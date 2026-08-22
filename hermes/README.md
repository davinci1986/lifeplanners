# Hermes Agent — LifePlanner Pro integration

Planning artifacts for putting [Hermes Agent](https://github.com/NousResearch/hermes-agent) in
front of LifePlanner Pro. **Nothing here is active.** No app code is changed and nothing is
installed; these files sit inert until the Phase 0 installer is run.

**Start with [`SETUP_PLAN.md`](SETUP_PLAN.md).**

| File | Purpose |
|---|---|
| `SETUP_PLAN.md` | The phased plan, prerequisites, costs, risks, rollback |
| `env.example` | Template for `~/.hermes/.env` (secrets) |
| `config.example.yaml` | Template for `~/.hermes/config.yaml` (settings + schedules) |
| `bridge/lifeplanner_bridge.gs` | Token-authed Apps Script bridge: read, write, team |
| `skills/lifeplanner-crm/` | Data model + query rules |
| `skills/lifeplanner-daily-brief/` | The 8am Telegram push |
| `skills/lifeplanner-team/` | Role-scoped staff handling |
| `skills/lifeplanner-dev/` | Driving Claude Code against this repo |

Two blockers must be cleared before Hermes gets write access — both are existing issues in the
current codebase, documented in `SETUP_PLAN.md` §5.
