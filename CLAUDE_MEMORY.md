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

## Contact Schema (data.js `createContact`)

```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation,
  employer, nationality,       // from ALPP enrichment
  notes, tags[],
  race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],         // ⚠️ ALWAYS ARRAY
  referralSource, socialMedia, createdAt, updatedAt
}
```

---

## To-Do Mode Flow (ALL modules)

```
renderStatusStep(cs, stepDef, options)
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

## Auto-Sync (NEW — implemented this session)

```
saveDB()
  → localStorage write
  → gdScheduleSave()           (Google Drive backup)
  → syncLocalToSheets()        (Google Sheets push — if GAUTH.accessToken active)

onLocalAuthReady() [local login]
  → gauthInit() always runs on DOMContentLoaded
  → restores token from localStorage (persists across browser close)
  → 2s after login → pullTeamDataFromSheets() + startSheetsSync()

Google token storage: localStorage (persistent) + sessionStorage (fast)
Clear on: gauthSignOut() clears both
```

**⚠️ REQUIRED:** Google Sheets API must be enabled in Google Cloud project `638079686621` (gen-lang-client)
URL: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=638079686621

---

## ALPP Scraper — Current State

| Pass | Status |
|---|---|
| Pass 1 (ILP, 199 policies) | ✅ COMPLETE — 74 contacts created |
| Pass 2 (traditional, 93 policies) | ✅ COMPLETE — scraped via Chrome MCP |
| Targeted (51 name-only contacts) | ✅ COMPLETE — enriched via processALPPEnrichment() |

**CRM current:** 140 contacts · 131 with phone · 129 with IC · 131 with occupation

### ALPP Scraper Critical Learnings
- Chrome MCP reaches `alpp.aia.com.my` — connect with `select_browser` (Browser 1 = user's Chrome)
- **DO NOT use async loop** — Angular SPA kills JS context after form submit
- **Use `window._step` self-scheduling pattern** with `setTimeout(window._step, 8000)` after each search
- Search button: `#ContentPlaceHolder1_btnEditSearch` — NOT `input[type=submit]` (hits PRINT first)
- Session extension popups: auto-click Extend via watchdog `setInterval` every 30s
- `processALPPEnrichment()` format: `{policyNo, owner, phone, email, nric, dob, gender, nationality, occupation, employer}`

---

## ALPP Enrich Button — How It Works
- `processALPPEnrichment(records)` — matches by owner name (case-insensitive, uppercase trim)
- Fills empty fields only — never overwrites existing data
- Creates new contact if name not matched (Title Case name)
- Can call directly via `javascript_tool` on LifePlanner tab — no file upload needed

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
- ALPP `alpp_t2` localStorage key = targeted scraper state (51 contacts)

---

## Pending Work

| Priority | Task |
|---|---|
| 🔴 NOW | Enable Sheets API → test iPad sync |
| 🟡 NEXT | Team Dashboard: hierarchy + per-agent stats (`dashboard.js`) |
| 🟡 NEXT | Pipeline charts: bar + conversion rate (`dashboard.js`) |
| 🟢 LATER | Security: hash passwords, encrypt DB, brute-force lockout |
| 🟢 LATER | ALPP Pass 3: capture existingInsurance[] plan/premium details |
