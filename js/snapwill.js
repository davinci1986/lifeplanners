/* ============================================
   Snapwill Module
   ============================================ */

function renderSnapwill() {
  document.getElementById('pageTitle').textContent = 'Snapwill';
  const cases = getCases('snapwill');
  const stats = getCategoryStats('snapwill');

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#FFE5EA">⚡</div><div class="stat-num" style="color:var(--pink)">${cases.length}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">⚡</div><div class="stat-num" style="color:var(--blue)">${stats.active}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">✅</div><div class="stat-num" style="color:var(--green)">${cases.filter(c=>c.currentStatus===5).length}</div><div class="stat-label">Closed</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--yellow-light)">📌</div><div class="stat-num" style="color:#B8860B">${stats.kivCount}</div><div class="stat-label">KIV</div></div>
    </div>

    <div class="flex items-center justify-between mb-12" style="flex-wrap:wrap;gap:8px">
      <div class="filter-bar" style="margin-bottom:0;flex-wrap:wrap">
        <span class="filter-chip active" id="sw_all" onclick="filterSnapwill('all')">All</span>
        ${STATUS_DEFS.snapwill.map(s => `<span class="filter-chip" onclick="filterSnapwill(${s.n})">${s.label}</span>`).join('')}
      </div>
      <button class="btn btn-primary" onclick="openNewCase('snapwill')">+ New Case</button>
    </div>

    <div class="section-header">
      <div class="section-title">Snapwill Cases <small>${cases.length}</small></div>
    </div>
    <div id="snapwillList">
      ${cases.length === 0
        ? emptyState('⚡', 'No Snapwill cases', 'Add your first case')
        : `<div class="case-list">${cases.map(c => renderCaseRow(c, 'openSnapwillCase')).join('')}</div>`
      }
    </div>
  `;
}

function filterSnapwill(filter) {
  const cases = getCases('snapwill');
  const filtered = filter === 'all' ? cases : cases.filter(c => c.currentStatus === filter);
  document.getElementById('snapwillList').innerHTML = filtered.length === 0
    ? emptyState('⚡', 'No cases', 'Try a different filter')
    : `<div class="case-list">${filtered.map(c => renderCaseRow(c, 'openSnapwillCase')).join('')}</div>`;
  playClick();
}

function openSnapwillCase(id) {
  const c = getCase(id);
  if (!c) return;
  playClick();
  const contact = getContact(c.contactId);
  document.getElementById('modalTitle').textContent = c.contactName || 'Snapwill Case';
  document.getElementById('modalSubtitle').textContent = `Snapwill • ${formatDate(c.createdAt)}`;

  let body = renderCaseDetail(buildViewCase(c, 'snapwill'), contact);

  // Customer types section (always shown for snapwill)
  const allTypes = getSnapwillTypes();
  const selectedTypes = c.snapwillTypes || [];
  const typesSection = `
    <div class="section-divider">Customer Types</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px" id="swTypeChips">
      ${allTypes.map(t => `
        <label class="checkbox-wrap" style="background:var(--bg);border:1.5px solid ${selectedTypes.includes(t) ? 'var(--blue)' : 'var(--border)'};border-radius:20px;padding:4px 12px;cursor:pointer;font-size:12px;color:${selectedTypes.includes(t) ? 'var(--blue)' : 'var(--text)'}">
          <input type="checkbox" name="sw_type" value="${escHtml(t)}" ${selectedTypes.includes(t) ? 'checked' : ''} onchange="saveSnapwillTypes('${c.id}')"> ${escHtml(t)}
        </label>`).join('')}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <input class="form-control" id="sw_new_type" placeholder="Add new type..." style="font-size:12px" />
      <button class="btn btn-secondary btn-sm" onclick="addNewSnapwillType('${c.id}')">+ Add</button>
    </div>
  `;
  body = body.replace('<!-- Special fields for sales status 5 (premiums) -->', typesSection + '<!-- Special fields for sales status 5 (premiums) -->');

  // Appointment details section (at status 2 or if already set)
  if (c.currentStatus === 2 || c.customFields?.appointment) {
    const appt = c.customFields?.appointment || {};
    const apptSection = `
      <div class="section-divider">Appointment Details</div>
      <div class="form-row mb-8">
        <div class="form-group mb-0">
          <label class="form-label">Purpose</label>
          <input class="form-control" id="appt_purpose" value="${escHtml(appt.purpose||'')}" placeholder="Meeting purpose..." onchange="saveAppt('${c.id}')" />
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Venue</label>
          <input class="form-control" id="appt_venue" value="${escHtml(appt.venue||'')}" placeholder="Location..." onchange="saveAppt('${c.id}')" />
        </div>
      </div>
      <div class="form-row mb-8">
        <div class="form-group mb-0">
          <label class="form-label">Date</label>
          <input type="date" class="form-control" id="appt_date" value="${escHtml(appt.date||todayStr())}" onchange="saveAppt('${c.id}')" />
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Time</label>
          <input type="time" class="form-control" id="appt_time" value="${escHtml(appt.time||'10:00')}" onchange="saveAppt('${c.id}')" />
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="saveApptAndReminder('${c.id}')">💾 Save & Set Reminder</button>
    `;
    body = body.replace('<!-- Special fields for sales status 5 (premiums) -->', apptSection + '<!-- Special fields for sales status 5 (premiums) -->');
  }

  document.getElementById('modalBody').innerHTML = body;
  openModal('caseModal');
}

function saveSnapwillTypes(caseId) {
  const checked = [...document.querySelectorAll('input[name="sw_type"]:checked')].map(cb => cb.value);
  updateCase(caseId, { snapwillTypes: checked });
  // Update chip border colours live
  document.querySelectorAll('input[name="sw_type"]').forEach(cb => {
    const lbl = cb.closest('label');
    if (!lbl) return;
    lbl.style.borderColor = cb.checked ? 'var(--blue)' : 'var(--border)';
    lbl.style.color = cb.checked ? 'var(--blue)' : 'var(--text)';
  });
  playClick();
}

function addNewSnapwillType(caseId) {
  const input = document.getElementById('sw_new_type');
  const val = input?.value?.trim();
  if (!val) return;
  addSnapwillType(val);
  input.value = '';
  // Re-open to refresh type list
  openSnapwillCase(caseId);
}

function saveAppt(caseId) {
  const appt = {
    purpose: document.getElementById('appt_purpose')?.value || '',
    venue: document.getElementById('appt_venue')?.value || '',
    date: document.getElementById('appt_date')?.value || '',
    time: document.getElementById('appt_time')?.value || ''
  };
  updateCase(caseId, { customFields: { appointment: appt } });
}

function saveApptAndReminder(caseId) {
  saveAppt(caseId);
  const c = getCase(caseId);
  const appt = c.customFields?.appointment;
  if (appt?.date) {
    addReminder({
      caseId, contactName: c.contactName, category: 'snapwill',
      title: `📅 Snapwill Appointment — ${c.contactName}`,
      date: appt.date, time: appt.time || '09:00'
    });
    showToast('Appointment saved with reminder!', 'success');
    playSuccess();
  }
}
