---
name: lifeplanner-dev
description: Make code changes to the LifePlanner Pro repo by driving Claude Code from chat, then commit, push and deploy to GitHub Pages. Use when Keith asks to fix a bug, change the UI, add a feature, or deploy the app from Telegram.
---

# Driving LifePlanner Pro development

Keith can ask for code changes from Telegram. You run Claude Code against the repo on this host,
show him the diff, and deploy only when he confirms.

Repo: `~/projects/lifeplanners` · Live: https://davinci1986.github.io/lifeplanners/

## Flow

1. `git fetch origin && git status` — confirm clean, on `master`, up to date.
2. `git checkout -b hermes/<short-description>` — **always a branch, never work on master directly.**
3. Run Claude Code with his request, plus the constraints below.
4. **Send him the diff summary in Telegram and wait for an explicit yes.**
5. Merge to `master`, commit, push, tell him to hard-refresh in ~2 min.

```bash
git -c user.name="Keith" -c user.email="chongwei1986@gmail.com" commit -m "..."
git push origin master:main       # local master → remote main. Not a typo.
```

GitHub Pages takes ~2 minutes; users need Ctrl+Shift+R.

## Hard rules — these break production

Read `CLAUDE.md`, `ARCHITECTURE.md` and `DEVELOPMENT_RULES.md` before the first change of a session.
The ones that bite:

- `existingInsurance` and `aiaPolicies` are **always arrays** — `Array.isArray()` before use.
- `confirmSetStatusWithDate()` calls `toggleStepDone()`, **not** `setStatus()`.
- `_blastFilter.insuranceFilter` is `[]`, not `''`.
- Glass CSS: `var(--glass)` only — never a hardcoded `rgba()`.
- `escHtml()` every piece of user content in template literals.
- `saveDB()` after every mutation. `saveUser()` / `localLogin()` are async (hashing).
- No build step, no framework, no bundler. Plain HTML/CSS/JS, loaded in order from `index.html`.
- `backdrop-filter` hangs headless browsers — use snapshots, not screenshots.

## Never without asking

- **Never push to `main` without Keith's explicit confirmation in the chat.** Not "he probably
  wants it" — an actual yes, for that specific change.
- **Never touch `js/sheets.js` sync logic unattended.** It is the one place a bug silently destroys
  client data instead of throwing.
- Never commit secrets: `BRIDGE_TOKEN`, `GROQ_API_KEY`, `BOT_TOKEN`, `.env`.
- Never force-push. Never rewrite published history.
- Never bump the Apps Script deployment without telling him — it changes the web app URL and breaks
  both the in-app AI Assistant and this bridge.

## Reporting back

Telegram, not a terminal. Keep it to: what changed, which files, anything risky, and the one-line
ask for approval. If a change touches sync, auth or the Sheet schema, say so loudly — those are the
ones worth him reading properly before saying yes.
