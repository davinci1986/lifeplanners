/* ============================================
   Reminders Module
   ============================================ */

function renderRemindersPage() {
  document.getElementById('pageTitle').textContent = 'Reminders';
  const all = (DB.reminders || []).filter(r => !r.done);
  const done = (DB.reminders || []).filter(r => r.done).slice(-20).reverse();
  const today = todayStr();

  const overdue = all.filter(r => r.date < today).sort((a,b) => a.date.localeCompare(b.date));
  const todayRem = all.filter(r => r.date === today).sort((a,b) => (a.time||'').localeCompare(b.time||''));
  const upcoming = all.filter(r => r.date > today).sort((a,b) => a.date.localeCompare(b.date));

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:var(--red-light)">🔴</div><div class="stat-num" style="color:var(--red)">${overdue.length}</div><div class="stat-label">Overdue</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--orange-light)">🟡</div><div class="stat-num" style="color:var(--orange)">${todayRem.length}</div><div class="stat-label">Today</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--blue-light)">🔵</div><div class="stat-num" style="color:var(--blue)">${upcoming.length}</div><div class="stat-label">Upcoming</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--green-light)">✅</div><div class="stat-num" style="color:var(--green)">${(DB.reminders||[]).filter(r=>r.done).length}</div><div class="stat-label">Completed</div></div>
    </div>

    <div class="flex items-center justify-between mb-16">
      <div class="section-title">All Reminders</div>
      <button class="btn btn-primary" onclick="openAddStandaloneReminder()">+ New Reminder</button>
    </div>

    ${overdue.length > 0 ? `
      <div class="section-divider" style="color:var(--red)">⚠ Overdue (${overdue.length})</div>
      ${overdue.map(r => renderReminderItemFull(r)).join('')}
    ` : ''}

    ${todayRem.length > 0 ? `
      <div class="section-divider" style="color:var(--orange)">📅 Today (${todayRem.length})</div>
      ${todayRem.map(r => renderReminderItemFull(r)).join('')}
    ` : ''}

    ${upcoming.length > 0 ? `
      <div class="section-divider" style="color:var(--blue)">🔵 Upcoming (${upcoming.length})</div>
      ${upcoming.map(r => renderReminderItemFull(r)).join('')}
    ` : ''}

    ${all.length === 0 ? emptyState('🎉', 'All clear!', 'No pending reminders') : ''}

    ${done.length > 0 ? `
      <div class="section-divider">✅ Recently Completed</div>
      ${done.slice(0,10).map(r => `
        <div class="reminder-item" style="opacity:0.5">
          <div class="reminder-dot" style="background:var(--green)"></div>
          <div class="reminder-body">
            <div class="reminder-title" style="text-decoration:line-through">${escHtml(r.title)}</div>
            <div class="reminder-meta">${escHtml(r.contactName||'')} ${r.category ? `• ${catMeta(r.category).label}` : ''}</div>
          </div>
          <div class="text-xs text-muted">${formatDate(r.date)}</div>
        </div>`).join('')}
    ` : ''}
  `;
}

function renderReminderItemFull(r) {
  const days = daysUntil(r.date);
  let cls = 'upcoming', dotCls = 'upcoming';
  if (days < 0) { cls = 'overdue'; dotCls = 'overdue'; }
  else if (days === 0) { cls = 'today'; dotCls = 'today'; }
  const meta = r.category ? catMeta(r.category) : { icon: '🔔', label: '' };

  return `
    <div class="reminder-item ${cls}">
      <div class="reminder-dot ${dotCls}"></div>
      <div class="reminder-body">
        <div class="reminder-title">${meta.icon} ${escHtml(r.title)}</div>
        <div class="reminder-meta">
          ${r.contactName ? `<strong>${escHtml(r.contactName)}</strong> •` : ''}
          ${r.category ? `${catMeta(r.category).label} •` : ''}
          ${formatDate(r.date)} ${r.time ? r.time : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="reminder-date" style="color:${days<0?'var(--red)':days===0?'var(--orange)':'var(--blue)'}">
          ${relativeDate(r.date)}
        </div>
        <div style="display:flex;gap:4px">
          ${r.caseId ? `<button class="btn btn-secondary btn-sm" onclick="closeCaseModalBtn();openCaseById('${r.caseId}')">Open →</button>` : ''}
          <button class="btn btn-success btn-sm" onclick="dismissReminder('${r.id}');renderRemindersPage();updateBadges()">Done ✓</button>
          <button class="btn btn-danger btn-sm" onclick="deleteReminderConfirm('${r.id}')">🗑</button>
        </div>
      </div>
    </div>`;
}

function openAddStandaloneReminder() {
  playClick();
  document.getElementById('contactModalTitle').textContent = 'New Reminder';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Reminder Title *</label>
      <input class="form-control" id="sr_title" placeholder="What to remember..." />
    </div>
    <div class="form-group">
      <label class="form-label">Contact Name (optional)</label>
      <input class="form-control" id="sr_contact" placeholder="Who is this for..." />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input type="date" class="form-control" id="sr_date" value="${todayStr()}" />
      </div>
      <div class="form-group">
        <label class="form-label">Time</label>
        <input type="time" class="form-control" id="sr_time" value="09:00" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Category</label>
      <select class="form-control" id="sr_cat">
        <option value="">None</option>
        <option value="sales">Sales</option>
        <option value="claims">Claims</option>
        <option value="servicing">Servicing</option>
        <option value="recruitment">Recruitment</option>
        <option value="onboarding">Onboarding</option>
        <option value="snapwill">Snapwill</option>
        <option value="others">Others</option>
      </select>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveStandaloneReminder()">Add Reminder</button>
    </div>
  `;
  openModal('contactModal');
}

function saveStandaloneReminder() {
  const title = document.getElementById('sr_title')?.value?.trim();
  const date = document.getElementById('sr_date')?.value;
  if (!title || !date) { showToast('Please fill in title and date', 'error'); return; }
  addReminder({
    title, date,
    time: document.getElementById('sr_time')?.value || '',
    contactName: document.getElementById('sr_contact')?.value || '',
    category: document.getElementById('sr_cat')?.value || ''
  });
  showToast('Reminder added!', 'success');
  playSuccess();
  closeContactModalBtn();
  renderRemindersPage();
  updateBadges();
}

async function deleteReminderConfirm(id) {
  const ok = await showConfirm('Delete Reminder', 'Delete this reminder?', 'Delete');
  if (!ok) return;
  deleteReminder(id);
  showToast('Reminder deleted', 'info');
  renderRemindersPage();
  updateBadges();
}
