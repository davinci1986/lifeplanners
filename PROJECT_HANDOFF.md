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

## Current Status: ~90% Complete

### ✅ Done
- CRM contacts: 20+ fields, 4 view modes, filter bar, search, Excel import/export, Bulk WhatsApp
- CRM: `employer` + `nationality` fields (from ALPP enrichment)
- CRM: `🔄 ALPP Enrich` — imports `alpp_enriched_*.json` → enriches existing OR creates new contacts
- All case modules in **to-do mode**: Sales, Onboarding, Claims, Servicing, Recruitment
- Auto-reminders fire correctly on step completion (`checkStepAutoReminder`)
- Sound system: 12 Web Audio sounds
- Glass design: backdrop-filter, neon gradients
- ALPP Pass 1 complete: 199/199 policies scraped, 74 contacts created

### ⏳ In Progress
- **ALPP Pass 2**: `alpp_scraper_pass2.js` — 93 non-ILP policies — user running now

### ❌ Pending
1. Team Dashboard — hierarchy tree + per-agent stats
2. Dashboard charts — pipeline bar chart, conversion rate

---

## ALPP Scraper — Current State

### Pass 1 (COMPLETE)
- Script: `alpp_scraper.js`
- Result: 199/199 done · 106 successful · 93 errors (non-ILP timeout)
- Imported: 74 new contacts created in CRM

### Pass 2 (IN PROGRESS)
- Script: `alpp_scraper_pass2.js` (project root)
- Storage key: `alpp_scrape_pass2` (Chrome localStorage)
- Target: 93 non-ILP/traditional policies
- Output: `alpp_enriched_pass2_YYYY-MM-DD.json`

**Resume Pass 2:**
1. Login ALPP → open any policy detail page
2. F12 → Console → paste `alpp_scraper_pass2.js` → Enter (auto-resumes)

**Import result:**
- CRM → **🔄 ALPP Enrich** → select `alpp_enriched_pass2_*.json`

---

## Database

**Key:** `localStorage['lifeplanner_v1']`
**Shape:** `{ contacts[], cases[], reminders[], settings{}, customCategories[], customLabels{}, globalStatusDefs{} }`

### Contact Object
```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation,
  employer, nationality,        // from ALPP
  notes, tags[],
  race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],          // ⚠️ ALWAYS ARRAY
  referralSource, socialMedia, createdAt, updatedAt
}
```

### Case Object
```js
{
  id, ownerEmail, contactId, contactName,
  category,          // sales|claims|servicing|recruitment|onboarding|snapwill|aisolution|others
  label, subLabel,
  currentStatus,     // int — max(completedSteps)
  completedSteps[],  // int[] — to-do mode (ALL modules)
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
Approached → Fact-Finding → Closing Appointment → Candidate Consider (autoReminder 3d) → Candidate Agreed → Candidate KIV

### Onboarding (9 steps)
Key in BALP (autoReminder 90d) → Arrange Exam → 20 Names Hotlist (autoReminder 5d) → Training → Policy Review → Fieldwork → Fieldwork Closed → Exam Complete → Completed

---

## To-Do Mode (all modules)

```
renderStatusStep(cs, stepDef, options)
  stepDef.n in cs.completedSteps[]?
    YES → green checked row → click unchecks via handleStepClick
    NO  → click → openSetStatusWithDate → confirmSetStatusWithDate
              → toggleStepDone(caseId, stepN, remark, date)
                  → toggles completedSteps[]
                  → currentStatus = Math.max(...completedSteps)
                  → checkStepAutoReminder() fires if step has autoReminder
```

**Recruitment branch (after step 3):**
- `renderConsiderChoices` → `handleConsiderChoice` → `toggleStepDone` for step 4/5/6
- Step 5 (Agreed) → `checkAutoTransfer` → creates onboarding case
- Step 6 (KIV) → `reactivateFromKIV` removes step 6 from completedSteps

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
| ALPP JSON import | `handleCRMImportFile` skips `.json` files (Excel-only handler) |

---

## Business Context

- Keith = AIA agent, Code A3719, PN PBG CK PARTNERS, Malaysia
- Team roles: `admin` / `dm` / `um` / `agent`
- Malaysian market: BM import column names, race/religion/langPref fields, festive WA templates
