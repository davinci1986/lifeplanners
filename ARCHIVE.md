# ARCHIVE — LifePlanner Pro

Obsolete / completed detail moved out of the active docs. Kept for reference only — **do not treat as current state.**

---

## ALPP Enrichment (completed / paused)

The CRM was bulk-built and enriched by scraping AIA's agent portal (ALPP). This work is **done** for the current contact set; the Pass 3 plan-detail scraper is **paused** and only worth resuming if Keith wants per-policy plan data on every contact.

| Pass | Status | Result |
|---|---|---|
| Pass 1 (ILP, ~200 policies) | ✅ complete | 74 contacts created |
| Pass 2 (traditional, 93 policies) | ✅ complete | scraped via Chrome MCP |
| Targeted (51 name-only contacts) | ✅ complete | enriched via `processALPPEnrichment()` |
| Pass 3 (plan name / SA / premium) | ⏸ paused | ~6/199 done; `aiaPolicies[]` import path exists |

Scraper files: `alpp_scraper.js`, `alpp_scraper_pass2.js`, `alpp_scraper_pass3.js`.
Import path (still live): CRM → 🔄 ALPP Enrich → select JSON (auto-detects Pass 1/2 vs Pass 3).

### Pass 3 — how to resume
1. ALPP → MY SERVICING → Policy Status Enquiry → search by Policy No → click a result (detail page).
2. F12 Console → paste `alpp_scraper_pass3.js`. State auto-saves to `localStorage['alpp_p3']` (resumable).
3. Search form: `#ContentPlaceHolder1_txtPolNo` + `#ContentPlaceHolder1_btnEditSearch` (NOT `input[type=submit]` — that hits PRINT).
4. Portal is the Angular `alpp_v2/pos/#/policy-enquiry-one-glance`.

### Pass 3 extraction regex (confirmed working)
```js
/([A-Z]{2,4}\d)\s+([\w\s\-\/\.&]+?)\s*[\n\r]+\s*\(([^)]+)\)[\s\S]*?(\d{1,3}(?:,\d{3})*\.\d{2})\t(\d{1,3}(?:,\d{3})*\.\d{2})/g
// code, planName, status, sumAssured, annualPremium
```
Pick main plan = highest non-zero `annualPremium`. Session watchdog: every 30s click any extend/continue/stay button.

`processALPPPass3()` (crm.js): groups by owner, merges `aiaPolicies[]`, adds 'AIA' to `existingInsurance[]`.

---

## Resolved / superseded notes
- Earlier "~95% complete, 2 pending bugs" milestone is superseded — see active docs for current state.
- `preview_screenshot` hangs on `backdrop-filter` → use `preview_snapshot`. (Tooling note, still true.)
