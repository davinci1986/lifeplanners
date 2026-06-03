# CLAUDE_MEMORY.md — LifePlanner Pro

## Assumptions

1. **Team size:** ~5-20 people (Keith + agents). localStorage is sufficient for this scale.
2. **Single active session per user:** No real-time collaboration needed. Last write wins.
3. **Keith is always admin** — his email is `chongwei1986@gmail.com`. The default admin user has `username: 'admin'`, `password: 'admin'`.
4. **Malaysia-centric:** Working days calculation skips weekends. Date format is DD/MM/YYYY for display. WhatsApp scripts in EN/中文/BM.
5. **No sensitive data regulations concern** — this is an internal team tool, not a public consumer app.
6. **Users trust each other** — client-side role enforcement is acceptable.

---

## Architectural Reasoning

### Why no backend?
Keith needs the app to remain free forever. GitHub Pages + Google Sheets as backend = zero hosting cost. The tradeoff (no real-time sync, client-side security only) is acceptable for a trusted small team.

### Why localStorage as primary DB?
Works offline, instant reads/writes, no API latency. Google Sheets is the cloud backup, not the primary. This means the app works even when Google auth fails.

### Why vanilla JS + global scope?
No build pipeline = Keith can edit files directly on GitHub web editor if needed. Global scope means `onclick="fn()"` works in dynamically-generated HTML, which is the primary rendering pattern.

### Why two auth systems?
Google OAuth is technically superior but requires Keith to configure a Client ID. Local auth (username/password) is the pragmatic fallback that works immediately. The plan is for the team to use local auth, and Google auth only for the Sheets sync.

---

## Business Decisions

1. **Snapwill is a separate module** — even though it's sales-adjacent, Keith's Snapwill business is distinct from his AIA insurance business and needs separate tracking.
2. **Onboarding is multi-status** — unlike all other modules (which are linear), onboarding requires multiple parallel tracks (exams can happen while training is ongoing).
3. **Auto-transfer Recruitment → Onboarding** — reduces manual work; when a candidate agrees (status 5), a new onboarding case is auto-created.
4. **WhatsApp is primary communication channel** — hence WA scripts in 3 languages on every case. This is Malaysia-specific (WhatsApp dominates).
5. **Labels are separate from categories** — e.g., Claims has labels B1-B5 (types of claims), Servicing has C1-C8. These are sub-types within a category.
6. **KIV (Keep In View)** is a local insurance industry term meaning "pending/hold" — not a generic term. It appears in Sales, Recruitment, and Snapwill.

---

## Design Tradeoffs

| Decision | Tradeoff |
|----------|----------|
| Plaintext passwords | Simple but insecure if device is compromised |
| Global JS functions | Easy onclick handlers but pollutes global namespace |
| innerHTML rendering | Fast but requires escHtml() discipline |
| localStorage primary | Works offline but 5MB limit |
| No bundler | Simpler but 23 script files loaded sequentially |
| Template literals for HTML | Easy to write but no type safety |
| `function` declarations for everything | Hoisting works predictably but caused the duplicate navigateTo bug |

---

## Workarounds

### The navigateTo Override Bug (FIXED)
**Problem:** Two `function navigateTo()` declarations in app.js. Due to JS hoisting, the second one wins, making `_origNavigate = navigateTo` capture the override → infinite recursion.
**Fix:** Removed the override. Inlined the role-based nav visibility check directly into the original `navigateTo()`.
**Rule:** NEVER declare two functions with the same name in global scope.

### GitHub Repo Structure Mismatch
**Problem:** The GitHub repo had files in a `todo-dashboard/` subfolder (from browser uploads), but the local git repo is at that subfolder level. The GitHub Actions workflow deployed from `./todo-dashboard`.
**Fix:** Updated workflow to deploy from `./` (root). Merged using `--allow-unrelated-histories -X ours` to combine the two unrelated git histories without force-push.

### `findLastIndex` Safari Compatibility
`Array.prototype.findLastIndex` is not available in older Safari. Workaround already in `saveStepLabel()`:
```js
const existingIdx = history.findLastIndex ? history.findLastIndex(h => h.toStatus === stepN) : history.map(h=>h.toStatus).lastIndexOf(stepN);
```
Apply this pattern anywhere `findLastIndex` is needed.

---

## Known Risks

1. **Label ID bug** (HIGH) — `addLabelToCategory()` always generates a new `uid()`. When the user saves a case with a label from `DB.customLabels`, the label gets a new random ID each time. Fix: when saving, check if label value already exists in `DB.customLabels[category]` and reuse that entry's ID.

2. **Password security** (MEDIUM) — Passwords stored plaintext. If Keith's PC is compromised, all user passwords are exposed. Should add simple hashing (even MD5 would help) in a future session.

3. **Concurrent session data loss** (LOW) — Two users editing simultaneously will overwrite each other's changes. The last `saveDB()` wins. Acceptable for now.

4. **Module files not using universal renderer** (MEDIUM) — `claims.js`, `servicing.js`, `recruitment.js` still use old inline status step HTML. They don't show the ✏ edit button or inline 🔔. Need to refactor to use `renderStatusStep()` from utils.js.

5. **Google Sheets scope** (MEDIUM) — Need to confirm `https://www.googleapis.com/auth/spreadsheets` is added in Google Cloud Console OAuth consent screen. If not, Sheets sync will silently fail.

---

## Future Plans

1. Convert to PWA (add `manifest.json` + service worker) for mobile install
2. Add bcrypt password hashing
3. Real-time sync via Google Sheets polling (every 30s)
4. Push notifications via Web Push API
5. Policy Summary PDF generation (jsPDF)
6. Commission tracking module
7. Analytics dashboard (recruitment funnel, sales conversion rates)
8. Bulk Excel import for contacts
9. Team chat/notes per case
10. Archive/soft-delete old cases

---

## Hidden Context

1. **"LifePlanner" is an AIA term** — refers to the AIA Life Planner (agent) role. "Be A Life Planner" (BALP) is the entry program for new agents.
2. **RintiZ, Next Gen Millionaire, Next Gen Leader** are AIA recruitment programs. When a candidate agrees to join, Keith selects which program they're on.
3. **PCIL, TBE (A&C), TBE ABC, PRS, General Insurance** — these are Malaysian insurance industry exam names required for agents to be licensed.
4. **Snapwill** is a separate company/product from AIA — a digital will writing app. Keith sells/promotes both.
5. **"Hotlist"** (20 Names Hotlist) is an AIA industry term — new agents must identify 20 potential clients within their first week.
6. **ANP** = Annual New Premium — the monetary value of a closed insurance case.
7. **Working days** in Malaysia = Monday to Friday (no public holiday tracking implemented).
8. **The app was previously managed via browser uploads to GitHub** — hence the messy repo history with files at both root and `todo-dashboard/` subfolder levels.

---

## Lessons Learned

1. **Function hoisting bites** — never have two `function X()` declarations in global scope
2. **Test the preview after every major change** — use `preview_eval` to catch JS errors before push
3. **`--allow-unrelated-histories`** is the right tool for merging repos with different lineages
4. **Force push to default branch is blocked by Claude Code auto-mode** — use merge strategy instead
5. **PowerShell heredocs use `@'...'@`** not bash `<<'EOF'...EOF` syntax
6. **Windows credential manager handles GitHub auth** — no need for PAT in .gitconfig if it's already stored

---

## Things Most Likely To Be Lost In A New Session

1. The **label ID bug** — the root cause is subtle (new uid() always generated in `addLabelToCategory`)
2. The **navigateTo override history** — why it was refactored and the hoisting trap to avoid
3. The **`findLastIndex` Safari workaround** — easy to forget and break Safari users
4. The **repo structure history** — why the workflow deploys from `./` not `./todo-dashboard/`
5. The fact that **`getStatusLabel()` takes 3 args** now (category, status, caseObj) — many call sites may still pass only 2
6. The **interrupted tasks** — Snapwill types, progress to-do mode, AI Solution category, label bug
7. That **`LOCAL_AUTH` must be declared before `navigateTo`** in app.js because navigateTo references it
8. That the **Google Sheets scope** may not be enabled in Cloud Console (unverified)
9. That `DB.customCategories` and `DB.customLabels` are new fields added this session and may be `undefined` in old localStorage data (handled by `ensureDefaults()`)
