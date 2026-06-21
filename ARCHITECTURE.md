# ARCHITECTURE — LifePlanner Pro

Current as of 2026-06-21. No server, no backend, no build step.

## File map
```
Browser (Single Page App)
├── index.html              ← Shell: sidebar nav, modals, topbar, all <script> tags
├── css/app.css             ← Glass design system + components
├── alpp_scraper*.js        ← ALPP enrichment scrapers (paused — see ARCHIVE.md)
├── telegram_bot.gs         ← Google Apps Script web app: Telegram bot + AI (Groq) proxy
└── js/
    ├── data.js             ← DB layer: localStorage CRUD, saveDB, status defs, security helpers; loadDB() at end
    ├── app.js              ← Router (PAGE_MAP), login, security (hash/lockout/auto-logout), sync wiring
    ├── utils.js            ← Toast, modals, IC/DOB helpers, renderStatusStep, handleStepClick
    ├── sounds.js           ← Web Audio sounds + toggle
    ├── crm.js              ← CRM, debounced search, sort, Follow-ups tab, Bulk WhatsApp, Excel/ALPP import
    ├── referrals.js        ← Will Referral Network (MLM downline): capture, genealogy tree, dashboard, 3D
    ├── ai.js               ← AI Assistant: proxy call, CRM context, chat, WhatsApp/brief generators
    ├── sales.js            ← Sales + shared renderCaseDetail (claims/servicing reuse it)
    ├── claims.js / servicing.js / onboarding.js   ← to-do mode modules
    ├── recruitment.js      ← to-do mode + own renderRecruitDetail (branch UI)
    ├── snapwill.js / aisolution.js / others.js    ← category modules
    ├── export.js           ← Excel export (SheetJS)
    ├── dashboard.js        ← Dashboard overview (team/charts: later)
    ├── reminders.js        ← Reminders page
    ├── whatsapp.js         ← WhatsApp script generator
    ├── gauth.js            ← Google OAuth + token persistence + login pull/sync hooks
    ├── gdrive.js           ← Google Drive backup
    └── sheets.js           ← Google Sheets sync: shared sheet, pullMyDataFromSheets, mergeMyRows, push

localStorage['lifeplanner_v1']  ← per-device source of truth
Google Sheets (shared)          ← cross-device sync (pull on login, push on saveDB)
Google Drive                    ← backup
Google Apps Script web app      ← Telegram bot + AI proxy (hides Groq key)
GitHub Pages                    ← static hosting
```

## Startup flow
```
index.html loads scripts in order: data.js → utils.js → sounds.js → [page modules incl. crm.js, ai.js]
  → reminders.js → app.js
data.js: loadDB() reads localStorage into DB.
app.js DOMContentLoaded:
  gauthInit() — always (restores Google token from localStorage)
  localAuthInit() — sessionStorage session?
    yes → onLocalAuthReady() → navigateTo('dashboard') → startAutoLogout()
           → await pullMyDataFromSheets() → pullTeamDataFromSheets() → startSheetsSync()
    no  → showLoginScreen()
```

## Sync flow
```
saveDB() → localStorage + gdScheduleSave() (Drive, debounced) + syncLocalToSheets() (Sheets push, if token)

Login (local or Google):
  pullMyDataFromSheets()   // owner-filtered, ALL roles; rebuilds device from the shared sheet
  pullTeamDataFromSheets() // managers' team view
  startSheetsSync()        // begin push-on-save
Shared sheet: DEFAULT_SHARED_SHEET_ID (sheets.js); a device with no stored ID opens it (no duplicate).
mergeMyRows(): keep my-owned + legacy(no-owner) rows; newest updatedAt wins.
Google token: localStorage (persistent) + sessionStorage (fast); cleared on gauthSignOut().
```

## AI Assistant + Telegram bot (Apps Script)
```
Browser (js/ai.js) → fetch exec URL, POST text/plain {ai:true, system, messages, max_tokens}
  (text/plain avoids CORS preflight)
Apps Script doPost(e):
  update.ai === true → handleAIProxy() → Groq /openai/v1/chat/completions
                       (model llama-3.3-70b-versatile, Bearer GROQ_API_KEY) → {ok,text} JSON
  else → Telegram command routing (/due /kiv /summary /search /overdue /priority …)
buildCRMContext() (ai.js): privacy-safe digest — no NRIC, no full phone.
Any Apps Script change requires a manual redeploy (Deploy → Manage deployments → New version).
```

## Identity (merge)
```
currentUserEmail() (data.js) = GAUTH.currentUser?.email || LOCAL_AUTH.currentUser?.email || ''.
Used for record ownerEmail (data.js create*) and Sheets ownership/pull filter (sheets.js).
admin's email is chongwei1986@gmail.com → local admin + Google login = one owner = shared data.
```

## Security
```
Passwords: SHA-256 via SubtleCrypto, 'sha256:'+hex; plaintext auto-upgrades on login.
Brute-force: localStorage['lp_lockout'] {count,username,until}; 5 fails → 15 min.
Auto-logout: 30 min inactivity (mousemove/keydown/click/touchstart) → localLogout()/gauthSignOut().
localLogin() and saveUser() are async.
2FA (Telegram OTP): DB.settings.twoFactor='telegram' (Admin Panel toggle, default off).
  localLogin() → after password ok → startOtpChallenge() → fetch proxy {otp:'send'} →
  showOtpScreen overlay → verifyOtp() {otp:'verify',nonce,code} → completeLocalLogin(user).
  Apps Script handleOtpSend/Verify: 6-digit code in CacheService 'otp_'+nonce (300s), sent to ALLOWED_CHAT_ID.
```

## Render + to-do flow
```
navigateTo('crm') → renderCRM() → #content.innerHTML = html (inline onclick handlers).
CRM list-only repaint: renderCRMList() updates #crmListArea + #crmCount (used by debounced search & sort).

renderStatusStep → completedSteps.includes(n)?
  YES → green checked (click → handleStepClick → uncheck)
  NO  → click → openSetStatusWithDate → confirmSetStatusWithDate
            → toggleStepDone()  (NOT setStatus()) → checkStepAutoReminder()
            → currentStatus = max(completedSteps)
Claims+Servicing share renderCaseDetail (sales.js); Recruitment has its own branch UI;
Snapwill must pass {...c, category:'snapwill'} to renderCaseDetail.
```

## Multi-category cases
```
category = primary (drives steps); categories[] = all (drives page membership).
getCases('snapwill') → c.category==='snapwill' OR c.categories.includes('snapwill').
```

## Components (index.html)
```
#sidebar (static nav, incl. AI Assistant item) · #mainWrapper(.topbar + #content)
#caseModal · #contactModal (also AI WhatsApp/brief tools) · #confirmModal · #crmImportInput (xlsx/csv/JSON)
```

## Design patterns
| Pattern | Usage |
|---|---|
| innerHTML injection | UI as template literal strings |
| Inline onclick | `onclick="fn('${escHtml(id)}')"` |
| DB singleton | `DB` in memory; `saveDB()` persists + syncs |
| escHtml() | all user content escaped |
| var(--glass) | all card/modal backgrounds |

`backdrop-filter` hangs headless renderers — use `preview_snapshot`.

ALPP scraper internals are in `ARCHIVE.md` (paused).
