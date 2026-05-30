/* ============================================
   Team / Agency Dashboard & Management
   ============================================ */

function renderTeamDashboard() {
  document.getElementById('pageTitle').textContent = 'Team Dashboard';
  const role = GAUTH.currentUser?.role || 'agent';
  const content = document.getElementById('content');

  if (role === 'agent') {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👤</div><div class="empty-state-title">Agent View</div><div class="empty-state-sub">You are viewing your own workspace</div></div>`;
    return;
  }

  const users = DB._usersCache || [];
  const myEmail = GAUTH.currentUser?.email || '';

  // Build hierarchy
  const myTeam = buildMyTeam(myEmail, users);

  content.innerHTML = `
    <div class="flex items-center justify-between mb-20" style="flex-wrap:wrap;gap:8px">
      <div>
        <div class="section-title">Agency Overview</div>
        <div class="text-sm text-muted">${getRoleLabel(role)} — ${escHtml(GAUTH.currentUser?.displayName||GAUTH.currentUser?.name||'')}</div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" onclick="pullTeamDataFromSheets()">🔄 Refresh Team Data</button>
        ${(role==='admin'||role==='district_manager'||role==='unit_manager') ? `<button class="btn btn-primary btn-sm" onclick="openInviteUser()">+ Add Team Member</button>` : ''}
      </div>
    </div>

    <!-- Team Stats -->
    <div class="stats-grid mb-24">
      <div class="stat-card">
        <div class="stat-icon" style="background:#F3E8FD">👥</div>
        <div class="stat-num" style="color:var(--purple)">${myTeam.length}</div>
        <div class="stat-label">Team Members</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#E8F0FE">📈</div>
        <div class="stat-num" style="color:var(--blue)">${getTeamActiveCases(myTeam)}</div>
        <div class="stat-label">Active Cases</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#E8F8EE">✅</div>
        <div class="stat-num" style="color:var(--green)">${getTeamClosedCases(myTeam)}</div>
        <div class="stat-label">Closed Cases</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--red-light)">🔔</div>
        <div class="stat-num" style="color:var(--red)">${getTeamDueReminders(myTeam)}</div>
        <div class="stat-label">Due Reminders</div>
      </div>
    </div>

    <!-- Team Hierarchy -->
    <div class="section-header mb-12">
      <div class="section-title">Team Structure</div>
    </div>
    <div class="team-tree mb-24">
      ${renderTeamNode(myEmail, users, 0)}
    </div>

    <!-- Per-Member Performance -->
    <div class="section-header mb-12">
      <div class="section-title">Member Performance</div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:0">
        <table class="compact-table">
          <thead><tr><th>Member</th><th>Role</th><th>Active</th><th>Closed</th><th>KIV</th><th>Reminders</th><th>Last Active</th></tr></thead>
          <tbody>
            ${myTeam.map(u => renderMemberRow(u)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildMyTeam(myEmail, users) {
  const role = GAUTH.currentUser?.role;
  if (role === 'admin') return users.filter(u => u[0] !== myEmail);

  const team = [];
  function collectUnder(email) {
    const directs = users.filter(u => (u[3]||'').toLowerCase() === email.toLowerCase());
    directs.forEach(u => { team.push(u); collectUnder(u[0]); });
  }
  collectUnder(myEmail);
  return team;
}

function renderTeamNode(email, users, depth) {
  const user = users.find(u => u[0]?.toLowerCase() === email.toLowerCase());
  const name = user ? user[1] : email;
  const role = user ? (user[2]||'agent') : 'agent';
  const directs = users.filter(u => (u[3]||'').toLowerCase() === email.toLowerCase());
  const cases = getCases().filter(c => (c.ownerEmail||'').toLowerCase() === email.toLowerCase());
  const active = cases.filter(c => !c.kiv).length;

  return `
    <div class="team-node" style="margin-left:${depth*28}px">
      <div class="team-node-header" onclick="openMemberDetail('${escHtml(email)}')">
        <div class="case-avatar" style="background:${getAvatarColor(name)};width:32px;height:32px;font-size:12px;flex-shrink:0">${getInitials(name)}</div>
        <div style="flex:1">
          <span class="fw-600" style="font-size:13px">${escHtml(name||email)}</span>
          <span class="role-badge" style="background:${getRoleBadgeColor(role)}">${getRoleLabel(role)}</span>
        </div>
        <span class="text-xs text-muted">${active} active</span>
      </div>
      ${directs.length > 0 ? `<div class="team-node-children">${directs.map(d => renderTeamNode(d[0], users, depth+1)).join('')}</div>` : ''}
    </div>`;
}

function renderMemberRow(userRow) {
  const email = userRow[0]||'';
  const name = userRow[1]||email;
  const role = userRow[2]||'agent';
  const cases = getCases().filter(c => (c.ownerEmail||'').toLowerCase() === email.toLowerCase());
  const active = cases.filter(c => !c.kiv && c.currentStatus < getStatusDef(c.category).length).length;
  const closed = cases.filter(c => c.currentStatus === getStatusDef(c.category).length).length;
  const kiv = cases.filter(c => c.kiv).length;
  const dueRem = getDueReminders().filter(r => (r.ownerEmail||'').toLowerCase() === email.toLowerCase()).length;
  const lastActive = cases.length > 0 ? [...cases].sort((a,b) => new Date(b.updatedAt)-new Date(a.updatedAt))[0]?.updatedAt : null;

  return `
    <tr onclick="openMemberDetail('${escHtml(email)}')">
      <td>
        <div class="flex items-center gap-8">
          <div class="case-avatar" style="background:${getAvatarColor(name)};width:28px;height:28px;font-size:11px">${getInitials(name)}</div>
          <div>
            <div class="fw-600">${escHtml(name)}</div>
            <div class="text-xs text-muted">${escHtml(email)}</div>
          </div>
        </div>
      </td>
      <td><span class="role-badge" style="background:${getRoleBadgeColor(role)}">${getRoleLabel(role)}</span></td>
      <td><span class="fw-600" style="color:var(--orange)">${active}</span></td>
      <td><span class="fw-600" style="color:var(--green)">${closed}</span></td>
      <td><span class="fw-600" style="color:#B8860B">${kiv}</span></td>
      <td>${dueRem > 0 ? `<span class="fw-600" style="color:var(--red)">${dueRem}</span>` : '—'}</td>
      <td class="text-sm text-muted">${lastActive ? formatDate(lastActive) : '—'}</td>
    </tr>`;
}

function getTeamActiveCases(team) {
  let count = 0;
  team.forEach(u => {
    const email = (u[0]||'').toLowerCase();
    count += getCases().filter(c => (c.ownerEmail||'').toLowerCase()===email && !c.kiv).length;
  });
  return count;
}

function getTeamClosedCases(team) {
  let count = 0;
  team.forEach(u => {
    const email = (u[0]||'').toLowerCase();
    count += getCases().filter(c => {
      if ((c.ownerEmail||'').toLowerCase() !== email) return false;
      return c.currentStatus === getStatusDef(c.category).length;
    }).length;
  });
  return count;
}

function getTeamDueReminders(team) {
  const emails = new Set(team.map(u => (u[0]||'').toLowerCase()));
  return getDueReminders().filter(r => emails.has((r.ownerEmail||'').toLowerCase())).length;
}

/* ---- MEMBER DETAIL ---- */
function openMemberDetail(email) {
  const users = DB._usersCache || [];
  const user = users.find(u => u[0]?.toLowerCase() === email.toLowerCase());
  const name = user ? user[1] : email;
  const role = user ? (user[2]||'agent') : 'agent';
  const mgrEmail = user ? (user[3]||'') : '';
  const cases = getCases().filter(c => (c.ownerEmail||'').toLowerCase() === email.toLowerCase());
  const reminders = getReminders().filter(r => (r.ownerEmail||'').toLowerCase() === email.toLowerCase() && !r.done);

  playClick();
  document.getElementById('contactModalTitle').textContent = name || email;
  document.getElementById('contactModalBody').innerHTML = `
    <div class="flex items-center gap-12 mb-16">
      <div class="contact-avatar" style="background:${getAvatarColor(name)};width:52px;height:52px;font-size:20px">${getInitials(name)}</div>
      <div style="flex:1">
        <div class="fw-700" style="font-size:16px">${escHtml(name||email)}</div>
        <div class="text-sm text-muted">${escHtml(email)}</div>
        <span class="role-badge mt-4" style="background:${getRoleBadgeColor(role)}">${getRoleLabel(role)}</span>
      </div>
      ${GAUTH.currentUser?.role === 'admin' ? `<button class="btn btn-secondary btn-sm" onclick="openEditUserRole('${escHtml(email)}')">✏ Edit Role</button>` : ''}
    </div>
    ${mgrEmail ? `<div class="info-row"><span class="info-label">Reports To</span><span class="info-value">${escHtml(mgrEmail)}</span></div>` : ''}

    <div class="section-divider">Performance</div>
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="stat-card" style="padding:12px"><div class="stat-num" style="font-size:22px;color:var(--blue)">${cases.length}</div><div class="stat-label">Total</div></div>
      <div class="stat-card" style="padding:12px"><div class="stat-num" style="font-size:22px;color:var(--orange)">${cases.filter(c=>!c.kiv).length}</div><div class="stat-label">Active</div></div>
      <div class="stat-card" style="padding:12px"><div class="stat-num" style="font-size:22px;color:var(--green)">${cases.filter(c=>c.currentStatus===getStatusDef(c.category).length).length}</div><div class="stat-label">Closed</div></div>
      <div class="stat-card" style="padding:12px"><div class="stat-num" style="font-size:22px;color:var(--red)">${reminders.length}</div><div class="stat-label">Reminders</div></div>
    </div>

    <div class="section-divider">Recent Cases</div>
    ${cases.length === 0 ? '<div class="text-sm text-muted">No cases</div>' : `
      <div class="case-list">
        ${[...cases].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,5).map(c => renderCaseRow(c,'openCaseById')).join('')}
      </div>`}

    ${reminders.length > 0 ? `
      <div class="section-divider">Due Reminders</div>
      ${getDueReminders().filter(r=>(r.ownerEmail||'').toLowerCase()===email.toLowerCase()).map(r=>renderReminderItem(r)).join('')}
    ` : ''}
  `;
  openModal('contactModal');
}

/* ---- INVITE / EDIT USER ---- */
function openInviteUser() {
  playClick();
  const users = DB._usersCache || [];
  const managers = users.filter(u => ['admin','district_manager','unit_manager'].includes(u[2]||'agent'));

  document.getElementById('contactModalTitle').textContent = '+ Add Team Member';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Full Name *</label>
      <input class="form-control" id="inv_name" placeholder="Member's full name..." />
    </div>
    <div class="form-group">
      <label class="form-label">Google Email *</label>
      <input class="form-control" id="inv_email" placeholder="their.email@gmail.com" />
    </div>
    <div class="form-group">
      <label class="form-label">Role *</label>
      <select class="form-control" id="inv_role">
        <option value="agent">👤 Agent</option>
        <option value="unit_manager">⭐ Unit Manager</option>
        <option value="district_manager">🏆 District Manager</option>
        ${GAUTH.currentUser?.role==='admin' ? '<option value="admin">👑 Admin</option>' : ''}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Reports To (Manager)</label>
      <select class="form-control" id="inv_manager">
        <option value="">None (Top level)</option>
        ${managers.map(m=>`<option value="${escHtml(m[0])}">${escHtml(m[1]||m[0])} — ${getRoleLabel(m[2])}</option>`).join('')}
        <option value="${escHtml(GAUTH.currentUser?.email||'')}">Me — ${getRoleLabel(GAUTH.currentUser?.role)}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Agent Code (optional)</label>
      <input class="form-control" id="inv_code" placeholder="e.g. A001" />
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveInviteUser()">Add Member</button>
    </div>
  `;
  openModal('contactModal');
}

async function saveInviteUser() {
  const name  = document.getElementById('inv_name')?.value?.trim();
  const email = document.getElementById('inv_email')?.value?.trim();
  const role  = document.getElementById('inv_role')?.value;
  const mgr   = document.getElementById('inv_manager')?.value || '';
  const code  = document.getElementById('inv_code')?.value || '';
  if (!name||!email) { showToast('Please fill in name and email', 'error'); return; }
  try {
    await sheetsInviteUser(email, name, role, mgr);
    showToast(`${name} added! They can now sign in.`, 'success');
    playSuccess();
    closeContactModalBtn();
    renderTeamDashboard();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

function openEditUserRole(email) {
  const users = DB._usersCache || [];
  const user = users.find(u => u[0]?.toLowerCase() === email.toLowerCase());
  if (!user) return;

  document.getElementById('contactModalTitle').textContent = 'Edit Role: ' + (user[1]||email);
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Role</label>
      <select class="form-control" id="edit_role">
        <option value="agent" ${user[2]==='agent'?'selected':''}>👤 Agent</option>
        <option value="unit_manager" ${user[2]==='unit_manager'?'selected':''}>⭐ Unit Manager</option>
        <option value="district_manager" ${user[2]==='district_manager'?'selected':''}>🏆 District Manager</option>
        <option value="admin" ${user[2]==='admin'?'selected':''}>👑 Admin</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Manager Email</label>
      <input class="form-control" id="edit_mgr" value="${escHtml(user[3]||'')}" placeholder="manager@email.com" />
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEditUserRole('${escHtml(email)}')">Save</button>
    </div>
  `;
  openModal('contactModal');
}

async function saveEditUserRole(email) {
  const users = DB._usersCache || [];
  const user = users.find(u => u[0]?.toLowerCase() === email.toLowerCase());
  if (!user) return;
  const role = document.getElementById('edit_role')?.value;
  const mgr  = document.getElementById('edit_mgr')?.value || '';
  try {
    await sheetsUpdateUser(email, { name: user[1], role, manager_email: mgr, agent_code: user[4], status: user[5] });
    showToast('Role updated!', 'success');
    playSuccess();
    closeContactModalBtn();
    renderTeamDashboard();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}
