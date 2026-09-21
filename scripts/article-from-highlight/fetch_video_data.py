#!/usr/bin/env python3
"""YouTube transcript + oEmbed fetcher for the article pipeline.

Returns a single JSON object on stdout that the orchestrator can parse.
Errors are returned as JSON too (with `ok: false`) so the orchestrator
can decide whether to skip the highlight or abort the batch.
"""
import json
import re
import sys
import urllib.request
import urllib.parse
from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url: str) -> str:
    if not url:
        return ""
    # YouTube ID is 11 chars, [A-Za-z0-9_-]
    patterns = [
        r"(?:v=|/v/|youtu\.be/)([A-Za-z0-9_-]{11})",
        r"embed/([A-Za-z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return ""


def _shape_transcript(snippets, lang):
    text = " ".join(s.text for s in snippets)
    return {
        "ok": True,
        "lang": lang,
        "snippet_count": len(snippets),
        "text": text[:30000],
        "samples": [{"t": round(s.start, 1), "text": s.text} for s in snippets[:20]],
    }


def _fetch_youtube_transcript_api(video_id: str) -> dict:
    """Tier 1: youtube-transcript-api. Fast but IP-block-prone under load."""
    candidate_langs = ["en", "en-US", "en-GB", "a.en"]
    api = YouTubeTranscriptApi()
    last_err = None
    for lang in candidate_langs:
        try:
            snippets = list(api.fetch(video_id, languages=[lang]))
            if snippets:
                return _shape_transcript(snippets, lang)
        except Exception as e:
            last_err = e
            continue
    # Last resort: list available transcripts and pick the first one.
    try:
        listing = api.list(video_id)
        for t in listing:
            try:
                snippets = list(t.fetch())
                if snippets:
                    lang_code = getattr(t, "language_code", "?")
                    return _shape_transcript(snippets, lang_code)
            except Exception as e:
                last_err = e
                continue
    except Exception as e:
        last_err = e
    return {"ok": False, "error": f"{type(last_err).__name__ if last_err else 'Unknown'}: {str(last_err)[:200] if last_err else 'no transcript found'}", "_tier": "youtube_transcript_api"}


def _fetch_yt_dlp(video_id: str) -> dict:
    """Tier 2: yt-dlp with multiple player clients + subtitle fallback. Slower
    but uses different network paths and is harder for YouTube to fingerprint."""
    try:
        import yt_dlp
    except ImportError:
        return {"ok": False, "error": "yt_dlp not importable", "_tier": "yt_dlp"}
    url = f"https://www.youtube.com/watch?v={video_id}"
    # Try multiple player clients. With download=False yt-dlp still fetches
    # the video info page metadata, including subtitle URLs.
    for player_client in ["web", "ios", "android", "tv"]:
        try:
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "ignoreerrors": True,
                "skip_download": True,
                "noplaylist": True,
                "extractor_args": {"youtube": {"player_client": [player_client]}},
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
            if not info:
                continue
            subs = info.get("subtitles") or {}
            auto_subs = info.get("automatic_captions") or {}
            # Prefer English in any form (en, en-US, en-GB, en-XX)
            english_keys = [k for k in list(subs.keys()) + list(auto_subs.keys()) if k.startswith("en")]
            if not english_keys:
                continue
            for key in english_keys:
                # Pick first matching source: manual first, then auto
                for source, is_auto in ((subs, False), (auto_subs, True)):
                    if key not in source:
                        continue
                    track = source[key]
                    if isinstance(track, list):
                        track = track[0] if track else None
                    if not isinstance(track, dict):
                        continue
                    sub_url = track.get("url")
                    if not sub_url:
                        continue
                    try:
                        req = urllib.request.Request(sub_url, headers={"User-Agent": "curl/7.88.1"})
                        with urllib.request.urlopen(req, timeout=20) as resp:
                            sub_text = resp.read().decode("utf-8", errors="ignore")
                    except Exception:
                        continue
                    # json3 is the auto-caption JSON format (not VTT) — parse it
                    if track.get("ext") == "json3":
                        snippets = _parse_json3(sub_text)
                    else:
                        snippets = _parse_vtt(sub_text)
                    if snippets:
                        label = ("auto-" if is_auto else "") + key
                        return _shape_transcript(snippets, label)
        except Exception:
            continue
    return {"ok": False, "error": "no subtitles found via any yt-dlp player client", "_tier": "yt_dlp"}


def _parse_json3(text: str) -> list:
    """Parse YouTube json3 timedtext format into [{start, text}, ...]."""
    try:
        data = json.loads(text)
    except Exception:
        return []
    out = []
    events = data.get("events") or []
    for ev in events:
        start = (ev.get("segs") and ev.get("tStartMs", 0) / 1000.0) or 0.0
        # Actually json3 structure: events[].segs[] = { "utf8": "..." }
        for seg in (ev.get("segs") or []):
            chunk = seg.get("utf8") or ""
            if chunk.strip():
                out.append({"start": start, "text": chunk.strip()})
    return out


def _parse_vtt(vtt_text: str) -> list:
    """Parse a WebVTT subtitle file into [{start: float, text: str}, ...]."""
    out = []
    blocks = re.split(r"\r?\n\r?\n", vtt_text)
    for block in blocks:
        lines = [l for l in block.split("\n") if l.strip() and not l.startswith("WEBVTT") and not l.isdigit()]
        if not lines:
            continue
        # First line typically: "00:00:01.500 --> 00:00:03.000"
        ts = None
        ts_match = re.match(r"(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})", lines[0])
        if ts_match:
            h, m, s, ms = map(int, ts_match.groups()[:4])
            ts = h * 3600 + m * 60 + s + ms / 1000.0
        # Remaining non-empty lines: subtitle text
        text_lines = [l.strip() for l in lines[1:]] if ts_match else [l.strip() for l in lines]
        text = " ".join(l for l in text_lines if l)
        if text:
            out.append({"start": ts or 0.0, "text": text})
    return out


def fetch_transcript(video_id: str) -> dict:
    if not video_id:
        return {"ok": False, "error": "no video id"}
    # Tier 1: youtube-transcript-api. Fast, but IP-block-prone under load.
    r1 = _fetch_youtube_transcript_api(video_id)
    if r1.get("ok"):
        r1["source"] = "youtube-transcript-api"
        return r1
    # Tier 2: yt-dlp with multi-client fallback. Slower but uses different
    # network paths and is harder for YouTube to fingerprint.
    r2 = _fetch_yt_dlp(video_id)
    if r2.get("ok"):
        r2["source"] = "yt-dlp"
        return r2
    # Both failed — return the more informative error.
    return {
        "ok": False,
        "error": f"tier1({r1.get('error', '?')}) | tier2({r2.get('error', '?')})",
        "tier1_error": r1.get("error"),
        "tier2_error": r2.get("error"),
    }


def fetch_oembed(video_id: str) -> dict:
    # noembed.com is a free, no-auth oEmbed proxy that doesn't 403 us.
    if not video_id:
        return {"ok": False, "error": "no video id"}
    try:
        url = f"https://noembed.com/embed?url=https://www.youtube.com/watch?v={video_id}"
        req = urllib.request.Request(url, headers={"User-Agent": "curl/7.88.1"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        if "error" in data:
            return {"ok": False, "error": data["error"]}
        return {
            "ok": True,
            "title": data.get("title", ""),
            "author_name": data.get("author_name", ""),
            "author_url": data.get("author_url", ""),
            "thumbnail_url": data.get("thumbnail_url", ""),
            "provider_name": data.get("provider_name", ""),
            "html": data.get("html", ""),
        }
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}


if __name__ == "__main__":
    # Usage: fetch_video_data.py <youtube_url>
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "usage: fetch_video_data.py <youtube_url>"}))
        sys.exit(1)
    video_url = sys.argv[1]
    video_id = extract_video_id(video_url)
    if not video_id:
        print(json.dumps({"ok": False, "error": f"could not extract video id from: {video_url}"}))
        sys.exit(1)
    out = {
        "ok": True,
        "video_id": video_id,
        "oembed": fetch_oembed(video_id),
        "transcript": fetch_transcript(video_id),
    }
    print(json.dumps(out, indent=2))
