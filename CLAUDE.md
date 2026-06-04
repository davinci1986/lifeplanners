# LifePlanner Pro — Claude Context

**What:** Browser-only CRM + case management for Malaysian AIA insurance agents. No server. localStorage + optional Google Drive sync.

**Live:** https://davinci1986.github.io/lifeplanners/
**Local:** `C:\Users\Keith\todo-dashboard\`
**Login:** username=`admin` password=`admin`
**Git:** `git push origin master:main` | `git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "..."`

---

## Stack
Vanilla HTML/CSS/JS · SheetJS CDN · Web Audio API · GitHub Pages · No build step

## Current State (~85%)
- ✅ CRM: contacts, Bulk WhatsApp, Excel import/export, Glass design, 12 sounds
- ✅ CRM: `employer` + `nationality` fields added to schema, form, detail view
- ✅ CRM: `🔄 ALPP Enrich` button — reads `alpp_enriched_*.json` → updates contacts
- ✅ `alpp_scraper.js` — browser console scraper, 49/199 done, running in Chrome
- ✅ Sales + Onboarding: to-do mode (`completedSteps[]`)
- ❌ Claims, Servicing, Recruitment: still old linear mode — next priority
- ❌ Team Dashboard, pipeline charts: not started

## Immediate Priorities
1. **ALPP scraper** — still running in Chrome tab (49/199 done). When complete, use `🔄 ALPP Enrich` in CRM to import. See CLAUDE_MEMORY.md for resume instructions.
2. Migrate `claims.js` → to-do mode (reference: `sales.js`)
3. Migrate `servicing.js` + `recruitment.js` → to-do mode

## Must-Know Rules
- `existingInsurance` = **always ARRAY** — `Array.isArray()` before use
- `confirmSetStatusWithDate()` → `toggleStepDone()` **not** `setStatus()`
- `_blastFilter.insuranceFilter` = `[]` not `''`
- Glass CSS: always `var(--glass)` — never hardcode `rgba()`
- `backdrop-filter` hangs headless tools — use `preview_snapshot` not `preview_screenshot`
- `updateSoundBtn()` in `localLogin()` only — not `loadDB()`

## Before Writing Any Code
Read: `PROJECT_HANDOFF.md` · `ARCHITECTURE.md` · `DEVELOPMENT_RULES.md` · `CLAUDE_MEMORY.md`
