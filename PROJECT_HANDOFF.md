# PROJECT_HANDOFF.md — LifePlanner Pro

## What Is This

Browser-only CRM + case management for Keith's AIA insurance agent team in Malaysia.
No server. No build step. localStorage + optional Google Drive sync. GitHub Pages hosting.

**Live:** https://davinci1986.github.io/lifeplanners/
**Local:** `C:\Users\Keith\todo-dashboard\`
**Login:** admin / admin
**Git push:** `git push origin master:main`
**Git commit:** `git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "..."`

After push: GitHub Pages takes ~2 min. Users need Ctrl+Shift+R.

---

## Tech Stack

| Layer | Detail |
|---|---|
| Language | Vanilla HTML/CSS/JS — no framework, no bundler |
| Data | `localStorage['lifeplanner_v1']` — single JSON object |
| Auth | Local username/password (plaintext, internal) + Google OAuth |
| Cloud | Google Drive backup/sync (`gauth.js` + `gdrive.js`) |
| Excel | SheetJS CDN — check `typeof XLSX !== 'undefined'` before use |
| Hosting | GitHub Pages (static) |

---

## Current Status: ~85% Complete

### ✅ Done
- CRM contacts: 20+ fields, 4 view modes, filter bar, search, Excel import/export, Bulk WhatsApp
- CRM: `employer` + `nationality` fields added (from ALPP enrichment)
- CRM: `🔄 ALPP Enrich` button — reads scraper output JSON → updates empty fields
- `alpp_scraper.js` — browser console scraper for ALPP policy detail pages
- Sales cases: to-do mode (`completedSteps[]`)
- Onboarding cases: to-do mode
- Sound system: 12 Web Audio sounds
- Glass design: backdrop-filter, neon gradients

### ❌ Pending (priority order)
1. **ALPP scraper completing** — 49/199 done, running in Chrome (see scraper state below)
2. **Second pass** on 17 timed-out non-ILP policies
3. **Migrate `claims.js`** to to-do mode (reference: `sales.js`)
4. **Migrate `servicing.js`** to to-do mode
5. **Migrate `recruitment.js`** to to-do mode
6. **Team Dashboard** — hierarchy tree + per-agent stats
7. **Dashboard charts** — pipeline bar chart, conversion rate

---

## ALPP Scraper — Current State

| Field | Value |
|---|---|
| Script | `alpp_scraper.js` (project root) |
| localStorage key | `alpp_scrape_v3` (in Chrome tab on ALPP) |
| Progress | 49/199 policies scraped |
| Successes | 32 contacts with phone + email + NRIC + employer |
| Errors | 17 (timeout on non-ILP policies) |
| Output | `alpp_enriched_YYYY-MM-DD.json` (auto-downloads on completion) |

### Resume Instructions
```
If Chrome tab still open:
  DevTools → Console → window._alppStatus  (check running state)
  If stopped: paste alpp_scraper.js — auto-resumes from localStorage

If tab closed:
  1. Login to https://www.alpp.aia.com.my
  2. MY SERVICING → Policy Status Enquiry → A3719 → Inforce-Premium Paying → SUBMIT
  3. Click OK on native confirm popup (manual)
  4. Click any policy to open detail page
  5. DevTools → Console → paste alpp_scraper.js
```

### Timed-Out Policies (non-ILP — need second pass)
```
7005332A04, 7535986A10, 5523205A06, 4200336A05, 1087608A10, 5351468A02,
0740117J09, 7763082A10, 4113349A02, 7164156A00, 7211229A05, 7260012A00,
0040108J02, 5224270A04, 0825306J10, 7157497A10, 5159628A08
```
These are traditional (non-ILP) policies — different page layout, no `POLICY OWNER:` h5.
Second pass extractor needs to find owner data without relying on that heading.

### Import Into CRM
After scraper completes: CRM → **🔄 ALPP Enrich** → select `alpp_enriched_*.json`
- Matches by owner name (case-insensitive)
- Only fills EMPTY fields (phone, email, nric, dob, gender, occupation, employer, nationality)
- Never overwrites existing data

---

## Database

**Key:** `localStorage['lifeplanner_v1']`
**Shape:** `{ contacts[], cases[], reminders[], settings{}, customCategories[], customLabels{}, globalStatusDefs{} }`

### Contact Object
```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation,
  employer,       // Name of Employer — from ALPP
  nationality,    // from ALPP
  notes, tags[],
  race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],  // ⚠️ ALWAYS ARRAY — Array.isArray() before any use
  referralSource, socialMedia, createdAt, updatedAt
}
```

### Case Object
```js
{
  id, ownerEmail, contactId, contactName,
  category,          // sales|claims|servicing|recruitment|onboarding|snapwill|aisolution|others
  label, subLabel,
  currentStatus,     // int — max(completedSteps) in to-do mode
  completedSteps[],  // int[] — to-do mode only
  statusHistory[],   // [{fromStatus, toStatus, remark, date}]
  customStatusLabels{}, remarks, reminders[], priority, kiv, followUp,
  premiums[], examinations[], recruitPrograms[], fieldwork[],
  closedDate, customFields{}, createdAt, updatedAt
}
```

---

## Status Definitions

### Sales (8 steps)
Approached → Fact-Finding → Policy Summary → Closing Appointment → Closed/Proposed → Cementing Session → Ask for Referrals → KIV Listing

### Claims (10 steps)
Ask Receipts → Pending Submission → Submitted (autoReminder 7d) → Checked Status → Checking Again → Pending Memo → Send Requirement → Submit Memo → Pending Memo Follow-Up (autoReminder 7d) → Claim Completed

### Servicing (9 steps)
Fill Forms → Send Link → Reminder to Approve → Check Status (autoReminder 7d) → Pending Memo → Send Requirement → Submit Memo → Pending Memo Follow-Up (autoReminder 7d) → Status Approved

### Recruitment (6 steps)
Approached → Fact-Finding → Closing Appointment → Candidate Consider (autoReminder 3d, repeat) → Candidate Agreed → Candidate KIV

### Onboarding (9 steps)
Key in BALP (autoReminder 90d) → Arrange Exam → 20 Names Hotlist (autoReminder 5d) → Training → Policy Review → Fieldwork → Fieldwork Closed → Exam Complete → Completed

---

## To-Do Mode (Sales, Onboarding)

```
renderStatusStep(cs, stepDef, caseId)
  stepDef.n in cs.completedSteps[]?
    YES → green checked row
    NO  → checkbox → confirmSetStatusWithDate()
              → toggleStepDone(caseId, stepN, remark, date)
                  → toggles completedSteps[]
                  → currentStatus = Math.max(...completedSteps)

⚠️ confirmSetStatusWithDate() MUST call toggleStepDone() — NOT setStatus()
```

## Linear Mode (Claims, Servicing, Recruitment — needs migration)
```
"Next Step" button → advanceCaseStatus(id) → currentStatus += 1
// completedSteps[] not used
```

---

## Critical Rules

| Rule | Detail |
|---|---|
| `existingInsurance` | Always ARRAY. `Array.isArray()` before any operation. |
| `_blastFilter.insuranceFilter` | `[]` not `''`. Only array field in blast filter. |
| `confirmSetStatusWithDate()` | Calls `toggleStepDone()` NOT `setStatus()`. |
| Glass CSS | `var(--glass)` always. Never hardcode `rgba()`. |
| `backdrop-filter` | Causes headless screenshot hangs. Use `preview_snapshot`. |
| `updateSoundBtn()` | Called from `localLogin()` only — not `loadDB()`. |
| Git branch | Local `master` → remote `main`. Push: `master:main`. |
| Working dir | `C:\Users\Keith\todo-dashboard\` — NOT nested copy. |

---

## Business Context

- Keith = AIA agent, Code A3719, PN PBG CK PARTNERS, Malaysia
- Team roles: `admin` / `dm` / `um` / `agent`
- Malaysian market: BM import column names, race/religion/langPref fields, festive WA templates
