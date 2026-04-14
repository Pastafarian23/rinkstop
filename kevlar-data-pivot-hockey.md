# Kevlar Data → Hockey Data API Platform
## Pivot Plan: From Property Data to Sports Data

---

## The Pivot: HockeyData.io (or similar)

**Vision:** An all-encompassing hockey data API platform — from local rinks to professional stats.

**Core Value:** Make hockey data accessible, affordable, and easy to use — for coaches, leagues, fantasy platforms, media, and app developers.

---

## Data Sources (What We Offer)

### Tier 1: Facility & League Data (Already Have)
- RinkStop directory data (2M+ rinks globally)
- League information
- Tournament schedules
- Geographic mapping

### Tier 2: Game Data (From Scoresheet.pro)
- Real-time game tracking
- Period scores, penalties, shots, goals, assists
- Player stats per game
- PDF export for official records

### Tier 3: Coaching Data (From CoachBoard.pro)
- Drill library with diagrams
- Practice plans
- Skate paths, player movements

### Tier 4: Player & Team Stats (To Build)
- Youth hockey stats (via Scoresheet data collection)
- Amateur league standings
- Tournament results
- Player profiles

### Tier 5: Pro Data (Partnerships/APIs later)
- NHL, AHL, CHL, International stats
- Live game feeds (expensive, long-term)

---

## Monetization Model

### Free Tier
- 100 API calls/month
- Basic facility search
- Limited data fields

### Hobby Tier — $19/mo
- 5,000 API calls/month
- Facility data + basic stats
- CoachBoard drill access

### Pro Tier — $79/mo
- 50,000 API calls/month
- Full game stats
- Player profiles
- Priority support

### Enterprise — $299/mo+
- Unlimited calls
- Custom data feeds
- White-label access
- Dedicated support

---

## Target Customers

| Customer | Use Case | Willing to Pay |
|----------|----------|----------------|
| Youth hockey clubs | Stats tracking, scheduling | $19-79/mo |
| Fantasy hockey sites | Player data feeds | $79-299/mo |
| Media companies | Historical stats, records | $79-299/mo |
| Coaching apps | Drill library, practice plans | $19-79/mo |
| Sports betting | Live odds, player stats | Enterprise |
| Team management | Roster, schedule, stats | $19-79/mo |

---

## Growth Roadmap

### Phase 1: Foundation (Months 1-3)
- [ ] Rebuild KevlarData site as HockeyData
- [ ] Fix API key UX (show, regenerate, copy)
- [ ] Document all existing APIs (facilities, drills, scoresheets)
- [ ] Build public API docs/portal
- [ ] Launch with free tier → capture users

### Phase 2: Expand Data (Months 4-6)
- [ ] Add player profile API
- [ ] Add league/tournament API
- [ ] Build webhook system for real-time updates
- [ ] First 10 paid customers

### Phase 3: Scale (Months 7-12)
- [ ] Add NHL/CHL data partnerships
- [ ] Expand to figure skating, sled hockey
- [ ] Build analytics dashboard
- [ ] 100+ paid customers

### Phase 4: Multi-Sport (Year 2+)
- [ ] Add basketball, baseball, soccer data
- [ ] Replicate model across sports
- [ ] Become "sports data API platform"

---

## Competitive Landscape

| Competitor | Strength | Weakness |
|------------|----------|----------|
| NHL API | Official, expensive | No youth/amateur data |
| EliteProspects | Player database | Not an API-first platform |
| HockeyReference | Historical stats | No modern API |
| STHS | Game stats software | Desktop only |

**Our Edge:**
- Youth/amateur focus (underserved)
- API-first design
- Affordable pricing
- All-in-one (facilities + games + drills)

---

## Integration with RinkStop

- RinkStop.com → Traffic → API signups
- Scoresheet.pro → Game data → API content
- CoachBoard.pro → Drill data → API content
- SEO: "hockey API", "hockey stats API", "youth hockey data"

---

## UX Improvements (Required)

### API Key Management
- [ ] Show key on creation (with warning)
- [ ] "Copy to clipboard" button
- [ ] View key anytime (masked: ••••••••)
- [ ] Regenerate key (with confirmation)
- [ ] Multiple API keys per account
- [ ] Usage dashboard (calls remaining, usage graph)

### Developer Experience
- [ ] Interactive API docs (try it live)
- [ ] Code examples (Python, JavaScript, cURL)
- [ ] Webhook configuration UI
- [ ] Error messages with solutions

---

## Technical Stack

- **Host:** Replit (current) → consider moving to VPS later
- **Backend:** Node.js/Express
- **Database:** PostgreSQL (for structured data)
- **Authentication:** JWT + API keys
- **Documentation:** Swagger/OpenAPI
- **Payments:** Stripe (for subscriptions)

---

## Action Items

1. **Rename domain** → HockeyData.io or similar
2. **Rebuild landing page** → Developer-focused
3. **Fix API key flow** → Top priority
4. **Document existing APIs** → OpenAPI spec
5. **Create free tier signup** → Capture emails
6. **Reach out to existing RinkStop users** → Cross-sell

---

## Long-Term Vision

**HockeyData.io → SportsDataAPI.com**

Start with hockey. Prove the model. Then expand to:
- Figure Skating
- Sled Hockey
- Lacrosse
- Ringette
- Other niche sports

The platform becomes the "Sports Data API for Everyone" — affordable, accessible, developer-friendly.

---

*Plan generated: 2026-04-14*