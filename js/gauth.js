/* ============================================
   Google Auth + Sheets Integration
   Handles Sign-In, Roles, and Sheets API
   ============================================ */

const GAUTH = {
  CLIENT_ID: localStorage.getItem('gd_client_id') || '638079686621-5jbk5gh84hiu9te96dedb7uhvvmuvtao.apps.googleusercontent.com',
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'email', 'profile'
  ].join(' '),
  accessToken: null,
  tokenExpiry: null,
  tokenClient: null,
  currentUser: null,   // { email, name, picture, role, manager_email, agent_code }
  spreadsheetId: localStorage.getItem('sheets_id') || null,
  SHEET_NAME: 'LifePlanner Pro',
  status: 'idle'
};

/* ---------- INIT ---------- */
function gauthInit() {
  GAUTH.CLIENT_ID = localStorage.getItem('gd_client_id') || '638079686621-5jbk5gh84hiu9te96dedb7uhvvmuvtao.apps.googleusercontent.com';
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

  // Try to restore session
  // Try sessionStorage first (current session), then localStorage (persisted)
  const saved = sessionStorage.getItem('gauth_token') || localStorage.getItem('gauth_token');
  const expiry = sessionStorage.getItem('gauth_expiry') || localStorage.getItem('gauth_expiry');
  const user = sessionStorage.getItem('gauth_user') || localStorage.getItem('gauth_user');
  if (saved && expiry && Date.now() < Number(expiry) && user) {
    GAUTH.accessToken = saved;
    GAUTH.tokenExpiry = Number(expiry);
    GAUTH.currentUser = JSON.parse(user);
    // Sync to sessionStorage too
    sessionStorage.setItem('gauth_token', saved);
    sessionStorage.setItem('gauth_expiry', expiry);
    sessionStorage.setItem('gauth_user', user);
    onAuthReady();
  }
}

function gauthSetupClient() {
  try {
    GAUTH.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GAUTH.CLIENT_ID,
      scope: GAUTH.SCOPES,
      callback: gauthOnToken,
      error_callback: (e) => {
        console.error('Auth error', e);
        showLoginError('Authentication failed: ' + (e.message || e.type));
      }
    });
  } catch (e) {
    console.error('GSI init failed', e);
  }
}

/* ---------- SIGN IN ---------- */
function gauthSignIn() {
  if (!GAUTH.CLIENT_ID) { openGDSetup(); return; }
  if (!GAUTH.tokenClient) { gauthInit(); setTimeout(gauthSignIn, 800); return; }
  GAUTH.tokenClient.requestAccessToken({ prompt: 'select_account' });
}

async function gauthOnToken(resp) {
  if (resp.error) { showLoginError(resp.error); return; }
  GAUTH.accessToken = resp.access_token;
  GAUTH.tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
  // Store in BOTH sessionStorage (fast) and localStorage (persists across browser close)
  sessionStorage.setItem('gauth_token', GAUTH.accessToken);
  sessionStorage.setItem('gauth_expiry', String(GAUTH.tokenExpiry));
  localStorage.setItem('gauth_token', GAUTH.accessToken);
  localStorage.setItem('gauth_expiry', String(GAUTH.tokenExpiry));

  // Fetch Google profile
  try {
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + GAUTH.accessToken }
    });
    const profile = await profileRes.json();
    GAUTH.currentUser = { email: profile.email, name: profile.name, picture: profile.picture };
    sessionStorage.setItem('gauth_user', JSON.stringify(GAUTH.currentUser));
    localStorage.setItem('gauth_user', JSON.stringify(GAUTH.currentUser));
    await onAuthReady();
  } catch (e) {
    showLoginError('Failed to get profile: ' + e.message);
  }
}

async function onAuthReady() {
  showLoginLoading('Setting up your workspace...');

  // Ensure spreadsheet exists — may fail if Sheets API not yet enabled; that's OK
  try {
    await sheetsEnsureSpreadsheet();
  } catch (e) {
    console.warn('Sheets setup skipped (API may not be enabled):', e);
    showToast('⚠ Google Sheets sync unavailable. Enable the Sheets API in Cloud Console to sync.', 'warning');
  }

  // Load user role from Users sheet
  try {
    await loadCurrentUserRole();
  } catch (e) {
    console.warn('Could not load user role — defaulting to agent:', e);
    if (GAUTH.currentUser) GAUTH.currentUser.role = 'agent';
  }

  // Hide login, show app
  hideLoginScreen();
  if (typeof refreshSidebarCategories === 'function') refreshSidebarCategories();
  renderCurrentPage();
  updateBadges();
  updateAuthUI();
  if (typeof startAutoLogout === 'function') startAutoLogout();

  // Start auto-sync (silently fails if API not available)
  try { startSheetsSync(); } catch (e) {}
}

/* ---------- SIGN OUT ---------- */
function gauthSignOut() {
  if (GAUTH.accessToken) {
    try { google.accounts.oauth2.revoke(GAUTH.accessToken, () => {}); } catch (e) {}
  }
  GAUTH.accessToken = null;
  GAUTH.currentUser = null;
  sessionStorage.clear();
  localStorage.removeItem('gauth_token');
  localStorage.removeItem('gauth_expiry');
  localStorage.removeItem('gauth_user');
  if (typeof stopAutoLogout === 'function') stopAutoLogout();
  showLoginScreen();
}

/* ---------- ROLE LOADING ---------- */
async function loadCurrentUserRole() {
  if (!GAUTH.currentUser) return;
  const email = GAUTH.currentUser.email;

  try {
    const users = await sheetsReadAll('Users');
    const userRow = users.find(r => (r[0]||'').toLowerCase() === email.toLowerCase());
    if (userRow) {
      GAUTH.currentUser.role         = userRow[2] || 'agent';
      GAUTH.currentUser.manager_email = userRow[3] || '';
      GAUTH.currentUser.agent_code   = userRow[4] || '';
      GAUTH.currentUser.displayName  = userRow[1] || GAUTH.currentUser.name;
    } else {
      // First time: add as agent, prompt admin to set role
      await sheetsAppend('Users', [[
        email, GAUTH.currentUser.name, 'agent', '', '', 'active',
        new Date().toISOString()
      ]]);
      GAUTH.currentUser.role = 'agent';
    }
    sessionStorage.setItem('gauth_user', JSON.stringify(GAUTH.currentUser));
  } catch (e) {
    console.warn('Could not load user role:', e);
    GAUTH.currentUser.role = 'agent';
  }
}

/* ---------- ACCESS CONTROL ---------- */
function canViewUser(targetEmail) {
  if (!GAUTH.currentUser) return false;
  const { email, role } = GAUTH.currentUser;
  if (role === 'admin') return true;
  if (email.toLowerCase() === targetEmail.toLowerCase()) return true;
  if (role === 'district_manager' || role === 'unit_manager') {
    return isUnderMe(targetEmail);
  }
  return false;
}

function isUnderMe(targetEmail) {
  const me = GAUTH.currentUser?.email;
  const users = DB._usersCache || [];
  const target = users.find(u => u[0]?.toLowerCase() === targetEmail.toLowerCase());
  if (!target) return false;
  const mgr = target[3];
  if (mgr?.toLowerCase() === me?.toLowerCase()) return true;
  // Check if target's manager is under me (DM case)
  if (mgr) return isUnderMe(mgr);
  return false;
}

function getVisibleEmails() {
  const me = GAUTH.currentUser;
  if (!me) return [];
  if (me.role === 'admin') return null; // null = all
  const all = [me.email.toLowerCase()];
  if (me.role === 'unit_manager' || me.role === 'district_manager') {
    (DB._usersCache || []).forEach(u => {
      if (isUnderMe(u[0])) all.push(u[0].toLowerCase());
    });
  }
  return all;
}

function filterByAccess(items) {
  const visible = getVisibleEmails();
  if (!visible) return items; // admin sees all
  return items.filter(item => {
    const owner = (item.ownerEmail || item.owner_email || GAUTH.currentUser?.email || '').toLowerCase();
    return visible.includes(owner);
  });
}

/* ---------- AUTH UI ---------- */
function updateAuthUI() {
  const user = GAUTH.currentUser;
  if (!user) return;
  const el = document.getElementById('authUserInfo');
  if (el) {
    el.innerHTML = `
      <img src="${user.picture||''}" style="width:28px;height:28px;border-radius:50%;margin-right:8px" onerror="this.style.display='none'" />
      <div>
        <div style="font-size:11px;font-weight:600;color:#fff">${escHtml(user.displayName||user.name)}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.5)">${getRoleLabel(user.role)}</div>
      </div>`;
  }
}

function getRoleLabel(role) {
  const map = {
    admin: '👑 Admin',
    dm: '🏆 District Manager', district_manager: '🏆 District Manager',
    um: '⭐ Unit Manager',     unit_manager: '⭐ Unit Manager',
    agent: '👤 Agent'
  };
  return map[role] || '👤 Agent';
}

function getRoleBadgeColor(role) {
  const map = { admin:'#FF2D55', dm:'#AF52DE', district_manager:'#AF52DE', um:'#007AFF', unit_manager:'#007AFF', agent:'#34C759' };
  return map[role] || '#6B6B6E';
}

/* ---------- LOGIN SCREEN ---------- */
function showLoginScreen() {
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('mainWrapper').style.display = 'none';
  document.getElementById('sidebar').style.display = 'none';
}

function hideLoginScreen() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('mainWrapper').style.display = 'flex';
  document.getElementById('sidebar').style.display = 'flex';
}

function showLoginLoading(msg) {
  const el = document.getElementById('loginStatus');
  if (el) el.innerHTML = `<div class="spinner"></div> ${escHtml(msg)}`;
}

function showLoginError(msg) {
  const el = document.getElementById('loginStatus');
  if (el) el.innerHTML = `<div style="color:var(--red)">⚠ ${escHtml(msg)}</div>`;
}
