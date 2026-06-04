# DEVELOPMENT_RULES.md — LifePlanner Pro

## Coding Standards

- **ES6+** — use `const`/`let`, arrow functions, template literals, destructuring, optional chaining (`?.`), nullish coalescing (`??`)
- **No frameworks** — vanilla JS only. No React, Vue, jQuery, etc.
- **No build step** — files served as-is. No webpack, Vite, etc.
- **Global scope** — all functions are global (accessible via `onclick="fn()"` in HTML). This is intentional.
- **Async/await** — use for all async operations (Google API calls)
- **Error handling** — wrap all critical async calls in try/catch

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Functions | camelCase | `openEditContact()`, `saveNewCase()` |
| Variables | camelCase | `currentPage`, `salesFilter` |
| Constants (app-wide) | UPPER_SNAKE | `DB_KEY`, `STATUS_DEFS`, `WA_TEMPLATES` |
| CSS classes | kebab-case | `status-step`, `btn-local-signin` |
| CSS variables | `--kebab-case` | `--blue`, `--sidebar-width` |
| HTML element IDs | camelCase | `loginOverlay`, `contactModalBody` |
| Module files | lowercase | `sales.js`, `crm.js`, `aisolution.js` |
| DB keys | snake_case in schema docs; camelCase in JS objects |
| Blast filter state | `_blastFilter`, `_blastSelected`, `_blastTemplate` (underscore prefix = module-private) |

---

## File Organization Rules

- **One module per category** — `sales.js` handles ALL sales rendering and logic
- **Shared utilities in `utils.js`** — anything used by 2+ modules goes here
- **Data layer in `data.js`** — all DB reads/writes, status definitions, custom category CRUD, CRM options, step toggle logic
- **Export in `export.js`** — all Excel export functions, helper functions prefixed with `_`
- **Auth split:** `gauth.js` = Google auth; `app.js` = local auth + router + admin panel
- **CSS is one file** — `app.css` is the only stylesheet. Add new styles at the bottom in clearly labeled sections
- **New features:** add to bottom of relevant module file, never in the middle
- **New module:** create `js/newmodule.js`, add `<script>` tag to `index.html` BEFORE `app.js`, add to `PAGE_MAP` in `app.js`, add to `catMeta()` in `utils.js`, add nav item in `index.html`

---

## Error Handling Rules

```js
// Always check element existence before using
const el = document.getElementById('myEl');
if (!el) return;

// Always validate required inputs
if (!name) { showToast('Please enter a name', 'error'); return; }

// Wrap Google API calls
try {
  const result = await sheetsFetch(url);
} catch (e) {
  console.warn('Sheets error:', e);
  showToast('Sync failed: ' + e.message, 'warning');
}

// Always use optional chaining on case/contact data
const label = c.customStatusLabels?.[stepN] || def.label;
```

---

## Logging Rules

- Use `console.warn()` for non-fatal errors (sync failures, missing data)
- Use `console.error()` for unexpected errors
- Use `showToast()` for user-facing feedback
- Do NOT leave `console.log()` debug statements in production code

---

## API Design Rules (Google Sheets)

- All Sheets operations go through `sheetsFetch(url, options)` in `sheets.js`
- Always include `GAUTH.accessToken` in Authorization header
- Sheet names match keys in `SHEET_DEFS` object exactly
- Append data with `sheetsAppend(sheetName, [[...row]])`
- Read data with `sheetsReadAll(sheetName)` → returns `[[row1...], [row2...]]`

---

## Database Design Rules

- **Never mutate DB arrays directly** — always use CRUD functions (`createCase`, `updateCase`, etc.)
- **Always call `saveDB()`** after any write
- **Always call `ensureDefaults()`** on load to handle missing fields in old data
- **Backward compatible** — new fields get default values, never break old data
- **`uid()`** for all IDs — never use sequential numbers
- **`ownerEmail`** on all new records for role-based filtering
- **Timestamps** — always `new Date().toISOString()` for `createdAt`/`updatedAt`
- **`completedSteps`** must be initialized as `[]` in all new cases — never undefined
- **`existingInsurance`** on contacts is an **ARRAY** — always handle with `Array.isArray()` check
- **`aiSteps`** — each step must have `{id: uid(), n, label, done: false, date: null, remark: ''}`
- **CRM options** — always use `getCRMOptions(field)` not `DEFAULT_CRM_OPTIONS` directly (user may have customised)

---

## Security Rules

- **Escape all user input** before rendering: `escHtml(str)` — NEVER inject raw user strings into innerHTML
- **No eval()** of user data
- **Passwords:** currently plaintext — future: hash before storing
- **Google tokens:** never log, never expose in URLs
- **WhatsApp links:** message content in URL is acceptable (not sensitive insurance data)

---

## Performance Rules

- **Re-render only what changed** — prefer `renderCurrentPage()` over location.reload()
- **Debounce sync** — never call Sheets API on every keystroke
- **`playClick()`** on all interactive elements for immediate feedback
- **Avoid nested loops** on the full DB — pre-filter before rendering
- **SheetJS** — only call `exportToExcel()` on demand, never on page load
- **Blast filter** — `_blastFilterContacts()` is called on every filter change; keep it O(n) not O(n²)

---

## Testing Rules

- **Manual testing via preview server** — Claude Code preview or `npx serve -p 3030 .`
- **Use `preview_eval`** in Claude Code to test functions in browser context
- Before pushing: test login, create a case, open it, tick a step, verify completedSteps
- Test Bulk WhatsApp: select contacts, generate links, verify personalisation
- Test Excel export: click Export Excel, verify file downloads with correct sheets
- **No automated tests** (acceptable for this project size)

---

## DO ✅

- Use `escHtml()` on ALL user-supplied strings in template literals
- Call `updateBadges()` after any case/reminder change
- Call `renderCurrentPage()` after modal closes with data changes
- Use `playSuccess()` on successful saves, `playClick()` on interactions
- Add `event.stopPropagation()` on buttons inside clickable card containers
- Use `todayStr()` for default date values in forms
- Use `formatDate(iso)` for display dates (en-MY locale)
- Check `c.customStatusLabels?.[stepN]` before using default label
- Pass `caseObj` as 3rd arg to `getStatusLabel()` for custom label support
- Use `handleStepClick()` for all status step clicks (to-do mode)
- Use `confirmSetStatusWithDate()` → calls `toggleStepDone()` for modal confirmation
- Use `getCRMOptions(field)` for all CRM dropdown lists (supports user customisation)
- Use `Array.isArray(c.existingInsurance)` before reading insurance field
- Check `typeof XLSX !== 'undefined'` before calling export functions
- Use `_` prefix for private helper functions in export.js (e.g. `_addSummarySheet`)
- Use `blastToggleInsurance(value, checked)` for insurance filter changes
- In `renderBulkWhatsApp()`: read `_blastFilter.insuranceFilter` as array (may be `[]`)

---

## DON'T ❌

- Don't use `innerHTML` with raw unsanitized user strings
- Don't create new functions for things already in `utils.js`
- Don't hardcode category strings — use `catMeta()` for metadata
- Don't call `location.reload()` (loses state) — use `renderCurrentPage()`
- Don't add new `<script>` tags without adding BEFORE `app.js` in index.html
- Don't change `DB_KEY` — it would lose all existing user data
- Don't use `alert()` or `confirm()` — use `showToast()` and `showConfirm()`
- Don't forget `saveDB()` after any DB mutation
- Don't add CSS frameworks (Bootstrap, Tailwind) — use existing design system variables
- Don't create `function navigateTo()` declarations twice (hoisting trap — caused recursive override bug, fixed)
- Don't use `Array.findLastIndex` without fallback — not available in older Safari:
  ```js
  const idx = arr.findLastIndex ? arr.findLastIndex(fn) : arr.map(fn).lastIndexOf(true);
  ```
- Don't treat `case.existingInsurance` as a string — it's now an ARRAY
- Don't treat `case.completedSteps` as undefined — always use `c.completedSteps || []`
- Don't use `currentStatus` as the "active step" in to-do mode — it's the max completed step
- Don't call `setStatus()` for step clicks — use `toggleStepDone()` instead
- Don't render insurance filter as a single `<select>` — it's now multi-select checkboxes
- Don't forget `_blastFilter.insuranceFilter` is an array, not a string — reset with `[]` not `''`
