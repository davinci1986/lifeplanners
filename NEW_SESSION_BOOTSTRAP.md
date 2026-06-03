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

Also read the key source files to understand current state:
- C:\Users\Keith\todo-dashboard\js\app.js
- C:\Users\Keith\todo-dashboard\js\data.js
- C:\Users\Keith\todo-dashboard\js\utils.js
- C:\Users\Keith\todo-dashboard\js\sales.js
- C:\Users\Keith\todo-dashboard\js\snapwill.js

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
- Patterns already in place I should use (not reinvent)
- The exact state of features (completed vs in-progress vs pending)

## 4. Current Project State
What was the last thing done? What is interrupted/incomplete?

## 5. Risk Analysis
Top 5 things most likely to go wrong if I start coding carelessly.

## 6. Execution Plan
Given the interrupted tasks from the last session, list exactly what I should implement next in priority order with file names and specific functions to modify.

The interrupted tasks waiting to be done are:
1. Snapwill customer types — add multi-select types: Will, Memories, Subscription 199, Subscription 299, Leader Account, Affiliate, Business Partner, School Donation, Booth — plus ability to add new types
2. Label ID bug — when reusing a saved label in Edit Case, it generates a random alphabet ID instead of keeping the saved label. Fix in js/sales.js addLabelToCategory() and saveNewCase()
3. AI Solution category — new category with fully tailor-made, self-keyed progress/statuses, everything multi-select and customizable
4. Progress to-do list mode — all status steps should work as checkboxes in order (not forced sequential), user can tick any step in any order, like a to-do list
5. After all the above: git commit and push to https://github.com/davinci1986/lifeplanners (branch: main, local branch: master)

Only after providing the analysis above, ask for confirmation before beginning implementation.

Live site: https://davinci1986.github.io/lifeplanners/
Local files: C:\Users\Keith\todo-dashboard\
Preview server: npx serve -p 3030 . (launch.json config available)
Default login: username=admin password=admin
```

---

## Notes for New Session

- The project uses a **preview server** via `mcp__Claude_Preview__preview_start` with server name `"lifeplanner"` (defined in `.claude/launch.json`)
- Use `preview_eval` to test JS functions in the browser without reloading
- Use `preview_screenshot` to verify UI changes
- Git push command: `git push origin master:main` (local branch is `master`, remote is `main`)
- Commit with: `git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m @'...'@`
- Force push is **blocked** by Claude Code auto-mode — use merge strategy if needed
