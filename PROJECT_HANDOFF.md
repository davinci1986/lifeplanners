# PROJECT_HANDOFF — LifePlanner Pro

Reflects **current state (2026-06-21)**. Obsolete ALPP scraper detail lives in `ARCHIVE.md`.

## What it is
Browser-only CRM + case management for Keith's AIA insurance agent team in Malaysia. No server, no build step. localStorage is the per-device source of truth; Google Sheets provides cross-device sync; Google Drive provides backup. Hosted on GitHub Pages.

**Live:** https://davinci1986.github.io/lifeplanners/
**Local:** `C:\Users\Keith\todo-dashboard\`
**Login:** `admin` / `admin`
**Git:** local `master` → remote `main`. Push `git push origin master:main`; commit with `git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "..."`. GitHub Pages ~2 min; users Ctrl+Shift+R.

---

## Tech stack
| Layer | Detail |
|---|---|
| Language | Vanilla HTML/CSS/JS — no framework, no bundler |
| Data | `localStorage['lifeplanner_v1']` — single JSON object |
| Auth | Local username/password (SHA-256) + Google OAuth |
| Cloud sync | Google Sheets (`gauth.js` + `sheets.js`) — shared sheet, all devices |
| Backup | Google Drive (`gdrive.js`) |
| Excel | SheetJS CDN |
| Bot + AI | Google Apps Script web app (`telegram_bot.gs`) — Telegram bot + Groq AI proxy |
| Hosting | GitHub Pages (static) |

---

## Status: ~98%, in production

### ✅ Done & live
- CRM: ~143 contacts, 20+ fields, 4 view modes, search/filter, Excel + ALPP import, Bulk WhatsApp.
- CRM UX overhaul: debounced search, sort dropdown, per-row WhatsApp/call buttons, **Follow-ups tab** (due reminders + stale cases + birthdays).
- All case modules in to-do mode (`completedSteps[]`): Sales, Claims, Servicing, Recruitment, Onboarding, Snapwill, AI Solution, Others.
- Auto-reminders fire on step completion; 12 Web Audio sounds; glass design system.
- Multi-device sync (shared sheet + pull-on-login for every role).
- Security: SHA-256 hashing, brute-force lockout, auto-logout.
- Telegram bot (Apps Script) — deployed.
- AI Assistant (Groq, free) — Apps Script Version 6, live and smoke-tested.
- Account merge — local admin + Google = one identity (`currentUserEmail()`), shared data.
- Will Referral Network (`referrals.js`) — MLM downline from will-named people; tree + dashboard + 3D.
- Telegram OTP 2FA — admin toggle (default off); server-generated code via Telegram on login.

### ⏳ / open
- **Roll the Groq key** (shown in chat) → re-paste in Apps Script → redeploy.
- **ALPP live sync** decision (no public API; scraper→import only — best as a one-click bookmarklet).
- Verify two legacy bugs (below). Team dashboard charts (later).

---

## Multi-device sync architecture
```
Login (local or Google)
  → restore Google token from localStorage (silent)
  → await pullMyDataFromSheets()      // owner-filtered, ALL roles; rebuilds device from cloud
  → await pullTeamDataFromSheets()    // team/managers view
  → startSheetsSync()                 // begin push-on-save
saveDB() → localStorage + gdScheduleSave() (Drive) + syncLocalToSheets() (Sheets push)
```
- **Shared sheet:** `DEFAULT_SHARED_SHEET_ID = '1yqD5ypEvsRjPim3iAnyMFmNRQPIjFfwAc9MacHZHGYE'` (in `sheets.js`). A fresh device with no stored Sheet ID opens this one — never creates a duplicate.
- `mergeMyRows(collection, rows, converter, myEmail)` merges only rows owned by the current user (or legacy no-owner rows); newest `updatedAt` wins.
- Requires Google Sheets API enabled on the linked Cloud project.

## AI Assistant + Telegram bot (Apps Script)
- One Apps Script web app serves both. `doPost(e)`: if `update.ai === true` → `handleAIProxy()`; else Telegram routing.
- **AI proxy:** `handleAIProxy()` calls Groq `https://api.groq.com/openai/v1/chat/completions`, model `llama-3.3-70b-versatile`, system prompt + messages from the browser, key from `GROQ_API_KEY`. Returns `{ok, text}` as JSON.
- **Front-end** (`js/ai.js`): `aiProxyCall()` POSTs `text/plain` (avoids CORS preflight) to the exec URL. `buildCRMContext()` makes a privacy-safe digest (no NRIC/full phone). Features: chat, `aiGenerateWhatsApp()`, `aiGenerateSummary()`, quick prompts. Page `renderAIAssistant()` registered in `app.js` `PAGE_MAP` as `aiassistant`; nav item in `index.html`; script tag before `reminders.js`.
- **Telegram:** commands `/due /reminders /kiv /summary /search /overdue /priority /debug /help`; CacheService dedupe; restricted to `ALLOWED_CHAT_ID`.
- Project edit URL and exec URL: see SESSION_SUMMARY.

---

## Database
**Key:** `localStorage['lifeplanner_v1']`
**Shape:** `{ contacts[], cases[], reminders[], settings{}, customCategories[], customLabels{}, globalStatusDefs{} }`

### Contact
```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation, employer, nationality,
  notes, tags[], race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],   // ⚠️ ALWAYS ARRAY — insurer names
  aiaPolicies[],         // ALWAYS ARRAY — [{policyNo, insured, planName, sumAssured, annualPremium, policyStatus, commencedDate}]
  referralSource, socialMedia, createdAt, updatedAt
}
```
### Case
```js
{
  id, ownerEmail, contactId, contactName,
  category,          // primary: sales|claims|servicing|recruitment|onboarding|snapwill|aisolution|others
  categories[],      // all selected (multi-category)
  label, subLabel, currentStatus,   // currentStatus = max(completedSteps)
  completedSteps[],  // int[] — to-do mode
  statusHistory[], remarks, reminders[], priority, kiv, followUp,
  premiums[], customFields{}, createdAt, updatedAt
}
```

---

## Status definitions
- **Sales (8):** Approached → Fact-Finding → Policy Summary → Closing Appointment → Closed/Proposed → Cementing Session → Ask for Referrals → KIV Listing
- **Claims (10):** Ask Receipts → Pending Submission → Submitted (autoReminder 7d) → Checked Status → Checking Again → Pending Memo → Send Requirement → Submit Memo → Pending Memo Follow-Up (7d) → Claim Completed
- **Servicing (9):** Fill Forms → Send Link → Reminder to Approve → Check Status (7d) → Pending Memo → Send Requirement → Submit Memo → Pending Memo Follow-Up (7d) → Status Approved
- **Recruitment (6):** Approached → Fact-Finding → Closing Appointment → Candidate Consider (3d) → Candidate Agreed → Candidate KIV
- **Onboarding (9):** Key in BALP (90d) → Arrange Exam → 20 Names Hotlist (5d) → Training → Policy Review → Fieldwork → Fieldwork Closed → Exam Complete → Completed

---

## To-do mode flow (all modules)
```
renderStatusStep(c, stepDef, options)
  completedSteps.includes(stepDef.n)?
    YES → green checked → click unchecks (handleStepClick)
    NO  → click → openSetStatusWithDate → confirmSetStatusWithDate
              → toggleStepDone(caseId, stepN, remark, date)   // NOT setStatus()
                  → toggles completedSteps[]; currentStatus = max(completedSteps)
                  → checkStepAutoReminder()
```
- Claims + Servicing share `renderCaseDetail` from `sales.js`.
- Recruitment: own `renderRecruitDetail`; step 5 (Agreed) auto-creates an onboarding case (`checkAutoTransfer`); step 6 (KIV) `reactivateFromKIV`.
- Snapwill: must call `renderCaseDetail({...c, category:'snapwill'}, contact)` so multi-category cases show Snapwill steps.

---

## Security
```
Passwords: 'sha256:' + hex (SubtleCrypto). Plaintext auto-upgrades on first login.
Brute-force: localStorage['lp_lockout'] = {count, username, until}; 5 fails → 15 min.
Auto-logout: 30 min inactivity (mousemove/keydown/click/touchstart reset). → localLogout()/gauthSignOut().
hashPassword(), verifyPassword(), startAutoLogout(), stopAutoLogout(). saveUser()/localLogin() are async.
```

---

## Critical rules
| Rule | Detail |
|---|---|
| `existingInsurance`, `aiaPolicies` | Always ARRAY — `Array.isArray()` first |
| `_blastFilter.insuranceFilter` | `[]` not `''` |
| `confirmSetStatusWithDate()` | calls `toggleStepDone()` NOT `setStatus()` |
| `saveDB()` | after every mutation (also pushes to Sheets + Drive) |
| Glass CSS | `var(--glass)` always; never hardcode `rgba()` |
| New features | go in the owning module — no new JS files unless a genuinely new surface (e.g. `ai.js`) |
| Git branch | local `master` → remote `main` (`master:main`) |
| Working dir | `C:\Users\Keith\todo-dashboard\` — not a nested copy |

---

## Known issues to verify
These were logged earlier and may already be fixed — confirm before re-fixing:
1. **Snapwill progress steps** — multi-category (claims+snapwill) case may show Claims steps in the Snapwill view. Fix if present: `renderCaseDetail({...c, category:'snapwill'}, contact)` in `snapwill.js` `openSnapwillCase()`.
2. **Label UID prefix** — new-case label picker may render `${l.id} — ${l.label}` (UID visible). Fix if present: show `${l.label}` only in `sales.js` `renderNewCaseForm()`.

---

## Business context
- Keith = AIA agent, Code A3719, PN PBG CK PARTNERS, Malaysia. (Refer to AIA generically, never brand-specific in client-facing copy.)
- Team roles: `admin` / `dm` / `um` / `agent`.
- Malaysian market: BM import column names; race/religion/langPref fields; festive WhatsApp templates; RM currency.
- Related but **separate** project: marketing site `insurancepro2u.com` (not this repo).
