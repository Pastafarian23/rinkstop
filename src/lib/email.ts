/**
 * Outbound email sender — Zoho SMTP.
 *
 * Used for: welcome emails, team invites, connection requests, DM
 * notifications, team post fan-out, listing-submission confirmations.
 *
 * Design rules (read before changing):
 *   1. NEVER block a request path on email send. Always `void sendEmail(...)`
 *      from a route. A failure logs but doesn't 5xx the user.
 *   2. Single From: identity (support@rinkstop.com). Replies route to a real
 *      Zoho inbox that Arnel can monitor.
 *   3. Templates live in src/lib/email-templates/. Plain HTML, brand-true.
 *   4. Subject lines are short. From-name is "RinkStop".
 *   5. All sends are best-effort. If SMTP is down, log and move on — do not
 *      surface errors to the user. The in-app inbox is the source of truth;
 *      email is a duplicate channel.
 *
 * Credentials:
 *   ZOHOMAIL_USER         — support@rinkstop.com
 *   ZOHOMAIL_APP_PASSWORD — app-specific password (rotated by Arnel)
 *
 * Cost: $0/month (Zoho free tier is 150/day; we send way below that).
 * Deliverability: 60-75% inbox placement. Upgrade to Resend if it drops.
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { renderTemplate, type TemplateName, type TemplateData } from './email-templates';

let _transport: Transporter | null = null;
let _initFailed: string | null = null;

function getTransport(): Transporter {
  if (_transport) return _transport;

  const user = process.env.ZOHOMAIL_USER;
  const pass = process.env.ZOHOMAIL_APP_PASSWORD;
  const host = process.env.ZOHOMAIL_SMTP_HOST || 'smtp.zoho.com';
  const port = Number(process.env.ZOHOMAIL_SMTP_PORT || 465);
  const secure = (process.env.ZOHOMAIL_SMTP_SECURE || 'true') === 'true';

  if (!user || !pass) {
    const msg = `ZOHOMAIL_USER or ZOHOMAIL_APP_PASSWORD not set (host=${host})`;
    if (_initFailed !== msg) {
      console.warn(`[email] ${msg} — email sends will be no-ops`);
      _initFailed = msg;
    }
    // Return a stub transport that always fails — caller logs and moves on.
    return nodemailer.createTransport({ jsonTransport: true });
  }

  _transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Zoho has a 60s idle timeout; cap our time below it.
    connectionTimeout: 10_000,
    socketTimeout: 30_000,
  });
  return _transport;
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  /** Render via a typed template. Mutually exclusive with raw html/text. */
  template?: TemplateName;
  data?: TemplateData[TemplateName];
  /** Send a raw HTML email (used by rink-notifications and similar fire-and-forget fan-out). */
  html?: string;
  text?: string;
  /** Optional reply-to override (defaults to support@). */
  replyTo?: string;
  /** Tag for log filtering (e.g. "welcome", "team-invite"). */
  tag?: string;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a templated email. Never throws. Caller does not need to await — they
 * can fire-and-forget with `void sendEmail(...)`.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const tag = args.tag || args.template || 'raw';
  try {
    let html: string;
    let text: string | undefined;
    if (args.template && args.data) {
      const rendered = renderTemplate(args.template, args.data);
      html = rendered.html;
      text = rendered.text;
    } else if (args.html) {
      html = args.html;
      text = args.text;
    } else {
      console.error(`[email] send failed [${tag} -> ${args.to}]: no template/data or html/text provided`);
      return { ok: false, error: 'no-template-or-html' };
    }
    const transport = getTransport();
    const fromName = process.env.ZOHOMAIL_FROM_NAME || 'RinkStop';
    const fromAddress = process.env.ZOHOMAIL_FROM_ADDRESS || args.to.includes('@rinkstop.com')
      ? process.env.ZOHOMAIL_USER || 'support@rinkstop.com'
      : process.env.ZOHOMAIL_USER || 'support@rinkstop.com';

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: args.to,
      replyTo: args.replyTo || process.env.ZOHOMAIL_USER,
      subject: args.subject,
      text,
      html,
    });

    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] send failed [${tag} -> ${args.to}]: ${msg}`);
    return { ok: false, error: msg };
  }
}

/**
 * Verify SMTP connectivity on startup. Returns true if creds work, false if not.
 * Used by the cron-health route so we know the email channel is up.
 */
export async function pingEmail(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const transport = getTransport();
    // jsonTransport always returns ok — we want to know if real SMTP works.
    // nodemailer.createTransport({ jsonTransport: true }) returns a stub.
    const isStub = (transport as unknown as { options?: { jsonTransport?: boolean } }).options?.jsonTransport;
    if (isStub) {
      return { ok: false, latencyMs: Date.now() - start, error: 'creds-missing' };
    }
    await transport.verify();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, latencyMs: Date.now() - start, error: msg };
  }
}

/**
 * Render the payment-pending email template without sending it.
 * Useful for routes that want to do their own fan-out (e.g., notifying multiple admins).
 */
export function paymentPendingEmail(args: TemplateData['payment-pending']): { subject: string; html: string } {
  const { html } = renderTemplate('payment-pending', args);
  return {
    subject: `${args.playerName} marked "${args.paymentTitle}" as paid`,
    html,
  };
}
