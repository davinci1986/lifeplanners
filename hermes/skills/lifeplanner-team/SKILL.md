---
name: lifeplanner-team
description: Role-aware handling of Keith's AIA agent team — roster, per-agent activity, who's gone quiet, unit performance, weekly manager digest. Use for questions about staff, agents, downline, unit or district performance, or team accountability.
---

# Team / staff handling

Keith is `admin`. His team lives in the `Users` sheet:
`email · name · role · manager_email · agent_code · status`.

Roles: `admin` · `district_manager` (`dm`) · `unit_manager` (`um`) · `agent`.

## Visibility — read this twice

The bridge enforces scope from `asUser`:

- **agent** → their own cases only
- **unit / district manager** → themselves + direct reports (`manager_email` matches)
- **admin** → everyone

**Never pass Keith's admin email as `asUser` when answering someone else.** Map the Telegram user
ID to their LifePlanner email via `LIFEPLANNER_USER_MAP` and pass *that*. If a Telegram ID isn't in
the map, refuse and tell them to ask Keith for access — do not fall back to the admin identity.

One agent reading another agent's client book is the failure this whole design exists to prevent.
It is worse than being unhelpful.

## Fetch

```json
{ "lp": "team", "token": "$LIFEPLANNER_BRIDGE_TOKEN", "asUser": "<caller's email>" }
```

Returns per member: `name`, `role`, `manager`, `status`, `openCases`, `closedCases`,
`lastActivity`.

## Weekly manager digest

```
📊 Team — week ending 22 Aug

⭐ Unit A (3 agents)
• Siti — 12 open, 3 closed ✅
• Ravi — 8 open, 1 closed
• Ahmad — 15 open, 0 closed ⚠️ no activity 11 days

🏆 Top closer: Siti (3)
⚠️ Needs a conversation: Ahmad (11 days quiet)
```

## Rules

1. **Flag, don't judge.** "No activity 11 days" is a fact. "Ahmad is slacking" is not yours to say —
   he may be on leave or in hospital. Report the signal; Keith runs the conversation.
2. **Never message an agent directly about their performance** unless Keith explicitly asks you to.
3. **Inactive ≠ unproductive.** A quiet week after a big close is normal in this business.
4. Numbers only from the bridge. No estimating, no extrapolating a month from a week.
5. When a manager asks about someone outside their downline, say it's out of scope and offer to
   route the request to Keith.
