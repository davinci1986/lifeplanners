/* ============================================
   Data Layer — localStorage CRUD
   ============================================ */

const DB_KEY = 'lifeplanner_v1';

const DB = {
  contacts: [],      // CRM contacts
  cases: [],         // All cases (sales, claims, servicing, etc.)
  reminders: [],     // Standalone reminders
  settings: { theme: 'light', notifySound: true }
};

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(DB, parsed);
    }
  } catch (e) { console.warn('DB load error', e); }
  ensureDefaults();
}

function saveDB() {
  try {
    // Stamp last-saved time so Drive can detect newer version
    if (!DB.settings) DB.settings = {};
    DB.settings._lastSaved = new Date().toISOString();
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    // Trigger Drive auto-save (debounced)
    if (typeof gdScheduleSave === 'function') gdScheduleSave();
  } catch (e) { console.warn('DB save error', e); }
}

function ensureDefaults() {
  if (!DB.contacts) DB.contacts = [];
  if (!DB.cases) DB.cases = [];
  if (!DB.reminders) DB.reminders = [];
  if (!DB.settings) DB.settings = {};
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- CONTACTS ---------- */
function getContacts() { return DB.contacts; }

function getContact(id) { return DB.contacts.find(c => c.id === id); }

function findOrCreateContact(name, phone = '') {
  // Try to find by name (case-insensitive)
  let c = DB.contacts.find(x => x.name.toLowerCase() === name.trim().toLowerCase());
  if (!c) {
    c = createContact({ name: name.trim(), phone });
  }
  return c;
}

function createContact(data) {
  const c = {
    id: uid(),
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    nric: data.nric || '',
    dob: data.dob || '',
    occupation: data.occupation || '',
    notes: data.notes || '',
    tags: data.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  DB.contacts.push(c);
  saveDB();
  return c;
}

function updateContact(id, data) {
  const idx = DB.contacts.findIndex(c => c.id === id);
  if (idx === -1) return null;
  DB.contacts[idx] = { ...DB.contacts[idx], ...data, updatedAt: new Date().toISOString() };
  saveDB();
  return DB.contacts[idx];
}

function deleteContact(id) {
  DB.contacts = DB.contacts.filter(c => c.id !== id);
  // Also remove linked cases
  DB.cases = DB.cases.filter(c => c.contactId !== id);
  saveDB();
}

function searchContacts(q) {
  const lower = q.toLowerCase();
  return DB.contacts.filter(c =>
    c.name.toLowerCase().includes(lower) ||
    (c.phone || '').includes(lower) ||
    (c.email || '').toLowerCase().includes(lower)
  );
}

/* ---------- CASES ---------- */
function getCases(category = null) {
  if (!category) return DB.cases;
  return DB.cases.filter(c => c.category === category);
}

function getCase(id) { return DB.cases.find(c => c.id === id); }

function getCasesForContact(contactId) {
  return DB.cases.filter(c => c.contactId === contactId);
}

function createCase(data) {
  const c = {
    id: uid(),
    contactId: data.contactId || null,
    contactName: data.contactName || '',
    category: data.category || 'others',
    label: data.label || '',          // B1-B5, C1-C8, etc.
    subLabel: data.subLabel || '',    // AIA / Snapwill for sales
    currentStatus: data.currentStatus || 1,
    statusHistory: data.statusHistory || [],
    remarks: data.remarks || '',
    reminders: data.reminders || [],
    priority: data.priority || false,
    kiv: data.kiv || false,
    followUp: data.followUp || false,
    premiums: data.premiums || [],            // [{plan, amount, company}]
    examinations: data.examinations || [],    // [{type, date, time, venue}]
    recruitPrograms: data.recruitPrograms || [],  // RintiZ, Next Gen, etc.
    fieldwork: data.fieldwork || [],
    closedDate: data.closedDate || null,
    customFields: data.customFields || {},
    nextStep: data.nextStep || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  DB.cases.push(c);
  saveDB();
  return c;
}

function updateCase(id, data) {
  const idx = DB.cases.findIndex(c => c.id === id);
  if (idx === -1) return null;
  DB.cases[idx] = { ...DB.cases[idx], ...data, updatedAt: new Date().toISOString() };
  saveDB();
  return DB.cases[idx];
}

function deleteCase(id) {
  DB.cases = DB.cases.filter(c => c.id !== id);
  saveDB();
}

function advanceCaseStatus(id, remark = '', nextStatus = null) {
  const c = getCase(id);
  if (!c) return null;
  const statusDef = getStatusDef(c.category);
  const maxStatus = statusDef ? statusDef.length : 10;
  const newStatus = nextStatus !== null ? nextStatus : Math.min(c.currentStatus + 1, maxStatus);

  const histEntry = {
    fromStatus: c.currentStatus,
    toStatus: newStatus,
    remark,
    date: new Date().toISOString()
  };
  const updated = updateCase(id, {
    currentStatus: newStatus,
    statusHistory: [...(c.statusHistory || []), histEntry]
  });
  return updated;
}

function setStatus(id, status, remark = '') {
  const c = getCase(id);
  if (!c) return null;
  const histEntry = {
    fromStatus: c.currentStatus,
    toStatus: status,
    remark,
    date: new Date().toISOString()
  };
  return updateCase(id, {
    currentStatus: status,
    statusHistory: [...(c.statusHistory || []), histEntry]
  });
}

/* ---------- REMINDERS ---------- */
function getReminders() { return DB.reminders || []; }

function addReminder(data) {
  const r = {
    id: uid(),
    caseId: data.caseId || null,
    contactId: data.contactId || null,
    contactName: data.contactName || '',
    category: data.category || '',
    title: data.title || '',
    date: data.date || '',       // ISO date string
    time: data.time || '09:00',
    done: false,
    createdAt: new Date().toISOString()
  };
  if (!DB.reminders) DB.reminders = [];
  DB.reminders.push(r);
  saveDB();
  return r;
}

function updateReminder(id, data) {
  const idx = DB.reminders.findIndex(r => r.id === id);
  if (idx === -1) return null;
  DB.reminders[idx] = { ...DB.reminders[idx], ...data };
  saveDB();
  return DB.reminders[idx];
}

function dismissReminder(id) {
  return updateReminder(id, { done: true });
}

function deleteReminder(id) {
  DB.reminders = DB.reminders.filter(r => r.id !== id);
  saveDB();
}

function getDueReminders() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  return (DB.reminders || []).filter(r => {
    if (r.done) return false;
    return r.date <= today;
  });
}

function getUpcomingReminders(days = 7) {
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + days);
  const today = now.toISOString().split('T')[0];
  const futureStr = future.toISOString().split('T')[0];
  return (DB.reminders || []).filter(r => {
    if (r.done) return false;
    return r.date >= today && r.date <= futureStr;
  });
}

/* ---------- STATUS DEFINITIONS ---------- */
const STATUS_DEFS = {
  sales: [
    { n: 1, label: 'Approached' },
    { n: 2, label: 'Fact-Finding' },
    { n: 3, label: 'Policy Summary' },
    { n: 4, label: 'Closing Appointment' },
    { n: 5, label: 'Closed / Proposed Case' },
    { n: 6, label: 'Cementing Session' },
    { n: 7, label: 'Ask for Referrals' },
    { n: 8, label: 'KIV Listing' }
  ],
  claims: [
    { n: 1, label: 'Ask for Receipts & Bill & IC' },
    { n: 2, label: 'Pending Submission / Account Login' },
    { n: 3, label: 'Submitted Claim', autoReminder: 7 },
    { n: 4, label: 'Checked Status (7 working days)' },
    { n: 5, label: 'Checking Again', customReminder: true },
    { n: 6, label: 'Pending Memo' },
    { n: 7, label: 'Send Requirement Needed' },
    { n: 8, label: 'Submit Pending Memo' },
    { n: 9, label: 'Pending Memo Follow-Up', autoReminder: 7 },
    { n: 10, label: 'Claim Completed' }
  ],
  servicing: [
    { n: 1, label: 'Fill Up Forms' },
    { n: 2, label: 'Send Link' },
    { n: 3, label: 'Reminder to Approve' },
    { n: 4, label: 'Check Status (7 working days)', autoReminder: 7 },
    { n: 5, label: 'Pending Memo' },
    { n: 6, label: 'Send Requirement Needed' },
    { n: 7, label: 'Submit Pending Memo' },
    { n: 8, label: 'Pending Memo Follow-Up', autoReminder: 7 },
    { n: 9, label: 'Status Approved' }
  ],
  recruitment: [
    { n: 1, label: 'Approached' },
    { n: 2, label: 'Fact-Finding' },
    { n: 3, label: 'Recruitment Closing Appointment' },
    { n: 4, label: 'Candidate Consider', autoReminder: 3, repeatReminder: true },
    { n: 5, label: 'Candidate Agreed' },
    { n: 6, label: 'Candidate KIV' }
  ],
  onboarding: [
    { n: 1, label: 'Key in Be A Life Planner', autoReminder: 90 },
    { n: 2, label: 'Arrange Examination' },
    { n: 3, label: 'Do 20 Names Hotlist', autoReminder: 5 },
    { n: 4, label: 'Onboarding Training' },
    { n: 5, label: 'Policy Review Strategy' },
    { n: 6, label: 'Fieldwork' },
    { n: 7, label: 'Fieldwork Closed Case' },
    { n: 8, label: 'Examination Complete' },
    { n: 9, label: 'Completed Onboarding' }
  ],
  snapwill: [
    { n: 1, label: 'Approached' },
    { n: 2, label: 'Set Appointment', hasDatetime: true },
    { n: 3, label: 'Meet Up and Explained' },
    { n: 4, label: 'Follow Up on Credit / Solution' },
    { n: 5, label: 'Closed Snapwill Case' },
    { n: 6, label: 'KIV' }
  ],
  others: []
};

function getStatusDef(category) { return STATUS_DEFS[category] || []; }

function getStatusLabel(category, status) {
  const defs = getStatusDef(category);
  const d = defs.find(x => x.n === status);
  return d ? d.label : `Status ${status}`;
}

/* ---------- LABELS ---------- */
const LABEL_DEFS = {
  claims: [
    { id: 'B1', label: 'Pre/Post Hospitalization' },
    { id: 'B2', label: 'Accidental Claim' },
    { id: 'B3', label: 'Travel PA' },
    { id: 'B4', label: 'Outpatient' },
    { id: 'B5', label: 'Guarantee Letter' }
  ],
  servicing: [
    { id: 'C1', label: 'Reinstatement' },
    { id: 'C2', label: 'Change Payment Frequency' },
    { id: 'C3', label: 'Change Card' },
    { id: 'C4', label: 'Restoration' },
    { id: 'C5', label: 'Change Investment' },
    { id: 'C6', label: 'Change Nominee' },
    { id: 'C7', label: 'Update Personal Information' },
    { id: 'C8', label: 'Remove Exclusion' }
  ]
};

function getLabelDefs(category) { return LABEL_DEFS[category] || []; }

/* ---------- WORKING DAYS ---------- */
function addWorkingDays(date, days) {
  let d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function workingDaysReminder(fromDate, days) {
  const d = addWorkingDays(new Date(fromDate), days);
  return d.toISOString().split('T')[0];
}

/* ---------- EXPORT / IMPORT ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lifeplanner_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported successfully', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      Object.assign(DB, data);
      saveDB();
      showToast('Data imported successfully! Refreshing...', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      showToast('Import failed: invalid file', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/* ---------- STATS ---------- */
function getCategoryStats(category) {
  const cases = getCases(category);
  const statDef = getStatusDef(category);
  const total = cases.length;
  const active = cases.filter(c => !c.kiv && c.currentStatus < (statDef.length || 8)).length;
  const completed = cases.filter(c => c.currentStatus === (statDef.length || 8)).length;
  const kivCount = cases.filter(c => c.kiv).length;
  const dueReminders = getDueReminders().filter(r => r.category === category).length;
  return { total, active, completed, kivCount, dueReminders };
}

// Init
loadDB();
