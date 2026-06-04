# ARCHITECTURE.md — LifePlanner Pro

## High Level Architecture

```
Browser (Single Page Application)
│
├── index.html          ← Shell: sidebar, modals, topbar, all <script> tags
├── css/app.css         ← Complete design system (glass UI + all components)
└── js/                 ← All application logic (no bundler, loaded sequentially)
    ├── data.js         ← Data layer (localStorage CRUD, status defs, CRM options)
    ├── app.js          ← Router + page orchestration + localLogin
    ├── utils.js        ← Shared UI utilities (toast, modals, IC/DOB, badges)
    ├── sounds.js       ← Web Audio API sound system + toggle
    └── [page].js       ← One file per page/module

localStorage['lifeplanner_v1']  ← Persistent JSON store
Google Drive (optional)         ← Cloud backup/sync via gauth.js + gdrive.js
GitHub Pages                    ← Static hosting, no server
```

**No server. No backend API. No build step.** Everything runs client-side.

---

## Application Flow

```
Page Load
  └── index.html loads all <script> tags in order (data.js first, sounds.js second...)
      └── data.js → loadDB() at bottom → reads localStorage into DB object
      └── gauth.js → initializes Google OAuth client
      └── app.js → defines LOCAL_AUTH, PAGE_MAP, navigateTo()
          └── DOMContentLoaded → checks logged-in state
              ├── Not logged in → showLoginScreen()
              └── Logged in    → hideLoginScreen() → navigateTo('dashboard')
```

---

## Request Flow (user interaction)

```
User clicks sidebar nav
  └── navigateTo('crm')
      ├── updates .nav-item.active state
      ├── sets currentPage = 'crm'
      ├── calls PAGE_MAP['crm'].render() → renderCRM()
      │   └── reads getContacts(), builds HTML string with template literals
      │   └── document.getElementById('content').innerHTML = generatedHTML
      └── updateBadges() ← updates reminder/case count badges in sidebar
```

All pages follow identical pattern: **render function → innerHTML injection → inline onclick handlers**.

---

## Authentication Flow

### Local Auth (primary, used by Keith's team)
```
localLogin()
  └── reads #loginUsername, #loginPassword inputs
  └── looks up user in localStorage['lp_users']
  └── validates password (plaintext — internal tool only)
  └── sets LOCAL_AUTH.currentUser = { name, role, email }
  └── hideLoginScreen()
  └── renderSidebarUser() → shows avatar + role badge in sidebar
  └── navigateTo('dashboard')
  └── updateSoundBtn()   ← sets correct speaker icon state
  └── setTimeout(checkRemindersOnLoad, 1500)
```

### Google Auth (secondary/optional)
```
gauthSignIn()
  └── Google OAuth popup flow
  └── gauth.js onSignIn callback
  └── sets GAUTH.currentUser
  └── hideLoginScreen() → renderCurrentPage()
  └── gdStartSync() → Google Drive sync begins
```

---

## Authorization Logic

```js
const role = LOCAL_AUTH.currentUser?.role || GAUTH.currentUser?.role;

// Role-gated nav items:
nav-admin → visible only if role === 'admin'
nav-team  → visible only if role !== 'agent'

// Data isolation:
ownerEmail stamped on contacts/cases at creation time
// Note: not strictly enforced in read queries — all team members see all data
```

---

## Database Flow

```
Any mutation (createContact, updateCase, deleteReminder...)
  └── modifies DB object in memory
  └── calls saveDB()
      ├── stamps DB.settings._lastSaved = ISO timestamp (Drive conflict resolution)
      ├── localStorage.setItem('lifeplanner_v1', JSON.stringify(DB))
      └── if gdScheduleSave defined → debounced Google Drive upload
```

---

## To-Do Mode Status Flow (Sales, Onboarding)

```
renderStatusStep(cs, stepDef, caseId)
  └── stepDef.n in cs.completedSteps[] ?
      ├── YES → renders green checked step (done)
      └── NO  → renders checkbox → onclick: confirmSetStatusWithDate()
                  └── user picks date + remark
                  └── calls toggleStepDone(caseId, stepN, remark, date)
                      └── data.js: toggles stepN in completedSteps[]
                      └── currentStatus = Math.max(...completedSteps)
                      └── appends statusHistory entry

CRITICAL: confirmSetStatusWithDate() → toggleStepDone() (NOT setStatus())
```

## Linear Mode Status Flow (Claims, Servicing, Recruitment — OLD)

```
Inline "Next Step" button → advanceCaseStatus(id)
  └── currentStatus += 1
  └── appends statusHistory entry
  // completedSteps[] NOT used — needs migration
```

---

## Component Relationships

```
index.html
├── #sidebar        ← static HTML nav, onclick="navigateTo()"
├── #mainWrapper
│   ├── .topbar     ← global search, sound toggle btn, reminders bell
│   └── #content    ← ALL page content injected here by JS render functions
├── #caseModal      ← shared modal for all case detail/edit views
├── #contactModal   ← shared modal for contact detail/form/import preview
├── #confirmModal   ← shared yes/no dialog
└── #crmImportInput ← hidden <input type="file"> for Excel import
```

---

## Design Patterns

| Pattern | Usage |
|---------|-------|
| innerHTML injection | All UI is template literal HTML strings injected via `el.innerHTML = html` |
| Inline onclick | `onclick="fn('${id}')"` in templates — avoids addEventListener complexity |
| Module per page | One JS file per feature, all loaded via `<script>` tags in index.html |
| Global module state | `let crmSearch`, `let crmViewMode`, `let crmFilters` at file top |
| DB singleton | Single `DB` object in memory, `saveDB()` persists to localStorage |
| escHtml() everywhere | All user content escaped before innerHTML (XSS prevention) |

---

## Security

- **No server auth** — internal tool, security = private URL + local passwords
- **Plaintext passwords** in localStorage `lp_users` — acceptable for private team tool
- **escHtml()** on all user content → XSS prevented
- Google OAuth handled by Google's own JS library

---

## Performance

- `backdrop-filter: blur()` → GPU-accelerated; reduced to `blur(10px)` on mobile (≤768px)
- `holoShimmer` CSS animation → transform/opacity only, GPU composited
- `renderCRM()` rebuilds full contacts panel on every filter change → fine for <500 contacts
- Web Audio oscillators created/destroyed per sound → no memory leak
- `saveDB()` is synchronous localStorage write → fine for current data sizes
- For >500 contacts: add virtual scroll + lazy case loading
