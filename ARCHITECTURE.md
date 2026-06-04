# ARCHITECTURE.md — LifePlanner Pro

## High-Level Architecture

```
Browser (Single Page Application)
│
├── index.html          ← Shell: sidebar, modals, topbar, all <script> tags
├── css/app.css         ← Glass design system + all components
├── alpp_scraper.js     ← Standalone browser console tool (not loaded by app)
└── js/
    ├── data.js         ← DB layer: localStorage CRUD, status defs, CRM options
    ├── app.js          ← Router, page orchestration, localLogin
    ├── utils.js        ← Toast, modals, IC/DOB helpers, badges, escHtml
    ├── sounds.js       ← 12 Web Audio API sounds + toggle
    ├── crm.js          ← CRM contacts, Bulk WhatsApp, Excel/ALPP import, employer field
    ├── sales.js        ← Sales cases (to-do mode ✅)
    ├── claims.js       ← Claims (⚠️ old linear mode — needs migration)
    ├── servicing.js    ← Servicing (⚠️ old linear mode — needs migration)
    ├── recruitment.js  ← Recruitment (⚠️ old linear mode — needs migration)
    ├── onboarding.js   ← Onboarding cases (to-do mode ✅)
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

## Status Mode Flows

### To-Do Mode (Sales ✅, Onboarding ✅)
```
renderStatusStep(cs, stepDef, caseId)
  stepDef.n in cs.completedSteps[]?
    YES → green checked step
    NO  → checkbox → confirmSetStatusWithDate()
            → toggleStepDone(caseId, stepN, remark, date)   ← NOT setStatus()
                → toggles stepN in completedSteps[]
                → currentStatus = Math.max(...completedSteps)
```

### Linear Mode (Claims ⚠️, Servicing ⚠️, Recruitment ⚠️ — needs migration)
```
"Next Step" button → advanceCaseStatus(id) → currentStatus += 1
// completedSteps[] NOT used — inconsistent with to-do modules
```

---

## Contact Schema (data.js `createContact`)

```js
{ id, ownerEmail, name, phone, email, nric, dob, occupation,
  employer, nationality,          // ✅ Added — from ALPP enrichment
  notes, tags[], race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],            // ⚠️ ALWAYS ARRAY
  referralSource, socialMedia, createdAt, updatedAt }
```

---

## ALPP Integration Architecture

AIA ALPP (https://www.alpp.aia.com.my) — Angular SPA wrapping ASP.NET WebForms.

```
Scraper flow (alpp_scraper.js — run in Chrome DevTools console):
  1. Start on any ILP policy detail page
  2. Fill #ContentPlaceHolder1_txtPolNo with policy number
     → native value setter + input/change events + Enter key + btn.click()
  3. Wait for "Please wait..." to clear AND inp.value matches AND POLICY OWNER h5 exists
  4. Extract from POLICY OWNER td: name, nric, dob, gender, nationality,
     occupation, employer, address, email, mobile phone, office phone
  5. Save to localStorage['alpp_scrape_v3'] every 10 policies
  6. Auto-download alpp_enriched_YYYY-MM-DD.json when all 200 done

Known limitation: Non-ILP/traditional policies have different page layout —
  no "POLICY OWNER:" h5, so scraper times out. These need a second-pass extractor.

CRM import: crm.js enrichFromALPPFile() → matches owner name → fills empty fields only
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
├── #contactModal   ← Contact detail/form/import preview
├── #confirmModal   ← Yes/no dialog
└── #crmImportInput ← Hidden file input — Excel AND JSON (ALPP enrichment)
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
