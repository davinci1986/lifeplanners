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
- C:\Users\Keith\todo-dashboard\js\aisolution.js
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
- Critical data structure changes from last session (existingInsurance as array, completedSteps[], insuranceFilter as array)
- Patterns already in place I should use (not reinvent)
- The exact state of features (completed vs in-progress vs pending)

## 4. Current Project State
What was the last thing done? What is interrupted/incomplete?

## 5. Risk Analysis
Top 5 things most likely to go wrong if I start coding carelessly.
Pay special attention to:
- existingInsurance being an ARRAY not a string
- insuranceFilter being an ARRAY in _blastFilter (all other fields are strings)
- confirmSetStatusWithDate() now calls toggleStepDone() not setStatus()
- completedSteps[] drives to-do mode, currentStatus = max done step
- claims/servicing/recruitment do NOT yet use to-do mode

## 6. Execution Plan
Given the interrupted tasks from the last session, list exactly what I should implement next in priority order with file names and specific functions to modify.

The immediate pending tasks are:
1. QUICK FIX — Gender field missing from CRM contact form (renderContactForm in crm.js + saveContact in crm.js)
2. Migrate claims.js to use renderStatusStep() + completedSteps to-do mode
3. Migrate servicing.js to use renderStatusStep() + completedSteps to-do mode
4. Migrate recruitment.js to use renderStatusStep() + completedSteps to-do mode
5. Team Dashboard flesh out (hierarchy view, agent stats)

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

- **SheetJS CDN** is loaded in index.html — `typeof XLSX !== 'undefined'` before using export
- **Preview server** use `mcp__Claude_Preview__preview_start` with name `"lifeplanner"`
- Use `preview_eval` to test JS functions in browser without reloading
- Use `preview_screenshot` to verify UI changes
- **existingInsurance** on contacts is an ARRAY — always `Array.isArray()` before using
- **`_blastFilter.insuranceFilter`** is an array `[]`, not a string — unique in that object
- **`confirmSetStatusWithDate()`** calls `toggleStepDone()` NOT `setStatus()` — do not revert
- **claims.js, servicing.js, recruitment.js** still use OLD linear rendering — to-do mode NOT applied
- **Gender field** exists in `DEFAULT_CRM_OPTIONS.genders` and `createContact()` but NOT in the contact form
- Force push is blocked by Claude Code auto-mode — use merge strategy if needed
