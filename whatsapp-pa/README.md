# 🤖 JARVIS — WhatsApp Personal Assistant (24/7)

Your Iron-Man-style PA for WhatsApp. It runs on a small server, stays online
24 hours, and works like this:

```
Client messages you on WhatsApp
        │
        ▼
JARVIS (this service, linked as a WhatsApp "Linked Device")
        │  reads the message + recent conversation
        ▼
Groq AI drafts 3 replies (warm / professional / short)
        │
        ▼
Telegram notification on your phone:
   💬 Mr Tan: "Hi Keith, how do I claim for my hospitalisation?"
   🤖 Suggested replies: 1 / 2 / 3
   [Send 1] [Send 2] [Send 3]
        │
        ▼
Tap a button → JARVIS sends that reply on WhatsApp for you.
Or reply to the notification with your own text → JARVIS sends that instead.
```

No Claude desktop, no PC needed — just your phone with Telegram.

---

## ⚠️ Read this first

- This uses the **WhatsApp Web protocol** (same as WhatsApp Web in a browser)
  via the open-source Baileys library. It is **not an official WhatsApp API**.
  WhatsApp's terms don't allow automation, and accounts doing spammy things
  can get **banned**. JARVIS only *reads* your messages and sends replies
  *you explicitly tap* — low risk in practice — but understand the risk to
  your WhatsApp number before running it. Don't add bulk/auto-send features.
- Your WhatsApp session key is stored in the `auth/` folder on the server.
  Anyone with that folder can read your WhatsApp — keep the server private,
  never commit `auth/` or `.env` to git (already in `.gitignore`).
- Your phone must stay registered on WhatsApp (linked-device model), but it
  does **not** need to be online for JARVIS to work.

---

## Setup (15 minutes)

### 1. Create a dedicated Telegram bot

Your existing LifePlanner bot uses a **webhook** (Apps Script), and one bot
cannot do webhook + polling at the same time — so JARVIS needs its own bot:

1. Message **@BotFather** on Telegram → `/newbot` → name it e.g. `Keith JARVIS PA`.
2. Copy the token → `TELEGRAM_BOT_TOKEN`.
3. Your chat ID is the same one already in `telegram_bot.gs` → `TELEGRAM_CHAT_ID`.
4. Open your new bot and press **Start** (bots can't message you first).

### 2. Groq key

Reuse the same free Groq API key (`gsk_...`) from the LifePlanner AI
Assistant → `GROQ_API_KEY`.

### 3. Pick a 24/7 home for JARVIS

Any always-on box with Node.js 18+ works. Best options, easiest first:

| Host | Cost | Notes |
|---|---|---|
| **Railway.app** | ~USD 5/mo | Easiest. Deploy from GitHub, add a **volume** mounted at `/app/auth`, set env vars, done. |
| **Fly.io** | ~free–2/mo | `fly launch` with the included Dockerfile, `fly volumes create jarvis_auth`, mount at `/app/auth`. |
| **Oracle Cloud Always-Free VPS** | Free forever | Small ARM VM; install Node 20, run with `pm2`. Most work to set up, zero cost. |
| **Old Android phone / spare PC at home** | Free | Termux (Android) or Node on Windows with `pm2` + auto-start. Fine if your home internet is stable. |

> ❌ Render's free tier **sleeps** after inactivity — JARVIS would go offline.
> Don't use free Render; the health endpoint on `PORT` exists so paid PaaS
> health checks pass.

### 4. Deploy

**VPS / home PC:**

```bash
cd whatsapp-pa
cp .env.example .env        # fill in the 3 keys
npm install
npx pm2 start index.js --name jarvis   # pm2 = auto-restart, survives reboots
npx pm2 save && npx pm2 startup
```

**Railway / Fly (Docker):** point it at this `whatsapp-pa/` folder, set the
env vars in the dashboard, and mount a persistent volume at `/app/auth`.

### 5. Link WhatsApp (one time)

On first start, JARVIS sends a **QR code photo to your Telegram**.
On your phone: WhatsApp → **Settings → Linked Devices → Link a Device** →
scan the QR from the Telegram photo. That's it — the session is saved and
survives restarts. If WhatsApp ever logs the session out, JARVIS
automatically sends you a fresh QR on Telegram.

---

## Client-aware replies (CRM + ALPP data)

With `CRM_PROXY_URL` + `CRM_PROXY_SECRET` set, JARVIS recognises **who** is
messaging you (matched by phone number against your LifePlanner CRM) and
drafts replies using their **actual data** — AIA plan names, policy status,
premiums, next due dates, and open case progress:

> 💬 **Tan Ah Kow** · 📇 *CRM: 2 AIA policies · 1 open case*
> "Keith, when is my premium due ah?"
>
> **1.** Hi Mr Tan! Your A-Life Med Regular premium is due on 15 Aug — I'll
> send you a reminder nearer the date. Anything else I can help with? 😊

**How the data flows (and how to keep it fresh):**

```
AIA ALPP portal ──(run alpp_scraper_pass3.js while logged in, ~monthly)──►
CRM (🔄 ALPP Enrich import) ──(auto Google Sheet sync)──►
JARVIS looks up client by phone at message time (cached 10 min)
```

⚠️ JARVIS deliberately does **not** log into ALPP/ALPA directly: AIA's agent
portal has no API, needs your agent credentials + OTP, and automating it
24/7 from a server would risk your agency compliance. The scraper-refresh
flow above gets the same data safely.

**Setup for this feature:**

1. In `telegram_bot.gs`, set `PA_SECRET` to a long random string and
   redeploy the Apps Script web app (New Deployment → same settings).
2. Set `CRM_PROXY_URL` (the web app `/exec` URL) and `CRM_PROXY_SECRET`
   (same string) on the JARVIS host.
3. Log into LifePlanner once on your browser so the updated sync pushes
   full profiles (with policies) to the Google Sheet.

The AI is instructed to answer client questions **only** from the CRM
record, to say "let me double-check" for amounts/claim decisions, and never
to guess. Note: the client's record is sent to Groq's API for drafting —
same as the existing LifePlanner AI Assistant.

## Daily use

| Action | How |
|---|---|
| Send a suggested reply | Tap **Send 1 / 2 / 3** under the notification |
| Send your own reply | **Reply** (swipe) to the notification with your text |
| Check it's alive | `/status` |
| See what clients ask most | `/insights` — 7/30-day breakdown by topic (claims, premiums, coverage, appointments…) + most active contacts |
| Silence it (meeting, night) | `/mute 90` (minutes) · `/unmute` |
| Include group chats | `/groups on` · `/groups off` (default off) |

Suggestions automatically match the client's language (English / Malay /
Chinese / Manglish) and come in three tones: warm, professional, and short.
The AI is told never to invent policy details — for policy questions it
drafts "let me check and get back to you" style replies.

## Configuration

All via environment variables — see `.env.example`. Notable ones:

- `WATCH_GROUPS=true` — also notify for group messages (noisy!)
- `MAX_MESSAGE_AGE_SEC=120` — ignore backlog older than this after a
  reconnect, so you don't get flooded
- `OWNER_NAME` / `OWNER_ROLE` — the persona used for drafting replies

## Troubleshooting

- **No QR arrives:** check the host logs; make sure you pressed **Start** on
  the new bot in Telegram.
- **"WhatsApp not connected" when tapping Send:** wait a few seconds
  (reconnecting) or check `/status`; if logged out, a new QR will arrive.
- **Buttons say "Expired":** the service restarted since that notification —
  just reply to the notification with your own text, or wait for their next
  message.
- **Flooded after downtime:** old messages are skipped by design
  (`MAX_MESSAGE_AGE_SEC`); only fresh messages notify.
