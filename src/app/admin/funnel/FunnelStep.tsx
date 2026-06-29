/**
 * src/app/admin/funnel/FunnelStep.tsx
 *
 * One row in a funnel table. Shows event label, unique-user count,
 * % of top step, and % of previous step. Server-rendered (no client JS).
 */
import { eventLabel, type FunnelStepResult } from '@/lib/funnel';

interface Props {
  step: FunnelStepResult;
  index: number;
  isBiggestDrop: boolean;
}

export function FunnelStep({ step, index, isBiggestDrop }: Props) {
  const pctOfPrevDisplay = step.pct_of_prev === null
    ? '—'
    : `${step.pct_of_prev.toFixed(1)}%`;
  const pctOfTopDisplay = step.unique_users === 0 && index > 0
    ? '—'
    : `${step.pct_of_top.toFixed(1)}%`;

  // Color the pct_of_prev cell: red if drop > 50%, yellow if 25-50%, default otherwise
  let pctColor = 'rgba(255,255,255,0.7)';
  if (step.pct_of_prev !== null && index > 0) {
    if (step.pct_of_prev < 25) pctColor = '#FF6B7A';
    else if (step.pct_of_prev < 50) pctColor = '#FFB81C';
    else pctColor = '#14B8A6';
  }

  return (
    <tr style={isBiggestDrop ? { background: 'rgba(255,184,28,0.06)' } : undefined}>
      <td style={{ padding: '0.6rem 0.75rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', width: 32 }}>
        {index + 1}
        {isBiggestDrop && (
          <span title="Biggest drop in this funnel" style={{ marginLeft: 6, fontSize: '0.7rem' }}>⚠️</span>
        )}
      </td>
      <td style={{ padding: '0.6rem 0.75rem', color: '#fff', fontSize: '0.9rem', fontWeight: isBiggestDrop ? 600 : 400 }}>
        {eventLabel(step.event)}
        <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontFamily: 'monospace' }}>
          {step.event}
        </span>
      </td>
      <td style={{ padding: '0.6rem 0.75rem', color: '#fff', fontSize: '0.9rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {step.unique_users.toLocaleString()}
      </td>
      <td style={{ padding: '0.6rem 0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {pctOfTopDisplay}
      </td>
      <td style={{ padding: '0.6rem 0.75rem', color: pctColor, fontSize: '0.85rem', textAlign: 'right', fontWeight: index === 0 ? 400 : 500, fontVariantNumeric: 'tabular-nums' }}>
        {pctOfPrevDisplay}
      </td>
    </tr>
  );
}