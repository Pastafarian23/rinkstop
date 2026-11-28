/**
 * Date text for a highlight match.
 *
 * Pinned to UTC so the server render and the browser render produce the same
 * string. Without a timezone, `toLocaleDateString()` uses the runtime's zone:
 * a timestamp late in the UTC day shows the next date in Asia and the same
 * date on the server, which triggers a React hydration mismatch (#418).
 */
export function formatHighlightDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC' });
}
