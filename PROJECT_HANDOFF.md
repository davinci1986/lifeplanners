# PROJECT_HANDOFF.md — LifePlanner Pro

## Project Overview

**Project Name:** LifePlanner Pro  
**Live URL:** https://davinci1986.github.io/lifeplanners/  
**GitHub Repo:** https://github.com/davinci1986/lifeplanners  
**Local Files:** `C:\Users\Keith\todo-dashboard\`

### Purpose
A private, role-based CRM + Task Management web app for an insurance agency team. Tracks sales prospects, claims, servicing, recruitment, onboarding of new agents, Snapwill digital will cases, and custom workflows.

### Business Objectives
- Keith (Unit Manager at AIA/Snapwill) manages his team's pipeline in one place
- Replace spreadsheets with a structured, reminder-driven workflow
- Support team hierarchy: Admin → District Manager → Unit Manager → Agent
- Centralize all client data and activity logs
- Sync data to Google Sheets as cloud backup

### Target Users
- **Keith (Admin):** Full access, manages all team data, admin panel
- **District Managers:** View all UMs and their agents
- **Unit Managers:** View their own agents' data
- **Agents:** View only their own cases

### Main User Flows
1. Login (username/password OR Google OAuth) → Dashboard
2. Create/track cases through status pipelines per category
3. Set reminders at any status step with custom dates
4. Recruit agents → auto-transfer agreed candidates to Onboarding
5. Admin manages users, custom categories, shared Google Sheet

---

## Current Status

- **Overall Completion:** ~80%
- **Phase:** Feature-complete core, mid-way through customization layer
- **Last Session Work:** Implemented editable step labels, date picker on steps, multi-category cases, custom categories/labels/statuses in Admin Panel

### ⚠️ INTERRUPTED TASKS (must be done next session):
1. **Snapwill**: Add multiple customer types (Will, Memories, Subscription 199/299, Leader Account, Affiliate, Business Partner, School Donation, Booth) — multi-select + add new types
2. **Bug Fix**: Labels in Edit Case form generating random alphabet IDs instead of reusing saved labels
3. **New category**: "AI Solution" — fully tailor-made, self-keyed statuses/progress
4. **All progress steps**: Make them act as to-do list (multi-select, no forced sequence) instead of linear advance

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5 / CSS3 / ES6 JS (no frameworks) |
| Hosting | GitHub Pages (free, static) |
| Auth | Local username/password (localStorage) + Google OAuth 2.0 |
| Database | Browser `localStorage` (primary) + Google Sheets API (cloud sync) |
| Sounds | Web Audio API |
| Fonts | Google Fonts — Inter |
| CI/CD | GitHub Actions (auto-deploy on push to `main`) |
| Google Cloud Project | `gen-lang-client-0268637234` |
| OAuth Client ID | `638079686621-5jbk5gh84hiu9te96dedb7uhvvmuvtao.apps.googleusercontent.com` |
| Authorized Origin | `https://davinci1986.github.io` |

---

## Folder Structure

```
C:\Users\Keith\todo-dashboard\          ← git repo root (deploys as GitHub Pages root)
├── .github/
│   └── workflows/
│       └── static.yml                  ← GitHub Actions: deploys ./ to Pages
├── .claude/
│   └── launch.json                     ← Preview server config (npx serve -p 3030)
├── css/
│   └── app.css                         ← Full design system (~1300 lines), Apple-inspired
├── js/
│   ├── gauth.js                        ← Google OAuth 2.0, role loading, access control
│   ├── sheets.js                       ← Google Sheets API sync (read/write all data)
│   ├── data.js                         ← localStorage CRUD, status defs, custom categories
│   ├── sounds.js                       ← Web Audio API sounds
│   ├── utils.js                        ← UI helpers, status step renderer, sidebar, toasts
│   ├── whatsapp.js                     ← WA script templates EN/ZH/BM
│   ├── dashboard.js                    ← Overview dashboard
│   ├── sales.js                        ← Sales module + shared renderNewCaseForm/saveNewCase
│   ├── claims.js                       ← Claims module
│   ├── servicing.js                    ← Servicing module
│   ├── recruitment.js                  ← Recruitment with 4-way branch at status 4
│   ├── onboarding.js                   ← Multi-status parallel onboarding
│   ├── snapwill.js                     ← Snapwill digital will module
│   ├── others.js                       ← Flexible others module
│   ├── crm.js                          ← CRM contacts + IC→birthday parsing
│   ├── reminders.js                    ← Reminders page
│   ├── team.js                         ← Team dashboard & hierarchy
│   └── app.js                          ← Router, auth, admin panel, custom categories
└── index.html                          ← Main shell: login overlay, sidebar, modals
```

---

## Features Completed

### Authentication
- [x] Username/password login (stored in `localStorage` key `lp_users`)
- [x] Default admin: username=`admin`, password=`admin`
- [x] Session persistence via `sessionStorage`
- [x] Google OAuth 2.0 Sign-In (secondary tab)
- [x] Role-based nav (Admin Panel, Team Dashboard hidden for non-admins)
- [x] Sign out (both local and Google)

### CRM
- [x] Contact cards with avatar, phone, email, NRIC, DOB, occupation
- [x] IC Number → auto-parse birthday (YYMMDD format) + calculate age
- [x] Age badge shown in contact detail view
- [x] Link cases to contacts, view case history per contact
- [x] Search contacts
- [x] Edit/delete contacts with confirmation

### Cases — All Categories
- [x] Multi-category selection on new case form
- [x] Cases appear in all selected category pages
- [x] Editable status step labels per case (custom names stored in `case.customStatusLabels`)
- [x] Date picker when setting any status step
- [x] Reminder button (🔔) on every status step
- [x] Status history timeline
- [x] Priority flagging
- [x] KIV marking
- [x] WhatsApp scripts (EN/ZH/BM) on every case
- [x] Remarks/notes tab

### Sales Module
- [x] 8-status pipeline (Approached → KIV)
- [x] AIA / Snapwill sub-labels
- [x] Premium entries at status 5
- [x] KIV routing from status 8

### Claims Module (B1–B5)
- [x] 10-status pipeline with branch at status 5
- [x] Auto 7-working-day reminders at status 3 & 9

### Servicing Module (C1–C8)
- [x] 9-status pipeline with branch at status 4
- [x] Auto 7-working-day reminders at status 4 & 8

### Recruitment Module
- [x] 6 statuses with 4-way branch at status 4 (Agreed/NotInterested/Timing/VIP)
- [x] Auto-transfer to Onboarding when Agreed
- [x] KIV reactivation to any previous stage
- [x] Advance button visible at statuses 1, 2, and 3

### Onboarding Module
- [x] Multi-status parallel tracking (multiple steps active simultaneously)
- [x] 9 steps: BALP key-in → Exams → 20 Hotlist → Training → Policy Review → Fieldwork → Fieldwork Closed → Exam Complete → Completed
- [x] Exam types: PCIL, TBE (A&C), TBE ABC, PRS, General Insurance
- [x] 20-name hotlist with Excel/CSV upload
- [x] Fieldwork records with agent + customer name
- [x] Fieldwork Closed Cases with ANP amount
- [x] Agent profile tab: full stats, timeline, exams, hotlist, fieldwork
- [x] Auto-reminders: 90 days (BALP), 5 days (Hotlist)

### Snapwill Module
- [x] 6-status pipeline
- [x] Appointment details at status 2

### Others Module
- [x] Fully flexible: custom label, next step, reminder

### Admin Panel
- [x] Centralized Google Sheet ID configuration
- [x] User management: add/edit/delete users with roles (admin/dm/um/agent)
- [x] Custom Categories: create with icon, color, statuses, labels
- [x] Add/edit/delete statuses per custom category
- [x] Add/delete labels per custom category
- [x] Custom categories appear in sidebar under "CUSTOM" section

### Sidebar & Navigation
- [x] Collapsible sidebar (hamburger in topbar, always visible on desktop)
- [x] Sidebar re-opens from collapsed state (bug fixed)
- [x] Custom categories injected dynamically into sidebar
- [x] Role-based nav items (Admin Panel, Team Dashboard)

### Reminders
- [x] Quick reminder from any case (🔔 button on every step)
- [x] Date presets: Today, Tomorrow, +3 Days, +1 Week, +7 Working Days
- [x] Reminder bell in topbar with badge count
- [x] Reminders page with overdue/today/upcoming sections
- [x] Auto-reminders on specific status transitions

### Google Sheets Sync
- [x] Auto-create spreadsheet "LifePlanner Pro — Data"
- [x] Sheets: Users, Contacts, Cases, Reminders, TeamActivity
- [x] Admin can set shared Sheet ID — all users point to same sheet
- [x] Shared sheet ID overrides individual sheets on login

### Data Export/Import
- [x] JSON backup/restore
- [x] Import CSV/Excel for hotlist names

---

## Features In Progress (interrupted this session)

1. **Snapwill customer types** — multi-select Will/Memories/Subscription/etc.
2. **Label bug fix** — random alphabet IDs when reusing saved labels
3. **AI Solution category** — tailor-made statuses, fully flexible
4. **Progress as to-do list** — all steps multi-selectable, no forced sequence

---

## Features Pending

- [ ] Team Dashboard fully functional (tree view, member stats)
- [ ] Google Sheets real-time sync (currently on demand)
- [ ] Push notifications for reminders
- [ ] Mobile app (PWA wrapper)
- [ ] Bulk import contacts from Excel
- [ ] Policy Summary generation
- [ ] Export cases to PDF/Excel
- [ ] Agent recruitment funnel analytics
- [ ] Commission tracking
- [ ] Scheduled reminder emails/WhatsApp

---

## API Documentation

### Google Sheets API
- Base: `https://sheets.googleapis.com/v4/spreadsheets`
- Auth: Bearer token from Google OAuth
- Key functions: `sheetsEnsureSpreadsheet()`, `sheetsReadAll(sheetName)`, `sheetsAppend(sheetName, rows)`, `sheetsUpdate(sheetName, rowIndex, data)`

### Google OAuth
- Library: `https://accounts.google.com/gsi/client`
- Scopes: `spreadsheets`, `drive.file`, `email`, `profile`
- Client: `gauthInit()` → `gauthSetupClient()` → token callback → `onAuthReady()`

---

## Database Documentation

### localStorage Keys
| Key | Content |
|-----|---------|
| `lifeplanner_v1` | Main DB: contacts, cases, reminders, settings, customCategories, customLabels |
| `lp_users` | Array of `{id, username, password, role, name, email}` |
| `lp_session` (sessionStorage) | Current local auth user JSON |
| `gauth_token` (sessionStorage) | Google OAuth access token |
| `gd_client_id` | Google OAuth Client ID |
| `sheets_id` | Google Sheets spreadsheet ID |
| `lp_shared_sheet_id` | Admin-configured shared sheet ID (overrides personal) |

### Main DB Object (DB in `data.js`)
```js
DB = {
  contacts: [...],      // CRM contacts
  cases: [...],         // All cases
  reminders: [...],     // Reminders
  settings: {},         // App settings
  customCategories: [], // User-created categories
  customLabels: {}      // {categoryId: [{id, label}]}
}
```

### Case Schema
```js
{
  id, ownerEmail, contactId, contactName,
  category,          // primary category string
  categories,        // array of all selected categories
  label,             // B1-B5, C1-C8, or custom
  subLabel,          // AIA / Snapwill
  currentStatus,     // current step number
  statusHistory,     // [{fromStatus, toStatus, remark, date}]
  customStatusLabels,// {stepN: 'custom label'}
  remarks, reminders, priority, kiv, followUp,
  premiums, examinations, recruitPrograms,
  fieldwork, hotlist, prsClients,
  closedDate, customFields, nextStep,
  createdAt, updatedAt
}
```

---

## Deployment

### GitHub Pages
- Repo: `https://github.com/davinci1986/lifeplanners`
- Branch: `main`
- Deploy path: `./` (repo root = `todo-dashboard/` folder content)
- Workflow: `.github/workflows/static.yml`
- Auto-deploys on every push to `main`
- Deployment takes ~1-2 minutes after push

### Push Commands
```powershell
cd "C:\Users\Keith\todo-dashboard"
git add -A
git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "your message"
git push origin master:main
```

### Preview Server
```powershell
cd "C:\Users\Keith\todo-dashboard"
npx serve -p 3030 .
# Visit http://localhost:3030
```

---

## Environment Variables
None — all config stored in localStorage. No server-side environment.

| Setting | Where Stored | How to Change |
|---------|-------------|---------------|
| Google Client ID | `localStorage.gd_client_id` | ⚙ Setup button on login screen |
| Sheets ID | `localStorage.sheets_id` | Auto-set or Admin Panel |
| Shared Sheet ID | `localStorage.lp_shared_sheet_id` | Admin Panel → Centralized Google Sheet |

---

## Known Bugs

1. **Label random alphabet bug** — When editing a case, saved labels from `DB.customLabels` are displayed correctly in the form, but on save they get a new `uid()` generated as their ID instead of reusing the saved label's ID. Root cause: `saveNewCase()` in `sales.js` reads `labelRadio?.value` correctly but `addLabelToCategory()` always generates a new `uid()` — the `nf_custom_label` input doesn't preserve the original `id`.

2. **Snapwill customer type** — Currently only a text field for appointment type, no multi-select customer type options.

3. **Progress sequencing** — All modules (except Onboarding) require steps to be set in sequence. User wants all progress to work as a to-do checklist (any step can be ticked in any order).

4. **Status step date not persisted to history** — When clicking a step and entering a date via `openSetStatusWithDate`, the date is stored in `statusHistory`. But in modules that DON'T use the new `renderStatusStep()` universal renderer (claims.js, servicing.js, recruitment.js), the old inline HTML is still used — those don't show the ✏ edit button or 🔔 inline.

5. **Google Sheets scope** — Need to verify `https://www.googleapis.com/auth/spreadsheets` scope is added in Google Cloud Console OAuth consent screen.

---

## Next Tasks (Recommended Order)

1. Fix label ID bug in `saveNewCase()` — preserve original `id` from `DB.customLabels`
2. Add Snapwill customer types (multi-select): Will, Memories, Sub 199/299, Leader, Affiliate, Business Partner, School Donation, Booth + add-new
3. Add "AI Solution" as a built-in flexible category (like Others but with custom statuses)
4. Refactor ALL status step rendering to use universal `renderStatusStep()` from `utils.js` — claims.js, servicing.js, recruitment.js
5. Convert all status pipelines to to-do list mode (any step clickable in any order, checkboxes not forced sequence)
6. Add ✏ rename and 🔔 reminder buttons to ALL modules (not just sales)
7. Update `getStatusLabel()` calls in all modules to pass `caseObj` for custom labels
8. Fix Onboarding to also use the universal step renderer
9. Add "Set Date" to existing history entries (let user backdate)
10. Add bulk reminder "Set all pending steps" feature
11. Team Dashboard: flesh out hierarchy view with agent stats
12. Google Sheets: add real-time sync on every `saveDB()` call
13. Add PWA manifest for mobile install
14. Add Excel/CSV bulk contact import
15. Policy Summary PDF generation
16. Commission tracking per case
17. Add "Closed Date" filter and reporting
18. Agent recruitment funnel chart on dashboard
19. Notification badge on browser tab (favicon)
20. Add "Archive" feature for old completed cases
