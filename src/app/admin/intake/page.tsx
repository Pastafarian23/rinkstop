import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import IntakeDashboard from './IntakeDashboard';

export const dynamic = 'force-dynamic';

interface Lead {
  id: string;
  email: string;
  entity_type: string | null;
  entity_id: string | null;
  intent: string | null;
  source_path: string | null;
  source_url: string | null;
  listing_id: string | null;
  listing_type: string | null;
  listing_name: string | null;
  claimant_user_id: string | null;
  submitter_name: string | null;
  submitter_phone: string | null;
  message: string | null;
  read_at: string | null;
  email_verified: boolean;
  clerk_user_id: string | null;
  created_at: string;
}

interface EmailCapture {
  id: string;
  email: string;
  entity_type: string | null;
  entity_id: string | null;
  intent: string | null;
  source_path: string | null;
  source_url: string | null;
  email_verified: boolean;
  clerk_user_id: string | null;
  created_at: string;
}

interface ListingSubmission {
  id: string;
  listing_type: string;
  name: string;
  city: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

async function getIntakeData() {
  // Run all 4 queries in parallel.
  const [leadsRes, emailCapturesRes, listingSubsRes, leadsByListingRes] = await Promise.all([
    // Leads with listing context (denormalized for at-a-glance)
    supabaseAdmin
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
    // Email captures (Play 1 inline form)
    supabaseAdmin
      .from('email_captures')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
    // Listing submissions (public queue for new directory entries)
    supabaseAdmin
      .from('listing_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
    // Count of "unread" leads (no read_at) — used for the badge
    supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null),
  ]);

  return {
    leads: (leadsRes.data || []) as Lead[],
    emailCaptures: (emailCapturesRes.data || []) as EmailCapture[],
    listingSubmissions: (listingSubsRes.data || []) as ListingSubmission[],
    counts: {
      leads: leadsRes.data?.length || 0,
      emailCaptures: emailCapturesRes.data?.length || 0,
      listingSubmissions: listingSubsRes.data?.length || 0,
      unreadLeads: leadsByListingRes.count || 0,
    },
  };
}

export default async function IntakePage() {
  await requireAdmin();
  const data = await getIntakeData();

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1>📥 Intake</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
            All inbound signals from the site — soft-signup leads, inline email captures, directory submissions, and listing inquiries.
          </p>
        </div>
      </div>

      <IntakeDashboard
        initialLeads={data.leads}
        initialEmailCaptures={data.emailCaptures}
        initialListingSubmissions={data.listingSubmissions}
        initialCounts={data.counts}
      />
    </div>
  );
}
