# PROJECT_HANDOFF.md — LifePlanner Pro

## Project Overview

**LifePlanner Pro** is a private, team-based CRM and case management web app for Malaysian insurance advisors (AIA agents). Runs entirely in the browser — no server, all data in `localStorage` with optional Google Drive sync.

### Business Objectives
- Replace spreadsheets for tracking insurance sales pipelines, claims, servicing, recruitment, onboarding
- CRM with full Malaysian-specific contact profiles (race, religion, income, insurance, tags)
- Bulk WhatsApp messaging with festive/sales templates
- Team hierarchy and agent management
- Snapwill (digital will writing) case tracking

### Target Users
- Keith (Admin/DM) — primary user and project owner
- Insurance agent team — roles: `admin`, `dm`, `um`, `agent`

### Main User Flows
1. Login (local username/password or Google OAuth) → Dashboard
2. CRM: Add/edit contacts → link cases → track status progress (to-do steps)
3. Bulk WhatsApp: filter contacts by profile → select template → generate pre-filled WA links
4. Case modules: open cases, advance status steps, set reminders
5. Excel export (full data) / Excel import (contacts)

---

## Current Status

- **Overall completion: ~82%**
- **Phase:** Feature-complete core; older modules need to-do mode migration
- **Last session:** Glass design system, CRM filters/views/search/import, 12 sounds, sound toggle

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Styling | Custom CSS — Apple/glass design system |
| Data | localStorage (`lifeplanner_v1` key) |
| Auth | Local username/password + Google OAuth |
| Cloud sync | Google Drive (optional, `gdrive.js`) |
| Excel | SheetJS (XLSX) CDN in index.html |
| Fonts | Inter (Google Fonts) |
| Hosting | GitHub Pages — https://davinci1986.github.io/lifeplanners/ |
| Git | Local `master` → remote `main` |

---

## Folder Structure

```
todo-dashboard/
├── index.html              # SPA shell, all modals, sidebar HTML
├── css/app.css             # Complete glass design system
├── js/
│   ├── data.js             # DB layer — localStorage CRUD, status defs, CRM options
│   ├── sounds.js           # 12 context-aware Web Audio sounds + toggle
│   ├── utils.js            # Toast, modals, IC/DOB, avatar, catMeta, badges
│   ├── app.js              # Router, KIV/Follow-up, localLogin, navigateTo
│   ├── crm.js              # CRM contacts + Bulk WhatsApp + Excel import
│   ├── sales.js            # Sales cases (to-do mode ✅)
│   ├── claims.js           # Claims (❌ OLD linear — needs to-do mode)
│   ├── servicing.js        # Servicing (❌ OLD linear — needs to-do mode)
│   ├── recruitment.js      # Recruitment (❌ OLD linear — needs to-do mode)
│   ├── onboarding.js       # Onboarding (to-do mode ✅)
│   ├── aisolution.js       # AI Solution custom case type
│   ├── others.js           # Others/custom category
│   ├── snapwill.js         # Snapwill digital will cases
│   ├── export.js           # Excel export (6 sheets, SheetJS)
│   ├── gauth.js            # Google OAuth login
│   ├── gdrive.js           # Google Drive sync
│   ├── sheets.js           # Google Sheets team sync
│   ├── reminders.js        # Reminders page
│   ├── whatsapp.js         # WhatsApp script generator
│   └── dashboard.js        # Dashboard overview
├── PROJECT_HANDOFF.md
├── ARCHITECTURE.md
├── DEVELOPMENT_RULES.md
├── CLAUDE_MEMORY.md
├── SESSION_SUMMARY.md
└── NEW_SESSION_BOOTSTRAP.md
```

---

## Features Completed

### CRM Contacts
- Full contact form (20+ fields, Malaysian-specific)
- 4 view modes: List / Grid / Large / Extra Large icons
- Filter bar: Race, Gender, State, Marital Status, Tag, Has Cases, Birthday
- Active filter chips (removable), filter count badge
- Enhanced search: all fields + linked case labels/history/tags/insurance
- Excel/CSV import: smart column mapping, 20+ synonyms (EN + BM), preview modal
- Bulk WhatsApp: 20+ templates, quick-select groups, pre-filled links
- Full Excel export

### Case Management
- **Sales** ✅ — to-do mode, 8 steps, priority/KIV/follow-up flags, premiums, examinations
- **Onboarding** ✅ — to-do mode, 9 steps
- **Claims** ⚠️ — linear mode, 10 steps (needs migration)
- **Servicing** ⚠️ — linear mode, 9 steps (needs migration)
- **Recruitment** ⚠️ — linear mode, 6 steps (needs migration)
- **Snapwill** — functional
- **AI Solution** — functional with custom ai steps
- **Others** — functional

### Sound System
- 12 distinct Web Audio API sounds (no external files needed)
- Context-aware event delegation (nav, open, close, create, save, delete, filter, toggle, complete, reminder, birthday, export)
- Sound toggle in topbar (persisted in DB, default ON)

### Glass Design System
- Backdrop-filter on all cards, modals, topbar
- Neon blue→purple gradient buttons with glow
- Holographic shimmer animation on stat cards
- Mesh radial gradient background
- Dark sidebar (#0A0D1A → #0F1228)
- Mobile-optimized (reduced blur ≤768px)

### Infrastructure
- Google OAuth + local auth
- Google Drive backup/restore/auto-save
- Google Sheets team sync
- Role-based navigation (admin/dm/um/agent)
- Admin panel for user management

---

## Features Pending

1. Migrate claims.js to to-do mode
2. Migrate servicing.js to to-do mode
3. Migrate recruitment.js to to-do mode
4. Team Dashboard: hierarchy tree + agent stats
5. Dashboard charts (pipeline, conversion)
6. Contact import: deduplication + better date parsing
7. CRM: bulk actions (delete/tag/export multiple)
8. Dark mode toggle
9. Mobile bottom tab nav
10. PWA offline support

---

## Database Documentation

**Key:** `localStorage['lifeplanner_v1']`

### Contact Object
```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation, notes,
  tags[],                   // string array
  race, stayArea, state, maritalStatus, dependants, jobType, income,
  langPref, gender, religion,
  existingInsurance[],      // ARRAY — NEVER string. Always Array.isArray() before use
  referralSource, socialMedia, createdAt, updatedAt
}
```

### Case Object
```js
{
  id, ownerEmail, contactId, contactName,
  category,           // 'sales'|'claims'|'servicing'|'recruitment'|'onboarding'|'snapwill'|'aisolution'|'others'
  categories[],       // multi-category
  label, subLabel,    // B1-B5, C1-C8, 'AIA', 'Snapwill', custom
  currentStatus,      // int — max of completedSteps[] in to-do mode
  completedSteps[],   // int[] — to-do mode only
  statusHistory[],    // [{fromStatus, toStatus, remark, date}]
  customStatusLabels, remarks, reminders[], priority, kiv, followUp,
  premiums[], examinations[], recruitPrograms[], fieldwork[],
  closedDate, customFields{}, aiSteps[], snapwillTypes[], nextStep,
  createdAt, updatedAt
}
```

### Settings Object
```js
settings: {
  theme: 'light',
  notifySound: true,        // sound on/off
  crmOptions: {},           // custom dropdown options per field
  snapwillTypes: [],
  _lastSaved: ISO string    // Drive conflict resolution timestamp
}
```

---

## Deployment

- **Live:** https://davinci1986.github.io/lifeplanners/
- **Repo:** https://github.com/davinci1986/lifeplanners
- **Push:** `git push origin master:main`
- **Commit:** `git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "..."`
- No CI/CD — push = live in 1–2 min (may need hard refresh / Ctrl+Shift+R)

---

## Known Bugs & Technical Debt

1. `existingInsurance` — legacy contacts may have string; always use `Array.isArray()`
2. `_blastFilter.insuranceFilter` is `[]` array; all other blast filter fields are strings — unique exception
3. `confirmSetStatusWithDate()` calls `toggleStepDone()` NOT `setStatus()` — do NOT revert
4. Claims/Servicing/Recruitment use old linear rendering — inconsistent with Sales/Onboarding
5. No contact deduplication on Excel import
6. `backdrop-filter` causes headless screenshot tool to time out — not a real browser issue
7. Gender field in contact form — verify `renderContactForm()` includes gender dropdown (was added in a prior session, confirm it's still there)

---

## Next 20 Tasks (Recommended Order)

1. Verify gender field in `renderContactForm()` in crm.js
2. Migrate claims.js to `renderStatusStep()` + `completedSteps[]`
3. Migrate servicing.js to to-do mode
4. Migrate recruitment.js to to-do mode
5. Team Dashboard: hierarchy tree + agent stats
6. Dashboard: sales pipeline chart
7. Dashboard: floating analytics widgets
8. Contact import: date parsing (DD/MM/YYYY, auto-DOB from IC)
9. Contact import: deduplication (skip/merge by name+phone)
10. Search: highlight matched text in results
11. CRM list view: sortable columns
12. CRM: bulk select actions (delete/tag/export)
13. Reminders: recurring support
14. Mobile: bottom tab navigation
15. Dark mode toggle
16. Print/PDF contact profile view
17. WhatsApp blast: send history log
18. Dashboard: conversion rate widget
19. PWA manifest + service worker
20. Virtual scroll for 500+ contacts
