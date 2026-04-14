# Facility Input & Update Request Management Plan
## RinkStop.com - Global Hockey Directory

## Overview
Process for facilities to submit updates, claim their listing, or add new facilities to the directory.

---

## 1. Update Request Types

| Type | Examples | Priority |
|------|----------|----------|
| **Claim Listing** | Facility claims ownership of their profile | High |
| **Contact Info** | Phone, email, address changes | High |
| **Hours/Schedule** | Public skate times, league schedules | Medium |
| **Amenities** | Pro shop, restaurant, locker rooms | Medium |
| **Photos** | Facility images, ice photos | Medium |
| **New Facility** | Add a brand new rink | High |
| **Removal** | Facility closed permanently | High |
| **Dispute** | Wrong info, duplicate listing | Medium |

---

## 2. Self-Service Options

### Option A: "Claim Your Rink" Form
Simple form on RinkStop.com for facilities to:
1. Enter facility name & location
2. Provide proof of ownership (business card, utility bill)
3. Set password for account access
4. Submit for review

### Option B: Direct Edit (Post-Claim)
Once claimed, facilities can:
- Update contact info anytime
- Add/edit photos
- Submit ice schedule changes
- View listing analytics

---

## 3. Submission Channels

| Channel | Use Case | Response Time |
|---------|----------|---------------|
| **Website form** | Primary method, self-service | 24-48 hrs |
| **Email** | Bulk updates, partners | 48-72 hrs |
| **Phone** | Urgent issues only | Same day |
| **Social media** | General inquiries | 48-72 hrs |

---

## 4. Review Process

### Step 1: Submission Received
- Auto-confirmation email sent
- Ticket created in tracking system (Airtable/Notion)

### Step 2: Verification
- Confirm facility identity (prevent fake updates)
- Check info accuracy against public sources
- Flag suspicious requests for manual review

### Step 3: Update
- Publish changes to directory
- Send confirmation to facility contact

### Step 4: Follow-up (Optional)
- Survey facility about experience
- Encourage photo uploads, full profile completion

---

## 5. Required Information

**For claim requests:**
- Facility name
- Physical address
- Contact name & role
- Business verification (website, phone, or photo of facility)

**For general updates:**
- Facility name
- What needs updating
- New information
- Source of new info (optional)

---

## 6. Tools & Setup

### Recommended Stack
- **Form**: Typeform or Google Forms (embedded on site)
- **Tracking**: Airtable or Notion database
- **Email**: Automated confirmations via Mailchimp/ConvertKit
- **Dashboard**: Simple admin panel to approve/reject updates

### Fields to Capture
```
Facility Name
Request Type (dropdown)
Your Name
Your Role
Email
Phone
Old Info (what needs changing)
New Info (what to change instead)
Proof/Notes
```

---

## 7. Quality Control

### Prevent Spam/Fake Updates
- Require email verification
- For major changes (address, contact): require proof
- Log all changes with timestamp & source
- Facility can flag "unauthorized changes"

### Data Hygiene
- Quarterly outreach to facilities for verification
- Flag listings with no updates in 12+ months
- Cross-reference with NHL/AHL official sources for pro rinks

---

## 8. Implementation Priority

1. **Week 1**: Create Google Form for updates
2. **Week 2**: Set up Airtable to capture submissions
3. **Week 3**: Build simple "Claim Your Rink" page
4. **Week 4**: Set up automated confirmation emails
5. **Ongoing**: Weekly review & publish sessions