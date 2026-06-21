# LifePlanner Pro — Claude Context

**What:** Browser-only CRM + case management for a Malaysian AIA insurance agent team. No server, no build step. localStorage + Google Sheets auto-sync. GitHub Pages hosting.

**Live:** https://davinci1986.github.io/lifeplanners/
**Local:** `C:\Users\Keith\todo-dashboard\`
**Login:** `admin` / `admin`
**Git:** local `master` → remote `main`. Push: `git push origin master:main`
Commit: `git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "..."`
(After push: GitHub Pages ~2 min; users Ctrl+Shift+R.)

---

## Stack
Vanilla HTML/CSS/JS (no framework, no bundler) · SheetJS CDN (Excel) · Web Audio API (sounds) · Google OAuth + Sheets + Drive · Google Apps Script (Telegram bot + AI proxy) · GitHub Pages.

## Current State (~98%, in production)
- ✅ CRM: ~143 contacts, 20+ fields, 4 views, search/filter, Excel + ALPP import, Bulk WhatsApp
- ✅ CRM UX overhaul: debounced search, sort dropdown, per-row WhatsApp/call buttons, **Follow-ups tab**
- ✅ All case modules in **to-do mode** (`completedSteps[]`): Sales, Claims, Servicing, Recruitment, Onboarding, Snapwill, AI Solution, Others
- ✅ **Multi-device sync** fixed: shared Sheet ID + pull-on-login for every role (see below)
- ✅ Security: SHA-256 hashing, brute-force lockout (5→15 min), auto-logout (30 min)
- ✅ **Telegram bot** (Apps Script): /due /kiv /summary /search /overdue /priority — deployed & live
- ✅ **AI Assistant** (Groq, free): chat over CRM, WhatsApp drafting, client briefs — Apps Script Version 6, live
- ✅ **Account merge**: local admin + Google = one identity (`currentUserEmail()`) → shared data
- ✅ **Will Referral Network** (`referrals.js`): MLM-style downline from will-named people; tree + dashboard + 3D
- ✅ **Telegram OTP 2FA** (admin toggle, default OFF): server-generated code via Telegram on login

## Architecture (key facts)
- **Multi-device:** all devices open one shared Google Sheet (`DEFAULT_SHARED_SHEET_ID` in `sheets.js`). On login: `pullMyDataFromSheets()` (owner-filtered, all roles) → then `startSheetsSync()`. `saveDB()` pushes up.
- **AI Assistant:** browser → Apps Script web app (`?ai=true` POST) → Groq API. Key hidden server-side. Code in `js/ai.js` + `telegram_bot.gs` `handleAIProxy()`.

## Must-Know Rules
- `existingInsurance` & `aiaPolicies` = **always ARRAY** — `Array.isArray()` before use
- `confirmSetStatusWithDate()` → `toggleStepDone()` **not** `setStatus()`
- `_blastFilter.insuranceFilter` = `[]` not `''`
- Glass CSS: always `var(--glass)` — never hardcode `rgba()`
- Inline `onclick` in template literals; `escHtml()` all user content
- `saveDB()` after every mutation; `saveUser()` / `localLogin()` are async (hashing)
- `backdrop-filter` hangs headless tools — use `preview_snapshot` not `preview_screenshot`

## Before Writing Code
Read: `PROJECT_HANDOFF.md` · `ARCHITECTURE.md` · `CLAUDE_MEMORY.md`. Obsolete detail (ALPP scrapers) is in `ARCHIVE.md`.
