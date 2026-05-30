/* ============================================
   Google Auth + Sheets Integration
   Handles Sign-In, Roles, and Sheets API
   ============================================ */

const GAUTH = {
  CLIENT_ID: localStorage.getItem('gd_client_id') || '',
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'email', 'profile'
  ].join(' '),
  accessToken: null,
  tokenExpiry: null,
  tokenClient: null,
  currentUser: null,
  spreadsheetId: localStorage.getItem('sheets_id') || null,
  status: 'idle'
};

function gauthInit() {
  GAUTH.CLIENT_ID = localStorage.getItem('gd_client_id') || '';
  if (!GAUTH.CLIENT_ID) return;
  const script = document.getElementById('gsi-script');
  if (!script) {
    const s = document.createElement('script');
    s.id = 'gsi-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => gauthSetupClient();
    document.head.appendChild(s);
  } else if (window.google?.accounts?.oauth2) {
    gauthSetupClient();
  }
  const saved = sessionStorage.getItem('gauth_token');
  const expiry = sessionStorage.getItem('gauth_expiry');
  const user = sessionStorage.getItem('gauth_user');
  if (saved && expiry && Date.now() < Number(expiry) && user) {
    GAUTH.accessToken = saved;
    GAUTH.tokenExpiry = Number(expiry);
    GAUTH.currentUser = JSON.parse(user);
    onAuthReady();
  }
}

function gauthSetupClient() {
  try {
    GAUTH.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GAUTH.CLIENT_ID,
      scope: GAUTH.SCOPES,
      callback: gauthOnToken,
      error_callback: (e) => showLoginError('Authentication failed: ' + (e.message || e.type))
    });
  } catch (e) { console.error('GSI init failed', e); }
}

function gauthSignIn() {
  if (!GAUTH.CLIENT_ID) { openGDSetup(); return; }
  if (!GAUTH.tokenClient) { gauthInit(); setTimeout(gauthSignIn, 800); return; }
  GAUTH.tokenClient.requestAccessToken({ prompt: 'select_account' });
}

async function gauthOnToken(resp) {
  if (resp.error) { showLoginError(resp.error); return; }
  GAUTH.accessToken = resp.access_token;
  GAUTH.tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
  sessionStorage.setItem('gauth_token', GAUTH.accessToken);
  sessionStorage.setItem('gauth_expiry', String(GAUTH.tokenExpiry));
  try {
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + GAUTH.accessToken }
    });
    const profile = await profileRes.json();
    GAUTH.currentUser = { email: profile.email, name: profile.name, picture: profile.picture };
    sessionStorage.setItem('gauth_user', JSON.stringify(GAUTH.currentUser));
    await onAuthReady();
  } catch (e) { showLoginError('Failed to get profile: ' + e.message); }
}

async function onAuthReady() {
  showLoginLoading('Setting up your workspace...');
  await sheetsEnsureSpreadsheet();
  await loadCurrentUserRole();
  hideLoginScreen();
  renderCurrentPage();
  updateBadges();
  updateAuthUI();
  startSheetsSync();
}

function gauthSignOut() {
  if (GAUTH.accessToken) {
    try { google.accounts.oauth2.revoke(GAUTH.accessToken, () => {}); } catch (e) {}
  }
  GAUTH.accessToken = null; GAUTH.currentUser = null;
  sessionStorage.clear();
  showLoginScreen();
}

async function loadCurrentUserRole() {
  if (!GAUTH.currentUser) return;
  const email = GAUTH.currentUser.email;
  try {
    const users = await sheetsReadAll('Users');
    const userRow = users.find(r => (r[0]||'').toLowerCase() === email.toLowerCase());
    if (userRow) {
      GAUTH.currentUser.role = userRow[2] || 'agent';
      GAUTH.currentUser.manager_email = userRow[3] || '';
      GAUTH.currentUser.agent_code = userRow[4] || '';
      GAUTH.currentUser.displayName = userRow[1] || GAUTH.currentUser.name;
    } else {
      await sheetsAppend('Users', [[email, GAUTH.currentUser.name, 'agent', '', '', 'active', new Date().toISOString()]]);
      GAUTH.currentUser.role = 'agent';
    }
    sessionStorage.setItem('gauth_user', JSON.stringify(GAUTH.currentUser));
  } catch (e) { console.warn('Could not load user role:', e); GAUTH.currentUser.role = 'agent'; }
}

function canViewUser(targetEmail) {
  if (!GAUTH.currentUser) return false;
  const { email, role } = GAUTH.currentUser;
  if (role === 'admin') return true;
  if (email.toLowerCase() === targetEmail.toLowerCase()) return true;
  if (role === 'district_manager' || role === 'unit_manager') return isUnderMe(targetEmail);
  return false;
}

function isUnderMe(targetEmail) {
  const me = GAUTH.currentUser?.email;
  const users = DB._usersCache || [];
  const target = users.find(u => u[0]?.toLowerCase() === targetEmail.toLowerCase());
  if (!target) return false;
  const mgr = target[3];
  if (mgr?.toLowerCase() === me?.toLowerCase()) return true;
  if (mgr) return isUnderMe(mgr);
  return false;
}

function getVisibleEmails() {
  const me = GAUTH.currentUser;
  if (!me) return [];
  if (me.role === 'admin') return null;
  const all = [me.email.toLowerCase()];
  if (me.role === 'unit_manager' || me.role === 'district_manager') {
    (DB._usersCache || []).forEach(u => { if (isUnderMe(u[0])) all.push(u[0].toLowerCase()); });
  }
  return all;
}

function filterByAccess(items) {
  const visible = getVisibleEmails();
  if (!visible) return items;
  return items.filter(item => {
    const owner = (item.ownerEmail || item.owner_email || GAUTH.currentUser?.email || '').toLowerCase();
    return visible.includes(owner);
  });
}

function updateAuthUI() {
  const user = GAUTH.currentUser;
  if (!user) return;
  const el = document.getElementById('authUserInfo');
  if (el) {
    el.innerHTML = '<img src="' + (user.picture||'') + '" style="width:28px;height:28px;border-radius:50%;margin-right:8px" onerror="this.style.display=\'none\'"><div><div style="font-size:11px;font-weight:600;color:#fff">' + escHtml(user.displayName||user.name) + '</div><div style="font-size:10px;color:rgba(255,255,255,0.5)">' + getRoleLabel(user.role) + '</div></div>';
  }
}

function getRoleLabel(role) {
  return { admin:'👑 Admin', district_manager:'🏆 District Manager', unit_manager:'⭐ Unit Manager', agent:'👤 Agent' }[role] || '👤 Agent';
}

function getRoleBadgeColor(role) {
  return { admin:'#FF2D55', district_manager:'#AF52DE', unit_manager:'#007AFF', agent:'#34C759' }[role] || '#6B6B6E';
}

function showLoginScreen() {
  const lo = document.getElementById('loginOverlay');
  const mw = document.getElementById('mainWrapper');
  const sb = document.getElementById('sidebar');
  if (lo) lo.style.display = 'flex';
  if (mw) mw.style.display = 'none';
  if (sb) sb.style.display = 'none';
}

function hideLoginScreen() {
  const lo = document.getElementById('loginOverlay');
  const mw = document.getElementById('mainWrapper');
  const sb = document.getElementById('sidebar');
  if (lo) lo.style.display = 'none';
  if (mw) mw.style.display = 'flex';
  if (sb) sb.style.display = 'flex';
}

function showLoginLoading(msg) {
  const el = document.getElementById('loginStatus');
  if (el) el.innerHTML = '<div class="spinner"></div> ' + escHtml(msg);
}

function showLoginError(msg) {
  const el = document.getElementById('loginStatus');
  if (el) el.innerHTML = '<div style="color:var(--red)">⚠ ' + escHtml(msg) + '</div>';
    }
