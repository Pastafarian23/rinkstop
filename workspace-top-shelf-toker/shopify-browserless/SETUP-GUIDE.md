# 🧭 Arnel's Guide: Setting Up Shopify API + Printful API

**Difficulty:** Zero technical skills required — just copy-paste and click
**Time:** ~15 minutes total

---

## PART 1: Shopify API Keys (5 minutes)

These keys let our scripts talk to your Shopify store directly — no browser, no CAPTCHA.

### Step-by-step:

**Step 1:** Log into your Shopify admin
- Go to your Shopify admin URL (the one you gave us: `xsisex-d6`)
- You should already be logged in at `https://admin.shopify.com/stores`

**Step 2:** Navigate to the Apps page
- In the **left sidebar**, scroll down to the very bottom
- Click **"Apps and sales channels"**
- Then in the new page, look for **"Develop apps"** (it might be near the bottom)

**Step 3:** Enable custom app development (if prompted)
- If you see a message saying custom app development is disabled, click **"Allow custom app development"**
- This is just flipping a switch — no code involved

**Step 4:** Create your app
- Click **"Create an app"**
- App name: **TopShelfToker**
- App developer: Choose **your email** (arnellarracas@gmail.com)
- Click **"Create app"**

**Step 5:** Configure permissions (scopes)
- You'll see a page with "Configuration" tab — click it
- Under **"Admin API integration settings"**, click **"Configure Admin API scopes"**
- You'll see a list of permissions. Find and **enable these**:
  - ✅ `read_products` — so the script can see your products
  - ✅ `write_products` — so the script can create/update products
  - ✅ `read_inventory` — so the script can check stock
  - ✅ `write_inventory` — so the script can update stock
  - ✅ `read_orders` — so the script can see sales
  - ✅ `write_orders` — (optional but useful)
  - ✅ `read_customers` — so we can see who's buying
  - ✅ `read_content` — for managing pages
  - ✅ `write_content` — for managing pages

- Click **Save**

**Step 6:** Install the app
- Go back and click the **"Installation"** tab
- Click **"Install app"**
- Confirm the installation

**Step 7:** Get your credentials
- Go to the **"API credentials"** tab
- You'll see TWO things you need. Copy these down somewhere safe:

```
🔑 Admin API access token:  (starts with "shpat_..." — this is 32 characters)
📛 API key:                 (starts with a long string)
🔒 API secret key:          (another long string)
```

- **Copy ALL THREE** and paste them into a message to me. That's it!

> ⚠️ **Important:** The access token is only shown ONCE. If you leave the page, you'll need to regenerate it. Save it now!

---

## PART 2: Printful API Keys (2 minutes)

These keys let our scripts tell Printful to upload designs and create products.

### Step-by-step:

**Step 1:** Log into Printful
- Go to https://www.printful.com and log in

**Step 2:** Go to API settings
- Click on your **profile icon** (top right)
- Click **"API"** in the menu

**Step 3:** Generate API key
- Click **"Generate API key"**
- Give it a name: **"TopShelfToker Automation"**
- Copy the key that appears — it looks like a long string of letters and numbers

> ⚠️ The API secret is shown ONCE. Copy it immediately!

---

## PART 3: What I'll Do With These Keys

Once you send me all three credentials:

1. **I'll build a unified script** that:
   - Uploads your design zip to Printful
   - Creates products on Printful with your designs
   - Prints/creates mockups automatically
   - Pushes products to your Shopify store
   - Sets pricing (your markup on Printful's base cost)
   - Manages inventory

2. **You'll have a single command:**
   ```bash
   node topshelf-automate.js --upload-designs --create-products --push-to-shopify
   ```

3. **No more manual uploading.** Design → Product → Store, all automatic.

---

## Summary: What You Need To Send Me

| Source | Key Name | What It Looks Like |
|--------|----------|-------------------|
| Shopify | Admin API access token | Starts with `shpat_...` |
| Shopify | API key | Long alphanumeric string |
| Shopify | API secret key | Long alphanumeric string |
| Printful | API key | Long alphanumeric string |
| Printful | API secret | Long alphanumeric string (shown once!) |

**That's 5 values total. Just paste them here and I'll handle the rest.** 🚀