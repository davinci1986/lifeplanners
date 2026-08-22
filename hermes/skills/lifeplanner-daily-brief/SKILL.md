---
name: lifeplanner-daily-brief
description: Produce Keith's morning LifePlanner brief — today's due follow-ups, overdue items, KIV list, priority cases, stalled claims and client birthdays. Use for the scheduled 8am push, or whenever he asks "what's on today", "anything overdue", or "what should I chase".
---

# Daily brief

One bridge call, one Telegram message. Keith reads this on his phone between appointments — it has
to be scannable in ten seconds.

## Fetch

```json
{ "lp": "brief", "token": "$LIFEPLANNER_BRIDGE_TOKEN", "asUser": "$LIFEPLANNER_ADMIN_EMAIL" }
```

Returns `due`, `overdue`, `kiv`, `priority`, `birthdays` in one round trip. Then a second call for
stalled work:

```json
{ "lp": "query", "token": "...", "asUser": "...", "what": "stale", "days": 14 }
```

## Format

```
☀️ Tuesday 22 Aug

🔴 OVERDUE (2)
• Tan Ah Kow — claim, Pending Memo — 5 days late
• Lim Siew Ling — servicing, Send Link — 2 days late

📌 TODAY (3)
• 10:00 Wong Kar Wai — sales, Closing Appointment
• 14:00 Siti Aminah — fact-finding
• Ravi Kumar — call re: policy summary

🎂 Birthday: Chong Mei Ling

⏳ Stalled 14+ days (2)
• Ahmad Faizal — recruitment, Candidate Consider
• Grace Tan — snapwill, Follow Up on Credit

💡 Nothing else needs you today.
```

## Rules

1. **Overdue first, always.** It is the only section that costs money when ignored.
2. **Skip empty sections entirely.** Do not print "OVERDUE (0)" — it's noise that trains him to
   stop reading.
3. **Cap each section at 8 items**, then "…and 4 more". A wall of text gets ignored.
4. **Step numbers → labels.** See the `lifeplanner-crm` skill for the mapping.
5. **Never invent an item to pad the brief.** A quiet day is good news; say so in one line.
6. **No NRIC, no full phone numbers.** Ever, including in a brief only Keith sees — that's how it
   stays a habit.
7. If the bridge errors, send the error plainly: *"Brief failed: unauthorized."* Silence looks
   identical to a quiet day, and that's the dangerous failure mode.

## Follow-through

After the brief, offer *one* concrete next action — the highest-value overdue item — and offer to
draft the WhatsApp for it. Don't offer five things; he's between appointments.
