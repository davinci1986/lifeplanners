# NEW_SESSION_BOOTSTRAP.md — LifePlanner Pro

## Ready-to-Paste Prompt for New Claude Code Session

---

```
I need you to continue development on the LifePlanner Pro project. Before writing any code, read the following files and reconstruct your full understanding of the project:

1. Read C:\Users\Keith\todo-dashboard\PROJECT_HANDOFF.md
2. Read C:\Users\Keith\todo-dashboard\ARCHITECTURE.md
3. Read C:\Users\Keith\todo-dashboard\DEVELOPMENT_RULES.md
4. Read C:\Users\Keith\todo-dashboard\CLAUDE_MEMORY.md
5. Read C:\Users\Keith\todo-dashboard\SESSION_SUMMARY.md

Also read these key source files to understand current state:
- C:\Users\Keith\todo-dashboard\js\data.js
- C:\Users\Keith\todo-dashboard\js\utils.js
- C:\Users\Keith\todo-dashboard\js\crm.js
- C:\Users\Keith\todo-dashboard\js\sales.js
- C:\Users\Keith\todo-dashboard\js\sounds.js
- C:\Users\Keith\todo-dashboard\js\app.js

DO NOT write any code yet.

After reading all files, provide:

## 1. Project Understanding
Summarize what LifePlanner Pro is, who uses it, and what it does.

## 2. Architecture Understanding
Explain the tech stack, data flow, auth flow, and how the modules connect.

## 3. Development Memory Reconstruction
List:
- Key conventions I must follow
- Known bugs I must not repeat
- Critical data structure rules:
  * existingInsurance is always an ARRAY — always Array.isArray() before use
  * _blastFilter.insuranceFilter is [] not '' (unique exception)
  * confirmSetStatusWithDate() calls toggleStepDone() NOT setStatus()
  * completedSteps[] drives to-do mode, currentStatus = max done step
  * claims.js, servicing.js, recruitment.js do NOT yet use to-do mode
- Patterns already in place I should reuse (not reinvent)
- The exact state of features (completed vs in-progress vs pending)

## 4. Current Project State
What was the last thing done? What is interrupted/incomplete?

## 5. Risk Analysis
Top 5 things most likely to go wrong if I start coding carelessly.
Pay special attention to:
- existingInsurance being an ARRAY not a string
- insuranceFilter being an ARRAY in _blastFilter (all other fields are strings)
- confirmSetStatusWithDate() calls toggleStepDone() not setStatus()
- completedSteps[] drives to-do mode, currentStatus = max done step
- claims.js/servicing.js/recruitment.js still use OLD linear rendering

## 6. Execution Plan
Given the pending tasks from the last session, list exactly what I should implement next in priority order with file names and specific functions to modify.

The immediate pending tasks are:
1. Migrate claims.js to renderStatusStep() + completedSteps to-do mode (reference: sales.js)
2. Migrate servicing.js to to-do mode
3. Migrate recruitment.js to to-do mode
4. Team Dashboard: hierarchy view + agent stats
5. Dashboard: pipeline chart and analytics widgets

Only after providing the analysis above, ask for confirmation before beginning implementation.

Live site: https://davinci1986.github.io/lifeplanners/
Local files: C:\Users\Keith\todo-dashboard\
Preview server: defined in .claude/launch.json (server name: "lifeplanner")
Default login: username=admin password=admin
Git push: git push origin master:main (local=master, remote=main)
Git commit: git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "..."
```

---

## Notes for New Session

- **Glass design** — all cards use `var(--glass)` + `backdrop-filter: var(--glass-blur)`. Do NOT use hardcoded rgba() values for backgrounds.
- **SheetJS CDN** loaded in index.html — check `typeof XLSX !== 'undefined'` before Excel operations
- **Preview server** — use `mcp__Claude_Preview__preview_start` with name `"lifeplanner"`
- **Screenshot tool** — `preview_screenshot` times out with glass CSS (backdrop-filter causes headless renderer hang). Use `preview_snapshot` or `preview_eval` to verify instead. This is NOT a production issue.
- **existingInsurance on contacts** is an ARRAY — always `Array.isArray()` before using
- **`_blastFilter.insuranceFilter`** is an array `[]`, not a string — unique in that object
- **`confirmSetStatusWithDate()`** calls `toggleStepDone()` NOT `setStatus()` — do not revert
- **claims.js, servicing.js, recruitment.js** still use OLD linear rendering — to-do mode NOT applied yet
- **Gender field** exists in `DEFAULT_CRM_OPTIONS.genders` and contact form — verify still present in `renderContactForm()` in crm.js
- **Sound toggle** — `updateSoundBtn()` must be called after login (it's in `localLogin()` in app.js)
- **Import pending state** — `_importPending` module var in crm.js holds Excel import data between preview and confirm
- **Git push** — always `master:main` (local=master, remote branch=main)
- **Hard refresh** needed after push — GitHub Pages caches aggressively; tell user Ctrl+Shift+R
