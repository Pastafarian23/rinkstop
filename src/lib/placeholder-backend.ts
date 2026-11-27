/**
 * Detects the deliberately invalid placeholder backend used by isolated
 * Preview deployments (host ending in `.invalid`, an RFC 2606 reserved TLD).
 *
 * Used only to let build-time data loaders fall back to empty results when no
 * real backend is configured. A real backend (any other host) is unaffected:
 * its errors still throw.
 */
export function isPlaceholderBackend(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith('.invalid');
  } catch {
    return false;
  }
}

export function backendIsPlaceholder(): boolean {
  return isPlaceholderBackend(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
}
