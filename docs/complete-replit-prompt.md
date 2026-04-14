# Complete Prompt for Multi-Vertical API Platform
## Copy and paste this into Replit

---

> **"Build a multi-vertical API platform with these exact specifications:**
>
> ## Project Overview
> - **Name:** Kevlar Data
> - **Tagline:** Data APIs for Emerging Markets
> - **Purpose:** Unified API platform offering data across multiple verticals
>
> ## Tech Stack
> - Backend: Node.js/Express
> - Database: PostgreSQL (use Replit's built-in Neon database)
> - Auth: Simple email/password (no Clerk needed for MVP)
>
> ## User Management
> - User registration with email/password
> - User login with JWT tokens
> - Dashboard showing user's API keys and usage
>
> ## API Key Management (CRITICAL - must work well)
> - Users can create multiple API keys
> - Each key can be named (e.g., "Production", "Test", "My App")
> - **Show Key:** Button reveals the full API key (hidden by default with ••••••••)
> - **Copy Key:** One-click copy to clipboard button
> - **Regenerate Key:** Button to generate new key (with confirmation)
> - Keys displayed in a list with: name, prefix (first 8 chars), creation date, usage count
>
> ## API Endpoints (all require API key in header: `Authorization: Bearer YOUR_KEY`)
>
> ### Hockey API (`/api/v1/hockey/`)
> - `GET /facilities` — List hockey rinks/facilities
>   - Query params: `city`, `state`, `limit`, `offset`
>   - Returns: `[{id, name, address, city, state, zip, phone}]`
> - `GET /facilities/:id` — Single facility
> - `GET /scoresheets` — Game statistics
>   - Returns: `[{id, date, home_team, away_team, home_score, away_score, period, penalties}]`
> - `GET /drills` — Coaching drills
>   - Returns: `[{id, name, description, difficulty, duration}]`
>
> ### Property API (`/api/v1/property/`)
> - `GET /properties` — Search property records
>   - Query params: `city`, `county`, `zip`, `min_price`, `max_price`, `limit`
>   - Returns: `[{id, address, city, county, zip, bedrooms, bathrooms, price, sqft}]`
> - `GET /properties/:id` — Single property
>
> ### Finance API (`/api/v1/finance/`)
> - `GET /market` — Market data
>   - Query params: `symbol` (e.g., BTC, ETH, AAPL)
>   - Returns: `[{symbol, name, price, change_24h, volume, market_cap}]`
> - `GET /crypto` — Cryptocurrency prices
>   - Returns: `[{symbol, name, price_usd, change_24h}]`
>
> ### Cannabis API (`/api/v1/cannabis/`)
> - `GET /strains` — Strain database
>   - Query params: `type` (sativa, indica, hybrid)
>   - Returns: `[{id, name, type, thc_percent, cbd_percent, effects}]`
> - `GET /dispensaries` — Dispensary locations
>   - Returns: `[{id, name, address, city, state, license_status}]`
>
> **Note:** For MVP, return sample/mock data for all endpoints (5-10 records each). Real data can be added later.
>
> ## Rate Limiting
> - **Free tier:** 100 API calls per month
> - Track usage per API key
> - Return 429 error when limit reached with message: "Monthly limit reached. Upgrade to continue."
>
> ## Usage Dashboard
> Show user dashboard with:
> - Total calls used this month
> - Calls remaining
> - Usage breakdown by endpoint (which APIs used most)
> - Reset date (first of next month)
>
> ## Landing Page
> Create a professional landing page with:
> - **Hero section:** "Kevlar Data — APIs for Real Estate, Sports, Finance & Cannabis"
> - **API categories** — 4 cards showing each API (Hockey, Property, Finance, Cannabis)
> - **Pricing section:**
>   - Free: 100 calls/mo - $0
>   - Hobby: 5,000 calls/mo - $19/mo
>   - Pro: 50,000 calls/mo - $79/mo
>   - Enterprise: Unlimited - $299/mo
> - **Documentation link** to `/docs`
> - **Sign Up / Login buttons**
>
> ## Interactive API Docs
> - Use Swagger UI at `/docs`
> - Show all endpoints with request/response examples
> - Include 'Try it out' functionality
>
> ## Response Format
> All API responses should use this format:
> ```json
> {
>   "success": true,
>   "data": [...],
>   "meta": {
>     "total": 100,
>     "limit": 10,
>     "offset": 0
>   }
> }
> ```
> Error response:
> ```json
> {
>   "success": false,
>   "error": {
>     "code": "LIMIT_REACHED",
>     "message": "Monthly limit reached. Upgrade to continue."
>   }
> }
> ```
>
> **Keep it simple — focus on making the API key UX perfect and the structure ready for adding real data later."**

---

**Tips for Replit AI:**
- If it asks about adding real data, say "NO — use mock/sample data only for now"
- Ask it to test the API key creation and display before moving on
- Make sure the landing page looks professional (use Tailwind CSS or similar)

---

Would you like me to adjust anything in the prompt?