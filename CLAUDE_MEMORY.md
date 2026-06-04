# CLAUDE_MEMORY.md — LifePlanner Pro

## Assumptions

- The app is used exclusively by Keith and his AIA insurance agent team in Malaysia
- Data volume is low: <500 contacts, <2,000 cases — no need for pagination or server DB
- Users are non-technical — no error messages with stack traces, always friendly toasts
- Mobile usage is secondary but must work — agents may view contacts on phone
- Privacy is important — no analytics, no third-party tracking, URL is the access control

---

## Architectural Reasoning

### Why vanilla JS (no React/Vue)?
Keith's team has no frontend dev background. The project was started as a simple tool and grew. No build step = easier deployment on GitHub Pages, no dependency hell, Keith can read and modify the code.

### Why localStorage (no Supabase/Firebase)?
Zero cost, zero setup, works offline. For a team of <20 agents, localStorage per-user is sufficient. Google Drive sync provides the cloud backup if needed.

### Why innerHTML injection (not DOM APIs)?
Faster to write complex UIs as template literals. The escHtml() guard prevents XSS. The codebase is already committed to this pattern throughout.

### Why one CSS file?
Simplicity. All components are defined in one place, easy to search, no import issues.

---

## Business Decisions

- **AIA-only branding**: Keith is an AIA agent. The app mentions AIA in insurance dropdowns but is generic enough for other companies.
- **Malaysian language support**: CRM import supports Bahasa Malaysia column names (Nama, No Tel, Bangsa, etc.)
- **Festive WhatsApp templates**: Malay/Chinese/Indian/Christian holidays are all in the Bulk WhatsApp module — reflects Malaysian multicultural market
- **No public registration**: Only Keith can add team members via the Admin Panel

---

## Design Tradeoffs

### Glass design + backdrop-filter
- Beautiful on real browsers (Chrome, Safari, Firefox)
- **BREAKS headless screenshot tools** (preview_screenshot times out) — this is a known tool limitation, NOT a bug in the app
- Mobile blur reduced to 10px to avoid GPU overload on low-end phones

### To-do mode vs linear mode
- **Sales and Onboarding**: to-do mode — user can check/uncheck steps in any order, date+remark per step
- **Claims, Servicing, Recruitment**: still on old linear mode — buttons advance status sequentially
- Reason for inconsistency: to-do mode was added mid-project and not yet backported to all modules

### Inline onclick handlers
- Trade-off: tightly couples template generation with JS function names
- Benefit: much simpler than maintaining event listener registrations for dynamically rendered content
- Risk: function name changes break inline handlers without compile-time errors

---

## Workarounds

### existingInsurance legacy migration
Old contacts created before the array change have `existingInsurance` as a string. `data.js createContact()` normalizes it to array, but UPDATE paths don't always re-normalize. Always use `Array.isArray()` check before any array operation.

### _blastFilter.insuranceFilter as array
All other blast filter fields are strings cleared with `''`. This one is cleared with `[]`. The `blastClearFilters()` function uses:
```js
Object.keys(_blastFilter).forEach(k => _blastFilter[k] = Array.isArray(_blastFilter[k]) ? [] : '');
```
If you ever add a new blast filter field that's a string, the clear function handles it automatically.

### Modal re-use for import preview
The contact modal (`#contactModal`) is reused for the Excel import preview. When `_showImportPreview()` opens it, `contactModalTitle` is set to "📥 Import X Contacts" and `contactModalBody` is replaced with preview HTML. `_importPending` module variable holds the parsed data between preview and confirm.

### Sound system initialization timing
`sounds.js` is loaded AFTER `data.js` in index.html script order. So `updateSoundBtn()` cannot be called from `loadDB()` (sounds.js not yet parsed). It's called instead from `localLogin()` in app.js, which runs after all scripts are loaded.

---

## Known Risks

1. **localStorage quota (~5-10MB)**: At current growth, safe for years. But if users attach base64 images in notes, could fill quickly.
2. **No password hashing**: Passwords in `lp_users` are plaintext in localStorage. Acceptable for internal team tool with no sensitive financial data.
3. **No offline sync conflict resolution**: If two users edit the same contact offline then sync to Drive, last-save wins via `_lastSaved` timestamp.
4. **Glass CSS on older Android browsers**: `backdrop-filter` not supported on older Chrome for Android (<76). Cards will look flat (white), not broken.
5. **Import date formats**: Excel date cells parsed as JS Date objects (handled), but string dates like "15/06/1990" not auto-converted — DOB from IC auto-fill is the workaround.

---

## Future Plans (from Keith's direction)

- Charts/graphs on dashboard (Keith mentioned "advanced charts")
- Team dashboard with hierarchy and agent performance stats
- Mobile-first redesign (bottom tab bar)
- Dark mode
- Possibly integrate with AIA's actual system APIs in future

---

## Hidden Context

- The `NEW_SESSION_BOOTSTRAP.md` in the project root contains the exact prompt to paste into a new Claude Code session — always update this file when major features change
- Git commit author must be: `git -c user.name="Keith" -c user.email="chongwei1986@gmail.com"`
- Push command: `git push origin master:main` (local branch is `master`, remote is `main`)
- After pushing, GitHub Pages takes 1–2 min to deploy. Users need Ctrl+Shift+R (hard refresh) to see changes.
- The `todo-dashboard/todo-dashboard/` nested copy exists — always work in `C:\Users\Keith\todo-dashboard\` (the outer one with the live files)
- SheetJS CDN: check `typeof XLSX !== 'undefined'` before any Excel operations

---

## Things Most Likely To Be Lost In A New Session

1. **existingInsurance is an ARRAY** — most likely gotcha for any new code touching insurance data
2. **confirmSetStatusWithDate() calls toggleStepDone() NOT setStatus()** — critical, will break to-do mode if reverted
3. **_blastFilter.insuranceFilter is [] not ''** — easy to accidentally reset to string
4. **claims.js, servicing.js, recruitment.js are NOT yet on to-do mode** — don't add to-do logic there without full migration
5. **Push is master:main** — not master:master or main:main
6. **backdrop-filter causes screenshot timeouts in preview tool** — not a real browser issue
7. **_importPending module variable** in crm.js holds Excel import state between preview and confirm steps
8. **Sound system initialization order** — updateSoundBtn() called from localLogin() not loadDB()
9. **Glass design vars** — --glass, --glass-blur, --glass-border, --glass-shadow, --accent are defined in :root and used throughout; don't use hardcoded rgba() values
10. **Gender field** in contact form — was added in a prior session; verify `renderContactForm()` includes the gender dropdown before touching that function
