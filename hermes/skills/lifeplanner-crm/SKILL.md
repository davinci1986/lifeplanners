---
name: lifeplanner-crm
description: Query Keith's LifePlanner Pro CRM — contacts, cases, follow-ups, KIV list, claims and sales pipeline — through the Apps Script bridge. Use whenever asked about clients, cases, follow-ups, who to chase, pipeline status, or anything about the insurance book.
---

# LifePlanner CRM access

LifePlanner Pro is a browser-only CRM for a Malaysian AIA advisor. Data lives in a shared Google
Sheet. You reach it through an Apps Script bridge — never through the browser app, and never by
guessing.

## Calling the bridge

`POST $LIFEPLANNER_BRIDGE_URL` with `Content-Type: text/plain;charset=utf-8` (this avoids a CORS
preflight Apps Script won't answer). Body is JSON:

```json
{
  "lp": "query",
  "token": "$LIFEPLANNER_BRIDGE_TOKEN",
  "asUser": "$LIFEPLANNER_ADMIN_EMAIL",
  "what": "kiv",
  "limit": 60
}
```

`asUser` is mandatory — the bridge scopes results by it and **fails closed** (returns nothing) if
it's missing. Never omit it hoping to see more.

### `what` values

| Value | Returns |
|---|---|
| `summary` | All visible cases |
| `kiv` | Cases flagged KIV (keep in view) |
| `priority` | Priority-flagged cases |
| `followup` | Cases flagged for follow-up |
| `category` | Add `"category": "sales"` etc. |
| `search` | Add `"q": "tan"` — matches contact name, remarks, next step |
| `stale` | Add `"days": 14` — untouched, still open |

Other actions: `{"lp":"brief"}` (everything the morning brief needs in one call),
`{"lp":"team"}` (roster + activity, managers/admin only).

## The data model

Eight case categories, each a numbered to-do flow. `status` is the **step number** — translate it
before speaking to a human. "Status 5" means nothing to Keith; "Closed / Proposed Case" does.

**sales:** 1 Approached · 2 Fact-Finding · 3 Policy Summary · 4 Closing Appointment ·
5 Closed / Proposed Case · 6 Cementing Session · 7 Ask for Referrals · 8 KIV Listing

**claims:** 1 Ask for Receipts & Bill & IC · 2 Pending Submission / Account Login ·
3 Submitted Claim · 4 Checked Status (7 working days) · 5 Checking Again · 6 Pending Memo ·
7 Send Requirement Needed · 8 Submit Pending Memo · 9 Pending Memo Follow-Up · 10 Claim Completed

**servicing:** 1 Fill Up Forms · 2 Send Link · 3 Reminder to Approve · 4 Check Status ·
5 Pending Memo · 6 Send Requirement Needed · 7 Submit Pending Memo · 8 Pending Memo Follow-Up ·
9 Status Approved

**recruitment:** 1 Approached · 2 Fact-Finding · 3 Recruitment Closing Appointment ·
4 Candidate Consider · 5 Candidate Agreed · 6 Candidate KIV

**onboarding:** 1 Key in Be A Life Planner · 2 Arrange Examination · 3 Do 20 Names Hotlist ·
4 Onboarding Training · 5 Policy Review Strategy · 6 Fieldwork · 7 Fieldwork Closed Case ·
8 Examination Complete · 9 Completed Onboarding

**snapwill:** 1 Approached · 2 Set Appointment · 3 Meet Up and Explained ·
4 Follow Up on Credit / Solution · 5 Closed Snapwill Case · 6 KIV

**aisolution** and **others** have user-defined steps — read `label` from the response instead of
assuming.

These are *to-do* flows: a case tracks completed steps, so "at step 4" means steps 1–3 are done.

## Rules

1. **Never invent.** No policy numbers, premiums, claim outcomes, or clients not in the response.
   If the bridge returns nothing, say "nothing came back" — do not fill the silence.
2. **Never ask for NRIC or full phone numbers.** The bridge masks them deliberately. If Keith needs
   a full number he opens the app.
3. **Translate step numbers to labels** in every human-facing sentence.
4. **Lead with the answer.** "3 claims stuck at Pending Memo: Tan, Lim, Wong" — not a preamble.
5. **Money is RM.** Dates are `YYYY-MM-DD`.
6. On `{"ok": false}`, report the exact error. `unauthorized` = wrong/missing token;
   `writes disabled` = expected until Phase 2.

## Drafting client messages

When asked for a WhatsApp draft: warm, brief, no jargon, no hard sell. Match the client's likely
language (English / Bahasa / Mandarin) from their name and area if it's obvious; ask if it isn't.
Never state a coverage amount or premium that didn't come from the bridge.
