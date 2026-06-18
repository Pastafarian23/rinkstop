import { formatRole, roleColor } from '@/lib/team';

export function RoleChip({ role, size = 'sm' }: { role: string; size?: 'xs' | 'sm' | 'md' }) {
  const style = roleColor(role);
  const fontSize = size === 'xs' ? 10 : size === 'md' ? 14 : 12;
  const padding = size === 'xs' ? '0.1rem 0.5rem' : size === 'md' ? '0.4rem 1rem' : '0.25rem 0.75rem';
  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: 999,
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {formatRole(role)}
    </span>
  );
}
