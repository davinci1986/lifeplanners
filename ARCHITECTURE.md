# ARCHITECTURE.md — LifePlanner Pro

## High Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Pages (CDN)                  │
│            https://davinci1986.github.io             │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │           Browser (Single Page App)          │    │
│  │                                              │    │
│  │  HTML/CSS/JS (no build step, no framework)  │    │
│  │                                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │
│  │  │localStorage│  │sessionStorage│  │MemoryState│ │    │
│  │  │ (primary │  │(auth token)│  │  (DB obj)│  │    │
│  │  │  cache)  │  │           │  │          │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  │    │
│  └─────────────────────────────────────────────┘    │
│              │                   │                   │
└──────────────┼───────────────────┼───────────────────┘
               │                   │
    ┌──────────▼──────┐   ┌────────▼─────────┐
    │  Google OAuth    │   │  Google Sheets   │
    │  (accounts.google│   │  API v4          │
    │  .com/gsi/client)│   │  (spreadsheets)  │
    └─────────────────┘   └──────────────────┘
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
    ├─ openNewSalesCase() → renderNewCaseForm('sales')
    │                     → openModal('caseModal')
    │
User fills form, clicks "Create Case"
    │
    ├─ saveNewCase('sales', '')
    │     ├─ reads name, categories[], label, subLabel, remarks, priority
    │     ├─ findOrCreateContact(name) → DB.contacts[]
    │     ├─ createCase({...data})
    │     │     ├─ generates uid()
    │     │     ├─ pushes to DB.cases[]
    │     │     └─ saveDB() → localStorage.setItem(DB_KEY, JSON.stringify(DB))
    │     │                 → gdScheduleSave() if Google Drive connected
    │     ├─ showToast(...)
    │     ├─ closeCaseModalBtn()
    │     ├─ updateBadges()
    │     └─ renderCurrentPage()
```

---

## Authentication Flow

### Local Auth (Primary)
```
Login form → localLogin()
    → getLocalUsers() from localStorage('lp_users')
    → find user by username+password (plaintext comparison)
    → LOCAL_AUTH.currentUser = user
    → sessionStorage.setItem('lp_session', JSON.stringify(user))
    → onLocalAuthReady()
        → hideLoginScreen()
        → refreshSidebarCategories()
        → navigateTo('dashboard')

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
        → onAuthReady()
            → sheetsEnsureSpreadsheet()
            → loadCurrentUserRole() (from Users sheet)
            → hideLoginScreen()
            → refreshSidebarCategories()

Logout → gauthSignOut()
    → revoke token
    → sessionStorage.clear()
    → showLoginScreen()
```

---

## Authorization Logic

```js
// Role hierarchy
admin > district_manager > unit_manager > agent

// In navigateTo():
role = LOCAL_AUTH.currentUser?.role || GAUTH.currentUser?.role
nav-admin: visible only if role === 'admin'
nav-team:  visible if role !== 'agent'

// Data visibility (Google Auth path):
filterByAccess(items) {
    if role === 'admin → return all
    if role === 'unit_manager' → return own + direct reports
    if role === 'agent' → return only own (ownerEmail matches)
}
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
  loadDB()
      → localStorage.getItem('lifeplanner_v1')
      → JSON.parse → Object.assign(DB, parsed)
      → ensureDefaults() [fills missing arrays]

Sheets sync (when Google connected):
  Every saveDB() → debounced 3s → sheetsSync()
      → write all contacts, cases, reminders to Google Sheet
```

---

## Business Logic Flow

### Recruitment → Onboarding Auto-Transfer
```
Recruitment case at status 4 (Consider)
    → User clicks "Candidate Agreed"
    → handleConsiderChoice('agreed')
        → setStatus(caseId, 5, remark)
        → checkAutoTransfer(c)
            → createCase({
                category: 'onboarding',
                contactId: c.contactId,
                contactName: c.contactName,
                recruitPrograms: c.recruitPrograms,
                currentStatus: 1
              })
```

### Status Step with Date (new universal flow)
```
User clicks any status step
    → openSetStatusWithDate(caseId, stepN, stepLabel)
        → modal: date picker + remark
        → confirmSetStatusWithDate(caseId, stepN)
            → setStatus(caseId, stepN, remark, customDate)
                → histEntry.date = new Date(customDate).toISOString()
                → updateCase(id, {currentStatus: stepN, statusHistory: [...]})
```

### Custom Category Page
```
createCustomCategory(data)
    → DB.customCategories.push({id: 'cat_'+uid(), name, icon, color, statuses, ...})
    → saveDB()
    → refreshSidebarCategories()
        → inject <a> nav items into #customCatNav
        → PAGE_MAP[catId] = { render: () => renderCustomCategory(catId) }
```

---

## Component Relationships

```
index.html          ← shell: login overlay, sidebar HTML, modal containers
    │
    ├─ gauth.js     ← Google auth, showLoginScreen/hideLoginScreen
    ├─ sheets.js    ← Google Sheets read/write
    ├─ data.js      ← DB object, all CRUD, STATUS_DEFS, custom categories
    ├─ sounds.js    ← playClick(), playSuccess(), playComplete(), playReminder()
    ├─ utils.js     ← renderCaseRow(), renderStatusStep(), catMeta(), toggleSidebar()
    │               ← openQuickReminder(), openEditStepLabel(), openSetStatusWithDate()
    │               ← refreshSidebarCategories(), renderCustomCategory()
    ├─ whatsapp.js  ← getWAScript(category, status, name, lang)
    ├─ dashboard.js ← renderDashboard()
    ├─ sales.js     ← renderSales(), renderNewCaseForm(), saveNewCase(), renderCaseDetail()
    ├─ claims.js    ← renderClaims(), openClaimsCase()
    ├─ servicing.js ← renderServicing(), openServicingCase()
    ├─ recruitment.js ← renderRecruitment(), renderConsiderChoices(), handleConsiderChoice()
    ├─ onboarding.js  ← renderOnboarding(), renderOnboardStatusCard(), multi-status logic
    ├─ snapwill.js  ← renderSnapwill(), openSnapwillCase()
    ├─ others.js    ← renderOthers(), openOthersCase()
    ├─ crm.js       ← renderCRM(), renderContactForm(), onICInput(), onDOBInput()
    ├─ reminders.js ← renderRemindersPage()
    ├─ team.js      ← renderTeamDashboard()
    └─ app.js       ← PAGE_MAP router, LOCAL_AUTH, localLogin(), Admin Panel,
                       renderAdminPanel(), custom category management, KIV/FollowUp pages
```

---

## Design Patterns Used

1. **Module Pattern** — each JS file is a module (no import/export, global scope via script tags)
2. **Observer-lite** — `saveDB()` triggers side effects (Drive sync, badge update)
3. **Template Strings** — all UI rendered via JS template literals, innerHTML
4. **Single Page App** — `navigateTo(page)` + `PAGE_MAP` as router
5. **Command Pattern** — all user actions are discrete functions called from `onclick`
6. **Strategy Pattern** — `catMeta(category)` returns category-specific metadata

---

## Scalability Considerations

- **localStorage limit:** ~5MB per origin. With ~500 cases + contacts, expect ~2-3MB. Should be fine for a small team (10-20 agents) but will hit limits at scale.
- **Google Sheets limit:** 10M cells per sheet. Not a concern.
- **Concurrent users:** No real-time sync between users. Last write wins. For a team of <20 people with low simultaneous use, this is fine.
- **Performance:** All data loaded into memory on page load. With 1000+ cases, initial parse might be slow. Add pagination if needed.

---

## Security Considerations

- **Passwords stored in plaintext** in localStorage `lp_users`. Risk: physical access to device exposes all passwords. Mitigation: add bcrypt hashing in a future session.
- **No HTTPS enforcement** beyond GitHub Pages (which does enforce HTTPS).
- **Google OAuth tokens** stored in sessionStorage — cleared on tab close.
- **No CSRF protection** — not applicable (no server).
- **Data isolation** — role-based filtering is client-side only. A determined user could inspect localStorage and see all data. Acceptable for a trusted team tool.

---

## Performance Considerations

- All 23 JS files loaded synchronously via `<script>` tags. Consider bundling if load time becomes an issue.
- `renderCurrentPage()` re-renders entire content area on every update — acceptable for small datasets.
- `getDueReminders()` scans all reminders every badge update (every 60s). Fine for <1000 reminders.
- Debounced Drive sync (3s delay) prevents excessive API calls.
