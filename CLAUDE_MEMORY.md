# CLAUDE_MEMORY — LifePlanner Pro

Durable facts and gotchas. Current as of 2026-06-21. (ALPP scraper internals → `ARCHIVE.md`.)

## The rules that break everything if wrong
```
1. existingInsurance / aiaPolicies → ALWAYS ARRAY. Array.isArray() before use.
2. confirmSetStatusWithDate() → toggleStepDone() NOT setStatus()
3. _blastFilter.insuranceFilter → [] not ''
4. All case modules in to-do mode (completedSteps[])
5. git push → master:main (not master:master)
6. saveDB() after every mutation (it also pushes to Sheets + Drive)
```

## Architecture decisions (don't re-debate)
- Vanilla JS + `innerHTML` template literals + `escHtml()`. No framework.
- One file per module. New features go in the owning module — exception: genuinely new surfaces get their own file (e.g. `js/ai.js`).
- `DB` singleton in memory; `saveDB()` persists + syncs.
- Inline `onclick="fn('${id}')"` in templates (no addEventListener for dynamic content).
- Glass CSS: `var(--glass)` + `var(--glass-blur)`; never hardcode `rgba()`.
- localStorage = per-device truth; Google Sheets = cross-device sync; Drive = backup.

## Multi-device sync (current)
```
Shared sheet: DEFAULT_SHARED_SHEET_ID = '1yqD5ypEvsRjPim3iAnyMFmNRQPIjFfwAc9MacHZHGYE' (sheets.js)
  → a device with no stored Sheet ID opens THIS one (never creates a duplicate).
Login: await pullMyDataFromSheets()  // owner-filtered, ALL roles (agents not blocked)
     → pullTeamDataFromSheets() → startSheetsSync()
mergeMyRows(collection, rows, converter, myEmail): keep my-owned + legacy(no-owner) rows; newest updatedAt wins.
saveDB() → localStorage + gdScheduleSave() (Drive) + syncLocalToSheets() (Sheets push, if token).
Requires Google Sheets API enabled on the linked Cloud project.
```

## AI Assistant (Groq, free) + Telegram bot — Apps Script proxy
```
One Apps Script web app (telegram_bot.gs) serves both.
doPost(e): update.ai === true → handleAIProxy(); else Telegram command routing.
handleAIProxy(): POST Groq /openai/v1/chat/completions, model 'llama-3.3-70b-versatile',
  Authorization: Bearer GROQ_API_KEY; returns {ok, text} JSON via ContentService.
Front-end js/ai.js:
  aiProxyCall(messages, system, maxTokens) → fetch exec URL, Content-Type text/plain
    (text/plain avoids the CORS preflight; Apps Script JSON stays readable).
  buildCRMContext() → privacy-safe digest (NO NRIC, NO full phone).
  Features: chat (aiSend), aiGenerateWhatsApp, aiGenerateSummary, quick prompts.
  Page renderAIAssistant → PAGE_MAP key 'aiassistant' (app.js); nav item in index.html;
  <script src="js/ai.js"> loads before reminders.js.
AI_PROXY_URL_DEFAULT in ai.js = the Apps Script exec URL (overridable via DB.settings.aiProxyUrl).
Apps Script constants (deployed editor only; blank in local file): BOT_TOKEN, ALLOWED_CHAT_ID, SPREADSHEET_ID, GROQ_API_KEY.
NOTE: any edit to the Apps Script needs a manual REDEPLOY (Deploy → Manage deployments → ✏️ → New version).
```

## CRM UX (current)
```
crmSearchInput(val): 180ms debounce → renderCRMList() (repaints #crmListArea + #crmCount only, not whole page).
crmSort: 'name' | 'newest' | 'birthday' (sortCRMContacts()).
Per-row quick actions: 📱 wa.me + 📞 tel: (event.stopPropagation so row onclick doesn't fire).
Follow-ups tab: getDueReminders + getStaleCasesList (CRM_STALE_DAYS=14) + upcoming birthdays;
  getFollowUpCount() → tab badge; renderFollowUps() renders 3 sections.
```

## Contact schema (`data.js` createContact)
```js
{
  id, ownerEmail, name, phone, email, nric, dob, occupation, employer, nationality,
  notes, tags[], race, stayArea, state, maritalStatus, dependants,
  jobType, income, langPref, gender, religion,
  existingInsurance[],   // ⚠️ ARRAY of insurer names e.g. ['AIA','Prudential']
  aiaPolicies[],         // ARRAY — AIA policy details
  referralSource, socialMedia, createdAt, updatedAt
}
```

## To-do mode flow (all modules)
```
renderStatusStep → completedSteps.includes(n)?
  YES → green checked (click → handleStepClick → uncheck)
  NO  → click → openSetStatusWithDate → confirmSetStatusWithDate
            → toggleStepDone()         // NOT setStatus()
            → checkStepAutoReminder()  // if step.autoReminder
            → currentStatus = max(completedSteps)
Recruitment: after step 3 renderConsiderChoices → handleConsiderChoice → toggleStepDone;
  step 5 (Agreed) → checkAutoTransfer creates onboarding case; step 6 (KIV) → reactivateFromKIV.
Snapwill: renderCaseDetail({...c, category:'snapwill'}, contact) so multi-category shows Snapwill steps.
```

## Security layer
```
hashPassword(pwd) → 'sha256:' + hex (SubtleCrypto). verifyPassword handles sha256: + legacy plaintext.
Brute-force: localStorage['lp_lockout'] = {count, username, until}; 5 fails → 15 min.
Auto-logout: 30 min inactivity → localLogout()/gauthSignOut(); start/stopAutoLogout().
saveUser() and localLogin() are async (await hashing).
```

## Multi-category cases
```
category = primary (drives status steps); categories[] = all (drives which pages show it).
getCases('snapwill') → c.category==='snapwill' OR c.categories.includes('snapwill').
```

## Timing-sensitive init
```
Script order: data.js → utils.js → sounds.js → [page modules incl. crm.js, ai.js] → reminders.js → app.js
loadDB() at bottom of data.js. updateSoundBtn() in localLogin() ONLY (sounds.js not ready in loadDB).
gauthInit() always on DOMContentLoaded (not gated on local session).
```

## Tool notes (not app bugs)
- `preview_screenshot` hangs on `backdrop-filter` → use `preview_snapshot`.
- Editing the Apps Script via Chrome MCP: a sticky "signed in as…" Google popup blocks Deploy; dismiss its OK button (sometimes via JS click) and dispatch Ctrl+S as a real keydown to save before deploying.
- Chrome MCP tab group is separate from the user's Chrome — `select_browser` + `tabs_context_mcp` before tab actions.

## Identity merge (current)
```
currentUserEmail() in data.js = GAUTH.currentUser?.email || LOCAL_AUTH.currentUser?.email || ''.
Used for ownerEmail (createContact/Case/Reminder) + Sheets ownership/pull filter (sheets.js).
admin.email = chongwei1986@gmail.com → local admin login and Google login share one owner = one dataset.
```

## Will Referral Network (referrals.js)
```
Each will-named person → createContact({referredBy: ownerContactId, referralRole, referralStatus,
  referralType:'snapwill', referralCaseId, referralRelationship}). The referredBy chain = the tree.
Roles: executor, replacement_executor, beneficiary, guardian, replacement_guardian, witness, other.
Status: named→contacted→appointment→client→declined.
Capture: renderWillReferralSection(caseId, ownerContactId) injected into openSnapwillCase (snapwill.js).
Page 'referrals' (renderReferralNetwork): tree (renderTreeNode recursion) | 3D (3d-force-graph CDN, load3DNetwork) | by-role.
getDirectReferrals/getReferralsForCase/countDownline/getAllReferrals helpers.
```

## Telegram OTP 2FA
```
Toggle: Admin Panel → Login Security → DB.settings.twoFactor = 'telegram' | 'off' (default off).
localLogin(): password ok → if twoFactor==='telegram' → startOtpChallenge(user); else completeLocalLogin(user).
OTP overlay (#otpOverlay) built in app.js: startOtpChallenge → showOtpScreen → verifyOtp → completeLocalLogin.
Proxy (telegram_bot.gs): {otp:'send'} → handleOtpSend (6-digit in CacheService 'otp_'+nonce 300s, sendMessage to ALLOWED_CHAT_ID, returns nonce); {otp:'verify',nonce,code} → handleOtpVerify.
Caveat: gate is client-side (static site) — code is server-verified but the step is bypassable by editing JS. Good-enough, not bank-grade.
```

## Open items (see SESSION_SUMMARY for detail)
- Redeploy Apps Script to activate AI proxy; roll the Groq key (shown in chat).
- Decide on ALPP live sync (no public API; scraper→import only).
- Verify legacy Snapwill-steps and label-UID bugs.
