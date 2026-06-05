# ARCHITECTURE.md — LifePlanner Pro

## High-Level Architecture

```
Browser (Single Page Application)
│
├── index.html              ← Shell: sidebar, modals, topbar, all <script> tags
├── css/app.css             ← Glass design system + all components
├── alpp_scraper.js         ← Pass 1: ILP policies — COMPLETE
├── alpp_scraper_pass2.js   ← Pass 2: traditional policies — COMPLETE
└── js/
    ├── data.js             ← DB layer: localStorage CRUD, saveDB, status defs
    ├── app.js              ← Router, page orchestration, local login, auto-sync trigger
    ├── utils.js            ← Toast, modals, IC/DOB helpers, renderStatusStep, handleStepClick
    ├── sounds.js           ← 12 Web Audio API sounds + toggle
    ├── crm.js              ← CRM contacts, Bulk WhatsApp, Excel/ALPP import
    ├── sales.js            ← Sales cases + shared renderCaseDetail (claims/servicing share this)
    ├── claims.js           ← Claims (to-do mode ✅)
    ├── servicing.js        ← Servicing (to-do mode ✅)
    ├── recruitment.js      ← Recruitment (to-do mode ✅, own renderRecruitDetail)
    ├── onboarding.js       ← Onboarding (to-do mode ✅)
    ├── snapwill.js         ← Snapwill digital will cases
    ├── aisolution.js       ← AI Solution custom cases
    ├── others.js           ← Custom category cases
    ├── export.js           ← Excel export (SheetJS, 6 sheets)
    ├── dashboard.js        ← Dashboard overview (charts: PENDING)
    ├── reminders.js        ← Reminders page
    ├── whatsapp.js         ← WhatsApp script generator
    ├── gauth.js            ← Google OAuth + token persistence (localStorage)
    ├── gdrive.js           ← Google Drive backup/sync
    └── sheets.js           ← Google Sheets auto-sync (push + pull)

localStorage['lifeplanner_v1']  ← Persistent JSON store (single source of truth per device)
Google Sheets                   ← Cross-device sync (auto-push on saveDB, auto-pull on login)
Google Drive                    ← Backup (gdScheduleSave on saveDB)
GitHub Pages                    ← Static hosting, no server
```

**No server. No backend. No build step.** Everything runs client-side.

---

## Application Startup Flow

```
Page Load → index.html loads all <script> tags in order
  data.js    → loadDB() reads localStorage into DB object
  gauth.js   → loaded (client setup deferred to DOMContentLoaded)
  app.js     → DOMContentLoaded:
                 gauthInit() — ALWAYS runs (restores Google token from localStorage)
                 localAuthInit() — checks sessionStorage for saved session
                   found → onLocalAuthReady() → navigateTo('dashboard')
                            → 2s delay → pullTeamDataFromSheets() if Google token active
                   not found → showLoginScreen()
```

---

## Auto-Sync Flow (NEW)

```
saveDB()
  → localStorage.setItem(DB_KEY, JSON.stringify(DB))
  → gdScheduleSave()           ← Google Drive backup (debounced)
  → syncLocalToSheets()        ← Google Sheets push (debounced, only if GAUTH.accessToken)

Google token lifecycle:
  First login: gauthSignIn() → Google OAuth popup → token saved to sessionStorage + localStorage
  Subsequent loads: gauthInit() reads localStorage → restores token silently
  Expiry (~1hr): Google prompts re-auth once, then silent again
  Sign out: clears both sessionStorage + localStorage
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

- Claims + Servicing: share `renderCaseDetail` from `sales.js`
- Recruitment: own `renderRecruitDetail` with branch choice UI

---

## Component Structure

```
index.html
├── #sidebar          ← Static nav
├── #mainWrapper
│   ├── .topbar       ← Search, sound toggle, reminders bell
│   └── #content      ← All page content injected here
├── #caseModal        ← Case detail/edit
├── #contactModal     ← Contact detail/form/ALPP import preview
├── #confirmModal     ← Yes/no dialog
└── #crmImportInput   ← Hidden file input — Excel (.xlsx/.csv) AND JSON (ALPP enrichment)
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

**`backdrop-filter` causes headless renderer hangs** — always use `preview_snapshot` not `preview_screenshot`

---

## ALPP Integration

```
processALPPEnrichment(records)   ← crm.js
  Input: [{policyNo, owner, phone, email, nric, dob, gender, nationality, occupation, employer}]
  → deduplicate by owner name (uppercase)
  → match CRM contact by name (case-insensitive)
    found: fill EMPTY fields only (never overwrite)
    not found: create new contact (Title Case name)
  → saveDB() → auto-sync to Sheets
```

**ALPP Scraper pattern (for future use):**
- Use `window._step` self-scheduling (NOT async loop — Angular SPA kills loops)
- Search button: `#ContentPlaceHolder1_btnEditSearch`
- Session watchdog: `setInterval` checks for Extend dialog every 30s
