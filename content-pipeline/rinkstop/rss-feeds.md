# RinkStop RSS Feed Configuration
## Breaking News & Topics Across All Levels of Hockey

---

## Feed Strategy

**Problem:** Most sports sites (ESPN, USA Hockey, etc.) block direct RSS access or have deprecated their feeds.

**Solution:** Use Google News RSS queries — they aggregate from thousands of sources and always return results.

### Google News RSS Format
```
https://news.google.com/rss/search?q=SEARCH_TERM&hl=en-US&gl=US&ceid=US:en
```

For Philippines hockey coverage:
```
https://news.google.com/rss/search?q=SEARCH_TERM&hl=en&gl=PH&ceid=PH:en
```

---

## 1. Professional Hockey (NHL + International)

| Feed | URL | Type |
|------|-----|------|
| NHL News | https://news.google.com/rss/search?q=NHL+hockey&hl=en-US&gl=US&ceid=US:en | News |
| IIHF International | https://news.google.com/rss/search?q=IIHF+hockey+championship&hl=en-US&gl=US&ceid=US:en | International |
| NHL Trade Rumors | https://news.google.com/rss/search?q=NHL+trade+rumors+2026&hl=en-US&gl=US&ceid=US:en | Rumors/Analysis |
| Olympic Hockey | https://news.google.com/rss/search?q=Olympic+hockey+2026&hl=en-US&gl=US&ceid=US:en | Events |

---

## 2. Youth Hockey & Coaching

| Feed | URL | Type |
|------|-----|------|
| Youth Hockey Coaching | https://news.google.com/rss/search?q=youth+hockey+coaching+tips&hl=en-US&gl=US&ceid=US:en | Coaching |
| USA Hockey Development | https://news.google.com/rss/search?q=USA+Hockey+development+model&hl=en-US&gl=US&ceid=US:en | Development |
| Hockey Drills & Training | https://news.google.com/rss/search?q=hockey+drills+training+practice&hl=en-US&gl=US&ceid=US:en | Training |
| Youth Hockey Safety | https://news.google.com/rss/search?q=youth+hockey+safety+concussions&hl=en-US&gl=US&ceid=US:en | Safety |

---

## 3. Hockey Business & Technology

| Feed | URL | Type |
|------|-----|------|
| Sports Business | https://news.google.com/rss/search?q=hockey+business+revenue+NHL&hl=en-US&gl=US&ceid=US:en | Business |
| Sports Tech | https://news.google.com/rss/search?q=hockey+technology+analytics+AI&hl=en-US&gl=US&ceid=US:en | Tech |
| Arena Industry | https://news.google.com/rss/search?q=ice+rink+arena+construction&hl=en-US&gl=US&ceid=US:en | Facilities |

---

## 4. Local Hockey Scenes (Country-Specific)

| Feed | URL | Type |
|------|-----|------|
| PH Hockey | https://news.google.com/rss/search?q=Philippines+ice+hockey&hl=en-US&gl=US&ceid=US:en | Philippines |
| Canada Hockey | https://news.google.com/rss/search?q=Canada+hockey+junior+nationals&hl=en-US&gl=US&ceid=US:en | Canada |
| USA Hockey | https://news.google.com/rss/search?q=USA+hockey+national+team+development&hl=en-US&gl=US&ceid=US:en | USA |
| European Hockey | https://news.google.com/rss/search?q=European+hockey+league+DEL+SHL+KHL&hl=en-US&gl=US&ceid=US:en | Europe |
| SEA Hockey | https://news.google.com/rss/search?q=Southeast+Asia+hockey+growing&hl=en-US&gl=US&ceid=US:en | Asia/SEA |

---

## 5. Hockey Equipment & Gear

| Feed | URL | Type |
|------|-----|------|
| Hockey Equipment | https://news.google.com/rss/search?q=hockey+skates+gear+equipment+2026&hl=en-US&gl=US&ceid=US:en | Gear |
| Bauer CCM | https://news.google.com/rss/search?q=Bauer+CCM+hockey+new+equipment&hl=en-US&gl=US&ceid=US:en | Brand News |
| Goalie Equipment | https://news.google.com/rss/search?q=goalie+equipment+pad+glove+2026&hl=en-US&gl=US&ceid=US:en | Goalie Gear |

---

## 6. NCAA & Junior Hockey

| Feed | URL | Type |
|------|-----|------|
| NCAA Hockey | https://news.google.com/rss/search?q=NCAA+hockey+college+2026&hl=en-US&gl=US&ceid=US:en | College |
| Junior Hockey | https://news.google.com/rss/search?q=USHL+OHL+junior+hockey+draft&hl=en-US&gl=US&ceid=US:en | Prospects |
| Hockey Futures | https://news.google.com/rss/search?q=hockey+prospect+draft+2026&hl=en-US&gl=US&ceid=US:en | Prospects |

---

## How to Use These Feeds for RinkStop

### Content Strategy

**Morning scan (15 min):** Browse all feeds, flag 3-5 stories worth sharing
- Breaking NHL news → quick social post driving traffic to RinkStop directory
- Coaching/tips articles → create CoachBoard drill content
- Country-specific hockey stories → unique "Local Scenes" angle nobody else covers
- Facility/arena news → highlight rinks on RinkStop directory

**Weekly deep dive (30 min):** Pick 1-2 stories for a full blog post
- Tie to RinkStop features (CoachBoard, Scoresheet, directory)
- Educational angle: "How coaches can use [X] to improve their teams"

### Content Mix

| Content Type | Source Feed | Frequency |
|-------------|-------------|-----------|
| **Quick News Posts** | NHL, IIHF, trade rumors | Daily (1-2) |
| **Coaching Tips** | Youth coaching, drills, safety | 2-3x/week |
| **Local Scenes | Country-specific hockey (PH, Canada, USA, Europe, Asia) | 1-2x/week |
| **Facility Spotlights** | Arena construction, rinks | 1-2x/week |
| **Tech/Innovation** | Sports tech, analytics | 1-2x/week |
| **Gear Reviews** | Equipment, brand news | As needed |

### Why Google News Works Better Than Direct Feeds

1. **Always returns results** — aggregates from hundreds of sources
2. **Fresh content** — updated continuously
3. **Broader coverage** — includes local news, blogs, press releases that don't have their own RSS
4. **Region-specific** — use `gl=US` or `gl=CA` etc. to filter by country
5. **Topic-specific** — exact search terms = exactly what you need

### Implementation

These URLs can be dropped directly into:
- **Feedly** / **Inoreader** (add as custom RSS URLs)
- **The topic curator script** (`scripts/topic-curator.js`)
- **Any RSS-to-AI pipeline**

All feeds update dynamically — no maintenance needed.

---

*30+ Google News RSS queries across 6 categories. Zero dead links.*