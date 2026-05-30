/* ============================================
   Google Drive Auto-Sync Module (Legacy)
   — Main auth now handled by gauth.js —
   Saves lifeplanner_data.json to your Drive.
   Free — uses Google Drive API v3 + OAuth2.
   ============================================ */

const GD = {
  CLIENT_ID: '',          // Set by user in settings
  SCOPES: 'https://www.googleapis.com/auth/drive.file',
  FILE_NAME: 'lifeplanner_data.json',
  FILE_MIME: 'application/json',
  fileId: null,           // Cached Drive file ID
  accessToken: null,
  tokenExpiry: null,
  status: 'disconnected', // disconnected | connecting | synced | error | saving
  lastSynced: null,
  saveTimer: null,
  tokenClient: null
};

/* ---------- STATUS DISPLAY ---------- */
function gdSetStatus(status, msg = '') {
  GD.status = status;
  const dot = document.getElementById('gdDot');
  const txt = document.getElementById('gdText');
  const btn = document.getElementById('gdConnectBtn');
  if (!dot || !txt) return;

  const map = {
    disconnected: { color: '#AEAEB2', text: 'Not connected' },
    connecting:   { color: '#FF9500', text: 'Connecting...' },
    synced:       { color: '#34C759', text: 'Synced ' + (GD.lastSynced ? formatTime(GD.lastSynced) : '') },
    saving:       { color: '#007AFF', text: 'Saving...' },
    error:        { color: '#FF3B30', text: msg || 'Sync error' },
    loading:      { color: '#007AFF', text: 'Loading...' }
  };
  const s = map[status] || map.disconnected;
  dot.style.background = s.color;
  txt.textContent = s.text;
  if (btn) btn.textContent = status === 'disconnected' || status === 'error' ? '🔗 Connect Drive' : '✓ Connected';
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
}

/* ---------- INIT ---------- */
function gdInit() {
  // Load saved client ID
  GD.CLIENT_ID = localStorage.getItem('gd_client_id') || '';
  GD.fileId    = localStorage.getItem('gd_file_id')   || null;

  if (!GD.CLIENT_ID) {
    gdSetStatus('disconnected');
    return;
  }

  // Load GIS script if not yet loaded
  if (!window.google?.accounts?.oauth2) {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => gdInitTokenClient();
    s.onerror = () => gdSetStatus('error', 'Failed to load Google SDK');
    document.head.appendChild(s);
  } else {
    gdInitTokenClient();
  }
}

function gdInitTokenClient() {
  try {
    GD.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GD.CLIENT_ID,
      scope: GD.SCOPES,
      callback: gdOnToken,
      error_callback: (e) => gdSetStatus('error', e.message || 'Auth error')
    });
    gdSetStatus('disconnected');
    // Auto-reconnect if we had a session
    const savedToken = sessionStorage.getItem('gd_access_token');
    const savedExpiry = sessionStorage.getItem('gd_token_expiry');
    if (savedToken && savedExpiry && Date.now() < Number(savedExpiry)) {
      GD.accessToken = savedToken;
      GD.tokenExpiry = Number(savedExpiry);
      gdLoadFromDrive();
    }
  } catch (e) {
    gdSetStatus('error', 'Init error: ' + e.message);
  }
}

function gdConnect() {
  if (!GD.CLIENT_ID) {
    openGDSetup();
    return;
  }
  if (!GD.tokenClient) {
    gdInit();
    setTimeout(() => { if (GD.tokenClient) GD.tokenClient.requestAccessToken(); }, 800);
    return;
  }
  gdSetStatus('connecting');
  GD.tokenClient.requestAccessToken({ prompt: GD.accessToken ? '' : 'select_account' });
}

function gdOnToken(resp) {
  if (resp.error) {
    gdSetStatus('error', resp.error);
    return;
  }
  GD.accessToken = resp.access_token;
  GD.tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
  sessionStorage.setItem('gd_access_token', GD.accessToken);
  sessionStorage.setItem('gd_token_expiry', String(GD.tokenExpiry));
  gdLoadFromDrive();
}

/* ---------- DRIVE API HELPERS ---------- */
async function gdFetch(url, options = {}) {
  if (!GD.accessToken) throw new Error('Not authenticated');
  const resp = await fetch(url, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + GD.accessToken,
      ...(options.headers || {})
    }
  });
  if (resp.status === 401) {
    GD.accessToken = null;
    gdSetStatus('disconnected');
    throw new Error('Token expired');
  }
  return resp;
}

async function gdFindFile() {
  // Search for existing file by name
  const q = encodeURIComponent(`name='${GD.FILE_NAME}' and mimeType='${GD.FILE_MIME}' and trashed=false`);
  const r = await gdFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`);
  const data = await r.json();
  if (data.files && data.files.length > 0) {
    GD.fileId = data.files[0].id;
    localStorage.setItem('gd_file_id', GD.fileId);
    return GD.fileId;
  }
  return null;
}

async function gdReadFile(fileId) {
  const r = await gdFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  return await r.json();
}

async function gdCreateFile(content) {
  const meta = JSON.stringify({ name: GD.FILE_NAME, mimeType: GD.FILE_MIME });
  const body = new Blob([meta], { type: 'application/json' });
  const contentBlob = new Blob([JSON.stringify(content)], { type: GD.FILE_MIME });
  const form = new FormData();
  form.append('metadata', body);
  form.append('file', contentBlob);
  const r = await gdFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', body: form }
  );
  const data = await r.json();
  GD.fileId = data.id;
  localStorage.setItem('gd_file_id', GD.fileId);
  return GD.fileId;
}

async function gdUpdateFile(fileId, content) {
  const blob = new Blob([JSON.stringify(content)], { type: GD.FILE_MIME });
  await gdFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    { method: 'PATCH', headers: { 'Content-Type': GD.FILE_MIME }, body: blob }
  );
}

/* ---------- LOAD FROM DRIVE ---------- */
async function gdLoadFromDrive() {
  gdSetStatus('loading');
  try {
    let fileId = GD.fileId || await gdFindFile();
    if (!fileId) {
      // No file yet — upload current local data
      await gdCreateFile(DB);
      GD.lastSynced = new Date();
      gdSetStatus('synced');
      showToast('✅ Google Drive connected! Data uploaded.', 'success');
      return;
    }
    // File exists — check if Drive is newer
    const driveData = await gdReadFile(fileId);
    const driveUpdated = driveData?.settings?._lastSaved || '0';
    const localUpdated = DB?.settings?._lastSaved || '0';

    if (driveUpdated > localUpdated && driveData.contacts?.length >= 0) {
      Object.assign(DB, driveData);
      saveDB();
      GD.lastSynced = new Date();
      gdSetStatus('synced');
      showToast('📥 Data loaded from Google Drive!', 'success');
      renderCurrentPage();
      updateBadges();
    } else {
      // Local is newer or same — push to Drive
      await gdUpdateFile(fileId, DB);
      GD.lastSynced = new Date();
      gdSetStatus('synced');
      showToast('✅ Google Drive connected & synced!', 'success');
    }
  } catch (e) {
    console.error('GD load error:', e);
    gdSetStatus('error', e.message);
  }
}

/* ---------- SAVE TO DRIVE (debounced) ---------- */
function gdScheduleSave() {
  if (!GD.accessToken || Date.now() > (GD.tokenExpiry || 0)) return;
  clearTimeout(GD.saveTimer);
  gdSetStatus('saving');
  GD.saveTimer = setTimeout(async () => {
    try {
      let fileId = GD.fileId || await gdFindFile();
      if (!fileId) fileId = await gdCreateFile(DB);
      else await gdUpdateFile(fileId, DB);
      GD.lastSynced = new Date();
      gdSetStatus('synced');
    } catch (e) {
      gdSetStatus('error', 'Save failed: ' + e.message);
      // Silent retry in 30s
      setTimeout(gdScheduleSave, 30000);
    }
  }, 1500); // 1.5s debounce
}

/* ---------- DISCONNECT ---------- */
function gdDisconnect() {
  if (GD.accessToken) {
    google.accounts.oauth2.revoke(GD.accessToken, () => {});
  }
  GD.accessToken = null;
  GD.fileId = null;
  sessionStorage.removeItem('gd_access_token');
  sessionStorage.removeItem('gd_token_expiry');
  gdSetStatus('disconnected');
  showToast('Disconnected from Google Drive', 'info');
}

/* ---------- SETUP MODAL ---------- */
function openGDSetup() {
  playClick();
  document.getElementById('contactModalTitle').textContent = '🔗 Connect Google Drive';
  document.getElementById('contactModalBody').innerHTML = `
    <div style="margin-bottom:20px">
      <div style="background:var(--blue-light);border-radius:10px;padding:14px;margin-bottom:16px;font-size:13px;line-height:1.7">
        <strong>One-time setup — completely free.</strong><br>
        Your data will auto-save to <code>lifeplanner_data.json</code> in your Google Drive every time you make a change.
      </div>

      <div class="form-label">Step 1 — Create a free Google Cloud Project</div>
      <ol style="font-size:13px;line-height:2;color:var(--text-secondary);padding-left:18px;margin-bottom:16px">
        <li>Go to <a href="https://console.cloud.google.com/" target="_blank" style="color:var(--blue)">console.cloud.google.com</a> (sign in with your Google account)</li>
        <li>Click <strong>Select a project → New Project</strong> → name it "LifePlanner" → Create</li>
        <li>Go to <strong>APIs & Services → Library</strong></li>
        <li>Search <strong>"Google Drive API"</strong> → Enable it</li>
        <li>Go to <strong>APIs & Services → Credentials</strong></li>
        <li>Click <strong>+ Create Credentials → OAuth client ID</strong></li>
        <li>Application type: <strong>Web application</strong></li>
        <li>Authorised JavaScript origins: add <code>http://localhost:3033</code></li>
        <li>Click Create → Copy your <strong>Client ID</strong></li>
      </ol>

      <div class="form-label">Step 2 — Configure OAuth consent screen</div>
      <ol style="font-size:13px;line-height:2;color:var(--text-secondary);padding-left:18px;margin-bottom:16px">
        <li>Go to <strong>APIs & Services → OAuth consent screen</strong></li>
        <li>User Type: <strong>External</strong> → Create</li>
        <li>Fill in App name: "LifePlanner Pro", support email: your email</li>
        <li>Scopes: add <strong>../auth/drive.file</strong></li>
        <li>Test users: add your Google email → Save</li>
      </ol>

      <div class="form-label">Step 3 — Paste your Client ID below</div>
      <input class="form-control" id="gd_client_id_input"
        value="${escHtml(GD.CLIENT_ID)}"
        placeholder="XXXXXXXXXXXX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
        style="font-size:12px;font-family:monospace" />
      <div class="text-xs text-muted mt-8">Your Client ID stays in your browser only. Nothing is sent to any server.</div>
    </div>

    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      ${GD.CLIENT_ID ? `<button class="btn btn-danger btn-sm" onclick="gdClearClientId()">Remove</button>` : ''}
      <button class="btn btn-primary" onclick="gdSaveClientId()">Save & Connect</button>
    </div>
  `;
  openModal('contactModal');
}

function gdSaveClientId() {
  const val = document.getElementById('gd_client_id_input')?.value?.trim();
  if (!val || !val.includes('.apps.googleusercontent.com')) {
    showToast('Please enter a valid Google Client ID', 'error');
    return;
  }
  GD.CLIENT_ID = val;
  localStorage.setItem('gd_client_id', val);
  closeContactModalBtn();
  showToast('Client ID saved! Connecting...', 'success');
  gdInit();
  setTimeout(gdConnect, 1000);
}

function gdClearClientId() {
  GD.CLIENT_ID = '';
  localStorage.removeItem('gd_client_id');
  localStorage.removeItem('gd_file_id');
  GD.fileId = null;
  gdDisconnect();
  closeContactModalBtn();
}
