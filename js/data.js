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
    // Trigger Sheets auto-sync on every save — only if Google token is active
    if (typeof syncLocalToSheets === 'function' && typeof GAUTH !== 'undefined' && GAUTH.accessToken) syncLocalToSheets();
  } catch (e) { console.warn('DB save error', e); }
}

function ensureDefaults() {
  if (!DB.contacts) DB.contacts = [];
  if (!DB.cases) DB.cases = [];
  if (!DB.reminders) DB.reminders = [];
  if (!DB.settings) DB.settings = {};
  if (!DB.customCategories) DB.customCategories = [];
  if (!DB.customLabels) DB.customLabels = {};
  if (!DB.globalStatusDefs) DB.globalStatusDefs = {};
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
    ownerEmail: data.ownerEmail || (typeof GAUTH !== 'undefined' ? GAUTH.currentUser?.email : '') || '',
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    nric: data.nric || '',
    dob: data.dob || '',
    occupation: data.occupation || '',
    employer: data.employer || '',
    nationality: data.nationality || '',
    notes: data.notes || '',
    tags: data.tags || [],
    // Extended CRM fields
    race: data.race || '',
    stayArea: data.stayArea || '',
    state: data.state || '',
    maritalStatus: data.maritalStatus || '',
    dependants: data.dependants || '',
    jobType: data.jobType || '',
    income: data.income || '',
    langPref: data.langPref || '',
    gender: data.gender || '',
    religion: data.religion || '',
    existingInsurance: Array.isArray(data.existingInsurance) ? data.existingInsurance : (data.existingInsurance ? [data.existingInsurance] : []),
    aiaPolicies: Array.isArray(data.aiaPolicies) ? data.aiaPolicies : [],
    referralSource: data.referralSource || '',
    socialMedia: data.socialMedia || '',
    // Will-referral / MLM downline tracking
    referredBy: data.referredBy || '',         // contactId of the will owner (upline)
    referralRole: data.referralRole || '',     // executor|replacement_executor|beneficiary|guardian|replacement_guardian|witness|other
    referralStatus: data.referralStatus || '', // named|contacted|appointment|client|declined
    referralType: data.referralType || '',     // source, e.g. 'snapwill'
    referralCaseId: data.referralCaseId || '', // the will case they were named in
    referralRelationship: data.referralRelationship || '',
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
  const lower = q.toLowerCase().trim();
  if (!lower) return DB.contacts;
  const has = (val) => val && String(val).toLowerCase().includes(lower);
  return DB.contacts.filter(c => {
    // Core identity
    if (has(c.name))           return true;
    if (has(c.phone))          return true;
    if (has(c.email))          return true;
    if (has(c.nric))           return true;
    // Profile fields
    if (has(c.race))           return true;
    if (has(c.gender))         return true;
    if (has(c.state))          return true;
    if (has(c.stayArea))       return true;
    if (has(c.maritalStatus))  return true;
    if (has(c.occupation))     return true;
    if (has(c.jobType))        return true;
    if (has(c.income))         return true;
    if (has(c.langPref))       return true;
    if (has(c.religion))       return true;
    if (has(c.referralSource)) return true;
    if (has(c.socialMedia))    return true;
    if (has(c.employer))       return true;
    if (has(c.nationality))    return true;
    if (has(c.notes))          return true;
    // Tags / labels
    if ((c.tags || []).some(t => has(t)))                                                return true;
    // Existing insurance
    if (Array.isArray(c.existingInsurance) && c.existingInsurance.some(i => has(i)))    return true;
    // Linked cases
    const cases = getCasesForContact(c.id);
    for (const cs of cases) {
      if (has(cs.label))      return true;
      if (has(cs.subLabel))   return true;
      if (has(cs.category))   return true;
      if (has(cs.remarks))    return true;
      if (has(cs.nextStep))   return true;
      // Case tags
      if ((cs.tags || []).some(t => has(t)))                                             return true;
      // Status label
      if (has(getStatusLabel(cs.category, cs.currentStatus, cs)))                        return true;
      // Status history remarks
      if ((cs.statusHistory || []).some(h => has(h.remark)))                             return true;
    }
    return false;
  });
}

/* ---------- CASES ---------- */
function getCases(category = null) {
  if (!category) return DB.cases;
  return DB.cases.filter(c =>
    c.category === category ||
    (c.categories && c.categories.includes(category))
  );
}

function getCase(id) { return DB.cases.find(c => c.id === id); }

function getCasesForContact(contactId) {
  return DB.cases.filter(c => c.contactId === contactId);
}

function createCase(data) {
  const primaryCat = data.category || 'others';
  const allCats = data.categories && data.categories.length > 0 ? data.categories : [primaryCat];
  const c = {
    id: uid(),
    ownerEmail: data.ownerEmail || (typeof GAUTH !== 'undefined' ? GAUTH.currentUser?.email : '') || '',
    contactId: data.contactId || null,
    contactName: data.contactName || '',
    category: primaryCat,
    categories: allCats,           // multi-category support
    label: data.label || '',       // B1-B5, C1-C8, custom, etc.
    subLabel: data.subLabel || '', // AIA / Snapwill for sales
    currentStatus: data.currentStatus || 1,
    statusHistory: data.statusHistory || [],
    customStatusLabels: data.customStatusLabels || {}, // {stepN: 'Custom label'}
    remarks: data.remarks || '',
    reminders: data.reminders || [],
    priority: data.priority || false,
    kiv: data.kiv || false,
    followUp: data.followUp || false,
    premiums: data.premiums || [],
    examinations: data.examinations || [],
    recruitPrograms: data.recruitPrograms || [],
    fieldwork: data.fieldwork || [],
    closedDate: data.closedDate || null,
    customFields: data.customFields || {},
    completedSteps: data.completedSteps || [],
    categoryCompletedSteps: data.categoryCompletedSteps || {}, // { snapwill: [1,2], claims: [1] }
    aiSteps: data.aiSteps || [],
    snapwillTypes: data.snapwillTypes || [],
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

function setStatus(id, status, remark = '', customDate = null) {
  const c = getCase(id);
  if (!c) return null;
  const histEntry = {
    fromStatus: c.currentStatus,
    toStatus: status,
    remark,
    date: customDate ? new Date(customDate).toISOString() : new Date().toISOString()
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
    ownerEmail: data.ownerEmail || (typeof GAUTH !== 'undefined' ? GAUTH.currentUser?.email : '') || '',
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
  aisolution: [],
  others: []
};

function getStatusDef(category) {
  // Global overrides take precedence (admin-customized built-in categories)
  if (DB.globalStatusDefs?.[category]?.length) return DB.globalStatusDefs[category];
  if (STATUS_DEFS[category] !== undefined) return STATUS_DEFS[category];
  // Check custom categories
  const custom = (DB.customCategories || []).find(c => c.id === category);
  return custom ? (custom.statuses || []) : [];
}

function setGlobalStatusDef(category, defs) {
  if (!DB.globalStatusDefs) DB.globalStatusDefs = {};
  DB.globalStatusDefs[category] = defs;
  saveDB();
}

function resetGlobalStatusDef(category) {
  if (DB.globalStatusDefs) delete DB.globalStatusDefs[category];
  saveDB();
}

// Get label — checks case's custom overrides first
function getStatusLabel(category, status, caseObj = null) {
  if (caseObj?.customStatusLabels?.[status]) return caseObj.customStatusLabels[status];
  const defs = getStatusDef(category);
  const d = defs.find(x => x.n === status);
  return d ? d.label : `Status ${status}`;
}

/* ---------- CUSTOM LABEL DEFS (user-added) ---------- */
function getCustomLabelDefs(category) {
  return (DB.customLabels || {})[category] || [];
}
function addCustomLabel(category, labelObj) {
  if (!DB.customLabels) DB.customLabels = {};
  if (!DB.customLabels[category]) DB.customLabels[category] = [];
  const existing = DB.customLabels[category].find(l => l.label.toLowerCase() === (labelObj.label || '').toLowerCase());
  if (existing) return existing;
  const entry = { id: labelObj.id || uid(), label: labelObj.label };
  DB.customLabels[category].push(entry);
  saveDB();
  return entry;
}
function deleteCustomLabel(category, labelId) {
  if (!DB.customLabels?.[category]) return;
  DB.customLabels[category] = DB.customLabels[category].filter(l => l.id !== labelId);
  saveDB();
}

/* ---------- BUILT-IN LABELS ---------- */
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

function getLabelDefs(category) {
  const builtin = LABEL_DEFS[category] || [];
  const custom = getCustomLabelDefs(category);
  return [...builtin, ...custom];
}

/* ---------- CUSTOM CATEGORIES ---------- */
function getCustomCategories() { return DB.customCategories || []; }

function createCustomCategory(data) {
  const cat = {
    id: 'cat_' + uid(),
    name: data.name || 'New Category',
    icon: data.icon || '📁',
    color: data.color || '#007AFF',
    bg: data.bg || '#E8F0FE',
    statuses: data.statuses || [{ n: 1, label: 'Step 1' }],
    createdAt: new Date().toISOString()
  };
  if (!DB.customCategories) DB.customCategories = [];
  DB.customCategories.push(cat);
  saveDB();
  refreshSidebarCategories();
  return cat;
}

function updateCustomCategory(id, data) {
  const idx = (DB.customCategories || []).findIndex(c => c.id === id);
  if (idx < 0) return;
  DB.customCategories[idx] = { ...DB.customCategories[idx], ...data };
  saveDB();
  refreshSidebarCategories();
}

function deleteCustomCategory(id) {
  DB.customCategories = (DB.customCategories || []).filter(c => c.id !== id);
  saveDB();
  refreshSidebarCategories();
}

function addStatusToCustomCategory(catId, label) {
  const cat = (DB.customCategories || []).find(c => c.id === catId);
  if (!cat) return;
  const maxN = (cat.statuses || []).reduce((m, s) => Math.max(m, s.n), 0);
  cat.statuses = [...(cat.statuses || []), { n: maxN + 1, label }];
  saveDB();
}

function updateStatusInCustomCategory(catId, statusN, newLabel) {
  const cat = (DB.customCategories || []).find(c => c.id === catId);
  if (!cat) return;
  cat.statuses = cat.statuses.map(s => s.n === statusN ? { ...s, label: newLabel } : s);
  saveDB();
}

function removeStatusFromCustomCategory(catId, statusN) {
  const cat = (DB.customCategories || []).find(c => c.id === catId);
  if (!cat) return;
  cat.statuses = cat.statuses.filter(s => s.n !== statusN);
  saveDB();
}

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

/* ---------- CRM OPTIONS (reusable dropdown lists) ---------- */
const DEFAULT_CRM_OPTIONS = {
  races:      ['Malay', 'Chinese', 'Indian', 'Kadazan', 'Iban', 'Others'],
  areas:      ['Kuala Lumpur', 'Petaling Jaya', 'Subang Jaya', 'Klang', 'Shah Alam', 'Puchong', 'Cheras', 'Ampang', 'Kepong', 'Damansara', 'Mont Kiara', 'Bangsar', 'Penang', 'Johor Bahru', 'Ipoh', 'Kuching', 'Kota Kinabalu', 'Seremban', 'Melaka', 'Others'],
  states:     ['Kuala Lumpur', 'Selangor', 'Penang', 'Johor', 'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan', 'Melaka', 'Perlis', 'Sabah', 'Sarawak', 'Labuan', 'Putrajaya'],
  incomes:    ['< RM2,000', 'RM2,000–4,000', 'RM4,000–8,000', 'RM8,000–15,000', '> RM15,000'],
  maritalStatuses: ['Single', 'Married', 'Divorced', 'Widowed'],
  jobTypes:   ['Employee (Private)', 'Employee (Government)', 'Self-Employed', 'Business Owner', 'Retiree', 'Housewife', 'Student', 'Others'],
  langPrefs:  ['English', 'Bahasa Malaysia', 'Mandarin', 'Cantonese', 'Hokkien', 'Hakka', 'Tamil', 'Others'],
  insurances: ['None', 'AIA', 'Prudential', 'Great Eastern', 'Allianz', 'Hong Leong Assurance', 'Manulife', 'Sun Life', 'AXA Affin', 'Zurich', 'ETIQA', 'Others'],
  referrals:  ['Self', 'Facebook', 'Instagram', 'TikTok', 'WhatsApp Group', 'Referral — Friend', 'Referral — Family', 'Cold Call', 'Walk-In', 'Seminar / Event', 'Others'],
  religions:  ['Islam', 'Buddhism', 'Christianity', 'Hinduism', 'Taoism', 'Sikhism', 'Others'],
  genders:    ['Male', 'Female'],
  tags:       ['VIP', 'Hot Lead', 'Cold Lead', 'Existing Client', 'Agent Prospect', 'Referrer', 'Long-Term Follow-Up']
};

function getCRMOptions(field) {
  const custom = DB.settings?.crmOptions?.[field];
  return (custom && custom.length > 0) ? custom : [...(DEFAULT_CRM_OPTIONS[field] || [])];
}

function addCRMOption(field, value) {
  if (!DB.settings) DB.settings = {};
  if (!DB.settings.crmOptions) DB.settings.crmOptions = {};
  if (!DB.settings.crmOptions[field]) DB.settings.crmOptions[field] = [...(DEFAULT_CRM_OPTIONS[field] || [])];
  const clean = value.trim();
  if (!clean || DB.settings.crmOptions[field].includes(clean)) return false;
  DB.settings.crmOptions[field].push(clean);
  saveDB();
  return true;
}

/* ---------- TO-DO STEP TOGGLE ---------- */
function toggleStepDone(caseId, stepN, remark, date, viewCat) {
  const c = getCase(caseId);
  if (!c) return null;
  const isPrimary = !viewCat || c.category === viewCat;

  if (isPrimary) {
    // Original logic — updates primary completedSteps
    const steps = [...(c.completedSteps || [])];
    const idx = steps.indexOf(stepN);
    const histEntry = idx >= 0
      ? { fromStatus: stepN, toStatus: 0, remark: 'Step unchecked', date: new Date().toISOString() }
      : { fromStatus: c.currentStatus || 0, toStatus: stepN, remark: remark || '', date: date ? new Date(date).toISOString() : new Date().toISOString() };
    if (idx >= 0) steps.splice(idx, 1); else steps.push(stepN);
    const maxStep = steps.length > 0 ? Math.max(...steps) : 0;
    return updateCase(caseId, { completedSteps: steps, currentStatus: maxStep, statusHistory: [...(c.statusHistory || []), histEntry] });
  } else {
    // Secondary category — updates categoryCompletedSteps[viewCat]
    const catSteps = { ...(c.categoryCompletedSteps || {}) };
    const steps = [...(catSteps[viewCat] || [])];
    const idx = steps.indexOf(stepN);
    if (idx >= 0) steps.splice(idx, 1); else steps.push(stepN);
    catSteps[viewCat] = steps;
    return updateCase(caseId, { categoryCompletedSteps: catSteps });
  }
}

/* ---------- SNAPWILL CUSTOMER TYPES ---------- */
const DEFAULT_SNAPWILL_TYPES = ['Will', 'Memories', 'Subscription 199', 'Subscription 299', 'Leader Account', 'Affiliate', 'Business Partner', 'School Donation', 'Booth'];

function getSnapwillTypes() {
  if (DB.settings?.snapwillTypes?.length) return DB.settings.snapwillTypes;
  return [...DEFAULT_SNAPWILL_TYPES];
}

function addSnapwillType(typeName) {
  if (!DB.settings) DB.settings = {};
  if (!DB.settings.snapwillTypes) DB.settings.snapwillTypes = [...DEFAULT_SNAPWILL_TYPES];
  const clean = typeName.trim();
  if (!clean || DB.settings.snapwillTypes.includes(clean)) { showToast('Type already exists', 'warning'); return; }
  DB.settings.snapwillTypes.push(clean);
  saveDB();
  showToast(`"${clean}" added!`, 'success');
}

/* ---------- AI SOLUTION STEPS ---------- */
function addAIStep(caseId, label) {
  const c = getCase(caseId);
  if (!c) return;
  const steps = [...(c.aiSteps || [])];
  const maxN = steps.reduce((m, s) => Math.max(m, s.n || 0), 0);
  steps.push({ id: uid(), n: maxN + 1, label: label.trim(), done: false, date: null, remark: '' });
  updateCase(caseId, { aiSteps: steps });
}

function toggleAIStep(caseId, stepId, date, remark) {
  const c = getCase(caseId);
  if (!c) return;
  const steps = (c.aiSteps || []).map(s => {
    if (s.id !== stepId) return s;
    return s.done
      ? { ...s, done: false, date: null, remark: '' }
      : { ...s, done: true, date: date || new Date().toISOString().split('T')[0], remark: remark || '' };
  });
  updateCase(caseId, { aiSteps: steps });
}

function deleteAIStep(caseId, stepId) {
  const c = getCase(caseId);
  if (!c) return;
  const steps = (c.aiSteps || []).filter(s => s.id !== stepId);
  updateCase(caseId, { aiSteps: steps });
}

function renameAIStep(caseId, stepId, newLabel) {
  const c = getCase(caseId);
  if (!c) return;
  const steps = (c.aiSteps || []).map(s => s.id === stepId ? { ...s, label: newLabel } : s);
  updateCase(caseId, { aiSteps: steps });
}

// Init
loadDB();
