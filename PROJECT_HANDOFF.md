# PROJECT_HANDOFF.md — LifePlanner Pro

## What Is This
Browser-only CRM + case management for Keith's AIA insurance agent team in Malaysia.
No server. No build step. localStorage + Google Sheets auto-sync. GitHub Pages hosting.

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
| Auth | Local username/password + Google OAuth |
| Cloud Sync | Google Sheets auto-sync (`gauth.js` + `sheets.js`) |
| Cloud Backup | Google Drive backup (`gdrive.js`) |
| Excel | SheetJS CDN — check `typeof XLSX !== 'undefined'` before use |
| Hosting | GitHub Pages (static) |

---

## Current Status: ~93% Complete

### ✅ Done
- CRM: 140 contacts, 20+ fields, 4 view modes, filter, search, Excel import/export, Bulk WhatsApp
- CRM enriched: phone, IC/NRIC, DOB, gender, nationality, occupation, employer (from ALPP)
- ALPP scraping complete: Pass 1 (ILP) + Pass 2 (traditional) + targeted 51-contact pass
- All case modules in **to-do mode**: Sales, Onboarding, Claims, Servicing, Recruitment
- Auto-reminders fire correctly on step completion (`checkStepAutoReminder`)
- Sound system: 12 Web Audio sounds · Glass design system
- **Auto-sync**: saveDB() → Google Sheets; login → auto-pull from Sheets
- Google token persists in localStorage (no re-auth across browser sessions)

### ⚠️ Needs Action
- Enable Google Sheets API in Google Cloud Console (project `638079686621` / gen-lang-client)
- URL: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=638079686621

### ❌ Pending
1. Team Dashboard — hierarchy tree + per-agent stats
2. Dashboard charts — pipeline bar chart, conversion rate
3. Security hardening — password hashing, DB encryption, auto-logout
4. ALPP Pass 3 — capture `existingInsurance[]` plan/premium details

---

## Auto-Sync Architecture

```
Any device → local login (admin/admin)
  → gauthInit() restores Google token from localStorage (silent)
  → onLocalAuthReady() → auto-pull from Google Sheets (2s delay)
  → Any saveDB() call → syncLocalToSheets() auto-push
  → All devices stay in sync automatically
```

**One-time setup per device:** Login with Google once (Google tab on login screen) → token persists.
**Google Sheets API must be enabled** in the linked Google Cloud project.

---

## Database

**Key:** `localStorage['lifeplanner_v1']`
**Shape:** `{ contacts[], cases[], reminders[], settings{}, customCategories[], customLabels{}, globalStatusDefs{} }`

### Contact Object
```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation,
  employer, nationality,        // from ALPP enrichment
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

## To-Do Mode Flow (all modules)

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
| ALPP search btn | `#ContentPlaceHolder1_btnEditSearch` — NOT `input[type=submit]` (hits PRINT first) |

---

## ALPP Enrichment

### Status: ALL COMPLETE
- Pass 1 (ILP, 199 policies) → 74 contacts created
- Pass 2 (traditional, 93 policies) → scraped via Chrome MCP
- Targeted pass (51 name-only contacts) → enriched directly via `processALPPEnrichment()`

### Future enrichment (new contacts)
1. Navigate to ALPP policy detail page (any policy)
2. Use `window._step` self-scheduling scraper pattern (NOT async loop — Angular SPA kills loops)
3. Inject via Chrome MCP `javascript_tool` on ALPP tab
4. CRM → **🔄 ALPP Enrich** → select output JSON

### processALPPEnrichment() format
```js
{ policyNo, owner, phone, email, nric, dob, gender, nationality, occupation, employer }
```
Matches by owner name (case-insensitive). Fills empty fields only — never overwrites.

---

## Business Context

- Keith = AIA agent, Code A3719, PN PBG CK PARTNERS, Malaysia
- Team roles: `admin` / `dm` / `um` / `agent`
- Malaysian market: BM import column names, race/religion/langPref fields, festive WA templates
