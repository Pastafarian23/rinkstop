# Content Pipeline — SativaExchange
## AI-Generated Content in Arnel's Voice

---

## Pipeline Overview

```
RSS Feeds → Source Material → AI Draft (structured prompt) → Voice Edit → Review Queue → Publish
```

**Goal:** 3-5 quality posts/day that sound like Arnel, not like AI.

---

## 1. SOURCE MATERIAL SOURCES

### RSS Feeds (to be configured)
- **Crypto:** CoinDesk, CoinTelegraph, The Block
- **Green Tech:** GreenTech Media, CleanTechnica, Reuters Energy
- **Energy:** OilPrice.com, Rigzone, Bloomberg Energy
- **Finance:** Bloomberg, Reuters, MarketWatch
- **Agriculture:** AgWeb, Farm Journal, USDA releases
- **Cannabis:** Leafly, Marijuana Moment, HempToday

### Internal Sources
- SativaExchange market data dashboards
- Trading mentor's notes / risk management insights
- Previous published content (context for continuity)

---

## 2. AI DRAFT PROMPT TEMPLATE

Use this for EVERY content generation. The key: feed the AI context first, then ask it to write.

### Base Prompt

```
You are writing content for SativaExchange.com — "Live Market Intelligence" 
for emerging markets (crypto, green tech, energy, finance, agriculture, cannabis).

THE WRITER: Arnel Larracas
- 32 years old, based in Cebu, Philippines
- Background: politics, tech/crypto, hockey coach
- Lived/traveled extensively (Africa, Asia, Philippines)
- Natural ideator, entrepreneur, learning as he goes

HIS VOICE (match this EXACTLY):
- First-person, conversational, authentic
- Short to medium sentences (2-5 sentences typical)
- Story → Insight structure (anecdote → lesson)
- Uses phrases like: "I remember...", "Looking back...", "The reality is..."
- Shares real experiences, not generic motivation
- Grounded, reflective, not preachy
- Check ARNELS-VOICE.md for full reference

TONE: Authoritative but personal. Data-driven but human. Bloomberg meets storytelling.

WRITING RULES:
- ✅ First-person, conversational
- ✅ Include real stories/memories (even if constructed from data context)
- ✅ Short, punchy sentences
- ✅ Share lessons learned
- ✅ Be encouraging
- ❌ No corporate jargon
- ❌ No long fluffy paragraphs
- ❌ No third-person or performative tone
- ❌ No generic motivational spam
- ❌ No excessive hashtags

FOR FINANCE/CRYPTO CONTENT:
⚠️ ALWAYS include: "For informational purposes only, not financial advice"
- Do NOT make price predictions
- Do NOT give investment advice
- Present data and analysis, let readers decide

STRUCTURE:
1. Hook (compelling opening — story or bold statement)
2. Context (what happened, what the data shows)
3. Analysis (your insight — this is where Arnel's perspective shines)
4. Takeaway (lesson or call-to-action)
5. Disclaimer (for finance content)

LENGTH: 300-600 words (MSN prefers 400+)
```

### Story-Specific Prompt Add-On

For each piece, append this after the base prompt:

```
SOURCE MATERIAL:
[Insert RSS article / data point / market event here]

WRITE ABOUT:
[Specific angle — e.g., "How today's Bitcoin dip relates to risk management principles"]

STEPDAD'S PERSPECTIVE:
[If applicable — insert any trading insight or quote from the trading mentor]

OUTPUT:
- A complete blog post/social post ready for review
- In Arnel's voice (see above)
- With proper source attribution
- SEO-friendly headline (60 chars max)
```

---

## 3. CONTENT QUALITY CHECKLIST

Before any post goes to review:

- [ ] Sounds like a human wrote it (read it out loud)
- [ ] First-person throughout
- [ ] Has a real story or concrete example
- [ ] Data is accurate and sourced (or clearly marked as analysis)
- [ ] No corporate buzzwords or filler
- [ ] SEO headline under 60 characters
- [ ] 300-600 words
- [ ] Has a clear lesson or takeaway
- [ ] Finance disclaimer included (if applicable)
- [ ] Links to sources included
- [ ] Internal links to related SativaExchange content

---

## 4. CONTENT TYPES & FREQUENCY

| Type | Frequency | Source | AI Involvement |
|------|-----------|--------|----------------|
| **Morning Analysis** | 2-3/day | RSS + market data | AI drafts, Arnel's twist |
| **Risk Management Tips** | 2-3/week | Trading mentor's expertise | AI structures, mentor reviews |
| **Deep Dives** | 1-2/week | Research + data | AI research assist, heavy human edit |
| **Quick Takes** | As needed | Breaking news | AI draft in 5 min, quick publish |
| **Roundups** | Weekly | Week's content | AI summarizes, Arnel adds perspective |

---

## 5. WORKFLOW (DAILY)

### Morning (30 min)
1. Scan RSS feeds — flag 3-5 stories worth covering
2. For each story: feed source material + prompt into AI
3. Generate drafts for 2-3 stories
4. Quick quality scan on each draft

### Midday (15 min)
5. Add "Arnel's twist" — 1-2 paragraphs of original insight per post
6. Check data/figures are accurate
7. Add internal links

### Afternoon (15 min)
8. Final voice check (read out loud or use TTS)
9. Format for platform (Twitter, LinkedIn, blog)
10. Queue for publishing or send to review

---

## 6. QUALITY IMPROVEMENT LOOP

Every Friday:
- Review the week's top 3 performing posts
- Note what worked (hook style, topic, data angle)
- Feed learnings back into prompt templates
- Adjust voice calibration if needed

Monthly:
- Compare AI-assisted content vs. fully manual content
- Track engagement metrics by content type
- Refine the ratio of AI-to-human input

---

## 7. AI PROVIDER RECOMMENDATION

For best quality-to-cost ratio with Arnel's voice:

**Primary:** Claude 3.5 Sonnet or Gemini 2.5 Flash
- Best at matching voice/tone from detailed prompts
- Good balance of quality and cost
- Strong at structured content generation

**Budget:** Gemini 2.0 Flash (free tier available) or current kilo-auto
- Functional for drafts
- Needs more editing/prompt refinement
- Acceptable for quick takes and roundups

**Key insight:** The prompt template and voice guide matter 10x more than the provider. A great prompt on a free model beats a vague prompt on GPT-4.