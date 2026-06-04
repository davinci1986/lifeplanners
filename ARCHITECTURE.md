# ARCHITECTURE.md — LifePlanner Pro

## High Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Pages (CDN)                  │
│            https://davinci1986.github.io             │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │           Browser (Single Page App)          │    │
│  │  HTML/CSS/JS (no build step, no framework)  │    │
│  │                                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │
│  │  │localStorage│  │sessionStorage│  │MemoryState│ │    │
│  │  │ (primary │  │(auth token)│  │  (DB obj)│  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  │    │
│  └─────────────────────────────────────────────┘    │
│              │                   │                   │
└──────────────┼───────────────────┼───────────────────┘
               │                   │
    ┌──────────▼──────┐   ┌────────▼──────────┐  ┌──────────────┐
    │  Google OAuth    │   │  Google Sheets    │  │  SheetJS CDN │
    │  accounts.google │   │  API v4           │  │  xlsx 0.20.3 │
    └─────────────────┘   └───────────────────┘  └──────────────┘
```

**Key Design Principle:** No backend server. Everything client-side. Free forever.

---

## Application Flow

```
Page Load
    │
    ├─ loadDB()          ← parse localStorage → DB object in memory
    ├─ showLoginScreen() ← hide main app, show login overlay
    │
    ├─ localAuthInit()   ← check sessionStorage for saved session
    │     ├─ Found → onLocalAuthReady() → hideLoginScreen() → navigateTo('dashboard')
    │     └─ Not found → gauthInit()   ← try Google OAuth restore
    │
    └─ User types credentials or Google sign-in
          │
          ├─ localLogin()    → validates vs lp_users in localStorage
          │                  → saves to sessionStorage
          │                  → onLocalAuthReady()
          │
          └─ gauthSignIn()   → Google OAuth token
                             → fetch Google profile
                             → onAuthReady() → sheetsEnsureSpreadsheet()
                                            → loadCurrentUserRole()
                                            → hideLoginScreen()
```

---

## Request Flow (Case Creation)

```
User clicks "+ New Case"
    │
    ├─ openNewCase(category) in claims.js → renderNewCaseForm(category)
    │   OR openNewSalesCase() → renderNewCaseForm('sales')
    │   OR openNewAISolutionCase() → renderNewAISolutionForm()
    │                     → openModal('caseModal')
    │
User fills form, clicks "Create Case"
    │
    ├─ saveNewCase('sales', '')          ← shared for most categories
    │   OR saveAISolutionCase('')        ← AI Solution only
    │     ├─ reads name, categories[], label, subLabel, remarks, priority
    │     ├─ findOrCreateContact(name) → DB.contacts[]
    │     ├─ createCase({...data})
    │     │     ├─ generates uid()
    │     │     ├─ completedSteps: []   ← to-do mode
    │     │     ├─ aiSteps: []          ← AI Solution
    │     │     ├─ snapwillTypes: []    ← Snapwill
    │     │     ├─ pushes to DB.cases[]
    │     │     └─ saveDB() → localStorage.setItem(DB_KEY, JSON.stringify(DB))
    │     ├─ showToast(...)
    │     ├─ closeCaseModalBtn()
    │     ├─ updateBadges()
    │     └─ renderCurrentPage()
```

---

## To-Do Step Progress Flow (NEW)

```
User clicks a status step
    │
    ├─ handleStepClick(caseId, stepN, label)     ← in utils.js
    │     │
    │     ├─ step in completedSteps?
    │     │     YES → toggleStepDone(caseId, stepN, '', null)  ← uncheck
    │     │           showToast('Step unchecked')
    │     │           openCaseById(caseId)
    │     │
    │     └─ NO → openSetStatusWithDate(caseId, stepN, label)  ← date picker modal
    │                   │
    │                   └─ confirmSetStatusWithDate(caseId, stepN)
    │                         → toggleStepDone(caseId, stepN, remark, date)
    │                               → completedSteps.push(stepN)   OR remove
    │                               → currentStatus = Math.max(...completedSteps)
    │                               → statusHistory.push({...})
    │                               → updateCase() → saveDB()
```

---

## Authentication Flow

### Local Auth (Primary)
```
Login form → localLogin()
    → getLocalUsers() from localStorage('lp_users')
    → find user by username+password (plaintext)
    → LOCAL_AUTH.currentUser = user
    → sessionStorage.setItem('lp_session', JSON.stringify(user))
    → onLocalAuthReady() → hideLoginScreen() → navigateTo('dashboard')

Logout → localLogout()
    → LOCAL_AUTH.currentUser = null
    → sessionStorage.removeItem('lp_session')
    → showLoginScreen()
```

### Google Auth (Secondary)
```
Google Sign-In → gauthSignIn() → tokenClient.requestAccessToken()
    → gauthOnToken(resp)
        → fetch profile from googleapis.com/oauth2/v2/userinfo
        → GAUTH.currentUser = {email, name, picture}
        → onAuthReady() → sheetsEnsureSpreadsheet() → loadCurrentUserRole()
                        → hideLoginScreen() → refreshSidebarCategories()
```

---

## Authorization Logic

```js
role hierarchy: admin > district_manager > unit_manager > agent

// In navigateTo():
role = LOCAL_AUTH.currentUser?.role || GAUTH.currentUser?.role
nav-admin: visible only if role === 'admin'
nav-team:  visible if role !== 'agent'
```

---

## Database Flow

```
All data lives in memory as global `DB` object (data.js)

On any write:
  updateCase(id, data)
      → DB.cases[idx] = {...existing, ...data, updatedAt: now}
      → saveDB()
          → localStorage.setItem('lifeplanner_v1', JSON.stringify(DB))
          → gdScheduleSave() [debounced, triggers Sheets sync if connected]

On page load:
  loadDB() → localStorage.getItem('lifeplanner_v1')
           → JSON.parse → Object.assign(DB, parsed)
           → ensureDefaults() [fills missing arrays/objects]
```

---

## Business Logic Flow

### Status Step — To-Do Mode
```
toggleStepDone(caseId, stepN, remark, date)
    → c.completedSteps = [...steps]
    → if stepN in steps → REMOVE (uncheck)
    → else → PUSH (check)
    → currentStatus = Math.max(...completedSteps) or 0
    → push histEntry to statusHistory
    → updateCase() → saveDB()
```

### Recruitment → Onboarding Auto-Transfer
```
Recruitment case: completedSteps includes step 5 (Agreed)
    → setStatusWithRemark(id, 5)
    → checkAutoTransfer(c)
        → createCase({ category: 'onboarding', contactId, currentStatus: 1 })
```

### Label Resolution (Bug-Fixed Flow)
```
User types "My Label" + clicks "+ Save":
    addCustomLabel(category, {label: 'My Label'})
        → checks existing by text (case-insensitive)
        → if duplicate → returns existing entry (no new uid)
        → if new → creates {id: uid(), label: 'My Label'}, pushes, saveDB()
    addLabelToCategory() injects radio button with entry.id + auto-selects it

User clicks "Create Case":
    saveNewCase(category, '')
        → labelRadio?.value = 'abc123'  (the uid, not text)
        → label = 'abc123'              (correct ID saved)
```

### Snapwill Customer Types
```
openSnapwillCase(id)
    → body = renderCaseDetail(c, contact)
    → inject Customer Types section (checkboxes from getSnapwillTypes())
    → inject Appointment Details if status 2 or appointment exists

saveSnapwillTypes(caseId)
    → reads checked inputs[name="sw_type"]
    → updateCase(caseId, { snapwillTypes: [...checked] })
```

### AI Solution Steps
```
aiSteps = [{id: uid(), n: 1, label: 'Step', done: false, date: null, remark: ''}]

handleAIStepClick(caseId, stepId, label)
    → if step.done → toggleAIStep(done=false)   ← uncheck
    → else → openAIStepDoneModal() → confirmAIStepDone()
                → toggleAIStep(done=true, date, remark)
                → updateCase() → saveDB()
```

### Bulk WhatsApp Blast
```
User selects contacts (checkboxes) + picks template + clicks Generate
    generateWALinks()
        → forEach _blastSelected contact:
            → personalise msg: replace {name}, {agent}
            → build phone: '6' + phone.replace(/\D/g,'').replace(/^6/,'')
            → url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        → render list of <a href=url> "📱 Send" buttons
        → user clicks each to open WhatsApp Web (zero cost)
```

### Excel Export
```
exportToExcel()
    → XLSX.utils.book_new()
    → _addSummarySheet(wb)     ← overview stats
    → _addContactsSheet(wb)    ← all contacts, 25 fields
    → _addCasesSheet(wb)       ← all cases with progress
    → _addHistorySheet(wb)     ← all statusHistory entries sorted by date
    → _addRemindersSheet(wb)   ← all reminders
    → _addAISolutionSheet(wb)  ← AI Solution step details
    → XLSX.writeFile(wb, filename.xlsx)
```

---

## Component Relationships

```
index.html         ← shell: login overlay, sidebar HTML, modal containers
    │              ← SheetJS CDN script tag
    ├─ gauth.js    ← Google auth
    ├─ sheets.js   ← Google Sheets read/write
    ├─ data.js     ← DB, all CRUD, STATUS_DEFS, getStatusDef() (with global overrides),
    │              ← toggleStepDone(), getSnapwillTypes(), addSnapwillType(),
    │              ← addAIStep(), toggleAIStep(), getCRMOptions(), addCRMOption(),
    │              ← setGlobalStatusDef(), resetGlobalStatusDef()
    ├─ sounds.js   ← playClick(), playSuccess(), playReminder()
    ├─ export.js   ← exportToExcel() and 6 _add*Sheet() helpers
    ├─ utils.js    ← renderCaseRow(), renderStatusStep(), handleStepClick(),
    │              ← confirmSetStatusWithDate() → calls toggleStepDone(),
    │              ← catMeta() (includes aisolution), openCaseById() (includes aisolution),
    │              ← updateBadges() (includes aisolution), refreshSidebarCategories()
    ├─ whatsapp.js ← getWAScript(category, status, name, lang)
    ├─ dashboard.js
    ├─ sales.js    ← renderSales(), renderNewCaseForm(), saveNewCase(), renderCaseDetail()
    │              ← renderCaseDetail() uses completedSteps for isDone/isCurrent
    │              ← branch buttons conditioned on completedSteps.includes(N)
    ├─ claims.js   ← renderClaims(), openClaimsCase(), openNewCase() [SHARED]
    ├─ servicing.js
    ├─ recruitment.js
    ├─ onboarding.js
    ├─ snapwill.js ← renderSnapwill(), openSnapwillCase(), saveSnapwillTypes(),
    │              ← addNewSnapwillType()
    ├─ aisolution.js ← renderAISolution(), openAISolutionCase(), saveAISolutionCase(),
    │                ← handleAIStepClick(), addAIStepInline(), renderAISolutionRow()
    ├─ others.js
    ├─ crm.js      ← renderCRM() [tabbed: Contacts | Bulk WhatsApp],
    │              ← renderContactForm() [extended fields], saveContact() [extended],
    │              ← renderBulkWhatsApp(), WA_TEMPLATES, WA_TEMPLATE_GROUPS,
    │              ← generateWALinks(), blastQuickFilter(), blastToggleInsurance()
    ├─ reminders.js
    ├─ team.js
    └─ app.js      ← PAGE_MAP router (includes aisolution), LOCAL_AUTH, localLogin(),
                   ← renderAdminPanel() [includes builtin category editor],
                   ← renderBuiltinCategoryEditors(), saveBuiltinStep(), addBuiltinStep(),
                   ← removeBuiltinStep(), resetBuiltinCat()
```

---

## Design Patterns Used

1. **Module Pattern** — each JS file is a module (no import/export, global scope via script tags)
2. **Observer-lite** — `saveDB()` triggers side effects (Drive sync, badge update)
3. **Template Strings** — all UI rendered via JS template literals, innerHTML
4. **Single Page App** — `navigateTo(page)` + `PAGE_MAP` as router
5. **Command Pattern** — all user actions are discrete functions called from `onclick`
6. **Strategy Pattern** — `catMeta(category)` returns category-specific metadata
7. **Two-tier status tracking** — `currentStatus` = max done step (display); `completedSteps[]` = actual state

---

## Scalability Considerations

- localStorage limit ~5MB. With 500+ cases + contacts: ~2-3MB fine for small team
- SheetJS Excel export is fully in-memory — with 1000+ cases could be slow
- Bulk WhatsApp: all contacts loaded into memory for filtering — fine for <500
- `_blastSelected` is a global Set — survives tab switches within session

---

## Security Considerations

- Passwords stored in **plaintext** in localStorage `lp_users` (known risk, future: hash)
- No HTTPS enforcement beyond GitHub Pages
- Google OAuth tokens in sessionStorage — cleared on tab close
- `escHtml()` used on all user-supplied strings in template literals
- Role-based filtering is client-side only — a determined user could inspect localStorage
- WhatsApp links include message content in URL — not sensitive, acceptable

---

## Performance Considerations

- 25 JS files loaded synchronously via `<script>` tags
- `renderCurrentPage()` re-renders entire content area on every update
- SheetJS CDN loaded on page load — ~500KB, cached after first load
- `getDueReminders()` scans all reminders every badge update (60s interval)
- `_blastFilterContacts()` scans all contacts on every filter change — acceptable for <500
