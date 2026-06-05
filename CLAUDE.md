# LifePlanner Pro — Claude Context

**What:** Browser-only CRM + case management for Malaysian AIA insurance agents. No server. localStorage + Google Sheets auto-sync.

**Live:** https://davinci1986.github.io/lifeplanners/
**Local:** `C:\Users\Keith\todo-dashboard\`
**Login:** username=`admin` password=`admin`
**Git:** `git push origin master:main` | `git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "..."`

---

## Stack
Vanilla HTML/CSS/JS · SheetJS CDN · Web Audio API · GitHub Pages · No build step

## Current State (~93%)
- ✅ CRM: 140 contacts, fully enriched (phone, IC, DOB, gender, nationality, occupation, employer)
- ✅ ALPP Pass 1 + Pass 2 + targeted scrape: ALL COMPLETE
- ✅ All case modules in **to-do mode** (`completedSteps[]`)
- ✅ Auto-sync: `saveDB()` pushes to Google Sheets; login auto-pulls
- ✅ Google token persisted in localStorage (survives browser close)
- ⚠️ Google Sheets API needs enabling: project `638079686621` (gen-lang-client) → console.cloud.google.com
- ❌ Team Dashboard, pipeline charts: not started

## Immediate Priority
1. Enable Google Sheets API in Google Cloud Console → test auto-sync on iPad
2. Team Dashboard (hierarchy tree + per-agent stats)
3. Dashboard pipeline charts

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
