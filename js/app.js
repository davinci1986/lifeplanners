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
  aisolution:  { render: renderAISolution,      title: 'AI Solution' },
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
        <div class="text-xs text-muted">${catMeta(c.category).icon} ${catMeta(c.category).label} ${c.label ? `• ${getLabelName(c.category, c.label)}` : ''}</div>
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

  // Always init Google auth (to restore saved token for auto-sync)
  gauthInit();
  // Try local auth session
  localAuthInit();

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

/* ---- Password Hashing (SHA-256, SubtleCrypto — browser built-in, no library) ---- */
async function hashPassword(pwd) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
  return 'sha256:' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
async function verifyPassword(input, stored) {
  if (!stored) return false;
  if (stored.startsWith('sha256:')) return (await hashPassword(input)) === stored;
  return input === stored; // legacy plaintext fallback
}

/* ---- Brute-Force Lockout ---- */
const _LO_KEY = 'lp_lockout';
function _getLockout() { try { return JSON.parse(localStorage.getItem(_LO_KEY)||'{}'); } catch { return {}; } }
function _isLockedOut() {
  const lo = _getLockout();
  if (!lo.until) return null;
  if (Date.now() < lo.until) return lo;
  localStorage.removeItem(_LO_KEY);
  return null;
}
function _recordFail(username) {
  const lo = _getLockout();
  const count = (lo.count||0) + 1;
  const until = count >= 5 ? Date.now() + 15*60*1000 : null;
  localStorage.setItem(_LO_KEY, JSON.stringify({ count, username, until }));
  return count;
}
function _clearLockout() { localStorage.removeItem(_LO_KEY); }

/* ---- Auto-Logout on Inactivity (30 min) ---- */
let _inactivityTimer = null;
const INACTIVITY_MS = 30 * 60 * 1000;
function _resetInactivity() {
  clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(() => {
    if (LOCAL_AUTH.currentUser) {
      showToast('Session expired due to inactivity.', 'info');
      localLogout();
    }
  }, INACTIVITY_MS);
}
function startAutoLogout() {
  ['mousemove','keydown','click','touchstart'].forEach(e => document.addEventListener(e, _resetInactivity, { passive:true }));
  _resetInactivity();
}
function stopAutoLogout() {
  clearTimeout(_inactivityTimer);
  ['mousemove','keydown','click','touchstart'].forEach(e => document.removeEventListener(e, _resetInactivity));
}

/* ---- Login / Logout ---- */
async function localLogin() {
  const username = document.getElementById('loginUsername')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  if (!username || !password) { showLoginError('Please enter username and password'); return; }

  // Check lockout
  const lo = _isLockedOut();
  if (lo) {
    const mins = Math.ceil((lo.until - Date.now()) / 60000);
    showLoginError(`Too many failed attempts. Try again in ${mins} minute${mins>1?'s':''}.`);
    return;
  }

  const users = getLocalUsers();
  const user  = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !(await verifyPassword(password, user.password))) {
    const count = _recordFail(username);
    const left  = Math.max(0, 5 - count);
    showLoginError(left > 0
      ? `Invalid username or password. ${left} attempt${left!==1?'s':''} remaining.`
      : 'Account locked for 15 minutes due to too many failed attempts.');
    return;
  }

  _clearLockout();

  // Silently upgrade plaintext password to hash
  if (!user.password.startsWith('sha256:')) {
    const hashed = await hashPassword(password);
    const all = getLocalUsers();
    const idx = all.findIndex(u => u.id === user.id);
    if (idx >= 0) { all[idx].password = hashed; saveLocalUsers(all); user.password = hashed; }
  }

  LOCAL_AUTH.currentUser = user;
  sessionStorage.setItem('lp_session', JSON.stringify(user));
  startAutoLogout();
  onLocalAuthReady();
}

function localLogout() {
  LOCAL_AUTH.currentUser = null;
  sessionStorage.removeItem('lp_session');
  stopAutoLogout();
  showLoginScreen();
}

function onLocalAuthReady() {
  const user = LOCAL_AUTH.currentUser;
  hideLoginScreen();
  refreshSidebarCategories();
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
  if (typeof updateSoundBtn === 'function') updateSoundBtn();
  setTimeout(checkRemindersOnLoad, 1500);
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission();
  // Auto-sync with Google Sheets (no button press needed)
  // Wait for Google token to restore, then pull latest + start push sync
  setTimeout(() => {
    if (typeof GAUTH !== 'undefined' && GAUTH.accessToken) {
      showToast('☁️ Auto-syncing...', 'info');
      (async () => {
        if (typeof pullMyDataFromSheets === 'function') await pullMyDataFromSheets();
        if (typeof pullTeamDataFromSheets === 'function') await pullTeamDataFromSheets();
        if (typeof startSheetsSync === 'function') startSheetsSync();
      })();
    }
  }, 2000);
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

    <!-- Notifications -->
    <div class="card mb-24">
      <div class="card-header"><div class="card-title">🔔 Push Notifications</div></div>
      <div class="card-body">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
          Reminders fire on <strong>all three channels at once</strong> — even when the app is closed. Both are free.
        </p>

        <div class="section-divider" style="margin-top:0">💬 WhatsApp (via CallMeBot — Free)</div>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
          Setup: On WhatsApp, add <strong>+34 644 59 78 53</strong> as a contact → send this exact message:<br>
          <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:11px">I allow callmebot to send me messages</code><br>
          CallMeBot will reply with your <strong>API Key</strong>. Use your phone number with country code (e.g. <code>60123456789</code>).
        </p>
        <div class="form-row mb-8">
          <div class="form-group mb-0">
            <label class="form-label">Phone Number (with country code)</label>
            <input class="form-control" id="wa_phone" value="${escHtml(DB.settings?.waPhone||'')}" placeholder="60123456789" />
          </div>
          <div class="form-group mb-0">
            <label class="form-label">CallMeBot API Key</label>
            <input class="form-control" id="wa_apikey" value="${escHtml(DB.settings?.waApiKey||'')}" placeholder="Your API key from CallMeBot..." />
          </div>
        </div>
        <div class="btn-row mb-16">
          <button class="btn btn-secondary btn-sm" onclick="testWhatsApp()">📱 Test WhatsApp</button>
          <button class="btn btn-primary btn-sm" onclick="saveWhatsAppSettings()">💾 Save</button>
        </div>

        <div class="section-divider">🤖 Telegram (Free)</div>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
          Setup: Message <strong>@BotFather</strong> on Telegram → <code>/newbot</code> → copy Bot Token.
          Then message your bot once, and send <code>/start</code> to <strong>@userinfobot</strong> to get your Chat ID.
        </p>
        <div class="form-row mb-8">
          <div class="form-group mb-0">
            <label class="form-label">Bot Token</label>
            <input class="form-control" id="tg_token" value="${escHtml(DB.settings?.telegramToken||'')}" placeholder="123456789:ABCdef..." />
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Chat ID</label>
            <input class="form-control" id="tg_chatid" value="${escHtml(DB.settings?.telegramChatId||'')}" placeholder="Your Telegram user ID..." />
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary btn-sm" onclick="testTelegram()">📨 Test Telegram</button>
          <button class="btn btn-primary btn-sm" onclick="saveTelegramSettings()">💾 Save</button>
        </div>
      </div>
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

    <!-- Custom Categories -->
    <div class="card mb-24">
      <div class="card-header">
        <div class="card-title">📁 Custom Categories</div>
        <button class="btn btn-primary btn-sm" onclick="openAddCategory()">+ Add Category</button>
      </div>
      <div class="card-body" style="padding-bottom:8px" id="customCatList">
        ${renderCustomCategoryList()}
      </div>
    </div>

    <!-- Customize Built-in Categories -->
    <div class="card mb-24">
      <div class="card-header"><div class="card-title">🔧 Customize Built-in Category Steps</div></div>
      <div class="card-body">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Rename, add or remove progress steps for any built-in category. Changes apply to all cases.</p>
        ${renderBuiltinCategoryEditors()}
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

function saveWhatsAppSettings() {
  const phone = document.getElementById('wa_phone')?.value?.trim();
  const apiKey = document.getElementById('wa_apikey')?.value?.trim();
  DB.settings = { ...(DB.settings || {}), waPhone: phone, waApiKey: apiKey };
  saveDB();
  showToast('WhatsApp settings saved!', 'success');
  renderAdminPanel();
}

async function testWhatsApp() {
  const phone = document.getElementById('wa_phone')?.value?.trim();
  const apiKey = document.getElementById('wa_apikey')?.value?.trim();
  if (!phone || !apiKey) { showToast('Enter Phone and API Key first', 'warning'); return; }
  try {
    const text = encodeURIComponent('✅ LifePlanner Pro connected!\nYou will now receive reminder notifications here.');
    const res = await fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${apiKey}`);
    const body = await res.text();
    if (body.toLowerCase().includes('message queued') || body.toLowerCase().includes('ok') || res.ok) {
      showToast('✅ WhatsApp message sent! Check your phone.', 'success');
      playSuccess();
    } else {
      showToast('❌ Failed — check phone number and API key', 'error');
    }
  } catch (e) {
    showToast('❌ Error: ' + e.message, 'error');
  }
}

function saveTelegramSettings() {
  const token = document.getElementById('tg_token')?.value?.trim();
  const chatId = document.getElementById('tg_chatid')?.value?.trim();
  DB.settings = { ...(DB.settings || {}), telegramToken: token, telegramChatId: chatId };
  saveDB();
  showToast('Telegram settings saved!', 'success');
  renderAdminPanel();
}

async function testTelegram() {
  const token = document.getElementById('tg_token')?.value?.trim();
  const chatId = document.getElementById('tg_chatid')?.value?.trim();
  if (!token || !chatId) { showToast('Enter Bot Token and Chat ID first', 'warning'); return; }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '✅ *LifePlanner Pro connected!*\nYou will now receive reminder notifications here.', parse_mode: 'Markdown' })
    });
    const data = await res.json();
    if (data.ok) {
      showToast('✅ Telegram connected! Check your chat.', 'success');
      playSuccess();
    } else {
      showToast('❌ Failed: ' + (data.description || 'Check token/chat ID'), 'error');
    }
  } catch (e) {
    showToast('❌ Error: ' + e.message, 'error');
  }
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

async function saveUser(existingId = '') {
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
    const pwUpdate = password ? { password: await hashPassword(password) } : {};
    users[idx] = { ...users[idx], name, username, role, email, ...pwUpdate };
  } else {
    if (!password) { showToast('Password is required', 'error'); return; }
    const dup = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (dup) { showToast('Username already exists', 'error'); return; }
    const hashed = await hashPassword(password);
    users.push({ id: 'u' + Date.now(), username, password: hashed, name, role, email, createdAt: new Date().toISOString() });
  }
  saveLocalUsers(users);
  showToast('User saved!', 'success');
  closeContactModalBtn();
  renderAdminPanel();
}

/* ======================================================
   CUSTOM CATEGORY MANAGEMENT
   ====================================================== */
function renderCustomCategoryList() {
  const cats = getCustomCategories();
  if (cats.length === 0) return '<div class="text-sm text-muted" style="padding:8px 0">No custom categories yet. Click + Add Category to create one.</div>';
  return cats.map(cat => `
    <div class="admin-user-card" style="flex-direction:column;align-items:stretch">
      <div class="flex items-center gap-12 mb-8">
        <span style="font-size:22px">${cat.icon}</span>
        <div style="flex:1">
          <div class="fw-600">${escHtml(cat.name)}</div>
          <div class="text-xs text-muted">${(cat.statuses||[]).length} statuses • ${getLabelDefs(cat.id).length} labels</div>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" onclick="openEditCategory('${cat.id}')">✏ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCatConfirm('${cat.id}')">🗑</button>
        </div>
      </div>
      <!-- Statuses -->
      <div style="background:var(--bg);border-radius:8px;padding:8px 10px;margin-bottom:6px">
        <div class="text-xs fw-600 text-muted mb-6">STATUSES</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
          ${(cat.statuses||[]).map(s => `
            <div style="display:flex;align-items:center;gap:4px;background:#fff;border:1px solid var(--border);border-radius:16px;padding:3px 10px;font-size:11px">
              <span>${s.n}. ${escHtml(s.label)}</span>
              <button onclick="editCatStatus('${cat.id}',${s.n},'${escHtml(s.label)}')" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--blue)">✏</button>
              <button onclick="deleteCatStatus('${cat.id}',${s.n})" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--red)">✕</button>
            </div>`).join('')}
        </div>
        <div class="flex gap-6">
          <input class="form-control" id="newstat_${cat.id}" placeholder="New status name..." style="font-size:12px" />
          <button class="btn btn-secondary btn-sm" onclick="addCatStatus('${cat.id}')">+ Add</button>
        </div>
      </div>
      <!-- Labels -->
      <div style="background:var(--bg);border-radius:8px;padding:8px 10px">
        <div class="text-xs fw-600 text-muted mb-6">LABELS</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
          ${getLabelDefs(cat.id).map(l => `
            <div style="display:flex;align-items:center;gap:4px;background:#fff;border:1px solid var(--border);border-radius:16px;padding:3px 10px;font-size:11px">
              <span>${escHtml(l.id !== l.label ? l.id+' — '+l.label : l.label)}</span>
              <button onclick="deleteCatLabel('${cat.id}','${l.id}')" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--red)">✕</button>
            </div>`).join('')}
        </div>
        <div class="flex gap-6">
          <input class="form-control" id="newlbl_${cat.id}" placeholder="New label name..." style="font-size:12px" />
          <button class="btn btn-secondary btn-sm" onclick="addCatLabel('${cat.id}')">+ Add</button>
        </div>
      </div>
    </div>`).join('');
}

function openAddCategory() {
  document.getElementById('contactModalTitle').textContent = '📁 New Category';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Category Name *</label>
        <input class="form-control" id="cat_name" placeholder="e.g. VIP Clients" />
      </div>
      <div class="form-group">
        <label class="form-label">Icon (emoji)</label>
        <input class="form-control" id="cat_icon" placeholder="📁" value="📁" style="font-size:20px" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Color</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['#007AFF','#34C759','#FF9500','#FF3B30','#AF52DE','#5AC8FA','#FF2D55','#FFCC00'].map(col =>
          `<div onclick="document.getElementById('cat_color').value='${col}'" style="width:28px;height:28px;background:${col};border-radius:50%;cursor:pointer;border:2px solid transparent" onmouseover="this.style.border='2px solid #000'" onmouseout="this.style.border='2px solid transparent'"></div>`
        ).join('')}
        <input type="color" class="form-control" id="cat_color" value="#007AFF" style="width:60px;height:34px;padding:2px" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Initial Statuses (one per line)</label>
      <textarea class="form-control" id="cat_statuses" rows="4" placeholder="Step 1&#10;Step 2&#10;Step 3"></textarea>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveNewCategory()">Create Category</button>
    </div>`;
  openModal('contactModal');
}

function saveNewCategory() {
  const name = document.getElementById('cat_name')?.value?.trim();
  if (!name) { showToast('Category name required', 'error'); return; }
  const icon = document.getElementById('cat_icon')?.value?.trim() || '📁';
  const color = document.getElementById('cat_color')?.value || '#007AFF';
  const statusText = document.getElementById('cat_statuses')?.value || '';
  const statuses = statusText.split('\n').map(l => l.trim()).filter(Boolean).map((label, i) => ({ n: i + 1, label }));
  const bg = color + '20'; // 20 = ~12% opacity hex
  createCustomCategory({ name, icon, color, bg, statuses });
  showToast(`Category "${name}" created!`, 'success');
  playSuccess();
  closeContactModalBtn();
  renderAdminPanel();
}

function openEditCategory(catId) {
  const cat = getCustomCategories().find(c => c.id === catId);
  if (!cat) return;
  document.getElementById('contactModalTitle').textContent = '✏ Edit Category';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input class="form-control" id="cat_name" value="${escHtml(cat.name)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Icon</label>
        <input class="form-control" id="cat_icon" value="${escHtml(cat.icon)}" style="font-size:20px" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Color</label>
      <input type="color" class="form-control" id="cat_color" value="${escHtml(cat.color||'#007AFF')}" style="width:80px;height:36px;padding:2px" />
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveCategoryEdit('${catId}')">Save</button>
    </div>`;
  openModal('contactModal');
}

function saveCategoryEdit(catId) {
  const name = document.getElementById('cat_name')?.value?.trim();
  if (!name) { showToast('Name required', 'error'); return; }
  const icon = document.getElementById('cat_icon')?.value?.trim() || '📁';
  const color = document.getElementById('cat_color')?.value || '#007AFF';
  updateCustomCategory(catId, { name, icon, color, bg: color + '20' });
  showToast('Category updated!', 'success');
  closeContactModalBtn();
  renderAdminPanel();
}

async function deleteCatConfirm(catId) {
  const cat = getCustomCategories().find(c => c.id === catId);
  const ok = await showConfirm('Delete Category', `Delete "${cat?.name}"? Cases in this category will not be deleted but won't appear here.`, 'Delete');
  if (!ok) return;
  deleteCustomCategory(catId);
  showToast('Category deleted', 'info');
  renderAdminPanel();
}

function addCatStatus(catId) {
  const input = document.getElementById(`newstat_${catId}`);
  const label = input?.value?.trim();
  if (!label) { showToast('Enter a status name', 'error'); return; }
  addStatusToCustomCategory(catId, label);
  showToast('Status added!', 'success');
  input.value = '';
  renderAdminPanel();
}

function editCatStatus(catId, statusN, currentLabel) {
  const newLabel = prompt(`Rename status "${currentLabel}":`, currentLabel);
  if (!newLabel || newLabel.trim() === currentLabel) return;
  updateStatusInCustomCategory(catId, statusN, newLabel.trim());
  renderAdminPanel();
}

function deleteCatStatus(catId, statusN) {
  removeStatusFromCustomCategory(catId, statusN);
  renderAdminPanel();
}

function addCatLabel(catId) {
  const input = document.getElementById(`newlbl_${catId}`);
  const val = input?.value?.trim();
  if (!val) { showToast('Enter a label name', 'error'); return; }
  addCustomLabel(catId, { label: val });
  showToast('Label added!', 'success');
  input.value = '';
  renderAdminPanel();
}

function deleteCatLabel(catId, labelId) {
  deleteCustomLabel(catId, labelId);
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

/* ======================================================
   BUILT-IN CATEGORY STEP CUSTOMIZATION
   ====================================================== */
const BUILTIN_CATS = ['sales','claims','servicing','recruitment','onboarding','snapwill'];

function renderBuiltinCategoryEditors() {
  return BUILTIN_CATS.map(catId => {
    const meta = catMeta(catId);
    const steps = getStatusDef(catId);
    const isCustomised = !!(DB.globalStatusDefs?.[catId]?.length);
    return `
      <div style="border:1px solid var(--border);border-radius:10px;margin-bottom:12px;overflow:hidden">
        <div class="flex items-center gap-8" style="padding:10px 14px;background:var(--bg);cursor:pointer" onclick="toggleBuiltinEditor('bce_${catId}')">
          <span style="font-size:18px">${meta.icon}</span>
          <span class="fw-600">${meta.label}</span>
          <span class="text-xs text-muted">${steps.length} steps</span>
          ${isCustomised ? '<span style="background:var(--blue);color:#fff;border-radius:10px;padding:1px 8px;font-size:10px">Customised</span>' : ''}
          <span style="margin-left:auto;color:var(--text-muted)">▼</span>
        </div>
        <div id="bce_${catId}" style="display:none;padding:12px 14px">
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px" id="bce_steps_${catId}">
            ${steps.map(s => `
              <div style="display:flex;align-items:center;gap:4px;background:#fff;border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:12px">
                <span style="color:var(--text-muted);font-weight:600;margin-right:2px">${s.n}.</span>
                <span id="bce_lbl_${catId}_${s.n}">${escHtml(s.label)}</span>
                <button onclick="openEditBuiltinStep('${catId}',${s.n},'${escHtml(s.label)}')" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--blue);margin-left:2px">✏</button>
                <button onclick="removeBuiltinStep('${catId}',${s.n})" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--red)">✕</button>
              </div>`).join('')}
          </div>
          <div class="flex gap-6 mb-8">
            <input class="form-control" id="bce_new_${catId}" placeholder="Add new step..." style="font-size:12px" />
            <button class="btn btn-secondary btn-sm" onclick="addBuiltinStep('${catId}')">+ Add</button>
          </div>
          ${isCustomised ? `<button class="btn btn-danger btn-sm" onclick="resetBuiltinCat('${catId}')">↩ Reset to Default</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function toggleBuiltinEditor(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function openEditBuiltinStep(catId, stepN, currentLabel) {
  document.getElementById('contactModalTitle').textContent = `✏ Edit Step ${stepN}`;
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">${catMeta(catId).label} — Step ${stepN}</label>
      <input class="form-control" id="bce_edit_input" value="${escHtml(currentLabel)}" />
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveBuiltinStep('${catId}',${stepN})">Save</button>
    </div>`;
  openModal('contactModal');
}

function saveBuiltinStep(catId, stepN) {
  const newLabel = document.getElementById('bce_edit_input')?.value?.trim();
  if (!newLabel) { showToast('Please enter a label', 'error'); return; }
  const defs = JSON.parse(JSON.stringify(getStatusDef(catId)));
  const idx = defs.findIndex(s => s.n === stepN);
  if (idx >= 0) defs[idx].label = newLabel; else defs.push({ n: stepN, label: newLabel });
  setGlobalStatusDef(catId, defs);
  showToast('Step updated!', 'success');
  closeContactModalBtn();
  renderAdminPanel();
}

function addBuiltinStep(catId) {
  const input = document.getElementById(`bce_new_${catId}`);
  const label = input?.value?.trim();
  if (!label) { showToast('Enter a step name', 'error'); return; }
  const defs = JSON.parse(JSON.stringify(getStatusDef(catId)));
  const maxN = defs.reduce((m, s) => Math.max(m, s.n), 0);
  defs.push({ n: maxN + 1, label });
  setGlobalStatusDef(catId, defs);
  showToast('Step added!', 'success');
  input.value = '';
  renderAdminPanel();
}

function removeBuiltinStep(catId, stepN) {
  const defs = JSON.parse(JSON.stringify(getStatusDef(catId))).filter(s => s.n !== stepN);
  setGlobalStatusDef(catId, defs);
  renderAdminPanel();
}

function resetBuiltinCat(catId) {
  resetGlobalStatusDef(catId);
  showToast('Reset to default steps!', 'info');
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
