# Alt-Text Audit — 2026-09-02

## Summary

Audited 16 key pages for `<img>` tags without proper alt text.

**Total images scanned: 205**
**Issues found: 174 (85%)**
**Pages with issues: 1 (`/directory/rinks`)**

## Where the issues are

All 174 issues are on `/directory/rinks` — every rink listing image has `alt=""`.

```
📄 /directory/rinks
   Images: 175 | Good: 1 | Issues: 174
   - All from https://yszheonqyyskkjoxoexk.supabase.co/storage/v1/object/public/...
   - All have alt="" (empty)
```

## What's actually working

- Homepage: 1/1 image has good alt text
- Directory landing: 1/1 good
- Teams: 14/14 good
- Players: 3/3 good
- Leagues, International, Hockey Database, Data Coverage, Draft, Tools, About, News, Articles: all good

## Why rink images have empty alt

The rink cards on `/directory/rinks` are generated from a server component that renders an `<img>` tag without an alt attribute (or with `alt=""`). The rink has a name and city which would be the ideal alt text.

## Recommended fix

Change the rink card image render to use:
```jsx
<img 
  src={rink.photo_url || rink.hero_image_url} 
  alt={`${rink.name} ice rink in ${rink.city}, ${rink.state || rink.country}`}
  loading="lazy"
  width={400}
  height={300}
/>
```

This:
- Gives Bing Image Search descriptive alt text → better image ranking
- Helps screen reader users (accessibility / WCAG 2.1 1.1.1)
- Adds keyword-rich content to the page (city names help local SEO)
- Fixes 174 instances in one change

## Estimated impact

- **Bing Image Search visibility** for rink photos — currently invisible due to empty alt
- **AI citation** — when ChatGPT/Perplexity cite our rink pages, they may pull the alt text
- **Accessibility** — compliance with WCAG 2.1 AA

## Re-run

```bash
node scripts/alt-text-audit.mjs
```
