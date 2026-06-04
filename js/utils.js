/* ============================================
   UI Utilities + IC Parsing + Sidebar Fix
   ============================================ */

/* ---------- TOAST ---------- */
function showToast(msg, type = 'info', duration = 3000) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ---------- CONFIRM ---------- */
let _confirmResolve = null;
function showConfirm(title, msg, btnLabel = 'Confirm') {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmOkBtn').textContent = btnLabel;
  openModal('confirmModal');
  return new Promise(resolve => { _confirmResolve = resolve; });
}
function closeConfirm(result) {
  closeModal('confirmModal');
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}

/* ---------- MODAL HELPERS ---------- */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  if (typeof playOpen === 'function') playOpen();
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  const anyOpen = document.querySelector('.modal-overlay.open');
  if (!anyOpen) document.body.style.overflow = '';
  if (typeof playClose === 'function') playClose();
}
function closeCaseModal(e) { if (e.target === document.getElementById('caseModal')) closeCaseModalBtn(); }
function closeCaseModalBtn() { closeModal('caseModal'); }
function closeContactModal(e) { if (e.target === document.getElementById('contactModal')) closeContactModalBtn(); }
function closeContactModalBtn() { closeModal('contactModal'); }

/* ---------- IC NUMBER → DOB + AGE ---------- */
function parseIC(ic) {
  if (!ic) return null;
  const clean = ic.replace(/[-\s]/g, '');
  if (clean.length < 6) return null;
  const yy = parseInt(clean.substring(0, 2), 10);
  const mm = parseInt(clean.substring(2, 4), 10);
  const dd = parseInt(clean.substring(4, 6), 10);
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const currentYY = new Date().getFullYear() % 100;
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy;
  return new Date(year, mm - 1, dd);
}

function dobFromIC(ic) {
  const d = parseIC(ic);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`; // ISO for input[type=date]
}

function ageFromDOB(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function formatDOBDisplay(dobStr) {
  if (!dobStr) return '—';
  const d = new Date(dobStr);
  if (isNaN(d.getTime())) return dobStr;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// Auto-fill DOB from IC in a form
function onICInput(icInput, dobFieldId, ageDisplayId) {
  const dob = dobFromIC(icInput.value);
  const dobEl = document.getElementById(dobFieldId);
  const ageEl = document.getElementById(ageDisplayId);
  if (dob && dobEl) {
    dobEl.value = dob;
    dobEl.style.border = '1.5px solid var(--green)';
    if (ageEl) {
      const age = ageFromDOB(dob);
      ageEl.textContent = age !== null ? `Age: ${age} years old` : '';
    }
  } else if (dobEl) {
    dobEl.style.border = '';
    if (ageEl) ageEl.textContent = '';
  }
}

/* ---------- DATE HELPERS ---------- */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function relativeDate(dateStr) {
  const diff = daysUntil(dateStr);
  if (diff === null) return '';
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff)!==1?'s':''} overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

/* ---------- AVATAR ---------- */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
const AVATAR_COLORS = [
  ['#007AFF','#5856D6'],['#34C759','#30B0C7'],['#FF9500','#FF2D55'],
  ['#AF52DE','#5856D6'],['#FF3B30','#FF9500'],['#5AC8FA','#007AFF']
];
function getAvatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name||'').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFF;
  const [a, b] = AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  return `linear-gradient(135deg,${a},${b})`;
}
function avatarHTML(name, size = 38) {
  return `<div class="case-avatar" style="width:${size}px;height:${size}px;background:${getAvatarColor(name)};font-size:${Math.round(size*0.37)}px">${getInitials(name)}</div>`;
}

/* ---------- CATEGORY META ---------- */
const CAT_META = {
  sales:       { label: 'Sales',       icon: '📈', color: '#007AFF', bg: '#E8F0FE' },
  claims:      { label: 'Claims',      icon: '📋', color: '#FF9500', bg: '#FFF3E0' },
  servicing:   { label: 'Servicing',   icon: '⚙️',  color: '#34C759', bg: '#E8F8EE' },
  recruitment: { label: 'Recruitment', icon: '👥', color: '#AF52DE', bg: '#F3E8FD' },
  onboarding:  { label: 'Onboarding',  icon: '🚀', color: '#5AC8FA', bg: '#E5F6FF' },
  snapwill:    { label: 'Snapwill',    icon: '⚡', color: '#FF2D55', bg: '#FFE5EA' },
  aisolution:  { label: 'AI Solution', icon: '🤖', color: '#5856D6', bg: '#F0EFFE' },
  others:      { label: 'Others',      icon: '📌', color: '#6B6B6E', bg: '#F5F5F7' }
};
function catMeta(category) {
  if (CAT_META[category]) return CAT_META[category];
  // Check custom categories
  const custom = (typeof DB !== 'undefined') ? (DB.customCategories || []).find(c => c.id === category) : null;
  if (custom) return { label: custom.name, icon: custom.icon, color: custom.color, bg: custom.bg };
  return CAT_META.others;
}

function statusClass(category, status) {
  return `s${Math.min(status, 9)}`;
}

/* ---------- RENDER CASE ROW ---------- */
function renderCaseRow(c, onClick) {
  const statusLabel = getStatusLabel(c.category, c.currentStatus, c);
  const sc = statusClass(c.category, c.currentStatus);
  const dueRem = getDueReminders().filter(r => r.caseId === c.id);
  const hasOverdue = dueRem.length > 0;
  // Show all categories (multi-category)
  const extraCats = (c.categories || []).filter(cat => cat !== c.category);
  return `
    <div class="case-item ${c.priority ? 'priority' : ''}" onclick="${onClick}('${c.id}')">
      ${avatarHTML(c.contactName || '?')}
      <div class="case-info">
        <div class="case-name">${escHtml(c.contactName || 'Unknown')}</div>
        <div class="case-meta">
          ${c.label ? `<span class="label-badge">${escHtml(c.label)}</span>` : ''}
          ${c.subLabel ? `<span class="label-badge">${escHtml(c.subLabel)}</span>` : ''}
          <span class="status-badge ${sc}">${escHtml(statusLabel)}</span>
          ${extraCats.map(cat => `<span class="label-badge" style="background:${catMeta(cat).bg};color:${catMeta(cat).color}">${catMeta(cat).icon} ${catMeta(cat).label}</span>`).join('')}
          ${hasOverdue ? `<span class="status-badge overdue">🔔 ${dueRem.length}</span>` : ''}
          ${c.remarks ? `<span class="text-xs text-muted" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.remarks)}</span>` : ''}
        </div>
      </div>
      <div class="case-right">
        ${c.priority ? '<span class="priority-tag">★ Priority</span>' : ''}
        ${c.kiv ? '<span class="status-badge kiv">KIV</span>' : ''}
        <span class="text-xs text-muted">${formatDate(c.updatedAt)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-tertiary)"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>`;
}

/* ---------- ESCAPE HTML ---------- */
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ---------- SIDEBAR ---------- */
function toggleSidebar() {
  const s = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    s.classList.toggle('mobile-open');
  } else {
    const isCollapsed = s.classList.toggle('collapsed');
    // Update reopen button visibility
    const reopenBtn = document.getElementById('sidebarReopenBtn');
    if (reopenBtn) reopenBtn.style.display = isCollapsed ? 'flex' : 'none';
  }
  playClick();
}

function reopenSidebar() {
  const s = document.getElementById('sidebar');
  s.classList.remove('collapsed');
  const reopenBtn = document.getElementById('sidebarReopenBtn');
  if (reopenBtn) reopenBtn.style.display = 'none';
  playClick();
}

/* ---------- QUICK REMINDER MODAL ---------- */
function openQuickReminder(caseId, contactName, category, currentStatusLabel) {
  playClick();
  document.getElementById('contactModalTitle').textContent = '🔔 Set Reminder';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Reminder Title *</label>
      <input class="form-control" id="qr_title" value="${escHtml('Follow up: ' + (currentStatusLabel||'') + (contactName?' — '+contactName:''))}" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input type="date" class="form-control" id="qr_date" value="${todayStr()}" />
      </div>
      <div class="form-group">
        <label class="form-label">Time</label>
        <input type="time" class="form-control" id="qr_time" value="09:00" />
      </div>
    </div>
    <div class="flex gap-8 mb-16" style="flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm" onclick="qrSetDate(0)">Today</button>
      <button class="btn btn-secondary btn-sm" onclick="qrSetDate(1)">Tomorrow</button>
      <button class="btn btn-secondary btn-sm" onclick="qrSetDate(3)">+3 Days</button>
      <button class="btn btn-secondary btn-sm" onclick="qrSetDate(7)">+1 Week</button>
      <button class="btn btn-secondary btn-sm" onclick="qrSetWorkingDays(7)">+7 Working Days</button>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveQuickReminder('${caseId}','${escHtml(contactName)}','${category}')">🔔 Set Reminder</button>
    </div>
  `;
  openModal('contactModal');
}

function qrSetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const el = document.getElementById('qr_date');
  if (el) el.value = d.toISOString().split('T')[0];
}

function qrSetWorkingDays(days) {
  const el = document.getElementById('qr_date');
  if (el) el.value = workingDaysReminder(new Date(), days);
}

function saveQuickReminder(caseId, contactName, category) {
  const title = document.getElementById('qr_title')?.value?.trim();
  const date  = document.getElementById('qr_date')?.value;
  const time  = document.getElementById('qr_time')?.value || '';
  if (!title || !date) { showToast('Please fill in title and date', 'error'); return; }
  addReminder({ caseId, contactName, category, title, date, time });
  showToast('Reminder set! 🔔', 'success');
  playSuccess();
  closeContactModalBtn();
  updateBadges();
}

/* ---------- REMINDER ALERT ---------- */
function showReminderAlert(title, text) {
  document.getElementById('reminderAlertTitle').textContent = title;
  document.getElementById('reminderAlertText').textContent = text;
  const el = document.getElementById('reminderAlert');
  el.style.display = 'flex';
  playReminder();
  setTimeout(() => dismissReminderAlert(), 8000);
}
function dismissReminderAlert() {
  document.getElementById('reminderAlert').style.display = 'none';
}

/* ---------- BADGES ---------- */
function updateBadges() {
  const cats = ['sales','claims','servicing','recruitment','onboarding','snapwill','aisolution','others'];
  cats.forEach(cat => {
    const stats = getCategoryStats(cat);
    const el = document.getElementById(`badge-${cat}`);
    if (el) el.textContent = stats.active > 0 ? stats.active : '';
  });
  const due = getDueReminders();
  const rCount = due.length;
  const el = document.getElementById('badge-reminder-count');
  if (el) el.textContent = rCount > 0 ? rCount : '';
  const topBadge = document.getElementById('topReminderBadge');
  if (topBadge) topBadge.classList.toggle('show', rCount > 0);
}

/* ---------- SEARCH ---------- */
function handleSearch(q) {
  if (!q || q.trim().length < 2) { renderCurrentPage(); return; }
  const results = searchContacts(q);
  const caseResults = DB.cases.filter(c =>
    (c.contactName||'').toLowerCase().includes(q.toLowerCase()) ||
    (c.remarks||'').toLowerCase().includes(q.toLowerCase())
  );
  renderSearchResults(q, results, caseResults);
}

function renderSearchResults(q, contacts, cases) {
  const content = document.getElementById('content');
  document.getElementById('pageTitle').textContent = `Search: "${q}"`;
  let html = `<div class="section-header"><div class="section-title">Search Results <small>${contacts.length + cases.length} found</small></div></div>`;
  if (contacts.length) {
    html += `<div class="section-title mb-8">Contacts</div><div class="grid-auto mb-24">`;
    contacts.forEach(c => { html += renderContactCard(c); });
    html += '</div>';
  }
  if (cases.length) {
    html += `<div class="section-title mb-8">Cases</div><div class="case-list">`;
    cases.forEach(c => { html += renderCaseRow(c, 'openCaseById'); });
    html += '</div>';
  }
  if (!contacts.length && !cases.length) {
    html += emptyState('🔍', 'No results found', 'Try a different search term');
  }
  content.innerHTML = html;
}

function openCaseById(id) {
  const c = getCase(id);
  if (!c) return;
  const handlers = {
    sales: openSalesCase, claims: openClaimsCase, servicing: openServicingCase,
    recruitment: openRecruitCase, onboarding: openOnboardCase,
    snapwill: openSnapwillCase, aisolution: openAISolutionCase, others: openOthersCase
  };
  const fn = handlers[c.category];
  if (fn) fn(id);
}

/* ---------- REMINDER CHECKER ---------- */
function checkRemindersOnLoad() {
  const due = getDueReminders();
  if (due.length > 0) {
    const first = due[0];
    showReminderAlert(`🔔 ${due.length} Reminder${due.length > 1 ? 's' : ''} Due`, `${first.title}${due.length > 1 ? ` and ${due.length - 1} more` : ''}`);
  }
}

setInterval(() => {
  const due = getDueReminders();
  const topBadge = document.getElementById('topReminderBadge');
  if (topBadge) topBadge.classList.toggle('show', due.length > 0);
}, 60000);

/* ---------- REMINDER ITEM RENDER ---------- */
function renderReminderItem(r) {
  const days = daysUntil(r.date);
  let cls = 'upcoming', dotCls = 'upcoming';
  if (days < 0) { cls = 'overdue'; dotCls = 'overdue'; }
  else if (days === 0) { cls = 'today'; dotCls = 'today'; }
  const meta = r.category ? catMeta(r.category) : { icon: '🔔' };
  return `
    <div class="reminder-item ${cls}" onclick="${r.caseId ? `openCaseById('${r.caseId}')` : ''}">
      <div class="reminder-dot ${dotCls}"></div>
      <div class="reminder-body">
        <div class="reminder-title">${escHtml(r.title)}</div>
        <div class="reminder-meta">${escHtml(r.contactName || '')} ${r.category ? `• ${catMeta(r.category).label}` : ''}</div>
      </div>
      <div>
        <div class="reminder-date" style="color:${days < 0 ? 'var(--red)' : days === 0 ? 'var(--orange)' : 'var(--blue)'}">${relativeDate(r.date)}</div>
        <button class="btn btn-secondary btn-sm" style="margin-top:4px" onclick="event.stopPropagation();dismissReminder('${r.id}');renderCurrentPage()">Done ✓</button>
      </div>
    </div>`;
}

function emptyState(icon, title, sub) {
  return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><div class="empty-state-title">${title}</div><div class="empty-state-sub">${sub}</div></div>`;
}

/* ---------- UNIVERSAL STATUS STEP RENDERER ---------- */
// Renders a single status step with editable label, date, reminder button
function renderStatusStep(c, stepDef, options = {}) {
  const {
    isCurrent = false,
    isDone = false,
    histEntry = null,
    onClickFn = null,    // string: JS to call when step is clicked
    extraContent = ''    // extra HTML inside step (e.g. branch choices)
  } = options;

  let cls = 'future';
  if (isDone) cls = 'done-step';
  else if (isCurrent) cls = 'current';

  // Get label — check custom labels first
  const customLabel = c.customStatusLabels?.[stepDef.n];
  const displayLabel = customLabel || stepDef.label;

  return `
    <div class="status-step ${cls}" id="step-${c.id}-${stepDef.n}" onclick="${onClickFn || `setStatusFromStep('${c.id}',${stepDef.n})`}">
      <div class="step-circle">${isDone ? '✓' : stepDef.n}</div>
      <div class="step-info" style="flex:1">
        <div class="step-label-row">
          <span class="step-label" id="step-lbl-${c.id}-${stepDef.n}">${escHtml(displayLabel)}</span>
          <button class="step-edit-btn" title="Edit step name" onclick="event.stopPropagation();openEditStepLabel('${c.id}',${stepDef.n},'${escHtml(displayLabel)}')" style="opacity:0.5;background:none;border:none;cursor:pointer;font-size:11px;padding:0 4px">✏</button>
        </div>
        ${histEntry?.date ? `<div class="step-date">📅 ${formatDate(histEntry.date)}</div>` : ''}
        ${histEntry?.remark ? `<div class="step-remark">${escHtml(histEntry.remark)}</div>` : ''}
      </div>
      <div class="step-actions" onclick="event.stopPropagation()">
        <button class="btn btn-secondary btn-sm" title="Set reminder" onclick="openQuickReminder('${c.id}','${escHtml(c.contactName)}','${c.category}','${escHtml(displayLabel)}')">🔔</button>
      </div>
    </div>
    ${extraContent}`;
}

/* ---------- EDIT STEP LABEL ---------- */
function openEditStepLabel(caseId, stepN, currentLabel) {
  playClick();
  document.getElementById('contactModalTitle').textContent = '✏ Rename Step';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Step ${stepN} — New Name</label>
      <input class="form-control" id="step_label_input" value="${escHtml(currentLabel)}" placeholder="Step name..." />
    </div>
    <div class="form-group">
      <label class="form-label">Date for this step</label>
      <input type="date" class="form-control" id="step_label_date" value="${todayStr()}" />
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-danger btn-sm" onclick="resetStepLabel('${caseId}',${stepN})">Reset to Default</button>
      <button class="btn btn-primary" onclick="saveStepLabel('${caseId}',${stepN})">Save</button>
    </div>`;
  openModal('contactModal');
}

function saveStepLabel(caseId, stepN) {
  const newLabel = document.getElementById('step_label_input')?.value?.trim();
  const newDate = document.getElementById('step_label_date')?.value;
  if (!newLabel) { showToast('Please enter a label', 'error'); return; }
  const c = getCase(caseId);
  if (!c) return;
  const customLabels = { ...(c.customStatusLabels || {}) };
  customLabels[stepN] = newLabel;
  // Also update history entry date if provided
  let history = [...(c.statusHistory || [])];
  const existingIdx = history.findLastIndex ? history.findLastIndex(h => h.toStatus === stepN) : history.map(h=>h.toStatus).lastIndexOf(stepN);
  if (newDate && existingIdx >= 0) {
    history[existingIdx] = { ...history[existingIdx], date: newDate + 'T00:00:00.000Z' };
  } else if (newDate && existingIdx < 0) {
    // Add a history entry with the date
    history.push({ fromStatus: stepN - 1, toStatus: stepN, remark: '', date: newDate + 'T00:00:00.000Z' });
  }
  updateCase(caseId, { customStatusLabels: customLabels, statusHistory: history });
  showToast('Step name saved!', 'success');
  playSuccess();
  closeContactModalBtn();
  openCaseById(caseId);
}

function resetStepLabel(caseId, stepN) {
  const c = getCase(caseId);
  if (!c) return;
  const customLabels = { ...(c.customStatusLabels || {}) };
  delete customLabels[stepN];
  updateCase(caseId, { customStatusLabels: customLabels });
  showToast('Reset to default', 'info');
  closeContactModalBtn();
  openCaseById(caseId);
}

/* ---------- SET STATUS WITH DATE PICKER ---------- */
function openSetStatusWithDate(caseId, stepN, stepLabel) {
  playClick();
  document.getElementById('contactModalTitle').textContent = `Set: ${stepLabel}`;
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Date</label>
      <input type="date" class="form-control" id="ssd_date" value="${todayStr()}" />
    </div>
    <div class="form-group">
      <label class="form-label">Remark (optional)</label>
      <textarea class="form-control" id="ssd_remark" rows="2" placeholder="Notes..."></textarea>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmSetStatusWithDate('${caseId}',${stepN})">✓ Confirm</button>
    </div>`;
  openModal('contactModal');
}

function confirmSetStatusWithDate(caseId, stepN) {
  const date = document.getElementById('ssd_date')?.value;
  const remark = document.getElementById('ssd_remark')?.value || '';
  const updatedCase = toggleStepDone(caseId, stepN, remark, date);
  if (updatedCase) checkStepAutoReminder(updatedCase, stepN);
  showToast('Step done! ✓', 'success');
  playSuccess();
  closeContactModalBtn();
  setTimeout(() => { openCaseById(caseId); updateBadges(); }, 50);
  renderCurrentPage();
}

function checkStepAutoReminder(c, stepN) {
  const defs = getStatusDef(c.category);
  const def = defs.find(d => d.n === stepN);
  if (!def?.autoReminder) return;
  const remDate = workingDaysReminder(new Date(), def.autoReminder);
  addReminder({
    caseId: c.id, contactId: c.contactId, contactName: c.contactName,
    category: c.category,
    title: `Follow up: ${def.label} — ${c.contactName}`,
    date: remDate
  });
  showToast(`Reminder set for ${def.autoReminder} working days`, 'info');
}

/* ---------- SIDEBAR DYNAMIC CATEGORIES ---------- */
function refreshSidebarCategories() {
  const container = document.getElementById('customCatNav');
  const section = document.getElementById('customCatSection');
  if (!container) return;
  const customs = getCustomCategories();
  if (section) section.style.display = customs.length > 0 ? 'block' : 'none';
  container.innerHTML = customs.map(cat => `
    <a class="nav-item" data-page="${cat.id}" onclick="navigateTo('${cat.id}')">
      <span class="nav-icon" style="font-size:16px">${cat.icon}</span>
      <span>${escHtml(cat.name)}</span>
      <span class="nav-badge" id="badge-${cat.id}"></span>
    </a>`).join('');
  // Register pages dynamically
  customs.forEach(cat => {
    PAGE_MAP[cat.id] = { render: () => renderCustomCategory(cat.id), title: cat.name };
  });
}

/* ---------- TO-DO STEP CLICK HANDLER ---------- */
function handleStepClick(caseId, stepN, label) {
  const c = getCase(caseId);
  if (!c) return;
  if ((c.completedSteps || []).includes(stepN)) {
    // Uncheck immediately
    toggleStepDone(caseId, stepN, '', null);
    showToast('Step unchecked', 'info');
    playClick();
    setTimeout(() => { openCaseById(caseId); updateBadges(); }, 50);
    renderCurrentPage();
  } else {
    // Open date + remark picker
    openSetStatusWithDate(caseId, stepN, label);
  }
}

/* ---------- CUSTOM CATEGORY PAGE ---------- */
function renderCustomCategory(catId) {
  const cat = getCustomCategories().find(c => c.id === catId);
  if (!cat) return;
  document.getElementById('pageTitle').textContent = cat.name;
  const cases = getCases(catId);

  document.getElementById('content').innerHTML = `
    <div class="flex items-center justify-between mb-16">
      <div class="section-title">${cat.icon} ${escHtml(cat.name)} <small>${cases.length} cases</small></div>
      <button class="btn btn-primary" onclick="openNewCase('${catId}')">+ New Case</button>
    </div>
    ${cases.length === 0
      ? emptyState(cat.icon, 'No cases yet', 'Click + New Case to add one')
      : `<div class="case-list">${cases.map(c => renderCaseRow(c, 'openCaseById')).join('')}</div>`}
  `;
}
