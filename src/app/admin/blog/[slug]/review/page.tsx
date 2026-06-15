'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PostBodyViewer from '@/components/admin/PostBodyViewer';
import EditFieldsDrawer from '@/components/admin/EditFieldsDrawer';
import BodyEditor from '@/components/admin/BodyEditor';
import CrossLinkOverridePanel, { Override } from '@/components/admin/CrossLinkOverridePanel';
import HighlightOverridePanel from '@/components/admin/HighlightOverridePanel';
import SourceSignalsPanel from '@/components/admin/SourceSignalsPanel';
import ReviewHistoryPanel from '@/components/admin/ReviewHistoryPanel';
import SlugPreviewBanner from '@/components/admin/SlugPreviewBanner';

interface CrossLinkRef {
  id: string;
  name?: string;
  slug?: string;
  first_name?: string;
  last_name?: string;
}

interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  content: string;
  category?: string | null;
  tags?: string[] | null;
  status: string;
  published_at?: string | null;
  game_date?: string | null;
  highlight_id?: number | null;
  highlight_id_override?: number | null;
  team_home_id?: string | null;
  team_away_id?: string | null;
  league_id?: string | null;
  player_id?: string | null;
  country_slug?: string | null;
  cross_link_overrides?: Override | null;
  team_home?: CrossLinkRef | null;
  team_away?: CrossLinkRef | null;
  league?: CrossLinkRef | null;
  player?: CrossLinkRef | null;
  author_name?: string | null;
  author_role?: string | null;
  created_at?: string;
  view_count?: number;
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ReviewBlogPostPage({ params }: Props) {
  const { slug } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  // Drawer / editor state
  const [fieldsDrawerOpen, setFieldsDrawerOpen] = useState(false);
  const [bodyEditorOpen, setBodyEditorOpen] = useState(false);

  // Local pending-change state (not yet saved)
  const [pendingFields, setPendingFields] = useState<{
    title?: string;
    subtitle?: string | null;
    category?: string | null;
    tags?: string[];
  }>({});
  const [pendingBody, setPendingBody] = useState<string | null>(null);
  const [pendingOverrides, setPendingOverrides] = useState<Override>({});
  const [pendingHighlight, setPendingHighlight] = useState<number | null | undefined>(undefined);
  const [pendingCountry, setPendingCountry] = useState<string | null | null>(null);

  // Team lookups for the SlugPreviewBanner. When the user picks an
  // override team via CrossLinkOverridePanel, we get just an ID — but
  // the slug preview needs the team's name and slug. Fetch the team
  // record on demand and cache it in pickedTeams.
  const [pickedTeams, setPickedTeams] = useState<Record<string, { id: string; name: string; slug: string }>>({});

  const fetchPost = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/blog/posts/${slug}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPost(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // Initialize pending state from post
  useEffect(() => {
    if (post) {
      setPendingFields({});
      setPendingBody(null);
      setPendingOverrides(post.cross_link_overrides || {});
      setPendingHighlight(post.highlight_id_override);
      setPendingCountry(null); // null = no change pending
    }
  }, [post?.id, post?.cross_link_overrides, post?.highlight_id_override]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading…</div>;
  }
  if (error || !post) {
    return (
      <div>
        <Link href="/admin/blog" className="text-slate-400 hover:text-teal-400 text-sm">← Back to Posts</Link>
        <div className="text-center py-12 text-red-400">Error: {error || 'Post not found'}</div>
      </div>
    );
  }

  // Compute effective values (pending overrides + pending field edits)
  const effectiveTitle = pendingFields.title ?? post.title;
  const effectiveSubtitle = pendingFields.subtitle !== undefined ? pendingFields.subtitle : post.subtitle;
  const effectiveCategory = pendingFields.category !== undefined ? pendingFields.category : post.category;
  const effectiveTags = pendingFields.tags ?? post.tags ?? [];
  const effectiveContent = pendingBody ?? post.content;
  const effectiveHighlightId = pendingHighlight !== undefined ? pendingHighlight : post.highlight_id;

  // Cross-link overrides: pending state is the source of truth
  // (user can clear an override by setting it to undefined)
  // When an override is set, use the pickedTeams lookup (populated
  // by the useEffect above) so the SlugPreviewBanner can show the
  // actual team name + slug.
  const effectiveTeamHome = pendingOverrides.team_home_id !== undefined
    ? (pendingOverrides.team_home_id ? (pickedTeams[pendingOverrides.team_home_id] || { id: pendingOverrides.team_home_id, name: '…', slug: '' }) : null)
    : post.team_home;
  const effectiveTeamAway = pendingOverrides.team_away_id !== undefined
    ? (pendingOverrides.team_away_id ? (pickedTeams[pendingOverrides.team_away_id] || { id: pendingOverrides.team_away_id, name: '…', slug: '' }) : null)
    : post.team_away;
  const effectiveLeague = pendingOverrides.league_id !== undefined
    ? (pendingOverrides.league_id ? { id: pendingOverrides.league_id, name: 'Override' } : null)
    : post.league;
  const effectivePlayer = pendingOverrides.player_id !== undefined
    ? (pendingOverrides.player_id ? { id: pendingOverrides.player_id } : null)
    : post.player;
  const effectiveCountry = pendingCountry !== null ? pendingCountry : post.country_slug;

  const hasPendingChanges = Object.keys(pendingFields).length > 0
    || pendingBody !== null
    || Object.keys(pendingOverrides).length > 0
    || pendingHighlight !== undefined
    || pendingCountry !== null;

  // Fetch team records for any override IDs we haven't seen yet.
  // The SlugPreviewBanner needs the team's name + slug to compute the
  // projected slug. We watch both home and away override IDs and fetch
  // the missing ones. The team search API returns id, name, slug.
  useEffect(() => {
    if (!post) return;
    const overrideHomeId = pendingOverrides.team_home_id;
    const overrideAwayId = pendingOverrides.team_away_id;
    const idsToFetch: string[] = [];
    if (overrideHomeId && !pickedTeams[overrideHomeId]) idsToFetch.push(overrideHomeId);
    if (overrideAwayId && !pickedTeams[overrideAwayId]) idsToFetch.push(overrideAwayId);
    if (idsToFetch.length === 0) return;

    let cancelled = false;
    (async () => {
      const updates: Record<string, { id: string; name: string; slug: string }> = {};
      for (const id of idsToFetch) {
        try {
          // We don't have a "get by id" endpoint, but the team search
          // with an empty query returns the first 20 results. For an
          // exact lookup, we can use ilike with the id as a query (no,
          // id is uuid). Better: add a tiny endpoint, or just look up
          // by id via the Supabase REST API. Easiest: use the
          // /api/admin/articles/teams/[id] route if it exists, else
          // fetch the post and follow the FK.
          // For now, use the team search with no query and filter.
          // Actually, simplest: hit a dedicated endpoint.
          // Fallback: skip the preview for the override case (banner
          // shows '—' instead of a slug).
          const res = await fetch(`/api/admin/teams/${id}`);
          if (!res.ok) continue;
          const team = await res.json();
          if (cancelled) return;
          if (team && team.id && team.name && team.slug) {
            updates[id] = { id: team.id, name: team.name, slug: team.slug };
          }
        } catch {
          // ignore
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setPickedTeams((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
  }, [pendingOverrides.team_home_id, pendingOverrides.team_away_id, post, pickedTeams]);

  // Build the PATCH payload
  const buildChanges = (statusOverride?: 'published' | 'draft' | 'archived') => {
    const changes: Record<string, any> = {};
    if (pendingFields.title !== undefined) changes.title = pendingFields.title;
    if (pendingFields.subtitle !== undefined) changes.subtitle = pendingFields.subtitle;
    if (pendingFields.category !== undefined) changes.category = pendingFields.category;
    if (pendingFields.tags !== undefined) changes.tags = pendingFields.tags;
    if (pendingBody !== null) changes.content = pendingBody;
    if (Object.keys(pendingOverrides).length > 0) changes.cross_link_overrides = pendingOverrides;
    if (pendingHighlight !== undefined) changes.highlight_id_override = pendingHighlight;
    return { changes, status: statusOverride };
  };

  // Skip this post from the needs-review queue (mark as intentionally
  // not a game article). The reason is optional but encouraged — it
  // shows up in the "Reviewed" tab of /admin/blog/needs-review.
  const handleSkip = async () => {
    const reason = window.prompt(
      'Why is this post not a game article? (optional, e.g. "coaching guide", "industry news")',
      ''
    );
    if (reason === null) return; // user cancelled
    const next: Override = {
      ...pendingOverrides,
      _skipped_review: true,
      _skip_reason: reason.trim() || '(no reason given)',
      _skipped_at: new Date().toISOString(),
    };
    setPendingOverrides(next);
    // Defer to next tick so the state update is flushed before save reads it
    setTimeout(() => applyChanges(), 0);
  };

  const applyChanges = async (statusOverride?: 'published' | 'draft' | 'archived') => {
    const { changes, status } = buildChanges(statusOverride);
    if (Object.keys(changes).length === 0 && !status) return;
    setSaving(true);
    try {
      const body: any = { ...changes };
      if (status) body.status = status;
      // country_slug is legacy — go through the legacy path
      if (pendingCountry !== null) {
        body.country_slug = pendingCountry;
      }
      const res = await fetch(`/api/admin/articles/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      // Reload post from server to get the merged state
      await fetchPost();
      setHistoryKey((k) => k + 1);
      // Clear pending state
      setPendingFields({});
      setPendingBody(null);
      setPendingOverrides(post?.cross_link_overrides || {});
      setPendingHighlight(post?.highlight_id_override);
      setPendingCountry(null);
    } catch (e) {
      alert(`Save failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldsSave = (changes: { title?: string; subtitle?: string | null; category?: string | null; tags?: string[] }) => {
    setPendingFields((prev) => ({ ...prev, ...changes }));
    setFieldsDrawerOpen(false);
  };

  const handleBodySave = (newContent: string) => {
    setPendingBody(newContent);
    setBodyEditorOpen(false);
  };

  const onOverrideChange = (next: Override) => {
    setPendingOverrides(next);
  };
  const onCountryChange = (slug: string | null) => {
    setPendingCountry(slug === post.country_slug ? null : slug);
  };

  const statusStyle = (() => {
    if (post.status === 'published') return { bg: 'rgba(20,184,166,0.15)', color: '#14B8A6', label: 'Published' };
    if (post.status === 'draft') return { bg: 'rgba(250,204,21,0.15)', color: '#FACC15', label: 'Draft' };
    return { bg: 'rgba(248,113,113,0.15)', color: '#F87171', label: 'Archived' };
  })();

  return (
    <div>
      <EditFieldsDrawer
        open={fieldsDrawerOpen}
        initial={{
          title: effectiveTitle,
          subtitle: effectiveSubtitle,
          category: effectiveCategory,
          tags: effectiveTags,
        }}
        saving={saving}
        onSave={handleFieldsSave}
        onClose={() => setFieldsDrawerOpen(false)}
      />
      <BodyEditor
        open={bodyEditorOpen}
        initialContent={effectiveContent}
        saving={saving}
        onSave={handleBodySave}
        onClose={() => setBodyEditorOpen(false)}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <Link href="/admin/blog" className="text-slate-400 hover:text-teal-400 text-sm">← Back to Posts</Link>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 4, background: statusStyle.bg, color: statusStyle.color }}>
              {statusStyle.label}
            </span>
            {hasPendingChanges && (
              <span style={{ fontSize: '0.7rem', color: '#FACC15', padding: '2px 8px', background: 'rgba(250,204,21,0.1)', borderRadius: 4 }}>
                Unsaved edits
              </span>
            )}
          </div>
          <h1 style={{ marginBottom: 4 }}>{effectiveTitle}</h1>
          {effectiveSubtitle && (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', margin: 0 }}>{effectiveSubtitle}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {post.status === 'published' && (
            <a
              href={`/news/${post.slug}`}
              target="_blank"
              rel="noopener"
              className="admin-btn admin-btn-secondary"
            >
              View on site ↗
            </a>
          )}
          <Link href={`/admin/blog/${post.slug}`} className="admin-btn admin-btn-secondary">
            Full editor
          </Link>
        </div>
      </div>

      {/* Two-column layout: review on left, signals on right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1.5rem' }}>
        {/* Left column */}
        <div>
          {/* Quick actions */}
          <div className="admin-card p-4" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', color: 'white', margin: '0 0 4px' }}>🔍 Review this article</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
                  Fix AI mistakes in the body, override any wrong cross-links, then promote with edits.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setFieldsDrawerOpen(true)}
                  className="admin-btn admin-btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                >
                  ✏️ Edit title/tags
                </button>
                <button
                  type="button"
                  onClick={() => setBodyEditorOpen(true)}
                  className="admin-btn admin-btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                >
                  📝 Edit body
                </button>
              </div>
            </div>
          </div>

          <PostBodyViewer content={effectiveContent} />

          <CrossLinkOverridePanel
            team_home={effectiveTeamHome}
            team_away={effectiveTeamAway}
            league={effectiveLeague}
            player={effectivePlayer}
            country_slug={effectiveCountry}
            overrides={pendingOverrides}
            onChange={onOverrideChange}
            onCountryChange={onCountryChange}
          />

          <SlugPreviewBanner
            homeTeam={effectiveTeamHome}
            awayTeam={effectiveTeamAway}
            gameDate={post.game_date ?? post.published_at}
            currentPostId={post.id}
          />

          <HighlightOverridePanel
            pipelineHighlightId={post.highlight_id}
            overrideHighlightId={pendingHighlight}
            onChange={setPendingHighlight}
            scopeTeamId={pendingOverrides.team_home_id ?? post.team_home_id}
          />
        </div>

        {/* Right column — signals + history */}
        <div>
          <SourceSignalsPanel post={post} />
          <ReviewHistoryPanel postId={post.id} refreshKey={historyKey} />
        </div>
      </div>

      {/* Sticky action bar */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: '1.5rem',
          padding: '1rem 1.25rem',
          background: '#0F172A',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
          {hasPendingChanges ? (
            <>
              <span style={{ color: '#FACC15' }}>●</span> You have unsaved edits
            </>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>No pending edits</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => applyChanges()}
            disabled={saving || !hasPendingChanges}
            className="admin-btn admin-btn-secondary"
          >
            {saving ? 'Saving…' : 'Save edits'}
          </button>
          {post.status !== 'published' && (
            <button
              type="button"
              onClick={() => applyChanges('published')}
              disabled={saving}
              className="admin-btn admin-btn-primary"
              style={{ fontWeight: 600 }}
            >
              {saving ? 'Promoting…' : hasPendingChanges ? '✓ Promote with edits' : '✓ Promote'}
            </button>
          )}
          {post.status === 'published' && (
            <button
              type="button"
              onClick={() => applyChanges('draft')}
              disabled={saving}
              className="admin-btn admin-btn-secondary"
            >
              ← Move to draft
            </button>
          )}
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="admin-btn admin-btn-secondary"
            style={{ fontSize: '0.75rem', color: 'rgba(96,165,250,0.8)' }}
            title="Mark this post as intentionally not a game article. Removes it from /admin/blog/needs-review."
          >
            ⏭️ Skip from review
          </button>
        </div>
      </div>
    </div>
  );
}
