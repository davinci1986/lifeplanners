# ARCHITECTURE.md — LifePlanner Pro

## High-Level Architecture

```
Browser (Single Page Application)
│
├── index.html          ← Shell: sidebar, modals, topbar, all <script> tags
├── css/app.css         ← Glass design system + all components
├── alpp_scraper.js     ← Pass 1: browser console scraper (199 policies — COMPLETE)
├── alpp_scraper_pass2.js ← Pass 2: 93 non-ILP policies — IN PROGRESS
└── js/
    ├── data.js         ← DB layer: localStorage CRUD, status defs, CRM options
    ├── app.js          ← Router, page orchestration, localLogin
    ├── utils.js        ← Toast, modals, IC/DOB helpers, renderStatusStep, handleStepClick
    ├── sounds.js       ← 12 Web Audio API sounds + toggle
    ├── crm.js          ← CRM contacts, Bulk WhatsApp, Excel/ALPP import, employer field
    ├── sales.js        ← Sales cases + shared renderCaseDetail (used by claims/servicing)
    ├── claims.js       ← Claims (to-do mode ✅ — uses shared renderCaseDetail)
    ├── servicing.js    ← Servicing (to-do mode ✅ — uses shared renderCaseDetail)
    ├── recruitment.js  ← Recruitment (to-do mode ✅ — own renderRecruitDetail)
    ├── onboarding.js   ← Onboarding (to-do mode ✅)
    ├── snapwill.js     ← Snapwill digital will cases
    ├── aisolution.js   ← AI Solution custom cases
    ├── others.js       ← Custom category cases
    ├── export.js       ← Excel export (SheetJS, 6 sheets)
    ├── dashboard.js    ← Dashboard overview
    ├── reminders.js    ← Reminders page
    ├── whatsapp.js     ← WhatsApp script generator
    ├── gauth.js        ← Google OAuth
    ├── gdrive.js       ← Google Drive backup/sync
    └── sheets.js       ← Google Sheets team sync

localStorage['lifeplanner_v1']  ← Persistent JSON store
Google Drive (optional)         ← Cloud backup via gauth.js + gdrive.js
GitHub Pages                    ← Static hosting, no server
```

**No server. No backend. No build step.** Everything runs client-side.

---

## Application Startup Flow

```
Page Load → index.html loads all <script> tags in order
  data.js  → loadDB() reads localStorage into DB object
  gauth.js → initializes Google OAuth client
  app.js   → DOMContentLoaded:
               Not logged in → showLoginScreen()
               Logged in     → hideLoginScreen() → navigateTo('dashboard')
               → updateSoundBtn() in localLogin() ONLY (not loadDB)
```

---

## Page Render Flow

All pages: **render fn → innerHTML injection → inline onclick handlers**

```
navigateTo('crm') → renderCRM() → getElementById('content').innerHTML = html
```

---

## To-Do Mode Flow (ALL case modules)

```
renderStatusStep(c, stepDef, options)
  completedSteps.includes(stepDef.n)?
    YES → green checked (click → handleStepClick → uncheck immediately)
    NO  → click → handleStepClick → openSetStatusWithDate
              → confirmSetStatusWithDate(caseId, stepN)
                  → toggleStepDone()          ← NOT setStatus()
                  → checkStepAutoReminder()   ← fires if step.autoReminder defined
                  → currentStatus = max(completedSteps)
```

**Claims + Servicing** use the shared `renderCaseDetail` from `sales.js`.
**Recruitment** has its own `renderRecruitDetail` with branch choice UI.

Branch routing in `renderCaseDetail`:
- Claims step 5 → show Pending Memo / Completed buttons
- Servicing step 4 → show Pending Memo / Approved buttons
- Recruitment step 3 → show Consider/Agreed/KIV buttons (via `renderConsiderChoices`)

---

## ALPP Integration Architecture

```
Pass 1 (COMPLETE): alpp_scraper.js
  → 199 policies · 106 successful · 93 non-ILP errors
  → alpp_enriched_2026-06-04.json → imported → 74 new CRM contacts

Pass 2 (IN PROGRESS): alpp_scraper_pass2.js
  → 93 non-ILP/traditional policies
  → storage key: alpp_scrape_pass2
  → output: alpp_enriched_pass2_YYYY-MM-DD.json

CRM import: crm.js processALPPEnrichment()
  → match by owner name (case-insensitive)
  → found: fill empty fields only (never overwrite)
  → not found: create new contact with Title Case name + all fields
  → handleCRMImportFile skips .json (Excel-only handler — fixed bug)
```

---

## Contact Schema (data.js `createContact`)

```js
{ id, ownerEmail, name, phone, email, nric, dob, occupation,
  employer, nationality,           // ✅ from ALPP enrichment
  notes, tags[], race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],             // ⚠️ ALWAYS ARRAY
  referralSource, socialMedia, createdAt, updatedAt }
```

---

## Component Structure

```
index.html
├── #sidebar        ← Static nav
├── #mainWrapper
│   ├── .topbar     ← Search, sound toggle, reminders bell
│   └── #content    ← All page content injected here
├── #caseModal      ← Case detail/edit
├── #contactModal   ← Contact detail/form/import preview / quick reminder / step label editor
├── #confirmModal   ← Yes/no dialog
└── #crmImportInput ← Hidden file input — Excel (.xlsx/.csv) AND JSON (ALPP enrichment)
```

---

## Design Patterns

| Pattern | Usage |
|---|---|
| innerHTML injection | All UI as template literal strings |
| Inline onclick | `onclick="fn('${escHtml(id)}')"` |
| DB singleton | `DB` in memory; `saveDB()` persists to localStorage |
| escHtml() | All user content escaped before injection |
| var(--glass) | All card/modal backgrounds — never hardcoded rgba() |

**`backdrop-filter` causes headless renderer hangs** — use `preview_snapshot` not `preview_screenshot`
