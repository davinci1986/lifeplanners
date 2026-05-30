/* ============================================
   Others Module — Fully Flexible
   ============================================ */

function renderOthers() {
  document.getElementById('pageTitle').textContent = 'Others';
  const cases = getCases('others');

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#F5F5F7">📌</div><div class="stat-num" style="color:var(--text)">${cases.length}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">⚡</div><div class="stat-num" style="color:var(--blue)">${cases.filter(c=>!c.kiv).length}</div><div class="stat-label">Active</div></div>
    </div>

    <div class="flex items-center justify-between mb-16">
      <div class="section-title">Other Tasks <small>${cases.length}</small></div>
      <button class="btn btn-primary" onclick="openNewOthersCase()">+ New Task</button>
    </div>

    ${cases.length === 0
      ? emptyState('📌', 'No other tasks', 'Add flexible tasks here')
      : `<div class="case-list">${cases.map(c => renderCaseRow(c, 'openOthersCase')).join('')}</div>`
    }
  `;
}

function openNewOthersCase() {
  playClick();
  document.getElementById('modalTitle').textContent = 'New Task';
  document.getElementById('modalSubtitle').textContent = 'Flexible task management';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Name / Contact *</label>
      <input class="form-control" id="nf_name" placeholder="Name or task title..." oninput="autofillContact(this.value)" autocomplete="off" />
      <div id="contactSuggestions" class="suggestion-chips"></div>
    </div>
    <div class="form-group">
      <label class="form-label">Task / Category Label</label>
      <input class="form-control" id="nf_label" placeholder="e.g. Follow-up, Meeting, Document..." />
    </div>
    <div class="form-group">
      <label class="form-label">What is the next step?</label>
      <input class="form-control" id="oth_nextstep" placeholder="Describe the next action..." />
    </div>
    <div class="form-group">
      <label class="form-label">Set Reminder?</label>
      <div class="flex gap-8">
        <input type="date" class="form-control" id="oth_remdate" value="${todayStr()}" style="flex:1" />
        <input type="text" class="form-control" id="oth_remtitle" placeholder="Reminder note..." style="flex:2" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Remarks</label>
      <textarea class="form-control" id="nf_remarks" rows="2" placeholder="Notes..."></textarea>
    </div>
    <div class="flex gap-8 mb-16">
      <label class="checkbox-wrap"><input type="checkbox" id="nf_priority"> Priority</label>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeCaseModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveOthersCase()">Create</button>
    </div>
  `;
  openModal('caseModal');
}

function saveOthersCase() {
  const nameEl = document.getElementById('nf_name');
  const name = nameEl?.value?.trim();
  if (!name) { showToast('Please enter a name', 'error'); return; }

  const label = document.getElementById('nf_label')?.value || '';
  const nextStep = document.getElementById('oth_nextstep')?.value || '';
  const remarks = document.getElementById('nf_remarks')?.value || '';
  const priority = document.getElementById('nf_priority')?.checked || false;
  const remDate = document.getElementById('oth_remdate')?.value || '';
  const remTitle = document.getElementById('oth_remtitle')?.value || '';

  const contactId = nameEl.dataset.contactId || null;
  let contact;
  if (contactId) contact = getContact(contactId);
  else contact = findOrCreateContact(name);

  const c = createCase({
    contactId: contact.id, contactName: contact.name,
    category: 'others', label, nextStep, remarks, priority,
    currentStatus: 1,
    statusHistory: [{ fromStatus: 0, toStatus: 1, remark: 'Task created', date: new Date().toISOString() }]
  });

  if (remDate && remTitle) {
    addReminder({ caseId: c.id, contactName: contact.name, category: 'others', title: remTitle, date: remDate });
  }

  showToast('Task created!', 'success');
  playSuccess();
  closeCaseModalBtn();
  updateBadges();
  renderOthers();
}

function openOthersCase(id) {
  const c = getCase(id);
  if (!c) return;
  playClick();
  const contact = getContact(c.contactId);
  document.getElementById('modalTitle').textContent = c.contactName || 'Task';
  document.getElementById('modalSubtitle').textContent = `Others • ${c.label || 'Task'} • ${formatDate(c.createdAt)}`;
  document.getElementById('modalBody').innerHTML = renderOthersDetail(c, contact);
  openModal('caseModal');
}

function renderOthersDetail(c, contact) {
  const allRems = (DB.reminders || []).filter(r => r.caseId === c.id && !r.done);
  return `
    <div class="flex items-center justify-between mb-16" style="flex-wrap:wrap;gap:8px">
      <div>
        ${c.label ? `<span class="label-badge">${escHtml(c.label)}</span>` : ''}
        ${c.priority ? '<span class="priority-tag ml-4">★ Priority</span>' : ''}
      </div>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" onclick="togglePriority('${c.id}')">
          ${c.priority ? '★ Unmark' : '☆ Priority'}
        </button>
        <button class="btn btn-success btn-sm" onclick="markOthersDone('${c.id}')">✅ Mark Done</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCaseConfirm('${c.id}')">🗑</button>
      </div>
    </div>

    ${c.nextStep ? `
      <div class="card mb-16" style="background:var(--blue-light);border-color:var(--blue)">
        <div class="card-body">
          <div class="form-label" style="color:var(--blue)">Next Step</div>
          <div class="fw-600">${escHtml(c.nextStep)}</div>
        </div>
      </div>` : ''}

    <div class="form-group">
      <label class="form-label">Remarks / Notes</label>
      <textarea class="form-control" id="remarksEdit" rows="3">${escHtml(c.remarks || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Update Next Step</label>
      <input class="form-control" id="nextStepEdit" value="${escHtml(c.nextStep || '')}" placeholder="What is the next action?" />
    </div>
    <div class="btn-row mb-16">
      <button class="btn btn-primary btn-sm" onclick="saveOthersRemarks('${c.id}')">Save</button>
    </div>

    <div class="section-divider">Reminders</div>
    <div class="form-row mb-8">
      <input class="form-control" id="rem_title" placeholder="Reminder note..." />
      <input type="date" class="form-control" id="rem_date" value="${todayStr()}" />
    </div>
    <div class="btn-row mb-16">
      <button class="btn btn-primary btn-sm" onclick="addCaseReminder('${c.id}','${c.contactName}','others')">Add Reminder</button>
    </div>
    ${allRems.length > 0 ? allRems.map(r => renderReminderItem(r)).join('') : '<div class="text-sm text-muted">No reminders set</div>'}

    ${contact ? `
      <div class="section-divider">Contact</div>
      <div class="info-row"><span class="info-label">Name</span><span class="info-value fw-600">${escHtml(contact.name)}</span></div>
      <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${escHtml(contact.phone || '—')}</span></div>
    ` : ''}
  `;
}

function saveOthersRemarks(caseId) {
  const remarks = document.getElementById('remarksEdit')?.value || '';
  const nextStep = document.getElementById('nextStepEdit')?.value || '';
  updateCase(caseId, { remarks, nextStep });
  showToast('Saved!', 'success');
  playSuccess();
}

function markOthersDone(caseId) {
  const c = getCase(caseId);
  if (!c) return;
  updateCase(caseId, { kiv: true, closedDate: new Date().toISOString() });
  showToast('Task marked as done!', 'success');
  playComplete();
  closeCaseModalBtn();
  renderOthers();
}
