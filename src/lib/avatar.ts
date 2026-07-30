/**
 * Clerk avatar URL utilities.
 *
 * Clerk's image proxy serves three distinct URL shapes from
 * img.clerk.com/<base64-payload>:
 *
 *   ?type=image          → a real uploaded image (signed URL to the proxy)
 *   ?type=profile         → avatar variant of the uploaded image
 *   ?type=default        → the auto-generated initials placeholder
 *                          (the purple silhouette / AA bubble Clerk assigns
 *                          on signup before the user uploads anything)
 *
 * The "default" URL is what Clerk sends on user.created / user.updated
 * webhook events before any real upload happens. If we write it to
 * profile_photo_history, the photo history shows a broken-looking
 * placeholder instead of the actual first photo the user chose.
 *
 * We identify the default URL by base64-decoding the first segment of
 * the path and checking for {"type":"default"..."initials":"..."}. The
 * base64 of `{"type":"default"` starts with `eyJ0eXBlIjoiZGVmYXVsdCI` —
 * substring matching this is enough to detect any default variant
 * without paying for base64 decode on every sync.
 */

/**
 * True if the URL is Clerk's auto-generated initials placeholder
 * (the purple silhouette with the user's initials). These are not real
 * photo choices and should never land in profile_photo_history.
 *
 * Safe to call on any string: returns false for null/empty/non-Clerk URLs.
 */
export function isClerkDefaultAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  // Clerk proxy URLs always contain this exact base64 prefix for the
  // default variant. We check for the prefix specifically (not just
  // "img.clerk.com") so we don't false-match the real uploaded photo
  // URLs.
  return url.includes('eyJ0eXBlIjoiZGVmYXVsdCI');
}
