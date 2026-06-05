# LifePlanner Pro — Claude Context

**What:** Browser-only CRM + case management for Malaysian AIA insurance agents. No server. localStorage + Google Sheets auto-sync.

**Live:** https://davinci1986.github.io/lifeplanners/
**Local:** `C:\Users\Keith\todo-dashboard\`
**Login:** username=`admin` password=`admin`
**Git:** `git push origin master:main` | `git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "..."`

---

## Stack
Vanilla HTML/CSS/JS · SheetJS CDN · Web Audio API · GitHub Pages · No build step

## Current State (~95%)
- ✅ CRM: 140 contacts, fully enriched (phone, IC, DOB, gender, nationality, occupation, employer)
- ✅ All case modules in **to-do mode** (`completedSteps[]`)
- ✅ Auto-sync: `saveDB()` pushes to Google Sheets; login auto-pulls
- ✅ Security: SHA-256 password hashing, brute-force lockout (5 attempts → 15 min), auto-logout (30 min inactivity)
- ✅ Google login: resilient error handling (still logs in if Sheets API not enabled)
- ✅ ALPP Pass 3 scraper built (`alpp_scraper_pass3.js`) + `processALPPPass3()` import in CRM
- ⚠️ Google Sheets API needs enabling: project `638079686621` → console.cloud.google.com
- ❌ 2 bugs pending fix (see below)

## Immediate Priority
1. Fix Bug #1: Snapwill shows Claims progress for multi-category cases
2. Fix Bug #2: Label picker shows random ID prefix (`mpye0qpq...`) instead of clean label name
3. Enable Google Sheets API → test sync on iPad
4. Complete ALPP Pass 3 scraping (in progress, ~6/199 done)

## Known Bugs (Unfixed)
### Bug #1 — Snapwill shows wrong progress steps
- **Root cause:** `renderCaseDetail(c, contact)` uses `c.category` which is `'claims'` (primary). When a case has `categories: ['claims','snapwill']`, Snapwill detail shows Claims steps.
- **Fix:** In `snapwill.js` `openSnapwillCase()`, pass `{...c, category:'snapwill'}` to `renderCaseDetail`.

### Bug #2 — Label picker shows random ID prefix
- **Root cause:** In `sales.js` `renderNewCaseForm()` line ~130: `${l.id} — ${l.label}` shows the internal UID in the radio button label.
- **Fix:** Change to just `${l.label}` in the radio button display text.

## Must-Know Rules
- `existingInsurance` = **always ARRAY** — `Array.isArray()` before use
- `confirmSetStatusWithDate()` → `toggleStepDone()` **not** `setStatus()`
- `_blastFilter.insuranceFilter` = `[]` not `''`
- Glass CSS: always `var(--glass)` — never hardcode `rgba()`
- `backdrop-filter` hangs headless tools — use `preview_snapshot` not `preview_screenshot`
- `updateSoundBtn()` in `localLogin()` only — not `loadDB()`
- ALPP search button: `#ContentPlaceHolder1_btnEditSearch` — NOT `input[type=submit]` (hits PRINT)

## Before Writing Any Code
Read: `PROJECT_HANDOFF.md` · `ARCHITECTURE.md` · `CLAUDE_MEMORY.md`
