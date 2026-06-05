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
| Auth | Local username/password (SHA-256 hashed) + Google OAuth |
| Cloud Sync | Google Sheets auto-sync (`gauth.js` + `sheets.js`) |
| Cloud Backup | Google Drive backup (`gdrive.js`) |
| Excel | SheetJS CDN |
| Hosting | GitHub Pages (static) |

---

## Current Status: ~95% Complete

### ✅ Done
- CRM: 140 contacts, 20+ fields, 4 view modes, filter, search, Excel import/export, Bulk WhatsApp
- CRM enriched: phone, IC/NRIC, DOB, gender, nationality, occupation, employer (from ALPP)
- ALPP scraping complete: Pass 1 + Pass 2 + targeted 51-contact pass
- ALPP Pass 3 scraper built (`alpp_scraper_pass3.js`) — plan details: name, SA, premium
- All case modules in **to-do mode**: Sales, Onboarding, Claims, Servicing, Recruitment
- Auto-reminders fire correctly on step completion
- Sound system: 12 Web Audio sounds · Glass design system
- **Auto-sync**: saveDB() → Google Sheets; login → auto-pull from Sheets
- Google token persists in localStorage (no re-auth across sessions)
- **Security**: SHA-256 password hashing, brute-force lockout (5 attempts/15 min), auto-logout (30 min)
- **Google login**: resilient — works even if Sheets API not yet enabled

### 🔴 Bugs Pending Fix
| # | Bug | File | Fix |
|---|---|---|---|
| 1 | Snapwill shows Claims progress for multi-category cases | `snapwill.js` line ~55 | `renderCaseDetail({...c, category:'snapwill'}, contact)` |
| 2 | Label picker shows random UID prefix (`mpye0qpq...`) | `sales.js` line ~130 | Change `${l.id} — ${l.label}` to `${l.label}` |

### ⚠️ Needs Action
- Enable Google Sheets API: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=638079686621
- Complete ALPP Pass 3 scraping (~6/199 done — resume scraper)

### ❌ Not Started
1. Team Dashboard — hierarchy tree + per-agent stats
2. Dashboard charts — pipeline bar chart, conversion rate

---

## Auto-Sync Architecture

```
Any device → local login (admin/admin)
  → gauthInit() restores Google token from localStorage (silent)
  → onLocalAuthReady() → auto-pull from Google Sheets (2s delay)
  → Any saveDB() call → syncLocalToSheets() auto-push
```

**One-time setup per device:** Login with Google once → token persists.
**Google Sheets API must be enabled** in linked Google Cloud project `638079686621`.

---

## Database

**Key:** `localStorage['lifeplanner_v1']`
**Shape:** `{ contacts[], cases[], reminders[], settings{}, customCategories[], customLabels{}, globalStatusDefs{} }`

### Contact Object
```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation,
  employer, nationality,
  notes, tags[],
  race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],   // ⚠️ ALWAYS ARRAY — insurer names
  aiaPolicies[],         // NEW — [{policyNo, insured, planName, sumAssured, annualPremium, policyStatus, commencedDate}]
  referralSource, socialMedia, createdAt, updatedAt
}
```

### Case Object
```js
{
  id, ownerEmail, contactId, contactName,
  category,          // primary: sales|claims|servicing|recruitment|onboarding|snapwill|aisolution|others
  categories[],      // all selected categories (multi-category support)
  label, subLabel,
  currentStatus,     // int — max(completedSteps)
  completedSteps[],  // int[] — to-do mode
  statusHistory[], remarks, reminders[], priority, kiv, followUp,
  premiums[], customFields{}, createdAt, updatedAt
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

## Security Architecture (NEW)

```
Passwords stored as: 'sha256:' + hex (SubtleCrypto SHA-256)
Migration: plaintext passwords auto-upgrade to hash on successful login

Brute-force: localStorage['lp_lockout'] = { count, username, until }
  5 failures → until = Date.now() + 15*60*1000
  Shows: "X attempts remaining" / "Locked for Y minutes"

Auto-logout: 30 min inactivity
  Activity events: mousemove, keydown, click, touchstart
  Fires: localLogout() / gauthSignOut() + stopAutoLogout()
```

---

## To-Do Mode Flow

```
renderStatusStep(c, stepDef, options)
  completedSteps.includes(stepDef.n)?
    YES → green checked → click unchecks via handleStepClick
    NO  → click → openSetStatusWithDate → confirmSetStatusWithDate
              → toggleStepDone(caseId, stepN, remark, date)
                  → toggles completedSteps[]
                  → currentStatus = Math.max(...completedSteps)
                  → checkStepAutoReminder()
```

**Recruitment branch (after step 3):**
- `renderConsiderChoices` → `handleConsiderChoice` → `toggleStepDone`
- Step 5 (Agreed) → `checkAutoTransfer` → creates onboarding case
- Step 6 (KIV) → `reactivateFromKIV`

---

## Critical Rules

| Rule | Detail |
|---|---|
| `existingInsurance` | Always ARRAY. `Array.isArray()` before any operation. |
| `aiaPolicies` | Always ARRAY. Populated by ALPP Pass 3 import. |
| `_blastFilter.insuranceFilter` | `[]` not `''`. Only array field in blast filter. |
| `confirmSetStatusWithDate()` | Calls `toggleStepDone()` NOT `setStatus()`. |
| `saveUser()` | Async — hashes password. Must be called with `await` or as onclick async. |
| `localLogin()` | Async — awaits hash verification. |
| Glass CSS | `var(--glass)` always. Never hardcode `rgba()`. |
| Git branch | Local `master` → remote `main`. Push: `master:main`. |
| Working dir | `C:\Users\Keith\todo-dashboard\` — NOT nested copy. |
| ALPP search btn | `#ContentPlaceHolder1_btnEditSearch` — NOT `input[type=submit]` (hits PRINT first) |

---

## ALPP Enrichment

### Status
| Pass | Status | Result |
|---|---|---|
| Pass 1 (ILP, ~200 policies) | ✅ COMPLETE | 74 contacts created |
| Pass 2 (traditional, 93 policies) | ✅ COMPLETE | Scraped via Chrome MCP |
| Targeted (51 name-only contacts) | ✅ COMPLETE | Enriched via processALPPEnrichment() |
| **Pass 3 (plan details)** | 🟡 IN PROGRESS | ~6/199 done |

### Pass 3 — How to Run
1. Login to ALPP → MY SERVICING → Policy Status Enquiry → search by Policy Number → click any result
2. You're now on `/policy-enquiry-one-glance` detail page
3. F12 → Console → paste `alpp_scraper_pass3.js` → Enter
4. Wait ~20 min (199 policies × ~6s). Partial downloads every 25. Final JSON auto-downloads.
5. Import: CRM → 🔄 ALPP Enrich → select JSON (auto-detected as Pass 3)

### Pass 3 — Resume via Chrome MCP
- Inject `window._step` pattern from `alpp_scraper_pass3.js` via `javascript_tool`
- State auto-saves to `localStorage['alpp_p3']` — survives page refresh
- Key fix: wait for plan table to appear (`/[A-Z]{2,4}\d\s+[\w][\w\s\-]+\n/`) before extracting
- Pick main plan = highest annual premium (not RM 0.00)

### processALPPEnrichment() — Pass 1/2 format
```js
{ policyNo, owner, phone, email, nric, dob, gender, nationality, occupation, employer }
```
Matches by owner name. Fills empty fields only.

### processALPPPass3() — Pass 3 format
```js
{ policyNo, owner, insured, planName, sumAssured, annualPremium, policyStatus, commencedDate, allPlans[], _pass:3 }
```
Adds `aiaPolicies[]` to matching contact. Adds 'AIA' to `existingInsurance[]`.

---

## Business Context

- Keith = AIA agent, Code A3719, PN PBG CK PARTNERS, Malaysia
- Team roles: `admin` / `dm` / `um` / `agent`
- Malaysian market: BM import column names, race/religion/langPref fields, festive WA templates
