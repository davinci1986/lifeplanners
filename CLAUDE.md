# LifePlanner Pro — Claude Context

**What:** Browser-only CRM + case management for Malaysian AIA insurance agents. No server. localStorage + optional Google Drive sync.

**Live:** https://davinci1986.github.io/lifeplanners/
**Local:** `C:\Users\Keith\todo-dashboard\`
**Login:** username=`admin` password=`admin`
**Git:** `git push origin master:main` | `git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "..."`

---

## Stack
Vanilla HTML/CSS/JS · SheetJS CDN · Web Audio API · GitHub Pages · No build step

## Current State (~90%)
- ✅ CRM: contacts, Bulk WhatsApp, Excel import/export, Glass design, 12 sounds
- ✅ CRM: `employer` + `nationality` fields, `🔄 ALPP Enrich` (creates + enriches contacts from JSON)
- ✅ Sales, Onboarding, Claims, Servicing, Recruitment: all in **to-do mode** (`completedSteps[]`)
- ✅ Auto-reminders fire correctly when steps are checked (`checkStepAutoReminder`)
- ✅ ALPP Pass 1 complete: 74 new contacts imported
- ⏳ ALPP Pass 2: `alpp_scraper_pass2.js` ready — 93 remaining policies — **user about to run**
- ❌ Team Dashboard, pipeline charts: not started

## Immediate Priority
1. **ALPP Pass 2** — user runs `alpp_scraper_pass2.js` in Chrome DevTools on ALPP policy detail page → downloads `alpp_enriched_pass2_*.json` → import via 🔄 ALPP Enrich
2. Team Dashboard (hierarchy tree + per-agent stats)
3. Dashboard pipeline charts

## Must-Know Rules
- `existingInsurance` = **always ARRAY** — `Array.isArray()` before use
- `confirmSetStatusWithDate()` → `toggleStepDone()` **not** `setStatus()`
- `_blastFilter.insuranceFilter` = `[]` not `''`
- Glass CSS: always `var(--glass)` — never hardcode `rgba()`
- `backdrop-filter` hangs headless tools — use `preview_snapshot` not `preview_screenshot`
- `updateSoundBtn()` in `localLogin()` only — not `loadDB()`

## Before Writing Any Code
Read: `PROJECT_HANDOFF.md` · `ARCHITECTURE.md` · `DEVELOPMENT_RULES.md` · `CLAUDE_MEMORY.md`
