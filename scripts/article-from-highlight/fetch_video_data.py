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


def fetch_transcript(video_id: str) -> dict:
    if not video_id:
        return {"ok": False, "error": "no video id"}
    # YouTube transcripts are tagged with specific language codes (en, en-US,
    # en-GB, etc.). The default is `en` but many videos only have `en-US`
    # manually created or generated transcripts. Try a small list and use
    # the first one that works.
    candidate_langs = ["en", "en-US", "en-GB", "a.en"]
    api = YouTubeTranscriptApi()
    last_err = None
    for lang in candidate_langs:
        try:
            snippets = list(api.fetch(video_id, languages=[lang]))
            if snippets:
                text = " ".join(s.text for s in snippets)
                trimmed = text[:30000]
                samples = [
                    {"t": round(s.start, 1), "text": s.text}
                    for s in snippets[:20]
                ]
                return {
                    "ok": True,
                    "lang": lang,
                    "snippet_count": len(snippets),
                    "text": trimmed,
                    "samples": samples,
                }
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
                    text = " ".join(s.text for s in snippets)
                    return {
                        "ok": True,
                        "lang": getattr(t, "language_code", "?"),
                        "snippet_count": len(snippets),
                        "text": text[:30000],
                        "samples": [{"t": round(s.start, 1), "text": s.text} for s in snippets[:20]],
                    }
            except Exception as e:
                last_err = e
                continue
    except Exception as e:
        last_err = e
    return {"ok": False, "error": f"{type(last_err).__name__ if last_err else 'Unknown'}: {str(last_err)[:200] if last_err else 'no transcript found'}"}


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
