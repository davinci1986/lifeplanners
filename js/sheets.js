/* ============================================
   Google Sheets API — Data Layer
   All data stored in one spreadsheet with
   separate sheets per category.
   ============================================ */

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

// Sheet definitions: name → [header columns]
const SHEET_DEFS = {
  Users:       ['email','name','role','manager_email','agent_code','status','created_at'],
  Contacts:    ['id','owner_email','name','phone','email_addr','nric','dob','occupation','notes','tags','created_at','updated_at'],
  Cases:       ['id','owner_email','contact_id','contact_name','category','label','sub_label','current_status','status_history','remarks','priority','kiv','follow_up','premiums','examinations','recruit_programs','fieldwork','custom_fields','next_step','closed_date','created_at','updated_at'],
  Reminders:   ['id','owner_email','case_id','contact_name','category','title','date','time','done','created_at'],
  TeamActivity:['id','actor_email','action','target_email','category','details','timestamp']
};

/* ---- FETCH HELPER ---- */
async function sheetsFetch(url, options = {}) {
  if (!GAUTH.accessToken) throw new Error('Not authenticated');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + GAUTH.accessToken,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ---- SPREADSHEET SETUP ---- */
// Default central Sheet — so a brand-new device opens the SAME spreadsheet
// instead of creating its own empty one.
const DEFAULT_SHARED_SHEET_ID = '1yqD5ypEvsRjPim3iAnyMFmNRQPIjFfwAc9MacHZHGYE';

async function sheetsEnsureSpreadsheet() {
  // Shared sheet ID takes priority (admin-configured central sheet)
  let sharedId = localStorage.getItem('lp_shared_sheet_id');
  if (!sharedId) {
    sharedId = DEFAULT_SHARED_SHEET_ID;
    localStorage.setItem('lp_shared_sheet_id', sharedId);
  }
  if (sharedId) {
    localStorage.setItem('sheets_id', sharedId);
  }

  // Check if we already have an ID stored
  let sid = localStorage.getItem('sheets_id');
  if (sid) {
    GAUTH.spreadsheetId = sid;
    try {
      // Verify it still exists
      await sheetsFetch(`${SHEETS_API}/${sid}?fields=spreadsheetId`);
      await sheetsEnsureAllSheets();
      await sheetsLoadUsersCache();
      return sid;
    } catch (e) {
      console.warn('Stored spreadsheet not accessible, creating new one');
      localStorage.removeItem('sheets_id');
    }
  }

  // Create new spreadsheet
  const body = {
    properties: { title: 'LifePlanner Pro — Data' },
    sheets: Object.keys(SHEET_DEFS).map(name => ({
      properties: { title: name }
    }))
  };
  const res = await sheetsFetch(SHEETS_API, { method: 'POST', body: JSON.stringify(body) });
  GAUTH.spreadsheetId = res.spreadsheetId;
  localStorage.setItem('sheets_id', res.spreadsheetId);

  // Write headers to each sheet
  for (const [sheetName, headers] of Object.entries(SHEET_DEFS)) {
    await sheetsUpdate(sheetName, 'A1', [headers]);
  }
  showToast('📊 Google Sheets database created!', 'success');
  return res.spreadsheetId;
}

async function sheetsEnsureAllSheets() {
  // Get existing sheet names
  const res = await sheetsFetch(`${SHEETS_API}/${GAUTH.spreadsheetId}?fields=sheets.properties.title`);
  const existing = (res.sheets || []).map(s => s.properties.title);
  const missing = Object.keys(SHEET_DEFS).filter(n => !existing.includes(n));
  if (missing.length === 0) return;

  // Add missing sheets
  const requests = missing.map(title => ({ addSheet: { properties: { title } } }));
  await sheetsFetch(`${SHEETS_API}/${GAUTH.spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests })
  });
  // Write headers
  for (const name of missing) {
    await sheetsUpdate(name, 'A1', [SHEET_DEFS[name]]);
  }
}

/* ---- READ / WRITE ---- */
async function sheetsReadAll(sheetName) {
  const res = await sheetsFetch(
    `${SHEETS_API}/${GAUTH.spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:ZZ`
  );
  const rows = res.values || [];
  return rows.slice(1); // Skip header row
}

async function sheetsAppend(sheetName, rows) {
  return sheetsFetch(
    `${SHEETS_API}/${GAUTH.spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) }
  );
}

async function sheetsUpdate(sheetName, range, rows) {
  return sheetsFetch(
    `${SHEETS_API}/${GAUTH.spreadsheetId}/values/${encodeURIComponent(sheetName)}!${range}?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values: rows }) }
  );
}

async function sheetsFindAndUpdate(sheetName, idColIndex, id, newRow) {
  const all = await sheetsReadAll(sheetName);
  const rowIdx = all.findIndex(r => r[idColIndex] === id);
  if (rowIdx === -1) return sheetsAppend(sheetName, [newRow]);
  const sheetRow = rowIdx + 2; // +1 for header, +1 for 1-based
  return sheetsUpdate(sheetName, `A${sheetRow}`, [newRow]);
}

async function sheetsClear(sheetName, rowIndex) {
  // Mark a row as deleted (soft delete) by clearing it
  const sheetRow = rowIndex + 2;
  return sheetsUpdate(sheetName, `A${sheetRow}:A${sheetRow}`, [['__DELETED__']]);
}

/* ---- USERS CACHE ---- */
async function sheetsLoadUsersCache() {
  try {
    DB._usersCache = await sheetsReadAll('Users');
  } catch (e) {
    DB._usersCache = [];
  }
}

/* ---- SYNC DB → SHEETS ---- */
let _syncTimer = null;

function startSheetsSync() {
  // Initial sync: push local data to Sheets
  syncLocalToSheets();
}

async function syncLocalToSheets() {
  if (!GAUTH.accessToken || !GAUTH.spreadsheetId) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(async () => {
    try {
      await pushContactsToSheets();
      await pushCasesToSheets();
      await pushRemindersToSheets();
      showSyncStatus('synced');
    } catch (e) {
      console.warn('Sync error:', e);
      showSyncStatus('error', e.message);
    }
  }, 2000);
}

// Batch sync: ONE read + ONE update + ONE append per sheet (quota-friendly).
// Old version did a full sheet read per item — 143 contacts = 143 reads,
// which always exceeded Google's 60 reads/min quota and never finished.
async function pushRowsBatch(sheetName, items, toRow) {
  if (items.length === 0) return;
  const existing = await sheetsReadAll(sheetName);
  const idToSheetRow = new Map();
  existing.forEach((r, i) => idToSheetRow.set(r[0], i + 2)); // +1 header, +1 1-based

  const updates = [];
  const appends = [];
  for (const item of items) {
    const row = toRow(item);
    const sheetRow = idToSheetRow.get(item.id);
    if (sheetRow) updates.push({ range: `${sheetName}!A${sheetRow}`, values: [row] });
    else appends.push(row);
  }

  if (updates.length > 0) {
    await sheetsFetch(`${SHEETS_API}/${GAUTH.spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data: updates })
    });
  }
  if (appends.length > 0) {
    await sheetsAppend(sheetName, appends);
  }
}

function contactToRow(c) {
  return [
    c.id, c.ownerEmail||currentUserEmail()||'', c.name, c.phone||'',
    c.email||'', c.nric||'', c.dob||'', c.occupation||'', c.notes||'',
    JSON.stringify(c.tags||[]), c.createdAt, c.updatedAt
  ];
}

function caseToRow(c) {
  return [
    c.id, c.ownerEmail||currentUserEmail()||'', c.contactId||'', c.contactName||'',
    c.category||'', c.label||'', c.subLabel||'', String(c.currentStatus||1),
    JSON.stringify(c.statusHistory||[]), c.remarks||'',
    String(c.priority||false), String(c.kiv||false), String(c.followUp||false),
    JSON.stringify(c.premiums||[]), JSON.stringify(c.examinations||[]),
    JSON.stringify(c.recruitPrograms||[]), JSON.stringify(c.fieldwork||[]),
    JSON.stringify(c.customFields||{}), c.nextStep||'', c.closedDate||'',
    c.createdAt, c.updatedAt
  ];
}

function reminderToRow(r) {
  return [
    r.id, r.ownerEmail||currentUserEmail()||'', r.caseId||'', r.contactName||'',
    r.category||'', r.title||'', r.date||'', r.time||'',
    String(r.done||false), r.createdAt
  ];
}

async function pushContactsToSheets() {
  await pushRowsBatch('Contacts', getContacts().filter(c => shouldSyncItem(c)), contactToRow);
}

async function pushCasesToSheets() {
  await pushRowsBatch('Cases', getCases().filter(c => shouldSyncItem(c)), caseToRow);
}

async function pushRemindersToSheets() {
  await pushRowsBatch('Reminders', getReminders().filter(r => shouldSyncItem(r)), reminderToRow);
}

function shouldSyncItem(item) {
  // Only sync items owned by current user (others' items synced by them)
  const owner = item.ownerEmail || item.owner_email || '';
  return !owner || owner === currentUserEmail();
}

/* ---- PULL SHEETS → LOCAL (for managers) ---- */
async function pullTeamDataFromSheets() {
  if (!GAUTH.currentUser) return;
  const role = GAUTH.currentUser.role;
  if (role === 'agent') return; // agents only see own data

  try {
    showSyncStatus('loading');
    const [sheetContacts, sheetCases, sheetReminders] = await Promise.all([
      sheetsReadAll('Contacts'),
      sheetsReadAll('Cases'),
      sheetsReadAll('Reminders')
    ]);

    // Merge team data into local DB
    mergeSheetData('contacts', sheetContacts, sheetRowToContact);
    mergeSheetData('cases', sheetCases, sheetRowToCase);
    mergeSheetData('reminders', sheetReminders, sheetRowToReminder);

    saveDB();
    renderCurrentPage();
    updateBadges();
    showSyncStatus('synced');
    showToast(`Team data loaded from Sheets`, 'success');
  } catch (e) {
    console.warn('Pull failed:', e);
    showSyncStatus('error');
  }
}

function mergeSheetData(collection, rows, converter) {
  rows.forEach(row => {
    if (!row[0] || row[0] === '__DELETED__') return;
    const item = converter(row);
    if (!item) return;
    // Only add if owner is visible to me
    if (!canViewUser(item.ownerEmail || item.owner_email || '')) return;
    const idx = DB[collection].findIndex(x => x.id === item.id);
    if (idx === -1) DB[collection].push(item);
    else if (new Date(item.updatedAt||0) > new Date(DB[collection][idx].updatedAt||0)) {
      DB[collection][idx] = item;
    }
  });
}

/* ---- PULL OWN DATA (all roles, incl. agents) — runs on login so a fresh
        device rebuilds its local DB from the Sheet ---- */
async function pullMyDataFromSheets() {
  if (!GAUTH.accessToken || !GAUTH.spreadsheetId) return;
  const myEmail = (currentUserEmail() || '').toLowerCase();
  try {
    showSyncStatus('loading');
    const [sheetContacts, sheetCases, sheetReminders] = await Promise.all([
      sheetsReadAll('Contacts'),
      sheetsReadAll('Cases'),
      sheetsReadAll('Reminders')
    ]);
    mergeMyRows('contacts', sheetContacts, sheetRowToContact, myEmail);
    mergeMyRows('cases', sheetCases, sheetRowToCase, myEmail);
    mergeMyRows('reminders', sheetReminders, sheetRowToReminder, myEmail);
    saveDB();
    renderCurrentPage();
    updateBadges();
    if (typeof refreshSidebarCategories === 'function') refreshSidebarCategories();
    showSyncStatus('synced');
  } catch (e) {
    console.warn('Pull (own) failed:', e);
    showSyncStatus('error');
  }
}

// Merge rows that belong to me OR have no owner (legacy data); newest wins.
function mergeMyRows(collection, rows, converter, myEmail) {
  rows.forEach(row => {
    if (!row[0] || row[0] === '__DELETED__') return;
    const item = converter(row);
    if (!item) return;
    const owner = (item.ownerEmail || item.owner_email || '').toLowerCase();
    if (owner && owner !== myEmail) return; // someone else's row — skip
    const idx = DB[collection].findIndex(x => x.id === item.id);
    if (idx === -1) DB[collection].push(item);
    else if (new Date(item.updatedAt||0) > new Date(DB[collection][idx].updatedAt||0)) {
      DB[collection][idx] = item;
    }
  });
}

/* ---- ROW CONVERTERS ---- */
function sheetRowToContact(r) {
  try {
    return {
      id:r[0], ownerEmail:r[1], name:r[2], phone:r[3], email:r[4],
      nric:r[5], dob:r[6], occupation:r[7], notes:r[8],
      tags:JSON.parse(r[9]||'[]'), createdAt:r[10], updatedAt:r[11]
    };
  } catch { return null; }
}

function sheetRowToCase(r) {
  try {
    return {
      id:r[0], ownerEmail:r[1], contactId:r[2], contactName:r[3],
      category:r[4], label:r[5], subLabel:r[6], currentStatus:Number(r[7])||1,
      statusHistory:JSON.parse(r[8]||'[]'), remarks:r[9],
      priority:r[10]==='true', kiv:r[11]==='true', followUp:r[12]==='true',
      premiums:JSON.parse(r[13]||'[]'), examinations:JSON.parse(r[14]||'[]'),
      recruitPrograms:JSON.parse(r[15]||'[]'), fieldwork:JSON.parse(r[16]||'[]'),
      customFields:JSON.parse(r[17]||'{}'), nextStep:r[18], closedDate:r[19],
      createdAt:r[20], updatedAt:r[21]
    };
  } catch { return null; }
}

function sheetRowToReminder(r) {
  try {
    return {
      id:r[0], ownerEmail:r[1], caseId:r[2], contactName:r[3],
      category:r[4], title:r[5], date:r[6], time:r[7],
      done:r[8]==='true', createdAt:r[9]
    };
  } catch { return null; }
}

/* ---- SYNC STATUS ---- */
function showSyncStatus(status, msg = '') {
  const dot = document.getElementById('gdDot');
  const txt = document.getElementById('gdText');
  if (!dot || !txt) return;
  const map = {
    synced:  { color:'#34C759', text:'✓ Synced to Sheets' },
    saving:  { color:'#007AFF', text:'Saving...' },
    loading: { color:'#FF9500', text:'Loading team data...' },
    error:   { color:'#FF3B30', text: msg || 'Sync error' }
  };
  const s = map[status] || map.synced;
  dot.style.background = s.color;
  txt.textContent = s.text;
}

/* ---- USERS MANAGEMENT API ---- */
async function sheetsGetAllUsers() {
  const rows = await sheetsReadAll('Users');
  return rows.filter(r => r[0] && r[0] !== '__DELETED__').map(r => ({
    email: r[0], name: r[1], role: r[2]||'agent',
    manager_email: r[3]||'', agent_code: r[4]||'', status: r[5]||'active'
  }));
}

async function sheetsUpdateUser(email, data) {
  const rows = await sheetsReadAll('Users');
  const idx = rows.findIndex(r => r[0]?.toLowerCase() === email.toLowerCase());
  const row = [
    email, data.name||'', data.role||'agent', data.manager_email||'',
    data.agent_code||'', data.status||'active', data.created_at||new Date().toISOString()
  ];
  if (idx === -1) {
    await sheetsAppend('Users', [row]);
  } else {
    await sheetsUpdate('Users', `A${idx+2}`, [row]);
  }
  await sheetsLoadUsersCache();
}

async function sheetsInviteUser(email, name, role, managerEmail) {
  await sheetsUpdateUser(email, { name, role, manager_email: managerEmail, status: 'active' });
  showToast(`${name} added as ${getRoleLabel(role)}`, 'success');
}
