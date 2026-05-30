/* ============================================
   App Entry — Router & KIV/Follow-Up Pages
   ============================================ */

let currentPage = 'dashboard';

const PAGE_MAP = {
  dashboard:   { render: renderDashboard,       title: 'Dashboard' },
  sales:       { render: renderSales,           title: 'Sales' },
  claims:      { render: renderClaims,          title: 'Claims' },
  servicing:   { render: renderServicing,       title: 'Servicing' },
  recruitment: { render: renderRecruitment,     title: 'Recruitment' },
  onboarding:  { render: renderOnboarding,      title: 'Onboarding' },
  snapwill:    { render: renderSnapwill,        title: 'Snapwill' },
  others:      { render: renderOthers,          title: 'Others' },
  crm:         { render: renderCRM,             title: 'CRM Contacts' },
  reminders:   { render: renderRemindersPage,   title: 'Reminders' },
  kiv:         { render: renderKIV,             title: 'KIV Listing' },
  followup:    { render: renderFollowUp,        title: 'Follow-Up' }
};

function navigateTo(page) {
  currentPage = page;
  const p = PAGE_MAP[page];
  if (!p) return;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  document.getElementById('pageTitle').textContent = p.title;
  document.getElementById('globalSearch').value = '';

  p.render();
  updateBadges();

  // Close mobile sidebar
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

function renderCurrentPage() {
  const p = PAGE_MAP[currentPage];
  if (p) p.render();
  updateBadges();
}

/* ---------- KIV PAGE ---------- */
function renderKIV() {
  document.getElementById('pageTitle').textContent = 'KIV Listing';
  const kivCases = getCases().filter(c => c.kiv);

  document.getElementById('content').innerHTML = `
    <div class="section-header mb-16">
      <div class="section-title">KIV Listing <small>${kivCases.length} items</small></div>
    </div>
    ${kivCases.length === 0
      ? emptyState('📌', 'No KIV items', 'Cases marked KIV will appear here')
      : `
        <div class="filter-bar mb-16">
          <span class="filter-chip active" onclick="filterKIV('all',this)">All</span>
          <span class="filter-chip" onclick="filterKIV('sales',this)">Sales</span>
          <span class="filter-chip" onclick="filterKIV('recruitment',this)">Recruitment</span>
          <span class="filter-chip" onclick="filterKIV('snapwill',this)">Snapwill</span>
          <span class="filter-chip" onclick="filterKIV('others',this)">Others</span>
        </div>
        <div id="kivListContent">
          ${renderKIVList(kivCases)}
        </div>`
    }
  `;
}

function filterKIV(cat, btn) {
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const all = getCases().filter(c => c.kiv);
  const filtered = cat === 'all' ? all : all.filter(c => c.category === cat);
  document.getElementById('kivListContent').innerHTML = renderKIVList(filtered);
  playClick();
}

function renderKIVList(cases) {
  return cases.map(c => `
    <div class="kiv-item" onclick="openCaseById('${c.id}')">
      ${avatarHTML(c.contactName, 36)}
      <div style="flex:1">
        <div class="fw-600">${escHtml(c.contactName)}</div>
        <div class="text-xs text-muted">${catMeta(c.category).icon} ${catMeta(c.category).label} ${c.label ? `• ${c.label}` : ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="status-badge kiv">KIV</span>
        <span class="text-xs text-muted">${formatDate(c.updatedAt)}</span>
      </div>
      <button class="btn btn-success btn-sm" onclick="event.stopPropagation();removeFromKIV('${c.id}')">↩ Reactivate</button>
    </div>`).join('');
}

function removeFromKIV(caseId) {
  updateCase(caseId, { kiv: false });
  showToast('Case reactivated!', 'success');
  playSuccess();
  renderKIV();
  updateBadges();
}

/* ---------- FOLLOW-UP PAGE ---------- */
function renderFollowUp() {
  document.getElementById('pageTitle').textContent = 'Follow-Up';
  const allCases = getCases().filter(c => !c.kiv);

  // Cases with due reminders
  const dueRemCaseIds = new Set(getDueReminders().map(r => r.caseId).filter(Boolean));
  const dueRem = allCases.filter(c => dueRemCaseIds.has(c.id));

  // Priority cases
  const priority = allCases.filter(c => c.priority);

  // Cases not updated in 7+ days
  const stale = allCases.filter(c => {
    const diff = (Date.now() - new Date(c.updatedAt).getTime()) / 86400000;
    return diff >= 7 && !c.priority;
  });

  document.getElementById('content').innerHTML = `
    ${dueRem.length > 0 ? `
      <div class="section-divider" style="color:var(--red)">🔔 Due Reminders (${dueRem.length})</div>
      <div class="case-list mb-24">${dueRem.map(c => renderCaseRow(c, 'openCaseById')).join('')}</div>
    ` : ''}
    ${priority.length > 0 ? `
      <div class="section-divider" style="color:var(--orange)">⭐ Priority Cases (${priority.length})</div>
      <div class="case-list mb-24">${priority.map(c => renderCaseRow(c, 'openCaseById')).join('')}</div>
    ` : ''}
    ${stale.length > 0 ? `
      <div class="section-divider" style="color:var(--text-secondary)">⏳ Not Updated in 7+ Days (${stale.length})</div>
      <div class="case-list mb-24">${stale.slice(0,20).map(c => renderCaseRow(c, 'openCaseById')).join('')}</div>
    ` : ''}
    ${dueRem.length === 0 && priority.length === 0 && stale.length === 0
      ? emptyState('🎉', 'All good!', 'No follow-ups needed right now') : ''}
  `;
}

/* ---------- INIT ---------- */
window.addEventListener('DOMContentLoaded', () => {
  // Seed demo data if empty
  if (DB.contacts.length === 0 && DB.cases.length === 0) {
    seedDemoData();
  }

  navigateTo('dashboard');
  updateBadges();

  // Init Google Drive sync
  gdInit();

  // Check reminders after 1 second
  setTimeout(checkRemindersOnLoad, 1000);
});

// Close modals on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
});

/* ---------- DEMO DATA ---------- */
function seedDemoData() {
  // Create sample contacts
  const alice = createContact({ name: 'Alice Tan', phone: '0123456789', email: 'alice@email.com', nric: '901215-10-1234', occupation: 'Teacher' });
  const bob = createContact({ name: 'Bob Lim', phone: '0198765432', email: 'bob@email.com', occupation: 'Engineer' });
  const carol = createContact({ name: 'Carol Wong', phone: '0176543210', occupation: 'Nurse' });
  const david = createContact({ name: 'David Lee', phone: '0134567890', occupation: 'Business Owner' });

  // Sales cases
  createCase({
    contactId: alice.id, contactName: alice.name, category: 'sales', subLabel: 'AIA',
    currentStatus: 3, priority: true, remarks: 'Interested in medical + PA plan',
    statusHistory: [
      { fromStatus: 0, toStatus: 1, remark: 'Approached via referral', date: new Date(Date.now()-7*86400000).toISOString() },
      { fromStatus: 1, toStatus: 2, remark: 'Completed fact-finding', date: new Date(Date.now()-5*86400000).toISOString() },
      { fromStatus: 2, toStatus: 3, remark: 'Policy summary prepared', date: new Date(Date.now()-2*86400000).toISOString() }
    ]
  });
  createCase({
    contactId: bob.id, contactName: bob.name, category: 'sales', subLabel: 'Snapwill',
    currentStatus: 1, remarks: 'Cold call prospect',
    statusHistory: [{ fromStatus: 0, toStatus: 1, remark: 'Initial approach', date: new Date().toISOString() }]
  });

  // Claims case
  createCase({
    contactId: carol.id, contactName: carol.name, category: 'claims', label: 'B1',
    currentStatus: 3, remarks: 'Hospitalisation 3 days',
    statusHistory: [
      { fromStatus: 0, toStatus: 1, date: new Date(Date.now()-10*86400000).toISOString() },
      { fromStatus: 1, toStatus: 2, date: new Date(Date.now()-7*86400000).toISOString() },
      { fromStatus: 2, toStatus: 3, remark: 'Submitted via portal', date: new Date(Date.now()-3*86400000).toISOString() }
    ]
  });

  // Recruitment case
  const recruit = createCase({
    contactId: david.id, contactName: david.name, category: 'recruitment',
    currentStatus: 2,
    statusHistory: [
      { fromStatus: 0, toStatus: 1, remark: 'Met at networking event', date: new Date(Date.now()-5*86400000).toISOString() },
      { fromStatus: 1, toStatus: 2, date: new Date(Date.now()-2*86400000).toISOString() }
    ]
  });

  // Add a reminder
  addReminder({
    caseId: alice.id, contactName: alice.name, category: 'sales',
    title: 'Follow up: Policy Summary — Alice Tan',
    date: todayStr()
  });

  addReminder({
    caseId: carol.id, contactName: carol.name, category: 'claims',
    title: 'Check claim status — Carol Wong',
    date: workingDaysReminder(new Date(Date.now()-3*86400000), 7)
  });

  saveDB();
}
