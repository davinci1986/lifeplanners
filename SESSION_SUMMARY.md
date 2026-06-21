# SESSION_SUMMARY — LifePlanner Pro
**Current state as of 2026-06-21.** (Not a history log — this reflects where the project stands now.)

---

## Where the project is
In production at https://davinci1986.github.io/lifeplanners/, ~98% complete. Recent work delivered: multi-device sync fix, CRM usability overhaul, Telegram bot, and an AI Assistant (Groq, free).

---

## Recently completed & live
1. **Multi-device sync** (`sheets.js`, `gauth.js`, `app.js`)
   - All devices open one shared Sheet: `DEFAULT_SHARED_SHEET_ID = '1yqD5ypEvsRjPim3iAnyMFmNRQPIjFfwAc9MacHZHGYE'`.
   - `pullMyDataFromSheets()` — pulls the logged-in user's own contacts/cases/reminders on **any role** (agents no longer blocked). `mergeMyRows()` merges by-owner + legacy rows, newest-by-timestamp wins.
   - Login flow now: `await pullMyDataFromSheets()` → `pullTeamDataFromSheets()` → `startSheetsSync()` (pull-first, then push). Fixes "contacts missing on other device".

2. **CRM UX overhaul** (`crm.js`)
   - Debounced search `crmSearchInput()` (180 ms) → `renderCRMList()` repaints only the list, not the whole page.
   - Sort dropdown (`crmSort`: name / newest / birthday). Per-row 📱 WhatsApp + 📞 call buttons.
   - **Follow-ups tab**: due reminders + stale cases (`CRM_STALE_DAYS = 14`, `getStaleCasesList()`) + upcoming birthdays, with one-tap WhatsApp. `getFollowUpCount()` feeds the tab badge.

3. **Telegram bot** (`telegram_bot.gs`, Google Apps Script — deployed & live)
   - Webhook `doPost(e)`; commands `/due /reminders /kiv /summary /search /overdue /priority /debug /help`. Dedupe via CacheService. Chat-restricted to Keith's chat ID.

4. **AI Assistant** (`js/ai.js` + `telegram_bot.gs` `handleAIProxy()`) — **Groq, free, LIVE**
   - Sidebar page "AI Assistant" (AI badge). Chat over live CRM data, ✍️ WhatsApp drafting (EN/BM/Chinese), 📋 client briefs, 🎯/🔥/📊 quick prompts.
   - Browser → Apps Script proxy (`?ai=true` POST, text/plain to avoid CORS preflight) → Groq `llama-3.3-70b-versatile`. Key hidden server-side (`GROQ_API_KEY`).
   - Apps Script **deployed (Version 6)** and smoke-tested live (Groq replied through the proxy).

5. **Account merge** (`data.js` `currentUserEmail()`, `sheets.js`) — local **admin** and Google account resolve to one email (`chongwei1986@gmail.com`) for data ownership + Sheets sync, so both logins share one dataset.

6. **Will Referral Network** (`js/referrals.js`, page `referrals`) — capture people named in a will (executor/replacement, beneficiary, guardian/replacement, witnesses, other) per Snapwill case; each becomes a CRM contact with `referredBy` = will owner. Views: genealogy **tree**, **dashboard** (status pipeline + conversion + top referrers), **3D network** (3d-force-graph CDN). Status pipeline: Named→Contacted→Appointment→Client→Not interested.

7. **Telegram OTP 2FA** (`app.js`, `telegram_bot.gs` `handleOtpSend/Verify`) — admin toggle (Admin Panel → Login Security, default OFF). After password, a server-generated 6-digit code (CacheService, 5-min) is sent to Telegram and verified server-side. Live & tested.

---

## Open tasks
| Priority | Task |
|---|---|
| 🔴 Security | Keith to **roll the Groq key** (shown in chat): console.groq.com/keys → delete → create new → paste on line 5 of Apps Script → save → redeploy (Deploy → Manage deployments → ✏️ → New version → Deploy). |
| 🟡 Decide | **ALPP live sync** — Keith asked whether the app can link to the AIA Life Planner Portal. No public API; only viable path is the existing scraper → JSON import, ideally packaged as a **one-click bookmarklet** (Tier A download+import, or Tier B post straight to the Sheet). Awaiting go-ahead. See `ARCHIVE.md`. |
| 🟢 Verify | Confirm two legacy bugs are resolved (Snapwill progress steps; label UID prefix) — see PROJECT_HANDOFF "Known issues to verify". |
| 🟢 Later | Team dashboard hierarchy + pipeline charts (`dashboard.js`). |

---

## Apps Script (shared web app — Telegram bot + AI proxy)
- Project: `https://script.google.com/home/projects/1rUsWl7UOZ-Xj1FFKs_s1mpsmKhc7EdrJmzODhThldiTAfEnDbFNmH2nX/edit`
- Exec URL (used by `js/ai.js` `AI_PROXY_URL_DEFAULT`): `.../macros/s/AKfycbyrmVRrjfjRRsg9rBS0RxbRbG2AwkwsjQOE27dFvy1GgB0A_Vzi4PzsvRUosHBapPKq/exec`
- Constants in the deployed editor: `BOT_TOKEN`, `ALLOWED_CHAT_ID`, `SPREADSHEET_ID`, `GROQ_API_KEY`. (Local `telegram_bot.gs` keeps these blank.)
