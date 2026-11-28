import { etDateKey, formatEtTime, isTba, teamName, type PwhlGame } from '@/lib/pwhl-schedule';

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function fold(line: string): string {
  // RFC 5545: lines are at most 75 octets; continuation lines start with one space.
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (parts.length === 0 ? 75 : 74)) {
      parts.push(cur);
      cur = ch;
    } else cur += ch;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

function stamp(utc: string): string {
  return new Date(utc).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** iCalendar for PWHL games. TBA games are all-day events on their Eastern date, never at an invented time. */
export function buildPwhlIcs(games: PwhlGame[], opts: { name: string; now?: Date }): string {
  const now = stamp((opts.now ?? new Date()).toISOString());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RinkStop//PWHL 2026-27//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + esc(opts.name),
  ];
  for (const g of games) {
    const summary = (g.phase === 'preseason' ? 'Preseason: ' : '') + teamName(g.away) + ' at ' + teamName(g.home);
    lines.push('BEGIN:VEVENT');
    lines.push('UID:pwhl-' + g.id + '@rinkstop.com');
    lines.push('DTSTAMP:' + now);
    if (isTba(g)) lines.push('DTSTART;VALUE=DATE:' + etDateKey(g.utc).replace(/-/g, ''));
    else lines.push('DTSTART:' + stamp(g.utc));
    lines.push('SUMMARY:' + esc(summary));
    if (g.venue) lines.push('LOCATION:' + esc(g.venue));
    lines.push('DESCRIPTION:' + esc((isTba(g) ? 'Time to be announced. ' : formatEtTime(g.utc) + '. ') + 'Official schedule: https://www.thepwhl.com/en/schedule'));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
