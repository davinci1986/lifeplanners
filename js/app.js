/* ============================================
   App Entry — Router & KIV/Follow-Up Pages
   ============================================ */

let currentPage = 'dashboard';

// Local auth state — must be declared early so navigateTo can reference it
const LOCAL_AUTH = { currentUser: null };

const PAGE_MAP = {
  dashboard:   { render: renderDashboard,       title: 'Dashboard' },
  admin:       { render: renderAdminPanel,      title: 'Admin Panel' },
  team:        { render: renderTeamDashboard,   title: 'Team Dashboard' },
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

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  document.getElementById('pageTitle').textContent = p.title;
  document.getElementById('globalSearch').value = '';

  // Show/hide role-based nav items
  const role = LOCAL_AUTH.currentUser?.role || GAUTH.currentUser?.role;
  const teamNav = document.getElementById('nav-team');
  if (teamNav) teamNav.style.display = (role && role !== 'agent') ? 'flex' : 'none';
  const adminNav = document.getElementById('nav-admin');
  if (adminNav) adminNav.style.display = (role === 'admin') ? 'flex' : 'none';

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
  // Show login screen first
  showLoginScreen();

  // Try local auth session first
  const hasLocalSession = localAuthInit();
  if (!hasLocalSession) {
    // Fall back to Google auth
    gauthInit();
  }

  // Check reminders after 2 seconds (post-auth)
  setTimeout(checkRemindersOnLoad, 2000);
});

// Role-based nav visibility is handled inside navigateTo above.

/* ======================================================
   LOCAL AUTH — Username / Password System
   Users stored in localStorage key: lp_users
   Session stored in sessionStorage key: lp_session
   ====================================================== */
function localAuthInit() {
  // Seed default admin if no users exist
  if (!localStorage.getItem('lp_users')) {
    const defaults = [
      { id: 'u1', username: 'admin', password: 'admin', role: 'admin', name: 'Keith (Admin)', email: 'chongwei1986@gmail.com', createdAt: new Date().toISOString() }
    ];
    localStorage.setItem('lp_users', JSON.stringify(defaults));
  }
  // Restore session
  const saved = sessionStorage.getItem('lp_session');
  if (saved) {
    try {
      LOCAL_AUTH.currentUser = JSON.parse(saved);
      onLocalAuthReady();
      return true;
    } catch (e) {}
  }
  return false;
}

function getLocalUsers() {
  try { return JSON.parse(localStorage.getItem('lp_users') || '[]'); } catch { return []; }
}
function saveLocalUsers(users) { localStorage.setItem('lp_users', JSON.stringify(users)); }

function localLogin() {
  const username = document.getElementById('loginUsername')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  if (!username || !password) { showLoginError('Please enter username and password'); return; }
  const users = getLocalUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) { showLoginError('Invalid username or password'); return; }
  LOCAL_AUTH.currentUser = user;
  sessionStorage.setItem('lp_session', JSON.stringify(user));
  onLocalAuthReady();
}

function localLogout() {
  LOCAL_AUTH.currentUser = null;
  sessionStorage.removeItem('lp_session');
  showLoginScreen();
}

function onLocalAuthReady() {
  const user = LOCAL_AUTH.currentUser;
  hideLoginScreen();
  // Update sidebar user info
  const userInfo = document.getElementById('authUserInfo');
  if (userInfo) {
    const roleColors = { admin: 'var(--red)', dm: 'var(--purple)', um: 'var(--blue)', agent: 'var(--green)' };
    userInfo.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
        <div style="width:30px;height:30px;border-radius:50%;background:${getAvatarColor(user.name)};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${getInitials(user.name)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(user.name)}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4)">${escHtml(user.role||'user')}</div>
        </div>
      </div>`;
  }
  navigateTo('dashboard');
  updateBadges();
  setTimeout(checkRemindersOnLoad, 1500);
}

function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('loginPasswordForm').style.display = tab === 'password' ? 'block' : 'none';
  document.getElementById('loginGoogleForm').style.display   = tab === 'google'   ? 'block' : 'none';
}

/* ======================================================
   ADMIN PANEL
   ====================================================== */
function renderAdminPanel() {
  const currentUser = LOCAL_AUTH.currentUser;
  if (!currentUser || currentUser.role !== 'admin') {
    document.getElementById('content').innerHTML = emptyState('🔒', 'Access Denied', 'Admin only area');
    return;
  }
  const users = getLocalUsers();
  const sharedSheetId = localStorage.getItem('lp_shared_sheet_id') || '';

  document.getElementById('content').innerHTML = `
    <div class="section-header mb-16">
      <div class="section-title">⚙ Admin Panel</div>
    </div>

    <!-- Shared Google Sheet -->
    <div class="card mb-24">
      <div class="card-header"><div class="card-title">☁ Centralized Google Sheet (Shared Drive)</div></div>
      <div class="card-body">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
          Set one Google Sheet ID for the whole team. All users sync their data here.
          Share your Google Sheet with each team member's Google account as <strong>Editor</strong>.
        </p>
        ${sharedSheetId ? `<div class="shared-sheet-banner">✅ Shared Sheet configured: <code style="background:rgba(0,122,255,0.1);padding:2px 6px;border-radius:4px">${escHtml(sharedSheetId)}</code></div>` : ''}
        <div class="form-row">
          <div class="form-group mb-0">
            <label class="form-label">Google Sheet ID</label>
            <input class="form-control" id="admin_sheet_id" value="${escHtml(sharedSheetId)}" placeholder="Paste Sheet ID from the Sheet URL..." />
          </div>
        </div>
        <div class="btn-row mt-12">
          <button class="btn btn-secondary btn-sm" onclick="clearSharedSheet()">Clear</button>
          <button class="btn btn-primary btn-sm" onclick="saveSharedSheet()">💾 Save Sheet ID</button>
        </div>
      </div>
    </div>

    <!-- User Management -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">👥 User Accounts (${users.length})</div>
        <button class="btn btn-primary btn-sm" onclick="openAddUser()">+ Add User</button>
      </div>
      <div class="card-body" style="padding-bottom:8px">
        ${users.map(u => `
          <div class="admin-user-card">
            <div style="width:36px;height:36px;border-radius:50%;background:${getAvatarColor(u.name)};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${getInitials(u.name)}</div>
            <div style="flex:1;min-width:0">
              <div class="fw-600">${escHtml(u.name)} <span class="user-role-pill role-${u.role}">${escHtml(u.role)}</span></div>
              <div class="text-xs text-muted">@${escHtml(u.username)} ${u.email ? '• '+escHtml(u.email) : ''}</div>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-secondary btn-sm" onclick="openEditUser('${u.id}')">✏ Edit</button>
              ${u.id !== 'u1' ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">🗑</button>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

function saveSharedSheet() {
  const id = document.getElementById('admin_sheet_id')?.value?.trim();
  if (id) {
    localStorage.setItem('lp_shared_sheet_id', id);
    // Override current sheets_id so everyone uses this
    localStorage.setItem('sheets_id', id);
    GAUTH.spreadsheetId = id;
    showToast('Shared Sheet ID saved! All users will sync here.', 'success');
  }
  renderAdminPanel();
}

function clearSharedSheet() {
  localStorage.removeItem('lp_shared_sheet_id');
  showToast('Shared sheet cleared', 'info');
  renderAdminPanel();
}

function openAddUser() {
  document.getElementById('contactModalTitle').textContent = 'Add Team Member';
  document.getElementById('contactModalBody').innerHTML = renderUserForm();
  openModal('contactModal');
}

function openEditUser(userId) {
  const users = getLocalUsers();
  const u = users.find(x => x.id === userId);
  if (!u) return;
  document.getElementById('contactModalTitle').textContent = 'Edit User';
  document.getElementById('contactModalBody').innerHTML = renderUserForm(u);
  openModal('contactModal');
}

function renderUserForm(u = null) {
  return `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input class="form-control" id="uf_name" value="${escHtml(u?.name||'')}" placeholder="Full name" />
      </div>
      <div class="form-group">
        <label class="form-label">Role *</label>
        <select class="form-control" id="uf_role">
          ${['admin','dm','um','agent'].map(r => `<option value="${r}" ${u?.role===r?'selected':''}>${r.toUpperCase()}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Username *</label>
        <input class="form-control" id="uf_username" value="${escHtml(u?.username||'')}" placeholder="login username" />
      </div>
      <div class="form-group">
        <label class="form-label">Password ${u ? '(leave blank = no change)' : '*'}</label>
        <input class="form-control" id="uf_password" type="password" placeholder="${u ? 'New password...' : 'Password...'}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="form-control" id="uf_email" value="${escHtml(u?.email||'')}" placeholder="email@example.com" />
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveUser('${u?.id||''}')">${u ? 'Save Changes' : 'Create User'}</button>
    </div>`;
}

function saveUser(existingId = '') {
  const name     = document.getElementById('uf_name')?.value?.trim();
  const username = document.getElementById('uf_username')?.value?.trim();
  const password = document.getElementById('uf_password')?.value;
  const role     = document.getElementById('uf_role')?.value;
  const email    = document.getElementById('uf_email')?.value?.trim();
  if (!name || !username) { showToast('Name and username are required', 'error'); return; }
  const users = getLocalUsers();
  if (existingId) {
    const idx = users.findIndex(u => u.id === existingId);
    if (idx < 0) return;
    users[idx] = { ...users[idx], name, username, role, email, ...(password ? { password } : {}) };
  } else {
    if (!password) { showToast('Password is required', 'error'); return; }
    const dup = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (dup) { showToast('Username already exists', 'error'); return; }
    users.push({ id: 'u' + Date.now(), username, password, name, role, email, createdAt: new Date().toISOString() });
  }
  saveLocalUsers(users);
  showToast('User saved!', 'success');
  closeContactModalBtn();
  renderAdminPanel();
}

async function deleteUser(userId) {
  const users = getLocalUsers();
  const u = users.find(x => x.id === userId);
  if (!u) return;
  const ok = await showConfirm('Delete User', `Delete account for ${u.name}? They will no longer be able to log in.`, 'Delete');
  if (!ok) return;
  saveLocalUsers(users.filter(x => x.id !== userId));
  showToast('User deleted', 'info');
  renderAdminPanel();
}

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
