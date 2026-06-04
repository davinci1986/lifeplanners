# CLAUDE_MEMORY.md — LifePlanner Pro

## Assumptions

1. **Team size:** ~5-20 people (Keith + agents). localStorage is sufficient.
2. **Single active session per user:** No real-time collaboration. Last write wins.
3. **Keith is always admin** — email: `chongwei1986@gmail.com`. Default login: `admin` / `admin`.
4. **Malaysia-centric:** Working days = Mon–Fri. Date format DD/MM/YYYY display. WhatsApp dominates communication. Religious holidays matter for marketing.
5. **No sensitive data regulations concern** — internal team tool, not a public consumer app.
6. **Users trust each other** — client-side role enforcement is acceptable.
7. **"Islam" is the exact string** stored for Muslim contacts' religion. Christmas template uses `blastQuickFilter('religion','Christianity')` — must match exactly.

---

## Architectural Reasoning

### Why no backend?
Free forever on GitHub Pages. Google Sheets = cloud backup. Tradeoff (no real-time sync, client-side security) acceptable for trusted small team.

### Why localStorage as primary DB?
Works offline, instant reads/writes, no API latency. Google Sheets is backup, not primary.

### Why vanilla JS + global scope?
No build pipeline = Keith can edit files directly on GitHub web editor. Global scope makes `onclick="fn()"` work in dynamically-generated HTML (primary rendering pattern).

### Why two auth systems?
Google OAuth is technically superior but requires Keith to configure Client ID. Local auth works immediately. Plan: team uses local auth; Google auth only for Sheets sync.

### Why to-do list mode instead of linear progress?
User feedback: forced sequential steps don't match real insurance workflows. Keith may visit client, close deal (step 5), then backfill earlier steps. Flexibility is key. `completedSteps[]` tracks actual state; `currentStatus` = max done for backward-compatible display.

### Why `existingInsurance` as an array?
Clients often have insurance from multiple companies. Multi-select better reflects reality. Always use `Array.isArray()` check — old contacts may have string value.

---

## Business Decisions

1. **Snapwill is a separate module** — distinct from AIA. Keith sells both.
2. **Onboarding is multi-status** — unlike all other modules (parallel tracks).
3. **Auto-transfer Recruitment → Onboarding** — when candidate agrees (step 5), onboarding case auto-created.
4. **WhatsApp is primary communication** — WA scripts in 3 languages on every case.
5. **Labels are separate from categories** — sub-types within a category (B1-B5 for Claims, etc.).
6. **KIV** = "Keep In View" — Malaysian insurance industry term for pending/hold.
7. **Bulk WhatsApp is zero-cost** — wa.me links open WhatsApp Web with pre-filled message. User clicks each link manually. No API, no cost.
8. **19 WA templates** — grouped as Festive (9) and Sales & Follow-Up (10). Organised in `WA_TEMPLATE_GROUPS` (grouped) and `WA_TEMPLATES` (flat array for backward compat).
9. **Excel export** uses SheetJS CDN — no npm package, no build step. Loaded in index.html.
10. **CRM options are extensible** — all dropdown lists in `DB.settings.crmOptions` override `DEFAULT_CRM_OPTIONS`. Use `getCRMOptions(field)` always.
11. **Global status overrides** — admin can rename built-in category steps. Stored in `DB.globalStatusDefs`. `getStatusDef()` checks this first. `resetGlobalStatusDef()` removes override.

---

## Design Tradeoffs

| Decision | Tradeoff |
|----------|----------|
| Plaintext passwords | Simple but insecure if device compromised |
| Global JS functions | Easy onclick handlers but pollutes global namespace |
| innerHTML rendering | Fast but requires escHtml() discipline |
| localStorage primary | Works offline but 5MB limit |
| No bundler | Simpler but 25 script files loaded sequentially |
| completedSteps[] | Flexible to-do mode but currentStatus now means "max done", not "current active" |
| existingInsurance as array | Accurate multi-company tracking but breaks old string assumptions |
| SheetJS via CDN | No install needed but adds 500KB network request |
| wa.me links | Zero cost but requires manual click per contact |

---

## Workarounds

### The navigateTo Override Bug (FIXED, long ago)
**Problem:** Two `function navigateTo()` declarations. Due to JS hoisting, the second wins → infinite recursion.
**Fix:** Removed the override. Inlined role-based nav visibility check into original.
**Rule:** NEVER declare two functions with the same name in global scope.

### findLastIndex Safari Compatibility
`Array.prototype.findLastIndex` not in older Safari. Workaround:
```js
const idx = arr.findLastIndex ? arr.findLastIndex(fn) : arr.map(fn).lastIndexOf(true);
```
Apply this pattern anywhere `findLastIndex` is needed.

### Insurance Array Migration
Old contacts have `existingInsurance` as a string (e.g. `'AIA'`). New contacts have it as array `['AIA']`.
`createContact` now stores as array. `updateContact` uses spread so old string stays if not updated.
Handle in display: `Array.isArray(c.existingInsurance) ? c.existingInsurance.join(', ') : c.existingInsurance`
Excel export handles this with `_ins(val)` helper.

### `_blastFilter` Mixed Types
`_blastFilter.insuranceFilter` is an ARRAY `[]`, all other filter fields are strings `''`.
`blastClearFilters()` handles this:
```js
Object.keys(_blastFilter).forEach(k => _blastFilter[k] = Array.isArray(_blastFilter[k]) ? [] : '');
```

### GitHub Repo Structure Mismatch (Historical)
The repo had files in `todo-dashboard/` subfolder. Fixed by updating workflow to deploy from `./` (root). Merged using `--allow-unrelated-histories -X ours`.

### Local branch `master` → Remote branch `main`
```powershell
git push origin master:main
```
Always use this command. Never `git push origin master`.

---

## Known Risks

1. **Gender field missing from CRM form** (HIGH) — `DEFAULT_CRM_OPTIONS.genders` exists in data.js but the contact form doesn't have a gender dropdown. `createContact` has `gender: data.gender || ''` but no form field. Quick fix needed.

2. **claims.js, servicing.js, recruitment.js don't use to-do mode** (MEDIUM) — These still use old linear inline HTML. `completedSteps` is ignored for these categories. Steps must be refactored to use `renderStatusStep()` + `handleStepClick()`.

3. **Label bug in old data** (LOW) — Old cases with `label = 'text string'` (not an ID) still exist in localStorage. They work fine but show raw text. On next edit → save, they get resolved to proper ID.

4. **Password security** (MEDIUM) — Plaintext in localStorage. Add hashing in future.

5. **Concurrent session data loss** (LOW) — Two users editing simultaneously: last `saveDB()` wins.

6. **Google Sheets scope** (MEDIUM) — May need `https://www.googleapis.com/auth/spreadsheets` confirmed in Google Cloud Console OAuth consent screen.

7. **SheetJS CDN dependency** (LOW) — If CDN is down, Excel export fails. `exportToExcel()` checks `typeof XLSX !== 'undefined'` and shows toast error.

8. **`currentStatus` meaning change** (MEDIUM) — In to-do mode, `currentStatus` = `Math.max(...completedSteps)`. In old linear mode, it was "current active step". Stats, badges, and `getStatusLabel()` displays may be slightly off for to-do mode cases.

---

## Future Plans

1. Fix gender field in CRM contact form (highest priority quick win)
2. Migrate claims/servicing/recruitment to to-do mode using `renderStatusStep()`
3. PWA manifest + service worker for mobile install
4. bcrypt password hashing
5. Real-time sync via Google Sheets polling (every 30s)
6. Push notifications via Web Push API
7. Policy Summary PDF (jsPDF)
8. Commission tracking module
9. Agent recruitment funnel chart
10. Bulk Excel contact import
11. Team Dashboard flesh out (hierarchy view, agent stats)
12. Archive/soft-delete old cases
13. Scheduled WhatsApp/email reminders
14. Agent performance PDF reports

---

## Hidden Context

1. **"LifePlanner"** is an AIA term — refers to the AIA Life Planner (agent) role. "Be A Life Planner" (BALP) is the entry program for new agents.
2. **RintiZ, Next Gen Millionaire, Next Gen Leader** are AIA recruitment programs.
3. **PCIL, TBE (A&C), TBE ABC, PRS, General Insurance** — Malaysian insurance exam names required for licensing.
4. **Snapwill** — separate from AIA. Digital will writing app. Keith sells/promotes both.
5. **"Hotlist"** (20 Names Hotlist) — AIA industry term. New agents identify 20 potential clients in first week.
6. **ANP** = Annual New Premium — monetary value of a closed insurance case.
7. **Working days** in Malaysia = Monday–Friday (no public holiday tracking).
8. **iCari** = `https://icari.com.my` — Malaysian insurance comparison portal. Keith recommends this to leads.
9. **WA_TEMPLATE_GROUPS** is the grouped structure; **WA_TEMPLATES** is the flat array (flatMap of groups). Both must be kept in sync — the flat array is auto-derived from groups via `.flatMap(g => g.templates)`.
10. **blastQuickFilter(field, value)** sets filter + calls `blastSelectAll()` + `refreshBlast()`. It does NOT auto-switch template — the caller must set `_blastTemplate` before calling refreshBlast().
11. The `_blastSelected` Set persists across CRM tab switches within a session but resets on page reload.
12. `LOCAL_AUTH` must be declared BEFORE `navigateTo` in app.js because navigateTo references it. It IS declared at the top of app.js — don't move it.

---

## Lessons Learned

1. **Function hoisting bites** — never have two `function X()` declarations in global scope
2. **Test the preview after every major change** — use `preview_eval` to catch JS errors before push
3. **`--allow-unrelated-histories`** for merging repos with different lineages
4. **Force push to default branch blocked by Claude Code** — use merge strategy instead
5. **PowerShell heredocs** use `@'...'@` not bash `<<'EOF'...EOF` syntax
6. **Windows credential manager handles GitHub auth** — no need for PAT in .gitconfig
7. **Mixed-type filter state** (`insuranceFilter: []` vs other fields `''`) — always handle with `Array.isArray()` check in `blastClearFilters()`
8. **`existingInsurance` as array** — always check with `Array.isArray()` before `.join()` — old data may be a string
9. **SheetJS `!freeze`** for header row is supported property name (not `!freezePane`)
10. **`blastQuickFilter` then `refreshBlast()`** — the caller must set `_blastTemplate` BEFORE calling `refreshBlast()` or the template won't switch

---

## Things Most Likely To Be Lost In A New Session

1. **Gender field is missing from the contact form** — exists in data defaults but not rendered
2. **`existingInsurance` is now an ARRAY** — breaking change from old string value
3. **`insuranceFilter` in `_blastFilter` is an ARRAY `[]`** — not a string like other filter fields
4. **`completedSteps[]` drives to-do mode** — `currentStatus` = max done, NOT active step
5. **`WA_TEMPLATE_GROUPS` + `WA_TEMPLATES`** both exist — groups for UI, flat for template lookup
6. **`getStatusDef()` checks `DB.globalStatusDefs` first** — built-in categories can be admin-overridden
7. **Local git branch is `master`, remote is `main`** — push with `git push origin master:main`
8. **`handleStepClick()` in utils.js** is the entry point for ALL step clicks — not `openSetStatusWithDate` directly
9. **`confirmSetStatusWithDate()` now calls `toggleStepDone()`** — NOT `setStatus()` (breaking change from old session)
10. **claims.js, servicing.js, recruitment.js** still use OLD linear step rendering — to-do mode NOT yet applied to them
11. **SheetJS CDN** must be loaded in index.html BEFORE all other scripts for export to work
12. **`_ins(val)` helper** in export.js handles both string and array `existingInsurance`
