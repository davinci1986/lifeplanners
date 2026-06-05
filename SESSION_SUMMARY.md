# SESSION_SUMMARY.md — LifePlanner Pro
**Date:** 2026-06-06

---

## Completed This Session

### 1. Security Enhancements (`js/app.js`, `js/gauth.js`)
- **SHA-256 password hashing** — SubtleCrypto (browser-native). Stored as `sha256:hex`. Auto-upgrades plaintext on first login.
- **Brute-force lockout** — 5 failed attempts → 15 min lock. Counter in `localStorage['lp_lockout']`. Shows remaining attempts.
- **Auto-logout** — 30 min inactivity. Resets on any mouse/key/touch event. Works for both local + Google login.
- **Google login resilience** — `onAuthReady()` now wraps Sheets calls in try/catch. Still logs in if Sheets API not enabled (shows warning toast instead of failing silently).
- **Role label fix** — `gauth.js` `getRoleLabel()` now handles both `dm`/`um` (local) and `district_manager`/`unit_manager` (Sheets).

### 2. ALPP Pass 3 — Plan Detail Scraper
- **`alpp_scraper_pass3.js`** — new scraper. Captures: plan name, sum assured, annual premium, total premium, policy status, commencement date for all ~199 unique policies.
- **`processALPPPass3()`** in `crm.js` — imports Pass 3 JSON. Groups by owner, adds `aiaPolicies[]` to contact. Auto-detects Pass 3 data on import (checks for `planName` field).
- **Contact detail view** — new "AIA Policies" table section shown when `aiaPolicies[]` is populated.
- **`aiaPolicies[]`** added to `createContact` defaults in `data.js`.
- **Portal discovery** — ALPP upgraded to new Angular portal (`alpp_v2/pos/`). Scrapers still work: `#ContentPlaceHolder1_txtPolNo` + `#ContentPlaceHolder1_btnEditSearch` exist on detail page.
- **Extraction regex confirmed working:**
  ```js
  /([A-Z]{2,4}\d)\s+([\w\s\-\/\.&]+?)\s*[\n\r]+\s*\(([^)]+)\)[\s\S]*?(\d{1,3}(?:,\d{3})*\.\d{2})\t(\d{1,3}(?:,\d{3})*\.\d{2})/g
  ```
  Captures: plan code, plan name, status, sum assured, annual premium per plan.

### 3. Pass 3 Scraper — In Progress
- Injected `window._step` scraper into Chrome MCP tab (34068521)
- ~6/199 policies scraped before session interrupted
- State saved in `localStorage['alpp_p3']` on ALPP domain
- Partial downloads every 25 policies; final download auto on completion

---

## Bugs Identified (NOT YET FIXED)

### Bug #1 — Snapwill shows Claims progress steps
- **Where:** `snapwill.js` `openSnapwillCase()` line 55
- **Cause:** `renderCaseDetail(c, contact)` uses `c.category` = `'claims'`. Multi-category cases (claims+snapwill) show Claims steps in Snapwill view.
- **Fix:** Pass `{...c, category:'snapwill'}` to `renderCaseDetail` in `openSnapwillCase`.

### Bug #2 — Label picker shows random ID prefix
- **Where:** `sales.js` `renderNewCaseForm()` ~line 130
- **Cause:** Radio button label text is `${l.id} — ${l.label}`. IDs are UIDs like `mpye0qpqscm0n`.
- **Fix:** Change display to just `${l.label}`.

---

## Pending Next Session

| Priority | Task |
|---|---|
| 🔴 Fix now | Bug #1: Snapwill progress (snapwill.js line 55) |
| 🔴 Fix now | Bug #2: Label ID prefix (sales.js ~line 130) |
| 🔴 Keith action | Enable Sheets API: [console.cloud.google.com](https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=638079686621) |
| 🟡 Resume | ALPP Pass 3 scraping — restart `window._step` in ALPP tab, inject from `alpp_scraper_pass3.js` |
| 🟡 Build | Team Dashboard: hierarchy tree + per-agent stats (`dashboard.js`) |
| 🟡 Build | Pipeline charts: bar chart + conversion rate (`dashboard.js`) |
| 🟢 Later | Security: DB encryption, auto-logout on Google session expiry |
