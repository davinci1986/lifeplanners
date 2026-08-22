# Hermes Agent — Setup Plan for LifePlanner Pro

**Status:** Plan only. Nothing installed, no app code changed.
**Owner:** Keith (chongwei1986@gmail.com)
**Target agent:** [Hermes Agent](https://github.com/NousResearch/hermes-agent) by Nous Research (open source, MIT).

---

## 1. What Hermes actually is

Hermes is **not** another chat window. It is an always-on service you host, that:

- receives instructions over Telegram / WhatsApp / Discord / CLI,
- runs tool calls on the machine it lives on (terminal, browser, files, HTTP),
- keeps persistent memory across sessions, and
- **writes its own skills** after finishing a complex task, so it gets better the more you use it.

That last part is the reason it's worth doing for you. Your Apps Script bot has 6 hardcoded
commands. Hermes learns "the way Keith chases a claim" once and then does it.

**What it is not:** it is not magic and not free of risk. It has terminal access to whatever box
it runs on, and it will be holding Malaysian client data (names, ages, income, policy status).
Section 7 covers that.

---

## 2. Decisions already locked

| Decision | Choice | Why |
|---|---|---|
| Install now? | **No — plan only** | This document + the files beside it are the deliverable. You run the installer when you're ready. |
| Model provider | **Nous Portal (OAuth)** | `hermes setup --portal` — no API keys to paste or leak, 300+ models incl. Claude/GPT/Gemini, and it clears the 64k-context requirement. |
| Scope | **Everything, phased** | Sheet read/write, daily Telegram brief, replace the Apps Script bot, control the repo through Claude, handle the agent team. Phases 0→5 below. |

**Model note:** do *not* try to run Hermes on your existing Groq free-tier key. Hermes requires
≥64,000 tokens of context for multi-step tool loops, and you are already hitting 429s on Groq with
a single-shot chat call (commit `d746362`). Groq stays where it is — powering the in-app AI
Assistant. Hermes gets its own provider. They don't compete.

---

## 3. Where it should run

You deferred this, so here is the decision when you get to it:

| Option | Cost | Verdict |
|---|---|---|
| **Windows PC** (`iex (irm https://hermes-agent.nousresearch.com/install.ps1)`) | Free | Fine for Phase 0–1. **Fails Phase 2+**: the daily 8am brief and overnight follow-up chasing don't fire when the laptop is closed. |
| **Ubuntu VPS** (Hetzner / DigitalOcean / Contabo, 2 vCPU / 4GB) | ~RM25–45/mo | **Recommended from Phase 2 on.** True 24/7, survives reboots via systemd, and your clients get replies whether or not you're at the desk. |
| **Docker on PC** | Free | Good throwaway trial. Same lights-out limitation. |

Suggested path: **install on the Windows PC first to learn it (Phase 0–1), then move to a VPS
before turning on writes and schedules.** `~/.hermes/` is portable — you copy the folder over.

---

## 4. Architecture

The important design call: **Hermes talks to your data through your existing Apps Script web app,
not through raw Google OAuth.**

```
   Telegram (you + staff)
          │
          ▼
   ┌──────────────┐   HTTPS + shared secret   ┌────────────────────┐
   │ Hermes Agent │ ────────────────────────► │  Apps Script       │
   │  (VPS/PC)    │ ◄──────────────────────── │  web app (bridge)  │
   └──────┬───────┘        JSON               └─────────┬──────────┘
          │                                             │
          │ terminal / git / browser                    │ SpreadsheetApp
          ▼                                             ▼
   lifeplanners repo                          Shared Google Sheet
   (Claude Code, deploys)                     1yqD5yp…HGYE
                                                        ▲
                                                        │ existing sync
                                              LifePlanner Pro (browser)
```

**Why the bridge and not direct Sheets API access:**

1. The Apps Script is already authorised as you — no service account, no OAuth consent screen, no
   `credentials.json` sitting on a rented VPS.
2. One choke point for auth, owner-filtering, redaction and audit logging.
3. If Hermes misbehaves, you revoke **one** token, not a Google identity.
4. It reuses the helpers already in `telegram_bot.gs` (`getSheet`, `todayStr`, `isDone`…).

Files provided: `hermes/bridge/lifeplanner_bridge.gs` — paste as a second file into the *same*
Apps Script project, then add one line to `doPost`.

---

## 5. Two problems in the current code that block Phase 2

Both verified against the live source. **Blocker 2 is now fixed** (see below); blocker 1 is still
open.

### 5.1 The Apps Script web app is completely unauthenticated 🔴

`telegram_bot.gs:12` routes `ai`, `otp:send` and `otp:verify` with **no secret check**, and the
web app URL is hardcoded in `js/ai.js:6` — which is published on GitHub Pages. Today that means
anyone who reads your repo can burn your Groq quota and spam your Telegram with login codes.

The moment you add *write* endpoints to that URL, "annoying" becomes "a stranger can edit your
client cases." So:

> **Prerequisite for Phase 2:** add `BRIDGE_TOKEN` and reject any `lp:*` call without it.
> Already implemented in `hermes/bridge/lifeplanner_bridge.gs` (`authOk()` — SHA-256 digest
> compare, not a plain `==`). Separately worth adding the same guard to `ai`/`otp`.

### 5.2 The browser blindly overwrites the Sheet ✅ FIXED

`pushRowsBatch()` (`js/sheets.js:179`) writes local rows over sheet rows **by id, with no
`updated_at` comparison**. The pull side (`mergeMyRows`) is newest-wins, but the pull only runs on
login.

Failure case, concretely: Hermes moves a claim to status 8 at 10:00. Your browser has been open
since 08:00 holding a stale copy. At 11:00 you edit any unrelated contact → `saveDB()` →
`syncLocalToSheets()` pushes **every** case you own, including the stale one → **Hermes's update is
silently gone.** No error, no conflict, no trace.

**Fixed** in commit *"Fix silent data loss: sync no longer overwrites newer Sheet rows"*.
`pushRowsBatch` now compares each row against the sheet's `updated_at` before pushing. Rows the
Sheet knows better are skipped and merged back into the local DB, so the next edit builds on the
newer version rather than the stale one. A genuine local edit still always wins, because
`updateContact()` and `updateCase()` stamp `updatedAt`.

Worth knowing: this bug already affected you across devices — phone and laptop open at once could
lose an edit exactly the same way. Hermes only made it easier to notice.

Two limits to be aware of:

- **`Reminders` is still unguarded** — that sheet has no `updated_at` column, so there's nothing to
  compare. It's append-only from the bridge, so it isn't a live risk, but marking a reminder done
  from two places can still race. Adding the column is a schema change for another day.
- The corrected data lands in the local DB **without forcing a re-render** (a re-render would wipe
  a form you're mid-way through typing), so a stale-looking screen refreshes on the next natural
  render, not instantly.

---

## 6. The phases

Each phase has an exit test. Don't start the next one until the test passes.

### Phase 0 — Hermes running, app untouched (≈30 min)

1. Install:
   - Windows: `iex (irm https://hermes-agent.nousresearch.com/install.ps1)`
   - Linux/VPS: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash` then `source ~/.bashrc`
   - Only hard prerequisite is `git`; the installer brings Python 3.11, Node and ffmpeg.
2. `hermes setup --portal` → OAuth login, no API key.
3. `hermes --tui` → confirm the banner shows your model.
4. Smoke test: *"What's my disk usage?"* and `/help`.
5. Telegram gateway:
   - @BotFather → `/newbot` → **make a NEW bot.** Do not reuse the LifePlanner bot token; both
     processes would long-poll the same bot and steal each other's messages.
   - @userinfobot → your numeric user ID.
   - `hermes gateway setup` → pick Telegram → paste token + your ID.
   - `hermes gateway` → message it privately.

**Exit test:** the new bot replies to you in Telegram, and only to you.

### Phase 1 — Read-only LifePlanner (≈45 min)

1. Add `lifeplanner_bridge.gs` to the Apps Script project, set `BRIDGE_TOKEN` to a long random
   string, redeploy the web app (**new version**, not just save).
2. Put the URL + token in `~/.hermes/.env` (see `hermes/env.example`).
3. Copy `hermes/skills/lifeplanner-crm/` into `~/.hermes/skills/`.
4. Ask it in Telegram: *"Who's due for follow-up today?"*, *"Any claims stuck at pending memo?"*,
   *"Which of my clients have no insurance and earn above 5k?"*

**Exit test:** answers match what the app shows. Cross-check three names by hand — if Hermes
invents one client, stop and fix the skill before going further.

### Phase 2 — Writes + the daily brief (≈1 hr)

1. ~~Land the `pushRowsBatch` timestamp guard~~ — done. Add the token check to the existing
   `ai` / `otp` routes (§5.1) before going live.
2. Enable the write endpoints in the bridge (`lp:'update'`, `lp:'reminder'`).
3. Install `hermes/skills/lifeplanner-daily-brief/`.
4. Set `TELEGRAM_HOME_CHANNEL` to your chat ID so scheduled results land somewhere.
5. Schedule the 8:00am brief: due follow-ups, overdue cases, KIV list, birthdays, stalled claims.

**Exit test:** ask it to move one *test* case to the next step. Reload the app on a second device
and confirm the change survived a browser sync cycle. Use a dummy contact, not a real client.

### Phase 3 — Retire the Apps Script bot commands (≈30 min)

`/due /kiv /summary /search /overdue /priority` become natural language:
*"anything overdue?"*, *"what's happening with Mr Tan?"*, *"draft a WhatsApp for the 3 clients
whose claims are stuck."*

Keep `telegram_bot.gs` deployed and unchanged for at least two weeks as fallback. It costs nothing
to leave running, and you'll want it the first time the VPS reboots mid-day.

**Exit test:** two weeks with zero reaches for the old bot.

### Phase 4 — Control the project through Claude (≈45 min)

This is your "control my project through Claude as well". Hermes has terminal access, so it can
drive Claude Code against the repo:

- clone `lifeplanners` on the host,
- from Telegram: *"ask Claude to fix the follow-ups tab sorting and push it"*,
- Hermes runs Claude Code → commit → `git push origin master:main` → GitHub Pages redeploys.

Skill: `hermes/skills/lifeplanner-dev/`. It encodes your `CLAUDE.md` rules — the `master:main`
push, the commit identity, the array-typed `existingInsurance`, `var(--glass)`, `escHtml()`.

**Guardrails, non-negotiable:** never auto-push to `main` without you confirming in the chat;
always branch; never touch `js/sheets.js` sync logic unattended.

**Exit test:** one trivial change (a label typo) goes from Telegram message to live site, with you
approving the push.

### Phase 5 — Handle the staff (≈1 hr)

Your `Users` sheet already has `email / name / role / manager_email / agent_code / status`, with
roles `admin`, `district_manager`, `unit_manager`, `agent`. Hermes becomes role-aware:

- add each agent's Telegram ID to `TELEGRAM_ALLOWED_USERS`;
- the bridge scopes every query by `owner_email`, so an agent sees only their own book;
- you (admin) can ask across the whole downline: *"who hasn't touched a case in 14 days?"*,
  *"which unit closed the most this month?"*;
- weekly team digest pushed to each manager.

**Exit test:** log in as one agent's Telegram ID and confirm they **cannot** read another agent's
clients. Test this deliberately before rollout — this is the one that ends careers if it leaks.

---

## 7. Client data, honestly

You are putting Malaysian PDPA-covered data (names, NRIC, income, health-adjacent claim details) on
a machine you rent. Before Phase 2:

- **Never send NRIC or full phone numbers through the bridge.** The provided bridge masks both by
  default — keep it that way. Your `buildCRMContext()` in `js/ai.js` already makes this call
  correctly; the bridge matches it.
- **VPS in Singapore or Malaysia**, not US, for latency and for the shorter conversation with a
  compliance officer.
- **Full-disk encryption + SSH keys only**, password auth off.
- **The Nous Portal provider sees whatever you send it.** If that's not acceptable for client
  detail, the local-Ollama route (zero egress) exists — slower and needs a real GPU, but it's the
  honest answer to "does client data leave the building".
- Keep `BRIDGE_TOKEN` out of the repo. `hermes/env.example` is a template; the real `.env` lives
  only in `~/.hermes/`.

---

## 8. Cost

| Item | Monthly |
|---|---|
| Hermes Agent itself | RM0 (MIT, self-hosted) |
| VPS (from Phase 2) | RM25–45 |
| Nous Portal model usage | Usage-based; budget RM40–80 for one advisor's daily use |
| Groq (existing in-app AI) | RM0 — unchanged |
| **Total** | **≈RM65–125/mo** |

Sanity check: that's roughly one case's commission. If Phase 2 stops you dropping *one* follow-up a
month, it pays for itself.

---

## 9. Rollback

Every phase reverses cleanly:

- **Phase 0–1:** `hermes gateway stop`, delete `~/.hermes/`. Nothing in the repo changed.
- **Phase 2:** blank `BRIDGE_TOKEN` in Apps Script and redeploy → every write endpoint 403s
  instantly. The app keeps working; it never knew the bridge existed.
- **Phase 3:** the old bot is still deployed. Re-point BotFather, done.
- **Phase 4:** it's git. Revert the commit.
- **Phase 5:** empty `TELEGRAM_ALLOWED_USERS` down to just your ID.

---

## 10. Files in this folder

| File | Purpose |
|---|---|
| `SETUP_PLAN.md` | This document |
| `env.example` | Template for `~/.hermes/.env` |
| `config.example.yaml` | Template for `~/.hermes/config.yaml` |
| `bridge/lifeplanner_bridge.gs` | Token-authed Apps Script bridge — read + write + team |
| `skills/lifeplanner-crm/` | Teaches Hermes your data model and how to query it |
| `skills/lifeplanner-daily-brief/` | The 8am push |
| `skills/lifeplanner-dev/` | Driving Claude Code against this repo |
| `skills/lifeplanner-team/` | Role-aware staff handling |

Nothing here is wired up. It activates only when you run the Phase 0 installer.
