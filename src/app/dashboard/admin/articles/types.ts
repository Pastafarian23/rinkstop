// Shared types for the article review dashboard.

export interface PostRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: string;
  human_review_status: string | null;
  audit_status: string | null;
  last_audit_check_at: string | null;
  last_audit_status: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  published_at: string | null;
  category: string | null;
}
