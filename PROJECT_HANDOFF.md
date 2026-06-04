# PROJECT_HANDOFF.md — LifePlanner Pro

## Project Overview

**Project Name:** LifePlanner Pro
**Live URL:** https://davinci1986.github.io/lifeplanners/
**GitHub Repo:** https://github.com/davinci1986/lifeplanners
**Local Files:** `C:\Users\Keith\todo-dashboard\`

### Purpose
A private, role-based CRM + Task Management web app for an insurance agency team. Tracks sales prospects, claims, servicing, recruitment, onboarding of new agents, Snapwill digital will cases, AI Solution custom workflows, and bulk WhatsApp marketing.

### Business Objectives
- Keith (Unit Manager at AIA/Snapwill) manages his team's pipeline in one place
- Replace spreadsheets with a structured, reminder-driven workflow
- Support team hierarchy: Admin → District Manager → Unit Manager → Agent
- Centralize all client data and activity logs
- Sync data to Google Sheets as cloud backup
- Bulk WhatsApp marketing to segmented contact lists at zero cost

### Target Users
- **Keith (Admin):** Full access, manages all team data, admin panel
- **District Managers:** View all UMs and their agents
- **Unit Managers:** View their own agents' data
- **Agents:** View only their own cases

### Main User Flows
1. Login (username/password OR Google OAuth) → Dashboard
2. Create/track cases through status pipelines per category
3. Tick steps as a to-do list (any order, any step)
4. Set reminders at any status step with custom dates
5. Recruit agents → auto-transfer agreed candidates to Onboarding
6. Admin manages users, custom categories, shared Google Sheet
7. CRM: manage extended contact profiles, bulk WhatsApp blast with templates
8. Export all data to Excel (.xlsx)

---

## Current Status

- **Overall Completion:** ~88%
- **Phase:** Feature-complete core + CRM marketing tools + Excel export
- **Last Session Work:** All tasks below pushed to live (commit ad8ee5e)

### ✅ JUST COMPLETED & PUSHED TO LIVE:
1. Snapwill customer types — multi-select (Will, Memories, Sub 199/299, Leader, Affiliate, Business Partner, School Donation, Booth) + add new
2. Label ID bug fixed — `addCustomLabel()` deduplicates; `saveNewCase()` resolves text→ID
3. AI Solution module — new 🤖 category with fully custom per-case steps, progress bar, inline add/rename/delete steps
4. To-do list progress mode — all status steps are now independent checkboxes; tick any in any order; uses `case.completedSteps[]`
5. CRM extended fields — Race, Religion, Gender, Language, Stay Area, State, Marital Status, Dependants, Job Type, Income, Existing Insurance (multi-select array), Referral Source, Social Media, Tags
6. Bulk WhatsApp blast — 19 templates in 2 groups, 3 Quick Select groups (By Occasion / By Profile / By Insurance), filter by religion/race/gender/age/area/insurance company
7. Excel export — 6-sheet .xlsx (Summary, Contacts, Cases, Activity History, Reminders, AI Solution) via SheetJS CDN
8. Admin Panel: customize built-in category steps globally (rename/add/remove/reset)
9. Insurance filter in Bulk WhatsApp: multi-select company checkboxes (OR logic)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5 / CSS3 / ES6 JS (no frameworks) |
| Hosting | GitHub Pages (free, static) |
| Auth | Local username/password (localStorage) + Google OAuth 2.0 |
| Database | Browser `localStorage` (primary) + Google Sheets API (cloud sync) |
| Excel Export | SheetJS (xlsx) v0.20.3 via CDN |
| Sounds | Web Audio API |
| Fonts | Google Fonts — Inter |
| CI/CD | GitHub Actions (auto-deploy on push to `main`) |
| Google Cloud Project | `gen-lang-client-0268637234` |
| OAuth Client ID | `638079686621-5jbk5gh84hiu9te96dedb7uhvvmuvtao.apps.googleusercontent.com` |
| Authorized Origin | `https://davinci1986.github.io` |

---

## Folder Structure

```
C:\Users\Keith\todo-dashboard\          ← git repo root (local branch: master, remote: main)
├── .github/workflows/static.yml        ← GitHub Actions: deploys ./ to Pages
├── .claude/launch.json                 ← Preview server config (npx serve -p 3030)
├── css/app.css                         ← Full design system (~1300 lines), Apple-inspired
├── js/
│   ├── gauth.js                        ← Google OAuth 2.0, role loading, access control
│   ├── sheets.js                       ← Google Sheets API sync (read/write all data)
│   ├── data.js                         ← localStorage CRUD, status defs, custom categories, CRM options
│   ├── sounds.js                       ← Web Audio API sounds
│   ├── utils.js                        ← UI helpers, renderStatusStep(), handleStepClick(), catMeta()
│   ├── export.js                       ← Excel export via SheetJS (6 sheets)
│   ├── whatsapp.js                     ← WA script templates EN/ZH/BM (per-case)
│   ├── dashboard.js                    ← Overview dashboard
│   ├── sales.js                        ← Sales module + shared renderNewCaseForm/saveNewCase/renderCaseDetail
│   ├── claims.js                       ← Claims module + openNewCase() shared function
│   ├── servicing.js                    ← Servicing module
│   ├── recruitment.js                  ← Recruitment with 4-way branch at status 4
│   ├── onboarding.js                   ← Multi-status parallel onboarding
│   ├── snapwill.js                     ← Snapwill module + customer types multi-select
│   ├── aisolution.js                   ← AI Solution module (NEW — fully custom steps)
│   ├── others.js                       ← Flexible others module
│   ├── crm.js                          ← CRM contacts + extended fields + Bulk WhatsApp blast
│   ├── reminders.js                    ← Reminders page
│   ├── team.js                         ← Team dashboard & hierarchy
│   └── app.js                          ← Router, auth, admin panel, built-in category customization
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

### CRM — Extended
- [x] Contact cards with avatar, phone, email, NRIC, DOB, occupation
- [x] IC Number → auto-parse birthday (YYMMDD format) + calculate age
- [x] Age badge shown in contact detail view
- [x] Extended fields: Race, Religion, Gender, Language Pref, Stay Area, State, Marital Status, Dependants, Job Type, Monthly Income, Existing Insurance (multi-select array), Referral Source, Social Media, Tags
- [x] All dropdown options are reusable and extensible (stored in `DB.settings.crmOptions`)
- [x] "More Info ▼" collapsible section in contact form
- [x] Birthday countdown on contact cards (🎂 X days)
- [x] Upcoming birthdays stat card (30d)
- [x] Link cases to contacts, view case history per contact
- [x] Search contacts
- [x] Edit/delete contacts with confirmation

### Bulk WhatsApp Blast
- [x] CRM tab: "📱 Bulk WhatsApp"
- [x] Filter contacts: Gender, Race, Religion, Area, State, Marital Status, Job Type, Income, Tag, Age range
- [x] Insurance filter: multi-select company checkboxes (OR logic), "No Insurance" option
- [x] 19 message templates in 2 groups (Festive / Sales & Follow-Up)
- [x] Templates: Birthday, Hari Raya, Raya Haji, CNY, Deepavali, Christmas, Wesak, New Year, Merdeka, iCari, Policy Review, Protection Gap, Critical Illness, Medical Card, Referral, Retirement, Mortgage, Education, Check-In
- [x] Quick Select groups: By Occasion (10), By Profile (10), By Insurance (3) — auto-select contacts + set template
- [x] `{name}` and `{agent}` merge fields personalised per contact
- [x] Generates clickable wa.me links (one per contact, pre-filled message)
- [x] "✓ Sent" state tracking per link
- [x] "Copy All Numbers" button
- [x] Draft message saving

### Excel Export
- [x] SheetJS CDN v0.20.3 loaded in index.html
- [x] `exportToExcel()` in `js/export.js`
- [x] 6 sheets: Summary, Contacts (25 fields), Cases, Activity History, Reminders, AI Solution
- [x] "📥 Export Excel" button in CRM Contacts tab header
- [x] Filename: `LifePlanner_Export_YYYY-MM-DD.xlsx`
- [x] Column widths optimised, header freeze row

### Cases — All Categories
- [x] Multi-category selection on new case form
- [x] Cases appear in all selected category pages
- [x] **To-do list progress mode:** any step can be ticked in any order via `case.completedSteps[]`
- [x] `handleStepClick()` — clicking done step unchecks it; clicking undone opens date/remark modal
- [x] `toggleStepDone()` in data.js — updates `completedSteps`, `currentStatus` (max done), `statusHistory`
- [x] Editable status step labels per case (custom names stored in `case.customStatusLabels`)
- [x] Date picker when setting any status step
- [x] Reminder button (🔔) on every status step
- [x] Status history timeline
- [x] Priority flagging, KIV marking
- [x] WhatsApp scripts (EN/ZH/BM) on every case
- [x] Remarks/notes tab

### Sales Module
- [x] 8-status pipeline (Approached → KIV)
- [x] AIA / Snapwill sub-labels
- [x] Premium entries at status 5
- [x] KIV routing from status 3
- [x] Branch buttons only appear when relevant step is in `completedSteps`

### Claims, Servicing, Recruitment, Onboarding, Others
- [x] All existing functionality preserved
- [x] Claims: 10-status pipeline with branch at step 5
- [x] Servicing: 9-status pipeline with branch at step 4
- [x] Recruitment: 4-way branch at step 4, auto-transfer to Onboarding
- [x] Onboarding: multi-status parallel tracking, hotlist, fieldwork, exams
- [x] Others: flexible free-form module

### Snapwill Module
- [x] 6-status pipeline
- [x] Appointment details at status 2
- [x] **Customer types multi-select** (Will, Memories, Sub 199/299, Leader Account, Affiliate, Business Partner, School Donation, Booth + add new)
- [x] Types stored in `DB.settings.snapwillTypes`, saved to `case.snapwillTypes[]`

### AI Solution Module (NEW)
- [x] 🤖 icon in sidebar
- [x] Fully custom per-case steps (not fixed pipeline)
- [x] Steps stored in `case.aiSteps = [{id, n, label, done, date, remark}]`
- [x] Progress bar on case list row (done/total, %)
- [x] Add steps at creation or inline from case detail
- [x] Tick any step → date/remark picker → mark done
- [x] Click done step → immediately uncheck
- [x] Rename/delete individual steps
- [x] Reminders tab per case

### Admin Panel
- [x] Centralized Google Sheet ID configuration
- [x] User management: add/edit/delete users with roles
- [x] **Customize Built-in Category Steps** — rename/add/remove steps for Sales/Claims/Servicing/Recruitment/Onboarding/Snapwill globally
- [x] Global overrides stored in `DB.globalStatusDefs`, `getStatusDef()` checks these first
- [x] "Customised" badge + Reset to Default button per category
- [x] Custom Categories: create with icon, color, statuses, labels (full CRUD)

### Label System (Bug Fixed)
- [x] `addCustomLabel()` deduplicates by text (case-insensitive)
- [x] `addLabelToCategory()` injects radio button + auto-selects after saving
- [x] `saveNewCase()` resolves custom text → existing ID via `DB.customLabels` lookup
- [x] No more random alphabet IDs when reusing saved labels

### Reminders
- [x] Quick reminder from any case
- [x] Date presets: Today, Tomorrow, +3 Days, +1 Week, +7 Working Days
- [x] Reminder bell in topbar with badge count
- [x] Reminders page with overdue/today/upcoming sections
- [x] Auto-reminders on specific status transitions

### Google Sheets Sync
- [x] Auto-create spreadsheet "LifePlanner Pro — Data"
- [x] Sheets: Users, Contacts, Cases, Reminders, TeamActivity
- [x] Admin can set shared Sheet ID — all users point to same sheet

### Data Export/Import
- [x] JSON backup/restore
- [x] Excel export (6-sheet .xlsx)
- [x] Import CSV/Excel for onboarding hotlist names

---

## Features Pending

- [ ] Team Dashboard fully functional (tree view, member stats)
- [ ] Google Sheets real-time sync (currently on demand)
- [ ] Push notifications for reminders
- [ ] Mobile app (PWA wrapper / manifest.json)
- [ ] Bulk import contacts from Excel
- [ ] Policy Summary PDF generation
- [ ] Export cases to PDF
- [ ] Agent recruitment funnel analytics
- [ ] Commission tracking per case
- [ ] Scheduled reminder emails/WhatsApp
- [ ] Password hashing (currently plaintext)
- [ ] Migrate claims.js, servicing.js, recruitment.js to use `renderStatusStep()` universal renderer
- [ ] Gender field in CRM currently defined in options but not yet added to contact form (DEFAULT_CRM_OPTIONS has 'genders' key — needs form field)

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

### SheetJS (Excel)
- CDN: `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`
- Usage: `XLSX.utils.book_new()`, `XLSX.utils.aoa_to_sheet(rows)`, `XLSX.utils.book_append_sheet(wb, ws, name)`, `XLSX.writeFile(wb, filename)`

---

## Database Documentation

### localStorage Keys
| Key | Content |
|-----|---------|
| `lifeplanner_v1` | Main DB: contacts, cases, reminders, settings, customCategories, customLabels, globalStatusDefs |
| `lp_users` | Array of `{id, username, password, role, name, email}` |
| `lp_session` (sessionStorage) | Current local auth user JSON |
| `gauth_token` (sessionStorage) | Google OAuth access token |
| `gd_client_id` | Google OAuth Client ID |
| `sheets_id` | Google Sheets spreadsheet ID |
| `lp_shared_sheet_id` | Admin-configured shared sheet ID |

### Main DB Object
```js
DB = {
  contacts: [...],
  cases: [...],
  reminders: [...],
  settings: {
    snapwillTypes: [...],    // custom snapwill customer types
    crmOptions: {            // extensible dropdown lists
      races, areas, states, incomes, maritalStatuses,
      jobTypes, langPrefs, insurances, referrals, religions, genders, tags
    }
  },
  customCategories: [],
  customLabels: {},          // {categoryId: [{id, label}]}
  globalStatusDefs: {}       // {categoryId: [{n, label},...]} — admin overrides
}
```

### Case Schema
```js
{
  id, ownerEmail, contactId, contactName,
  category,           // primary category string
  categories,         // array of all selected categories
  label,              // B1-B5, C1-C8, or custom label ID
  subLabel,           // AIA / Snapwill for sales
  currentStatus,      // max of completedSteps (to-do mode) or 0
  completedSteps,     // [] — array of step numbers ticked (to-do list mode)
  statusHistory,      // [{fromStatus, toStatus, remark, date}]
  customStatusLabels, // {stepN: 'custom label'} — per-case overrides
  aiSteps,            // [{id, n, label, done, date, remark}] — AI Solution only
  snapwillTypes,      // [] — array of customer type strings (Snapwill only)
  remarks, reminders, priority, kiv, followUp,
  premiums, examinations, recruitPrograms,
  fieldwork, hotlist, prsClients,
  closedDate, customFields, nextStep,
  createdAt, updatedAt
}
```

### Contact Schema (Extended)
```js
{
  id, ownerEmail, name, phone, email, nric, dob,
  occupation, notes, tags,
  // Extended CRM fields:
  gender, race, religion, stayArea, state,
  maritalStatus, dependants, jobType, income, langPref,
  existingInsurance,  // ARRAY — e.g. ['AIA', 'Prudential']
  referralSource, socialMedia,
  createdAt, updatedAt
}
```

---

## Deployment

### GitHub Pages
- Repo: `https://github.com/davinci1986/lifeplanners`
- Remote branch: `main`; Local branch: `master`
- Deploy path: `./` (repo root = todo-dashboard/ folder content)
- Workflow: `.github/workflows/static.yml`
- Auto-deploys on every push to `main`
- Deployment takes ~1-2 minutes after push

### Push Commands
```powershell
cd "C:\Users\Keith\todo-dashboard"
git add <files>
git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "message"
git push origin master:main
```

### Preview Server
```powershell
cd "C:\Users\Keith\todo-dashboard"
npx serve -p 3030 .   # or use launch.json in Claude Code (server name: "lifeplanner")
# Visit http://localhost:3030 (or whatever port is assigned)
```

---

## Environment Variables
None — all config stored in localStorage.

---

## Known Bugs

1. **Gender field missing from contact form** — `DEFAULT_CRM_OPTIONS.genders` exists in data.js but the contact form in crm.js doesn't have a gender dropdown. Quick fix: add `renderCRMDropdown('cf_gender', 'genders', contact?.gender||'', 'Gender')` to the form and `gender: document.getElementById('cf_gender')?.value||''` in saveContact().

2. **claims.js, servicing.js, recruitment.js use old inline step HTML** — These modules don't use the universal `renderStatusStep()` from utils.js. They don't respect `completedSteps` for to-do mode — their steps still follow old linear rendering. To-do mode only fully works for Sales, Snapwill, and AI Solution cases.

3. **`blastQuickFilter('religion','Christianity')` for Christmas** — The religion option is stored as 'Christianity' in DEFAULT_CRM_OPTIONS.religions. Contacts must have this exact value saved. If they were saved before the religion field existed, they won't match. No bug in code, just data population issue.

4. **Google Sheets scope** — Need to verify `https://www.googleapis.com/auth/spreadsheets` is added in Google Cloud Console OAuth consent screen. If not, Sheets sync will silently fail.

5. **Password security** — Passwords stored in plaintext in localStorage `lp_users`. Future: add bcrypt hashing.

6. **`currentStatus` in to-do mode** — Set to `Math.max(...completedSteps)` or 0. This means `currentStatus` is not the "current active step" but the highest completed step. Stats and status badges in `getCategoryStats()` and `getStatusLabel()` may show inaccurate numbers for to-do mode cases. Acceptable for now.

---

## Next Tasks (Recommended Order)

1. **Fix gender field in CRM contact form** — add dropdown to `renderContactForm()` and `saveContact()`
2. **Migrate claims.js to use `renderStatusStep()` + `completedSteps`** — to-do mode for Claims cases
3. **Migrate servicing.js to use `renderStatusStep()` + `completedSteps`** — to-do mode for Servicing
4. **Migrate recruitment.js to use `renderStatusStep()` + `completedSteps`** — to-do mode for Recruitment
5. **Migrate onboarding.js to use `completedSteps`** — Onboarding already has multi-status, needs rethinking
6. **Team Dashboard** — flesh out hierarchy view with agent stats, case counts per agent
7. **PWA manifest** — add manifest.json + service worker for mobile install
8. **Password hashing** — hash passwords before storing in `lp_users`
9. **Google Sheets real-time sync** — trigger `sheetsSync()` on every `saveDB()` call
10. **Bulk contact import from Excel** — import contacts from .xlsx/.csv
11. **Policy Summary PDF generation** — use jsPDF to generate client policy summaries
12. **Export cases to PDF** — printable case report per contact
13. **Commission tracking module** — track ANP per closed case
14. **Agent recruitment funnel chart** — dashboard analytics
15. **Notification badge on browser tab** — favicon counter
16. **Archive feature** — soft-delete old completed cases
17. **Scheduled reminder emails/WhatsApp** — auto-send reminders
18. **"Set all pending steps" bulk feature** — mark multiple steps done at once
19. **Backdate history entries** — let user set date on existing history
20. **Agent performance reports** — PDF/Excel export per agent
