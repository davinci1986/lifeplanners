# CLAUDE_MEMORY.md — LifePlanner Pro

## The 5 Rules That Will Break Everything If Wrong

```
1. existingInsurance  → ALWAYS ARRAY. Array.isArray() before any use.
2. confirmSetStatusWithDate() → toggleStepDone() NOT setStatus()
3. _blastFilter.insuranceFilter → [] not ''
4. All case modules now in to-do mode (completedSteps[])
5. git push → master:main (not master:master)
```

---

## Architecture Decisions (don't re-debate these)

**Vanilla JS + innerHTML** — no framework. Template literals + `escHtml()` everywhere.
**One file per module** — don't create new JS files. New features go in the owning module.
**DB singleton** — `DB` object in memory, `saveDB()` to persist. Always call after mutations.
**Inline onclick** — `onclick="fn('${id}')"` in templates. No addEventListener for dynamic content.
**Glass CSS** — `var(--glass)` + `var(--glass-blur)` on all cards/modals. Never hardcode `rgba()`.

---

## Contact Schema (data.js `createContact`)

```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation,
  employer,       // ✅ from ALPP
  nationality,    // ✅ from ALPP
  notes, tags[],
  race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],  // ⚠️ ALWAYS ARRAY
  referralSource, socialMedia, createdAt, updatedAt
}
```

---

## To-Do Mode (ALL case modules now migrated)

```
renderStatusStep(cs, stepDef, options)
  completedSteps.includes(stepDef.n)?
    YES → green checked row (click to uncheck via handleStepClick)
    NO  → checkbox → handleStepClick → openSetStatusWithDate
              → confirmSetStatusWithDate(caseId, stepN)
                  → toggleStepDone()        ← NOT setStatus()
                  → checkStepAutoReminder() ← fires autoReminder if defined on step
                  → currentStatus = Math.max(...completedSteps)
```

**Modules in to-do mode:** sales ✅ · onboarding ✅ · claims ✅ · servicing ✅ · recruitment ✅

**Recruitment special flow:**
- Steps 1-3: normal checkboxes
- After step 3: `renderConsiderChoices` → `handleConsiderChoice` → `toggleStepDone` (NOT setStatus)
- Step 5 (Agreed): auto-creates onboarding case via `checkAutoTransfer`
- Step 6 (KIV): `reactivateFromKIV` removes step 6 from completedSteps

---

## ALPP Scraper State

| Item | Value |
|---|---|
| Pass 1 | COMPLETE — 199/199 done, 74 contacts created in CRM |
| Pass 2 script | `alpp_scraper_pass2.js` (project root) |
| Pass 2 storage key | `alpp_scrape_pass2` (Chrome localStorage on ALPP tab) |
| Pass 2 target | 93 non-ILP/traditional policies |
| Pass 2 status | User running — not yet complete |

**Resume Pass 2:**
1. Login ALPP → any policy detail page
2. F12 → Console → paste `alpp_scraper_pass2.js` (auto-resumes from localStorage)

**Import result:**
- CRM → **🔄 ALPP Enrich** → select `alpp_enriched_pass2_*.json`
- Matches by name → enriches empty fields OR creates new contact if not found

---

## ALPP Enrich Button — How It Works
- File input `#crmImportInput` is shared between Excel import and ALPP JSON
- `handleCRMImportFile` bails early if file is `.json` (fixed bug)
- `processALPPEnrichment` deduplicates by owner name, enriches matched contacts, **creates new contacts** for unmatched ones
- Names converted to Title Case on creation
- Only fills EMPTY fields — never overwrites existing data

---

## Timing-Sensitive Initializations

```
loadDB()          → runs at bottom of data.js
updateSoundBtn()  → localLogin() in app.js ONLY (not loadDB — sounds.js not loaded yet)
Script load order: data.js → utils.js → sounds.js → [page modules] → app.js
```

---

## Tool Limitations (not app bugs)

- `preview_screenshot` → hangs on `backdrop-filter` CSS — use `preview_snapshot`
- Chrome = read-tier in computer-use — cannot click/type; use Claude-in-Chrome MCP instead
- Chrome MCP cannot reach `alpp.aia.com.my` (DNS issue in MCP tab) — user must run scraper manually

---

## Pending Work (priority order)

1. ⏳ ALPP Pass 2 completing (user running now) → import via 🔄 ALPP Enrich
2. Team Dashboard: hierarchy + agent stats
3. Dashboard pipeline charts
