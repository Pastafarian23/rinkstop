/**
 * HiddenWorkspacesFooter
 *
 * 2026-07-22 (Arnel): server component that renders the dismissed
 * workspace list at the bottom of the dashboard landing page.
 *
 * Layout: small footer block, muted styling so it doesn't compete with
 * the main workspace grid. Each row shows the workspace icon + name +
 * the reason they dismissed (if any) + the date + a Restore button.
 * Header has a bulk "Show all workspaces" trigger.
 *
 * Only rendered when the user has at least one dismissed workspace.
 * When empty, returns null — no empty-state chrome.
 *
 * Source: getDismissedWorkspaces() (React-cached). Re-fetched on every
 * router.refresh() triggered by DismissWorkspaceButton / RestoreWorkspaceButton.
 */

import { getDismissedWorkspaces } from '@/lib/dashboard/dismissedWorkspaces';
import { WORKSPACES, type WorkspaceDef } from '@/lib/dashboard/workspaces';
import RestoreWorkspaceButton from './RestoreWorkspaceButton';
import RestoreAllWorkspacesButton from './RestoreAllWorkspacesButton';

function formatReason(reason: string | null): string | null {
  if (!reason) return null;
  switch (reason) {
    case 'not_relevant':
      return "you marked it 'not relevant'";
    case 'too_complex':
      return "you marked it 'too complex'";
    case 'temporary':
      return 'temporary hide';
    case 'other':
      return 'hidden';
    default:
      return 'hidden';
  }
}

function formatDismissedAt(iso: string): string {
  // Light relative-time formatter. Avoids date-fns to keep deps stable.
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  // Older than a week → show calendar date.
  return new Date(iso).toLocaleDateString();
}

function findWorkspace(id: string): WorkspaceDef | undefined {
  return WORKSPACES.find((w) => w.id === id);
}

export default async function HiddenWorkspacesFooter() {
  const dismissed = await getDismissedWorkspaces();
  if (dismissed.length === 0) return null;

  return (
    <section
      id="hidden-workspaces-footer"
      aria-label="Hidden workspaces"
      data-testid="hidden-workspaces-footer"
      style={{
        marginTop: '2rem',
        padding: '1.25rem',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            HIDDEN WORKSPACES ({dismissed.length})
          </h3>
          <p
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '0.75rem',
              margin: '0.25rem 0 0',
              lineHeight: 1.4,
            }}
          >
            You hid these from your dashboard. Restore any to bring it back.
          </p>
        </div>
        <RestoreAllWorkspacesButton />
      </div>

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {dismissed.map((d) => {
          const ws = findWorkspace(d.workspaceId);
          // If the workspace id doesn't exist in WORKSPACES (deleted registry
          // entry, renamed workspace, etc.), still show a restore affordance.
          const name = ws?.name ?? d.workspaceId;
          const icon = ws?.icon ?? '📦';
          const reasonText = formatReason(d.reason);
          const timeText = formatDismissedAt(d.dismissedAt);
          return (
            <li
              key={d.workspaceId}
              data-testid={`hidden-workspace-row-${d.workspaceId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                flexWrap: 'wrap',
              }}
            >
              <span aria-hidden style={{ fontSize: '1.1rem' }}>{icon}</span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  flex: 1,
                  minWidth: 120,
                }}
              >
                {name}
              </span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.02em',
                }}
              >
                {timeText}
                {reasonText ? ` · ${reasonText}` : ''}
              </span>
              <RestoreWorkspaceButton workspaceId={d.workspaceId} workspaceName={name} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
