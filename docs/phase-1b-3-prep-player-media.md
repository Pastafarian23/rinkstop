# Phase 1b-3 — Player Media (Photos + Videos) (Prep Doc)

**Status:** DRAFT. NOT YET REVIEWED BY ARNEL. No code has been written.
**Author:** KiloClaw
**Date:** 2026-07-07
**Source of truth:** Phase 1a prep doc; Phase 1b-1 prep doc + audit report (storage pattern); Phase 1b-2 prep doc; existing `listings/photos` route as a working model.
**Related:** `supabase/migrations/2026-07-06_player_documents.sql` (1b-1 storage pattern); `supabase/migrations/2026-06-14-listing-photos-bucket.sql` (existing public-photo bucket).

---

## 0. Why this piece is third in 1b

After 1b-1 (documents) and 1b-2 (achievements + timeline) ship, the Hockey Passport has:
- Identity + verification (1a)
- Documents (1b-1, shipped)
- Achievements + career history (1b-2, prep pending)

The piece that's **notably missing** is the visual record: action shots, team photos, video highlights, achievement ceremonies. Per the 1a prep doc: "Your Hockey Passport is the permanent record of your child's hockey career — verified identity, **photo**, achievements, and team history."

This piece **closes the 1b-3 "coming soon" hits**:
- (No direct "coming soon" placeholder, but the 1b-2 prep doc §0 lists 5 remaining hits, and 1b-3 doesn't close any of them — see Q1 below)
- **The real value is enabling the photo/avatar-driven surfaces** that 1a and 1b-2 reference but can't fulfill yet.

**Heaviest piece in 1b.** Photos need image variants (thumbnail/medium/full). Video needs transcoding. Both are storage-heavy. **The 1b-1 audit confirmed the storage pattern works; we're now extending it with media-specific concerns.**

---

## 1. What this piece does (and does not do)

### Does

- Adds a new table `player_media` — uploaded media items (photos + videos) at the player level.
- Adds a new Supabase Storage bucket `player-media` (private, sized appropriately).
- Adds an upload UI on `/dashboard/family` (per child) and `/dashboard/profile` (per player) that lets a parent upload a photo or short video for one of their linked children.
- Adds a read-only gallery view with thumbnail grid.
- Adds a small set of "image variants" — thumbnail (200px wide), medium (800px wide), and full (original). Variants are stored as separate files in the same bucket.
- Adds a "primary media" flag on one media item per player (used as the avatar/header in the Hockey Passport).
- Tier gate: matches 1b-1 (identity_plus+ OR business_listing+).
- RLS: parent of the player (via `managed_profiles`) can SELECT/INSERT/UPDATE. No DELETE in v1.
- Storage RLS: parent can read/write files in their own children's folders. No DELETE.

### Does NOT do (deferred)

- **Server-side transcoding for video** — v1 stores the original uploaded file. ffmpeg/wasm is a separate piece (would need dependency + queue + cost). v1: original video is served via signed URL; the client plays it.
- **Image variant generation via `sharp` or similar** — v1 uses **client-side** variant generation. The browser scales images before upload, so the server only stores 1-3 fixed variants that the client requested. **Open question: client-side vs. server-side?**
- **EXIF stripping** — v1: original is stored with EXIF. **v2:** strip EXIF on upload (privacy + file size).
- **AI tagging / face recognition** — out of scope.
- **Public sharing** — v1 is parent-only. v2: org-side reads + share-by-link.
- **Comments / likes** — v1 is read-only with maybe a "caption" text field per item. v2: engagement features.
- **Bulk import from phone gallery** — v1: 1-5 files per batch (matches 1b-1 pattern). v2: native camera roll picker.

### Out of scope per the original spec's guardrail

- Authentication, pricing tiers, billing, verification, permissions, workspace architecture — **untouched**.
- 1b-1 surfaces (player_documents) — **untouched**. Player media and player documents are separate surfaces; the storage buckets are different.
- 1b-2 surfaces (achievements + timeline) — **untouched**. v1 doesn't link media to achievements (v2: "attach photo to this achievement").

---

## 2. Schema

### New table: `public.player_media`

```sql
CREATE TABLE public.player_media (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  uploaded_by     text NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,

  -- 'photo' | 'video' — drives variant generation + UI rendering.
  media_type      text NOT NULL CHECK (media_type IN ('photo', 'video')),

  -- For photos: 1-3 variants (thumbnail/medium/full). For videos: 1 (original only in v1).
  -- The storage paths for each variant live in jsonb for flexibility.
  -- Schema: { "original": "...", "thumbnail": "...", "medium": "...", "full": "..." }
  -- For videos, only "original" is set.
  storage_paths   jsonb NOT NULL,

  -- Pre-formatted display strings.
  caption         text CHECK (caption IS NULL OR char_length(caption) <= 200),

  -- Photo-specific metadata (v1: only width/height for layout reservation).
  width_px        integer,
  height_px       integer,

  -- Video-specific metadata (v1: only duration_sec).
  duration_sec    integer,

  -- File sizes per variant (bytes). Sum of all = total storage cost.
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes < 104857600),  -- 100 MB cap

  -- Primary media flag: at most one row per (player_id, media_type) has is_primary=true.
  -- Used as the avatar/header. Application-level enforcement (no DB partial unique).
  is_primary      boolean NOT NULL DEFAULT false,

  -- Soft-delete via archived_at; no DELETE in v1 RLS.
  archived_at     timestamptz,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX player_media_player_idx
  ON public.player_media (player_id, created_at DESC)
  WHERE status = 'active';

CREATE INDEX player_media_player_primary_idx
  ON public.player_media (player_id)
  WHERE is_primary = true AND status = 'active';

CREATE INDEX player_media_player_type_idx
  ON public.player_media (player_id, media_type, created_at DESC)
  WHERE status = 'active';
```

**Decisions in the schema:**

- **`storage_paths` is `jsonb`** — flexible per-variant paths. For photos: `{ original, thumbnail, medium }`. For videos: `{ original }`. Adding a new variant type in v2 doesn't require a schema change.
- **`media_type` enum is 2 values** — `photo` or `video`. The UI and storage paths differ; the enum keeps the read paths clean.
- **`is_primary` is application-level enforced** — Postgres partial unique indexes with expressions can do this, but the application code is simpler. Trade-off: a bug in the route could leave 2 primary items. **Open question: enforce at DB level with a partial unique?**
- **100 MB cap** — generous for photos. For videos, this is the cap. **Open question: separate cap for videos (e.g., 500 MB)?** My recommendation: 100 MB cap is fine for v1; a parent uploading a 5-minute highlight video at 1080p is already at the cap. v2: relax the cap or use a streaming-friendly format.
- **No DELETE in v1** — same as 1b-1 and 1b-2. Archive by setting `status='archived'`.

### New Supabase Storage bucket

- **Name:** `player-media`
- **Public:** `false` (private, signed URLs only)
- **File size limit:** 100 MB (matches DB cap)
- **Allowed MIME types:**
  - Photos: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
  - Videos: `video/mp4`, `video/quicktime` (`.mov`), `video/webm`
- **Path convention:** `{player_id}/{media_id}/{variant}.{ext}` — e.g., `{player_id}/abc-123/thumbnail.webp`
- **RLS on the bucket** (mirrors 1b-1's `player-documents` bucket):
  - SELECT: parent of the player (joined on `player_media.storage_paths->>original`)
  - INSERT: same
  - UPDATE: same
  - DELETE: blocked at the policy level (parent must archive in the DB instead)

### RLS policies on `public.player_media`

Mirroring 1b-1's RLS pattern:

```sql
ALTER TABLE public.player_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY player_media_select ON public.player_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_media.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );

CREATE POLICY player_media_insert ON public.player_media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_media.player_id
        AND mp.manager_user_id = current_user_id()
    )
    AND uploaded_by = current_user_id()
  );

CREATE POLICY player_media_update ON public.player_media
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_media.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );

-- No DELETE policy in v1.
```

---

## 3. File changes

### 3.1 New files

| File | Purpose |
|---|---|
| `supabase/migrations/2026-07-09_player_media.sql` | Table + indexes + RLS |
| `src/app/api/player-media/route.ts` | POST (upload, 1-5 files/batch, all-or-nothing rollback, client-side variants for photos), GET (list for a player) |
| `src/app/api/player-media/[id]/route.ts` | GET (signed URLs for all variants in one response), PATCH (set primary, edit caption, archive) |
| `src/components/player-media/PlayerMediaGallery.tsx` | Read-only thumbnail grid, 4 cols, click to expand to lightbox |
| `src/components/player-media/PlayerMediaUpload.tsx` | Multi-file picker (1-5, 100MB cap, mime-validated), client-side variant generation for photos, per-file caption, review panel |
| `src/components/player-media/PlayerMediaLightbox.tsx` | Full-screen overlay, prev/next, sets is_primary, archive, edit caption |
| `src/components/player-media/PlayerMediaSection.tsx` | Thin client wrapper that composes gallery + upload |

### 3.2 Modified files

| File | Change | Risk |
|---|---|---|
| `src/app/dashboard/family/page.tsx` | Add a Media section (per child) below the Career Timeline (1b-2). | **Low.** Additive. |
| `src/app/dashboard/profile/page.tsx` | Add a Media section (per player) — could replace an existing placeholder if any. | **Low.** |
| `src/lib/timeline-builder.ts` (1b-2) | If 1b-2 ships first, add a `media_uploaded` event source to the timeline. | **Low.** Read-only. |

### 3.3 No-touch list (must-keep-working audit)

- [ ] `player_documents` table + 1b-1 surfaces (separate storage, separate UI)
- [ ] `player_achievements` + 1b-2 surfaces
- [ ] `team_documents` + Phase 2 surfaces
- [ ] `team_notifications` + `consumer_notifications` (when 1b-4 ships) — these don't change with 1b-3
- [ ] All Phase 1a consumer cards
- [ ] All Family Hub sections
- [ ] All Wizard steps
- [ ] Tier gates, account-type gates, parental-link gates
- [ ] Authentication, pricing tiers, billing, verification, permissions, workspace architecture

---

## 4. The image-variant strategy (the heart of this piece)

**v1: client-side variant generation.** The browser uses `<canvas>` to scale the original image to the desired variant sizes BEFORE upload. The server receives 1 (video) to 4 (photo with thumbnail/medium/full/original) already-scaled files and stores each in its own path.

```typescript
// pseudocode — src/components/player-media/PlayerMediaUpload.tsx

async function generatePhotoVariants(file: File): Promise<{ blob: Blob; ext: string; size: 'thumbnail' | 'medium' | 'full' }[]> {
  const img = await loadImage(file);
  const variants: { blob: Blob; ext: string; size: 'thumbnail' | 'medium' | 'full' }[] = [];

  for (const { width, name } of [
    { width: 200, name: 'thumbnail' },
    { width: 800, name: 'medium' },
    { width: 1600, name: 'full' },
  ]) {
    if (img.naturalWidth <= width) {
      // Don't upscale — if the original is smaller than the variant, skip it.
      continue;
    }
    const canvas = document.createElement('canvas');
    const scale = width / img.naturalWidth;
    canvas.width = width;
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/webp', 0.85));
    variants.push({ blob, ext: 'webp', size: name as any });
  }

  return variants;
}
```

**Why client-side:**
- No server-side dependency (no `sharp`, no extra npm install).
- The browser knows the device's pixel density and can generate variants that look right.
- v1 upload UX is slower (the user waits for the browser to process), but no extra server cost.

**Why server-side might be better (v2):**
- Reliable: no browser variance.
- Can use `sharp` for higher-quality downscaling.
- Can strip EXIF automatically.
- But: extra npm install, extra server cost, extra failure modes.

**Open question: client-side for v1, server-side for v2?** My recommendation: **client-side for v1.** No new dependency, ships faster, browser can do this well. v2 if `sharp` becomes a real win.

### Videos in v1

**No transcoding.** The browser plays the original via a `<video>` tag with a signed URL from Supabase Storage. Mobile Safari, Chrome, and Firefox all play MP4/WebM natively. QuickTime (.mov) may not play in all browsers — server could reject it, OR we could add a ffmpeg-on-upload step. **Open question: support .mov uploads?**

My recommendation: **support .mp4 and .webm only in v1.** Reject .mov with a clear error. .mov is a container; iPhones can record in .mp4 (HEVC inside MP4) by default in newer iOS. v2: add ffmpeg if .mov support is needed.

### The lightbox UI

For photos, clicking a thumbnail opens a lightbox with:
- The medium (or full) variant at native size
- Caption (editable inline)
- "Set as primary" button (only if not already primary)
- "Archive" button
- Prev/Next navigation (keyboard arrows + on-screen arrows)

For videos, clicking opens a lightbox with:
- `<video>` element with controls, autoplay muted
- Caption (editable)
- "Set as primary" button
- "Archive" button
- No prev/next (v1 doesn't differentiate video from photo in the gallery grid)

---

## 5. The upload flow (the user-facing path)

### Step-by-step what the user does

1. Parent on `identity_plus+` tier with at least one linked child navigates to `/dashboard/family`.
2. Below the Career Timeline (1b-2) section, a "Media" section shows:
   - If the child has media: a 4-column grid of thumbnails, newest first
   - If the child has no media: "No media yet. **Upload your first photo or video**" with an Upload button
3. Clicking "Upload" opens an inline form (matches 1b-1 pattern):
   - Multi-file picker (1-5 files)
   - Per-file caption (optional, ≤200 chars)
   - The client generates variants for photos automatically; the user sees a preview thumbnail
4. Clicking "Save" sends a single multipart POST to `/api/player-media` with all files + variants.
5. The list refreshes with the new items.

### Edge cases the prep covers

- **No linked children** → "Add your first child before uploading media." with a link to FamilySearch.
- **Mixed photo + video batch** → supported; the route handles each per its type.
- **Video too large** → client-side rejects with a clear message.
- **Photo with very large dimensions** → client-side scales to a max of 4096px on the longest side before generating variants.
- **EXIF data** → v1 keeps EXIF in the original; client should strip it from the variants (the canvas re-encode naturally drops EXIF).
- **HEIC** → HEIC is allowed in the upload (per the bucket's allowed mime types) but the browser may not be able to render it for variant generation. **Open question: convert HEIC → JPEG client-side before variant generation?**
- **Multiple "primary" media items** → application-level invariant. When setting primary, the route first clears the existing primary for that player, then sets the new one. Idempotent.

---

## 6. Rollback plan

### Schema rollback
```sql
DROP TABLE IF EXISTS public.player_media;
-- RLS policies drop with the table
```

### Storage rollback
- Delete the `player-media` bucket via Supabase Dashboard → Storage → Delete bucket.
- All uploaded files are lost (v1 has no DELETE policy but Dashboard can still drop the bucket).

### Code rollback
- Revert the 3 modified files + 6 new files.
- Re-deploy. The Media section disappears.

### Data preservation
- Migration is additive (CREATE TABLE, no ALTER on existing tables).
- Modified files only ADD new sections.

### Worst case
- `git revert <merge-commit> + git push origin main`.

---

## 7. Ship gate (per 2026-06-24 protocol)

### Step 1 — Preparation (this doc, currently in progress)
- [x] Scope statement written (this doc)
- [x] Affected file list (section 3)
- [x] Dependency check (sections 1, 2, 4)
- [x] Rollback plan (section 6)
- [x] Must-keep-working audit list (section 3.3)
- [ ] **Arnel gives explicit "go" on implementation**

### Step 2 — Implementation (only after Step 1 is approved)
- One commit per file (one-piece-at-a-time rule)
- `pnpm run build` clean
- Local smoke: upload a photo, see variants; upload a video, see it play; set primary, see it appear in the avatar slot

### Step 3 — Pre-deploy audit
- Smoke test: parent uploads a photo → 3 variants appear in storage; lightbox displays the right variant
- Smoke test: parent uploads a video → 1 file in storage; video plays
- Smoke test: set primary → existing primary is cleared; new primary is set
- Smoke test: archive → item disappears from gallery; storage file remains
- Smoke test: must-keep-working features still work (1b-1, 1b-2 if shipped, 1a, Phase 2)

### Step 4 — Ship
- One merge commit to `main`, Vercel auto-deploys
- Confirm live site works
- Confirm `player_media` table exists in production

### Step 5 — Post-ship audit
- Smoke test on production
- Watch Vercel logs for errors 10-15 min

---

## 8. Open questions for Arnel (must be answered before Step 2)

1. **Image variants — client-side or server-side?** My recommendation: **client-side** for v1. No new dependency, browser does it well. v2: `sharp` for higher quality + EXIF stripping.

2. **Video support — .mp4/.webm only, or also .mov?** My recommendation: **.mp4/.webm only.** Reject .mov with a clear error. .mov is uncommon on modern phones (most record in .mp4 by default).

3. **HEIC support — accept and convert, or reject?** My recommendation: **reject HEIC for v1.** Many browsers can't decode HEIC client-side, which would break variant generation. iPhone users can set their camera to "Most Compatible" mode in Settings.

4. **Bucket public or private?** My recommendation: **private.** Photos of minors shouldn't be publicly addressable. The route always mints signed URLs. This is a **departure from the `listing-photos` bucket which is public** — but listings are business photos, not kids' hockey media. Different content, different posture.

5. **is_primary uniqueness — DB-level or application-level?** My recommendation: **DB-level partial unique index.** A bug in the route shouldn't be able to leave 2 primary items. Code:
   ```sql
   CREATE UNIQUE INDEX player_media_one_primary_per_player
     ON public.player_media (player_id)
     WHERE is_primary = true AND status = 'active';
   ```
   Wait — the partial unique would need to be on (player_id, media_type) if "primary photo" and "primary video" are different things. **Open question: is "primary" media-type-specific?**

6. **File size cap — 100 MB flat, or split by type (e.g., 25 MB photos, 100 MB videos)?** My recommendation: **100 MB flat for v1.** Simpler. v2: split if real parents hit the cap.

7. **Bulk upload — 1-5 per batch (matches 1b-1) or higher?** My recommendation: **1-5 per batch.** Same as 1b-1; consistency.

8. **Video duration limit?** My recommendation: **no explicit limit in v1**; rely on the 100 MB file size cap. A 5-minute 1080p video at 5 Mbps is ~190 MB, so the cap effectively limits to ~2.5 minutes at that bitrate. Good enough for v1.

9. **EXIF stripping in v1?** My recommendation: **no explicit EXIF stripping.** The original is stored as-is. Variants generated via canvas re-encoding naturally lose EXIF. Parents who want to strip EXIF from the original can do it before upload. v2: server-side `sharp` strips automatically.

10. **Per-batch consent re-assertion (Q12a from 1b-1)?** My recommendation: **yes, mirror 1b-1.** If a parent's prior consent was revoked, the upload form shows a consent checkbox at the top of the review stage.

---

## 9. Estimated effort (after Arnel approval)

| Step | Effort | Notes |
|---|---|---|
| Step 1 prep | DONE | this doc |
| Step 2 implementation | 1 piece, 6-9 hours | heaviest in 1b; client-side variant generation adds complexity |
| Step 3 pre-deploy audit | 1-2 hours | similar shape to 1b-1's audit |
| Step 4 ship | ~30 min | merge + Vercel |
| Step 5 post-ship audit | 15 min + 15 min log watch | routine |
| **Total** | **9-13 hours, one session, one piece** | fits the 2026-06-24 one-piece-at-a-time rule |

---

## 10. After this piece (the rest of 1b, briefly)

- **Phase 3 (org adoption surface)** — needs its own prep doc. Org-side first-touch.
- All other 1b pieces shipped (1b-1, 1b-2, 1b-4).

Each gets its own prep doc and its own session per the 2026-06-24 protocol.

---

## 11. Status + outstanding (2026-07-07 13:30 CDT)

### Built (on disk)
- **Nothing.** Prep doc only.

### Pre-deploy audit (Step 3) — N/A (no code yet)

### Outstanding (gate-step)
- [ ] **Arnel approves this prep doc** (Step 1 gate)
- [ ] All 10 open questions answered
- [ ] Verify `sharp` and `ffmpeg` are NOT in `package.json` (Step 0 — confirmed)
- [ ] Verify storage RLS pattern from 1b-1 audit holds for 1b-3 (Step 0 — read 1b-1 audit report)

### v2 backlog (not part of 1b-3, parked)
- Server-side image variants via `sharp`
- Server-side video transcoding via `ffmpeg`
- EXIF stripping
- HEIC support
- AI tagging / face recognition
- Public sharing / share-by-link
- Org-side media reads
- Comments + likes
- Bulk import from phone gallery
- "Attach photo to this achievement" linking
- .mov support
- Per-kind mute preferences
- Larger video file cap (500 MB)
- Video thumbnail generation (extract a frame at 1s)