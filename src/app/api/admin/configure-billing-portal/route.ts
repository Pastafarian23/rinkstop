import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// ONE-TIME ADMIN ROUTE — used to configure the Stripe Customer Portal.
// Disable cancel + switch plan in the portal. Keeps billing history +
// payment method + customer info update enabled.
//
// Guard: requires the Vercel protection bypass header (x-vercel-protection-bypass)
// OR the ADMIN_API_KEY env var matching the request's x-admin-key header.

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia' as any,
  });
}

function isAuthorized(req: NextRequest): boolean {
  const adminKey = req.headers.get('x-admin-key');
  const expected = process.env.ADMIN_API_KEY;
  if (expected && adminKey && adminKey === expected) return true;
  // Vercel protection bypass
  const bypass = req.headers.get('x-vercel-protection-bypass');
  if (bypass && process.env.VERCEL_AUTOMATION_BYPASS_SECRET &&
      bypass === process.env.VERCEL_AUTOMATION_BYPASS_SECRET) return true;
  // One-time ops secret (set via Vercel env, deleted after use)
  const url = new URL(req.url);
  const urlSecret = url.searchParams.get('secret');
  const expectedOps = process.env.OPS_ONE_TIME_SECRET;
  if (expectedOps && urlSecret && urlSecret === expectedOps) return true;
  if (expectedOps) {
    const headerSecret = req.headers.get('x-ops-secret');
    if (headerSecret && headerSecret === expectedOps) return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  const action = new URL(req.url).searchParams.get('action') || 'apply';

  try {
    // 1. List existing portal configurations
    const existing = await stripe.billingPortal.configurations.list({ limit: 5 });
    const defaultConfig = existing.data.find((c) => c.is_default) || existing.data[0] || null;

    // 2. Build the desired features:
    //    - subscription_cancel: DISABLED (must email support)
    //    - subscription_update: DISABLED (no plan switching)
    //    - customer_update: ENABLED (name, email, address, phone, shipping, tax_id)
    //    - invoice_history: ENABLED
    //    - payment_method_update: ENABLED
    const features = {
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'address', 'phone', 'name', 'shipping', 'tax_id'] as any,
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: false, mode: 'at_period_end' as any },
      subscription_update: {
        enabled: false,
        default_allowed_updates: [] as any,
        proration_behavior: 'none' as any,
        products: [],
      },
    } as any;

    if (action === 'list') {
      return NextResponse.json({
        existing_configurations: existing.data.map((c) => ({
          id: c.id,
          is_default: c.is_default,
          active: c.active,
          has_login_page: !!c.login_page,
          created: c.created,
        })),
        default_config_features: defaultConfig?.features || null,
      });
    }

    let result;
    if (defaultConfig) {
      // Update existing default config
      result = await stripe.billingPortal.configurations.update(defaultConfig.id, {
        features,
        active: true,
      });
    } else {
      // Create a new one and make it default
      const created = await stripe.billingPortal.configurations.create({
        features,
        business_profile: {
          headline: 'RinkStop — Manage your billing',
          privacy_policy_url: 'https://rinkstop.com/privacy',
          terms_of_service_url: 'https://rinkstop.com/terms',
        },
      });
      // Mark as default for the account
      result = await stripe.billingPortal.configurations.update(created.id, {
        default_return_url: 'https://rinkstop.com/dashboard/subscription',
        active: true,
      });
    }

    return NextResponse.json({
      success: true,
      action: defaultConfig ? 'updated' : 'created',
      configuration_id: result.id,
      is_default: result.is_default,
      active: result.active,
      features: result.features,
    });
  } catch (e) {
    console.error('[configure-billing-portal] failed', e);
    return NextResponse.json(
      { error: 'stripe_api_failed', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
