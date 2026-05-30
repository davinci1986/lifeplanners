/* ============================================
   UI Utilities
   ============================================ */

/* ---------- TOAST ---------- */
function showToast(msg, type = 'info', duration = 3000) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const container = document.getElementById('toastContainer');
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
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  // Restore scroll only if no modals are open
  const anyOpen = document.querySelector('.modal-overlay.open');
  if (!anyOpen) document.body.style.overflow = '';
}

function closeCaseModal(e) {
  if (e.target === document.getElementById('caseModal')) closeCaseModalBtn();
}
function closeCaseModalBtn() { closeModal('caseModal'); }

function closeContactModal(e) {
  if (e.target === document.getElementById('contactModal')) closeContactModalBtn();
}
function closeContactModalBtn() { closeModal('contactModal'); }

/* ---------- DATE HELPERS ---------- */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
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
  others:      { label: 'Others',      icon: '📌', color: '#6B6B6E', bg: '#F5F5F7' }
};

function catMeta(category) { return CAT_META[category] || CAT_META.others; }

/* ---------- STATUS COLOR ---------- */
function statusClass(category, status) {
  const defs = getStatusDef(category);
  const max = defs.length;
  if (status === max) return 'done';
  if (status >= max * 0.7) return `s${Math.min(status, 9)}`;
  return `s${Math.min(status, 9)}`;
}

/* ---------- RENDER CASE LIST ITEM ---------- */
function renderCaseRow(c, onClick) {
  const meta = catMeta(c.category);
  const statusLabel = getStatusLabel(c.category, c.currentStatus);
  const sc = statusClass(c.category, c.currentStatus);
  const dueRem = getDueReminders().filter(r => r.caseId === c.id);
  const hasOverdue = dueRem.length > 0;

  return `
    <div class="case-item ${c.priority ? 'priority' : ''}" onclick="${onClick}('${c.id}')">
      ${avatarHTML(c.contactName || '?')}
      <div class="case-info">
        <div class="case-name">${escHtml(c.contactName || 'Unknown')}</div>
        <div class="case-meta">
          ${c.label ? `<span class="label-badge">${escHtml(c.label)}</span>` : ''}
          ${c.subLabel ? `<span class="label-badge">${escHtml(c.subLabel)}</span>` : ''}
          <span class="status-badge ${sc}">${escHtml(statusLabel)}</span>
          ${hasOverdue ? `<span class="status-badge overdue">🔔 ${dueRem.length} reminder</span>` : ''}
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

/* ---------- SIDEBAR & NAVIGATION ---------- */
function toggleSidebar() {
  const s = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    s.classList.toggle('mobile-open');
  } else {
    s.classList.toggle('collapsed');
  }
  playClick();
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
  const cats = ['sales','claims','servicing','recruitment','onboarding','snapwill','others'];
  cats.forEach(cat => {
    const stats = getCategoryStats(cat);
    const el = document.getElementById(`badge-${cat}`);
    if (el) {
      el.textContent = stats.active > 0 ? stats.active : '';
    }
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
  if (!q || q.trim().length < 2) { updateBadges(); return; }
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
    contacts.forEach(c => {
      html += renderContactCard(c);
    });
    html += '</div>';
  }

  if (cases.length) {
    html += `<div class="section-title mb-8">Cases</div><div class="case-list">`;
    cases.forEach(c => {
      html += renderCaseRow(c, 'openCaseById');
    });
    html += '</div>';
  }

  if (!contacts.length && !cases.length) {
    html += `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No results found</div><div class="empty-state-sub">Try a different search term</div></div>`;
  }

  content.innerHTML = html;
}

function openCaseById(id) {
  const c = getCase(id);
  if (!c) return;
  const handlers = {
    sales: openSalesCase, claims: openClaimsCase, servicing: openServicingCase,
    recruitment: openRecruitCase, onboarding: openOnboardCase,
    snapwill: openSnapwillCase, others: openOthersCase
  };
  const fn = handlers[c.category];
  if (fn) fn(id);
}

/* ---------- REMINDER CHECKER ---------- */
function checkRemindersOnLoad() {
  const due = getDueReminders();
  if (due.length > 0) {
    const first = due[0];
    showReminderAlert(
      `🔔 ${due.length} Reminder${due.length > 1 ? 's' : ''} Due`,
      `${first.title}${due.length > 1 ? ` and ${due.length - 1} more` : ''}`
    );
  }
}

// Check reminders every 60 seconds
setInterval(() => {
  const due = getDueReminders();
  const topBadge = document.getElementById('topReminderBadge');
  if (topBadge) topBadge.classList.toggle('show', due.length > 0);
}, 60000);
