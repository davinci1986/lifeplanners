# CLAUDE_MEMORY.md — LifePlanner Pro

## The 5 Rules That Will Break Everything If Wrong

```
1. existingInsurance  → ALWAYS ARRAY. Array.isArray() before any use.
2. confirmSetStatusWithDate() → toggleStepDone() NOT setStatus()
3. _blastFilter.insuranceFilter → [] not ''
4. claims/servicing/recruitment → OLD linear mode, no to-do logic yet
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

## Contact Schema (current — data.js)

```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation,
  employer,       // ✅ NEW — Name of Employer from ALPP
  nationality,    // ✅ NEW — from ALPP
  notes, tags[],
  race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],  // ⚠️ ALWAYS ARRAY
  referralSource, socialMedia, createdAt, updatedAt
}
```

---

## ALPP Scraper State

**Script:** `alpp_scraper.js` in project root
**localStorage key:** `alpp_scrape_v3` (Chrome tab on ALPP)
**Progress as of last save:** 49/199 policies done, 32 with phone/email/NRIC
**Status:** Still running in Chrome tab

### Resume Instructions
```
1. Check tab: window._alppStatus  →  { running, done, current }
2. If stopped: paste alpp_scraper.js in console — auto-resumes from localStorage
3. If tab closed: re-login ALPP → any policy detail → paste alpp_scraper.js
```

### Scraper Technical Notes
- Submit method: native value setter + input/change events + Enter keydown + btn.click()
- Wait method: poll until "Please wait" gone AND inp.value === polNo AND POLICY OWNER h5 exists
- ILP policies (A-series like 7XXXXXXA): work fine — have POLICY OWNER h5
- Non-ILP/traditional policies: timeout — different page layout, no POLICY OWNER h5
- 17 timed-out policy numbers saved in SESSION_SUMMARY.md

### ALPP Page Structure (ILP policies)
```
POLICY OWNER: h5
  └── td (contains ALL owner info):
      - Name (2nd line after heading)
      - New NRIC No./Old NRIC No./Passport No.\n{value}
      - DOB:\n{DD MONTH YYYY}
      - Gender:\n{MALE|FEMALE}
      - Nationality:\n{value}
      - Occupation:\n{value}
      - Address\n{multiline}
      - Email:- {value}
      - Mobile Phone: {value}
      - Tel.(Office): {value}
      - Name of Employer:\n{value}  OR  Name Of Employer:\n{value}
```

### CRM Enrichment Button
CRM → **🔄 ALPP Enrich** → select `alpp_enriched_*.json`
- Matches by owner name (case-insensitive)
- Only fills EMPTY fields — never overwrites
- Reports: X contacts updated, Y fields filled

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
- Chrome = read-tier in computer-use — cannot click/type
- Native browser `confirm()` dialogs must be dismissed manually

---

## Pending Work (priority order)

1. ⏳ ALPP scraper completing (running in Chrome) — then import via 🔄 ALPP Enrich
2. Second pass on 17 timed-out policies (non-ILP page layout)
3. Migrate `claims.js` to to-do mode (reference: `sales.js`)
4. Migrate `servicing.js` to to-do mode
5. Migrate `recruitment.js` to to-do mode
6. Team Dashboard: hierarchy + agent stats
7. Dashboard pipeline charts
