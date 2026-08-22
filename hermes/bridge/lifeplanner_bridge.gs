/**
 * LifePlanner Pro — Hermes Agent bridge
 * ------------------------------------------------------------------
 * Add this as a SECOND file in the SAME Apps Script project as
 * telegram_bot.gs (it reuses getSheet / todayStr / toDateStr / isDone /
 * isTrue / jsonOut / sendMessage from there), then add ONE line to the
 * top of doPost():
 *
 *     if (update.lp) return handleBridge(update);
 *
 * ...and redeploy the web app as a NEW VERSION (Deploy > Manage
 * deployments > edit > New version). Saving alone does not publish.
 *
 * SECURITY: every call must carry a matching `token`. The web app URL is
 * public (it is committed in js/ai.js), so the token is the ONLY thing
 * standing between a stranger and your client book. Use 40+ random chars
 * and never commit it.
 */

// ── CONFIG ────────────────────────────────────────────────────────
const BRIDGE_TOKEN  = '';     // ← paste a long random string (40+ chars)
const BRIDGE_WRITES = false;  // ← leave false until js/sheets.js has the
                              //    pushRowsBatch timestamp guard (see
                              //    SETUP_PLAN.md §5.2), or Hermes's edits
                              //    get silently overwritten by the browser.

// Column indices — must match SHEET_DEFS in js/sheets.js
const C = { id:0, owner:1, contactId:2, contactName:3, category:4, label:5,
            subLabel:6, status:7, history:8, remarks:9, priority:10, kiv:11,
            followUp:12, premiums:13, exams:14, programs:15, fieldwork:16,
            custom:17, nextStep:18, closedDate:19, createdAt:20, updatedAt:21 };
const K = { id:0, owner:1, name:2, phone:3, email:4, nric:5, dob:6,
            occupation:7, notes:8, tags:9, createdAt:10, updatedAt:11 };
const R = { id:0, owner:1, caseId:2, contactName:3, category:4, title:5,
            date:6, time:7, done:8, createdAt:9 };
const U = { email:0, name:1, role:2, manager:3, agentCode:4, status:5, createdAt:6 };

// ── ROUTER ────────────────────────────────────────────────────────
function handleBridge(data) {
  if (!authOk(data)) return jsonOut({ ok: false, error: 'unauthorized' });
  try {
    switch (data.lp) {
      case 'query':    return lpQuery(data);
      case 'brief':    return lpBrief(data);
      case 'team':     return lpTeam(data);
      case 'update':   return lpUpdate(data);
      case 'reminder': return lpReminder(data);
      default:         return jsonOut({ ok: false, error: 'unknown lp action: ' + data.lp });
    }
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

/** Digest compare so a wrong token cannot be recovered byte-by-byte from timing. */
function authOk(data) {
  if (!BRIDGE_TOKEN) return false;               // unset = bridge disabled
  var a = sha256(String(data.token || ''));
  var b = sha256(BRIDGE_TOKEN);
  return a === b;
}
function sha256(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ((b & 0xFF) + 0x100).toString(16).slice(1); }).join('');
}

// ── SCOPING ───────────────────────────────────────────────────────
/**
 * Which owner_emails may the caller see?
 * - agent            → only themselves
 * - unit/district mgr → themselves + direct reports
 * - admin            → everyone
 * Hermes passes `asUser` (the Telegram user's mapped email). If it is
 * absent we fail CLOSED with an empty scope rather than leaking the book.
 */
function visibleOwners(asUser) {
  var me = String(asUser || '').toLowerCase();
  if (!me) return [];
  var users = getSheet('Users').getDataRange().getValues().slice(1);
  var mine = users.filter(function (u) { return String(u[U.email]).toLowerCase() === me; })[0];
  var role = mine ? String(mine[U.role] || 'agent') : 'agent';
  if (role === 'admin') return users.map(function (u) { return String(u[U.email]).toLowerCase(); });
  if (role === 'unit_manager' || role === 'um' ||
      role === 'district_manager' || role === 'dm') {
    var team = users.filter(function (u) { return String(u[U.manager] || '').toLowerCase() === me; })
                    .map(function (u) { return String(u[U.email]).toLowerCase(); });
    team.push(me);
    return team;
  }
  return [me];
}
function ownedBy(row, ownerCol, scope) {
  var owner = String(row[ownerCol] || '').toLowerCase();
  if (!owner) return true;                        // legacy unowned rows
  return scope.indexOf(owner) !== -1;
}

// ── PRIVACY ───────────────────────────────────────────────────────
// Never let NRIC or a full phone number leave this script. Matches the
// posture of buildCRMContext() in js/ai.js.
function maskPhone(p) {
  p = String(p || '');
  return p.length > 4 ? '•••• ' + p.slice(-4) : '';
}

// ── READ ──────────────────────────────────────────────────────────
function lpQuery(data) {
  var scope  = visibleOwners(data.asUser);
  var cases  = getSheet('Cases').getDataRange().getValues().slice(1)
                 .filter(function (r) { return r[C.id] && r[C.id] !== '__DELETED__' &&
                                               ownedBy(r, C.owner, scope); });
  var what   = String(data.what || 'summary');
  var today  = todayStr();
  var out;

  switch (what) {
    case 'kiv':
      out = cases.filter(function (r) { return isTrue(r[C.kiv]); }); break;
    case 'priority':
      out = cases.filter(function (r) { return isTrue(r[C.priority]); }); break;
    case 'followup':
      out = cases.filter(function (r) { return isTrue(r[C.followUp]); }); break;
    case 'category':
      out = cases.filter(function (r) { return String(r[C.category]) === String(data.category); }); break;
    case 'search':
      var q = String(data.q || '').toLowerCase();
      out = cases.filter(function (r) {
        return (String(r[C.contactName]) + ' ' + String(r[C.remarks]) + ' ' +
                String(r[C.nextStep])).toLowerCase().indexOf(q) !== -1;
      });
      break;
    case 'stale':
      var days = Number(data.days || 14);
      var cut  = new Date(); cut.setDate(cut.getDate() - days);
      out = cases.filter(function (r) {
        var u = toDateStr(r[C.updatedAt]);
        return u && new Date(u) < cut && !r[C.closedDate];
      });
      break;
    default:
      out = cases;
  }

  return jsonOut({ ok: true, today: today, count: out.length,
                   cases: out.slice(0, Number(data.limit || 60)).map(caseOut) });
}

function caseOut(r) {
  return {
    id: r[C.id], owner: r[C.owner], contact: r[C.contactName],
    category: r[C.category], status: Number(r[C.status] || 1),
    label: r[C.label], remarks: r[C.remarks], nextStep: r[C.nextStep],
    priority: isTrue(r[C.priority]), kiv: isTrue(r[C.kiv]),
    followUp: isTrue(r[C.followUp]),
    closed: !!r[C.closedDate], updatedAt: toDateStr(r[C.updatedAt])
  };
}

/** Everything the morning brief needs, in one round trip. */
function lpBrief(data) {
  var scope = visibleOwners(data.asUser);
  var today = todayStr();

  var rems = getSheet('Reminders').getDataRange().getValues().slice(1)
    .filter(function (r) { return r[R.id] && ownedBy(r, R.owner, scope) && !isDone(r[R.done]); });
  var due     = rems.filter(function (r) { return toDateStr(r[R.date]) === today; });
  var overdue = rems.filter(function (r) { var d = toDateStr(r[R.date]); return d && d < today; });

  var cases = getSheet('Cases').getDataRange().getValues().slice(1)
    .filter(function (r) { return r[C.id] && r[C.id] !== '__DELETED__' && ownedBy(r, C.owner, scope); });

  // Birthdays today (MM-DD match), phone masked, NRIC never included.
  var md = today.slice(5);
  var bdays = getSheet('Contacts').getDataRange().getValues().slice(1)
    .filter(function (r) { return r[K.id] && ownedBy(r, K.owner, scope) &&
                                  String(r[K.dob] || '').slice(5) === md; })
    .map(function (r) { return { name: r[K.name], phone: maskPhone(r[K.phone]) }; });

  return jsonOut({
    ok: true, today: today,
    due:      due.map(remOut),
    overdue:  overdue.map(remOut),
    kiv:      cases.filter(function (r) { return isTrue(r[C.kiv]); }).map(caseOut),
    priority: cases.filter(function (r) { return isTrue(r[C.priority]); }).map(caseOut),
    birthdays: bdays
  });
}
function remOut(r) {
  return { id: r[R.id], contact: r[R.contactName], category: r[R.category],
           title: r[R.title], date: toDateStr(r[R.date]), time: r[R.time] };
}

/** Roster + per-agent activity counts. Admin/manager only, by scope. */
function lpTeam(data) {
  var scope = visibleOwners(data.asUser);
  if (scope.length <= 1) return jsonOut({ ok: false, error: 'no team visibility for this user' });

  var users = getSheet('Users').getDataRange().getValues().slice(1)
    .filter(function (u) { return scope.indexOf(String(u[U.email]).toLowerCase()) !== -1; });
  var cases = getSheet('Cases').getDataRange().getValues().slice(1)
    .filter(function (r) { return r[C.id] && r[C.id] !== '__DELETED__'; });

  return jsonOut({ ok: true, today: todayStr(), team: users.map(function (u) {
    var email = String(u[U.email]).toLowerCase();
    var mine  = cases.filter(function (r) { return String(r[C.owner]).toLowerCase() === email; });
    var last  = mine.map(function (r) { return toDateStr(r[C.updatedAt]) || ''; }).sort().pop() || '';
    return {
      email: email, name: u[U.name], role: u[U.role],
      manager: u[U.manager], status: u[U.status],
      openCases: mine.filter(function (r) { return !r[C.closedDate]; }).length,
      closedCases: mine.filter(function (r) { return !!r[C.closedDate]; }).length,
      lastActivity: last
    };
  })});
}

// ── WRITE ─────────────────────────────────────────────────────────
/**
 * Update ONE case. Only the safe fields — never category, owner or id.
 * Bumps updated_at so the browser's newest-wins pull picks it up.
 */
function lpUpdate(data) {
  if (!BRIDGE_WRITES) return jsonOut({ ok: false, error: 'writes disabled (BRIDGE_WRITES=false)' });
  var scope = visibleOwners(data.asUser);
  var sheet = getSheet('Cases');
  var rows  = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][C.id]) !== String(data.caseId)) continue;
    if (!ownedBy(rows[i], C.owner, scope)) return jsonOut({ ok: false, error: 'not yours' });

    var row = rows[i].slice();
    if (data.status   !== undefined) row[C.status]   = String(data.status);
    if (data.remarks  !== undefined) row[C.remarks]  = String(data.remarks);
    if (data.nextStep !== undefined) row[C.nextStep] = String(data.nextStep);
    if (data.kiv      !== undefined) row[C.kiv]      = String(!!data.kiv);
    if (data.priority !== undefined) row[C.priority] = String(!!data.priority);
    if (data.followUp !== undefined) row[C.followUp] = String(!!data.followUp);
    row[C.updatedAt] = new Date().toISOString();

    sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
    logActivity(data.asUser, 'hermes_update', data.caseId, rows[i][C.category],
                JSON.stringify({ status: data.status, kiv: data.kiv }));
    return jsonOut({ ok: true, updated: caseOut(row) });
  }
  return jsonOut({ ok: false, error: 'case not found: ' + data.caseId });
}

/** Create a reminder. Low-risk write — append only, nothing overwritten. */
function lpReminder(data) {
  if (!BRIDGE_WRITES) return jsonOut({ ok: false, error: 'writes disabled (BRIDGE_WRITES=false)' });
  var scope = visibleOwners(data.asUser);
  if (!scope.length) return jsonOut({ ok: false, error: 'unknown user' });

  var id  = 'rem_' + Utilities.getUuid().slice(0, 8);
  var now = new Date().toISOString();
  getSheet('Reminders').appendRow([
    id, String(data.asUser).toLowerCase(), data.caseId || '', data.contactName || '',
    data.category || '', data.title || 'Follow-up', data.date || todayStr(),
    data.time || '09:00', 'false', now
  ]);
  logActivity(data.asUser, 'hermes_reminder', data.caseId || '', data.category || '', data.title || '');
  return jsonOut({ ok: true, id: id });
}

/** Audit trail — every Hermes write lands in TeamActivity. */
function logActivity(actor, action, target, category, details) {
  try {
    getSheet('TeamActivity').appendRow([
      'act_' + Utilities.getUuid().slice(0, 8), String(actor || '').toLowerCase(),
      action, target || '', category || '', details || '', new Date().toISOString()
    ]);
  } catch (e) { /* audit must never break the write */ }
}
