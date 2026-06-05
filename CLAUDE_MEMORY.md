# CLAUDE_MEMORY.md — LifePlanner Pro

## The 5 Rules That Break Everything If Wrong

```
1. existingInsurance  → ALWAYS ARRAY. Array.isArray() before any use.
2. confirmSetStatusWithDate() → toggleStepDone() NOT setStatus()
3. _blastFilter.insuranceFilter → [] not ''
4. All case modules in to-do mode (completedSteps[])
5. git push → master:main (not master:master)
```

---

## Architecture Decisions (don't re-debate)

- **Vanilla JS + innerHTML** — no framework. Template literals + `escHtml()` everywhere.
- **One file per module** — no new JS files. New features go in the owning module.
- **DB singleton** — `DB` in memory, `saveDB()` to persist. Always call after mutations.
- **Inline onclick** — `onclick="fn('${id}')"` in templates. No addEventListener for dynamic content.
- **Glass CSS** — `var(--glass)` + `var(--glass-blur)` on all cards/modals. Never hardcode `rgba()`.

---

## Security Layer (NEW — implemented this session)

```js
// Password hashing (SubtleCrypto SHA-256, browser-native)
hashPassword(pwd) → 'sha256:' + hexHash
verifyPassword(input, stored) → bool  // handles both sha256: and legacy plaintext

// Brute-force lockout
localStorage['lp_lockout'] = { count, username, until }
5 failures → 15 min lock → shown to user

// Auto-logout
startAutoLogout() / stopAutoLogout()
30 min inactivity → localLogout() / gauthSignOut()
Called from: onLocalAuthReady(), onAuthReady(), localLogout(), gauthSignOut()

// saveUser() is now async — hashes password before storing
// localLogin() is now async — verifies hash, auto-upgrades plaintext
```

---

## Contact Schema (`data.js` `createContact`)

```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation,
  employer, nationality,       // from ALPP enrichment
  notes, tags[],
  race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],         // ⚠️ ALWAYS ARRAY — insurer names e.g. ['AIA','Prudential']
  aiaPolicies[],               // NEW — AIA policy details from Pass 3
  referralSource, socialMedia, createdAt, updatedAt
}
```

### aiaPolicies[] entry format (from Pass 3)
```js
{
  policyNo, insured, code,
  name,          // plan name e.g. "A-LifeLink"
  status,        // e.g. "In Force - Premium Paying"
  sumAssured,    // e.g. "RM 54,500.00"
  annualPremium  // e.g. "RM 2,400.00"
}
```

---

## To-Do Mode Flow (ALL modules)

```
renderStatusStep(c, stepDef, options)
  completedSteps.includes(stepDef.n)?
    YES → green checked (click to uncheck via handleStepClick)
    NO  → checkbox → handleStepClick → openSetStatusWithDate
              → confirmSetStatusWithDate(caseId, stepN)
                  → toggleStepDone()        ← NOT setStatus()
                  → checkStepAutoReminder() ← fires if step.autoReminder defined
                  → currentStatus = Math.max(...completedSteps)
```

**Recruitment special flow:**
- After step 3: `renderConsiderChoices` → `handleConsiderChoice` → `toggleStepDone`
- Step 5 (Agreed): auto-creates onboarding case via `checkAutoTransfer`
- Step 6 (KIV): `reactivateFromKIV` removes step 6 from completedSteps

---

## Auto-Sync Architecture

```
saveDB()
  → localStorage write
  → gdScheduleSave()           (Google Drive backup)
  → syncLocalToSheets()        (Google Sheets push — if GAUTH.accessToken active)

onLocalAuthReady() [local login]
  → gauthInit() always on DOMContentLoaded
  → restores token from localStorage silently
  → 2s delay → pullTeamDataFromSheets() + startSheetsSync()

Google token: localStorage (persistent) + sessionStorage (fast)
Cleared on: gauthSignOut() clears both
```

**⚠️ REQUIRED:** Enable Google Sheets API in project `638079686621` (gen-lang-client)
URL: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=638079686621

---

## Known Bugs (Pending Fix)

### Bug #1 — Snapwill shows Claims progress
- File: `snapwill.js`, function `openSnapwillCase()`, line ~55
- Cause: `renderCaseDetail(c, contact)` uses `c.category` = `'claims'` for multi-category cases
- Fix: `let body = renderCaseDetail({...c, category:'snapwill'}, contact);`

### Bug #2 — Label shows random ID prefix
- File: `sales.js`, function `renderNewCaseForm()`, line ~130
- Cause: Radio button shows `${l.id} — ${l.label}` where `l.id` is a UID like `mpye0qpq...`
- Fix: Change to `${l.label}` only in the display text

---

## ALPP Scraper — Current State

| Pass | Status |
|---|---|
| Pass 1 (ILP, ~200 policies) | ✅ COMPLETE — 74 contacts created |
| Pass 2 (traditional, 93 policies) | ✅ COMPLETE — scraped via Chrome MCP |
| Targeted (51 name-only contacts) | ✅ COMPLETE — enriched via processALPPEnrichment() |
| **Pass 3 (plan details)** | 🟡 IN PROGRESS — ~6/199 done |

**CRM current:** 140 contacts · 131 with phone · 129 with IC · 131 with occupation

### Pass 3 Scraper Critical Info
- Script: `alpp_scraper_pass3.js` (paste into Chrome DevTools Console on ALPP detail page)
- Chrome MCP: inject via `javascript_tool` using `window._step` pattern
- ALPP now uses new Angular portal: `alpp_v2/pos/#/policy-enquiry-one-glance`
- Policy detail page URL: navigate to Portal → Policy Status Enquiry → search by Policy Number → click result
- Search form: `#ContentPlaceHolder1_txtPolNo` input + `#ContentPlaceHolder1_btnEditSearch` button ✅ confirmed working
- State saved in `localStorage['alpp_p3']` — resumable after interruption
- Import: CRM → 🔄 ALPP Enrich → select JSON → auto-detected as Pass 3 data

### Pass 3 Extraction (confirmed working regex)
```js
// Captures: code, planName, status, sumAssured, annualPremium
/([A-Z]{2,4}\d)\s+([\w\s\-\/\.&]+?)\s*[\n\r]+\s*\(([^)]+)\)[\s\S]*?(\d{1,3}(?:,\d{3})*\.\d{2})\t(\d{1,3}(?:,\d{3})*\.\d{2})/g

// Policy status
/Policy Status\s+(IN FORCE[^\n\r]*|LAPSED[^\n\r]*|...)/i

// Commencement date
/Effective\s+Dt\s*:\s*(\d{1,2}\s+\w+\s+\d{4})/i
```

### Pick main plan = highest annual premium:
```js
const nonZero = allPlans.filter(x => x.annualPremium !== 'RM 0.00');
const mainPlan = nonZero[0] || allPlans[0];
```

### Session watchdog (auto-extend ALPP session):
```js
setInterval(() => {
  const b = [...document.querySelectorAll('button,a')]
    .find(b => /extend|continue|stay/i.test(b.textContent));
  if (b) b.click();
}, 30000);
```

---

## Timing-Sensitive Initializations

```
loadDB()          → runs at bottom of data.js
updateSoundBtn()  → localLogin() in app.js ONLY (not loadDB — sounds.js not loaded yet)
gauthInit()       → always runs on DOMContentLoaded (not gated on local session)
Script load order: data.js → utils.js → sounds.js → [page modules] → app.js
```

---

## Tool Notes (not app bugs)

- `preview_screenshot` hangs on `backdrop-filter` — use `preview_snapshot`
- Chrome MCP tab group is separate from user's Chrome tabs — use `select_browser('9752ede8...')` to connect
- After Chrome MCP reconnects: always call `tabs_context_mcp` + `select_browser` before any tab action
- ALPP `alpp_p3` localStorage key = Pass 3 scraper state
