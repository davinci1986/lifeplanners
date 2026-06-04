# DEVELOPMENT_RULES.md — LifePlanner Pro

## Coding Standards

- **Vanilla JS only** — no frameworks, no bundlers, no npm, no TypeScript
- **Template literals** for all HTML generation — never use createElement() for complex UI
- **escHtml()** on every piece of user-provided data before innerHTML injection — no exceptions
- **No comments** unless the WHY is non-obvious (hidden constraint, workaround, invariant)
- **No abstraction beyond what's needed** — three similar lines is fine, don't extract prematurely
- **No error handling for impossible scenarios** — trust internal code; validate only at boundaries

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Functions | camelCase | `renderContactCard()`, `saveContact()` |
| Variables | camelCase | `crmSearch`, `displayContacts` |
| Constants | UPPER_SNAKE | `CRM_IMPORT_COL_MAP`, `DEFAULT_CRM_OPTIONS` |
| CSS classes | kebab-case | `.contact-card`, `.crm-list-row` |
| CSS variables | --kebab-case | `--glass-blur`, `--accent-glow` |
| IDs | camelCase | `contactModalBody`, `soundToggleBtn` |
| DB fields | camelCase | `existingInsurance`, `stayArea` |
| File names | kebab-case | `app.css`, no file naming needed for JS (already set) |

---

## File Organization Rules

- **One JS file per page/module** — crm.js owns CRM, sales.js owns Sales, etc.
- **data.js** — ONLY data layer functions. No DOM access. No UI.
- **utils.js** — shared UI helpers only. No page-specific logic.
- **sounds.js** — audio only. No data access except `DB.settings.notifySound`.
- **New features in the owning module** — CRM import goes in crm.js, not a new file
- **CSS** — all styles in `app.css`. No inline `<style>` tags. No separate CSS files.

---

## Critical Data Structure Rules

### existingInsurance — ALWAYS an ARRAY
```js
// CORRECT
Array.isArray(contact.existingInsurance)
  ? contact.existingInsurance.filter(Boolean).join(', ')
  : ''

// WRONG — will break on array contacts
contact.existingInsurance.includes('AIA')  // ← TypeError if it's an array
```

### _blastFilter.insuranceFilter — ARRAY (unique exception in blast filter)
```js
// All blast filter fields are strings EXCEPT insuranceFilter which is []
_blastFilter = { gender: '', race: '', ..., insuranceFilter: [] }
// Always clear it with [] not ''
```

### completedSteps[] — drives to-do mode
```js
// currentStatus = max completed step
// completedSteps[] = which steps are checked
// confirmSetStatusWithDate() → toggleStepDone()  (NOT setStatus())
```

---

## HTML Generation Rules

- Always use `escHtml()` on any `contact.name`, `c.label`, user input before inserting into innerHTML
- Inline onclick handlers use single quotes for JS, double quotes for HTML attribute:
  ```html
  onclick="openContact('${contact.id}')"
  ```
- IDs injected into templates must be escaped or guaranteed safe (use uid()-generated IDs)
- Never store large data objects in onclick attributes — use module-level temp variables instead

---

## CSS Rules

- Use CSS variables for all colors, shadows, radii — never hardcode `#007AFF` inline
- Glass effect pattern:
  ```css
  background: var(--glass);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  ```
- Mobile: wrap heavy CSS in `@media (max-width: 768px)` with reduced values
- New component styles go at the BOTTOM of app.css in their own section comment block
- Do not use `!important` except for override specificity issues with existing styles

---

## Sound Rules

- All sound functions check `DB?.settings?.notifySound !== false` before playing (via `_sfx()`)
- Use `_sfx(() => ...)` wrapper for all sounds — never call `playTone()` directly in features
- Sound event delegation is in sounds.js — don't add `playX()` calls in HTML onclick if event delegation already covers it
- For programmatic sounds (save, delete, create) — call explicitly in the function, not via delegation

---

## Error Handling Rules

- `showToast(message, 'error')` for user-visible errors
- `try/catch` around SheetJS (XLSX) and Web Audio API only — they can throw
- Never silently swallow errors in catch blocks — at minimum `console.warn()`
- Do NOT add error handling for internal state that can't realistically fail

---

### DO

- Always call `saveDB()` after any mutation to DB
- Always call `renderCRM()` or `renderCurrentPage()` after data changes
- Always call `updateBadges()` after case status changes
- Use `uid()` for all new IDs
- Use `escHtml()` on ALL user content in templates
- Use `formatDate()` for date display, `formatDOBDisplay()` for DOBs
- Call `playCreate()` after creating records, `playSave()` after updating, `playDelete()` after deleting
- Test on mobile viewport after any layout change

### DON'T

- Don't use `innerHTML +=` (use full re-render or targeted update)
- Don't call `setStatus()` from `confirmSetStatusWithDate()` — use `toggleStepDone()`
- Don't use `document.write()` or `eval()`
- Don't add backwards-compatibility shims for removed features
- Don't add features "just in case" — build only what's requested
- Don't create new JS files — add to the owning module file
- Don't push directly to main without testing locally first
- Don't use `background-attachment: fixed` with complex gradients (causes headless renderer issues)
- Don't use `git push --force`
