# ARCHITECTURE.md — LifePlanner Pro

## High-Level Architecture

```
Browser (Single Page Application)
│
├── index.html              ← Shell: sidebar, modals, topbar, all <script> tags
├── css/app.css             ← Glass design system + all components
├── alpp_scraper.js         ← Pass 1: ILP policies — COMPLETE
├── alpp_scraper_pass2.js   ← Pass 2: traditional policies — COMPLETE
├── alpp_scraper_pass3.js   ← Pass 3: plan details (name/SA/premium) — IN PROGRESS
└── js/
    ├── data.js             ← DB layer: localStorage CRUD, saveDB, status defs, security helpers
    ├── app.js              ← Router, page orchestration, local login, security (hash/lockout/auto-logout)
    ├── utils.js            ← Toast, modals, IC/DOB helpers, renderStatusStep, handleStepClick
    ├── sounds.js           ← 12 Web Audio API sounds + toggle
    ├── crm.js              ← CRM contacts, Bulk WhatsApp, Excel/ALPP import, processALPPPass3()
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
    ├── gauth.js            ← Google OAuth + token persistence + auto-logout hook
    ├── gdrive.js           ← Google Drive backup/sync
    └── sheets.js           ← Google Sheets auto-sync (push + pull)

localStorage['lifeplanner_v1']  ← Persistent JSON (single source of truth per device)
Google Sheets                   ← Cross-device sync (auto-push on saveDB, auto-pull on login)
Google Drive                    ← Backup (gdScheduleSave on saveDB)
GitHub Pages                    ← Static hosting
```

**No server. No backend. No build step.**

---

## Application Startup Flow

```
Page Load → index.html loads all <script> tags in order:
  data.js    → loadDB() reads localStorage into DB
  gauth.js   → loaded (client setup deferred to DOMContentLoaded)
  app.js     → DOMContentLoaded:
                 gauthInit() — ALWAYS runs (restores Google token from localStorage)
                 localAuthInit() — checks sessionStorage for saved session
                   found → onLocalAuthReady() → navigateTo('dashboard')
                            → startAutoLogout()
                            → 2s delay → pullTeamDataFromSheets() if token active
                   not found → showLoginScreen()
```

---

## Security Architecture

```
Passwords: SHA-256 via SubtleCrypto (browser-native, no library)
  Format: 'sha256:' + hexdigest
  Migration: plaintext auto-upgraded on successful login

Brute-force: localStorage['lp_lockout'] = { count, username, until }
  5 failures → 15 min lockout (Date.now() + 15*60*1000)
  Clears on successful login

Auto-logout: 30 min inactivity
  Events watched: mousemove, keydown, click, touchstart
  Timer reset on any activity
  On timeout: localLogout() or gauthSignOut()

Functions: hashPassword(), verifyPassword(), startAutoLogout(), stopAutoLogout()
  localLogin() and saveUser() are async (await hashPassword)
```

---

## Auto-Sync Flow

```
saveDB()
  → localStorage.setItem(DB_KEY, JSON.stringify(DB))
  → gdScheduleSave()           ← Google Drive backup (debounced)
  → syncLocalToSheets()        ← Google Sheets push (only if GAUTH.accessToken)

Google token lifecycle:
  First login: gauthSignIn() → Google OAuth popup → saved to sessionStorage + localStorage
  Subsequent loads: gauthInit() reads localStorage → restores silently
  Expiry (~1hr): Google prompts re-auth
  Sign out: clears both stores + stopAutoLogout()

onAuthReady() (Google login success):
  → sheetsEnsureSpreadsheet()  [wrapped in try/catch — fails gracefully if API not enabled]
  → loadCurrentUserRole()      [wrapped in try/catch — defaults to 'agent']
  → hideLoginScreen() → render app → startAutoLogout()
```

---

## Page Render Flow

```
navigateTo('crm') → renderCRM() → getElementById('content').innerHTML = html
```
All pages: **render fn → innerHTML injection → inline onclick handlers**

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
- **Snapwill**: calls `renderCaseDetail({...c, category:'snapwill'}, contact)` ← override needed (bug fix)

---

## Multi-Category Cases

Cases can belong to multiple categories (e.g. Claims + Snapwill):
```js
{
  category: 'claims',              // primary category — drives status steps
  categories: ['claims','snapwill'] // all categories — determines which pages show it
}
```

`getCases('snapwill')` returns cases where `c.category === 'snapwill'` OR `c.categories.includes('snapwill')`.

**Known issue:** When viewing a multi-category case from the Snapwill page, `renderCaseDetail` uses `c.category` (primary = 'claims'), so shows Claims steps. Fix: `renderCaseDetail({...c, category:'snapwill'}, contact)` in `openSnapwillCase()`.

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

**`backdrop-filter` causes headless renderer hangs** — always use `preview_snapshot`

---

## ALPP Integration

### Pass 1 + 2 — Personal enrichment
```
processALPPEnrichment(records)   ← crm.js
  Input: [{policyNo, owner, phone, email, nric, dob, gender, nationality, occupation, employer}]
  → match by owner name (case-insensitive)
  → fill EMPTY fields only (never overwrite)
  → saveDB()
```

### Pass 3 — Plan details (NEW)
```
processALPPPass3(records)        ← crm.js
  Input: [{policyNo, owner, insured, planName, sumAssured, annualPremium, policyStatus, commencedDate, allPlans[], _pass:3}]
  → group by owner name
  → add/merge aiaPolicies[] on contact (no duplicates)
  → add 'AIA' to existingInsurance[] if not present
  → saveDB()

Auto-detection: enrichFromALPPFile() checks arr[0]._pass === 3 || 'planName' in arr[0]
```

### ALPP Scraper Pattern (Chrome MCP injection)
```js
// window._step self-scheduling (survives Angular route changes)
window._step = function() {
  // fill #ContentPlaceHolder1_txtPolNo
  // click #ContentPlaceHolder1_btnEditSearch
  // wait for plan table: /[A-Z]{2,4}\d\s+[\w][\w\s\-]+\n/ in innerText
  // extract with regex (confirmed working on new alpp_v2/pos/ portal)
  // save to localStorage['alpp_p3']
  // setTimeout(window._step, 3000)
}
```
