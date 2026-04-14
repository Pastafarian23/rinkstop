# Developer Prompt for Kevlar Data Pivot
## Copy and paste this to your Replit project or freelancer

---

**Subject:** Update my Kevlar Data API to be a multi-vertical platform

---

**Hi [Developer Name],**

I need help updating my Replit project at **kevlar-data-monetization.replit.app**.

**Current state:**
- It's a single property data API (Illinois/Cook County)
- Has user accounts (Clerk) and API key management

**What I want:**
Transform it into a **multi-vertical API platform** that offers data APIs for:
1. Real Estate / Property data (keep what I have)
2. Hockey data (facilities, game stats, drills)
3. Finance data (market data)
4. Cannabis data (industry data)

**Changes needed:**

### 1. Add Hockey API endpoints
Create these new routes:
- `GET /api/v1/hockey/facilities` — Return list of hockey rinks/facilities
- `GET /api/v1/hockey/facilities/:id` — Return single facility details
- `GET /api/v1/hockey/scoresheets` — Return game stats (goals, assists, penalties)
- `GET /api/v1/hockey/drills` — Return coaching drills

For now, just create the **endpoints with sample data** (return fake/test data so we can test the API works). We'll add real data later.

### 2. Keep existing Property API but rename
- `GET /api/v1/property/properties` — (current /api/properties)
- `GET /api/v1/property/properties/:id` — (current /api/properties/:id)

### 3. Fix API Key UX (IMPORTANT)
The current API key only shows ONCE and users can't see it again. Add:
- A "Copy" button next to the API key
- A "Show" toggle to reveal the hidden key (••••••••)
- A "Regenerate" button to create a new key

### 4. Add usage dashboard
Create a page showing:
- Total API calls used this month
- Calls remaining
- Breakdown by endpoint (which APIs are being used)

### 5. Update the landing page
Change the headline from "Illinois Property Data for Investors" to something like:
> "Kevlar Data — APIs for Real Estate, Sports, Finance & Cannabis"

Add sections showing all 4 API categories.

---

**Timeline:** This is Phase 1 — just getting the structure in place. More data to add later.

**Budget:** [YOUR BUDGET]

---

Thanks!
Arnel