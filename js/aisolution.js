/* ============================================
   AI Solution Module — fully custom per-case steps
   ============================================ */

function renderAISolution() {
  document.getElementById('pageTitle').textContent = 'AI Solution';
  const cases = getCases('aisolution');
  const stats = getCategoryStats('aisolution');

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#F0EFFE">🤖</div><div class="stat-num" style="color:#5856D6">${cases.length}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">⚡</div><div class="stat-num" style="color:var(--blue)">${stats.active}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">✅</div><div class="stat-num" style="color:var(--green)">${cases.filter(c => (c.aiSteps||[]).length > 0 && (c.aiSteps||[]).every(s => s.done)).length}</div><div class="stat-label">All Steps Done</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--yellow-light)">📌</div><div class="stat-num" style="color:#B8860B">${stats.kivCount}</div><div class="stat-label">KIV</div></div>
    </div>

    <div class="flex items-center justify-between mb-16">
      <div class="section-title">AI Solution Cases <small>${cases.length}</small></div>
      <button class="btn btn-primary" onclick="openNewAISolutionCase()">+ New Case</button>
    </div>

    ${cases.length === 0
      ? emptyState('🤖', 'No AI Solution cases', 'Add your first case to get started')
      : `<div class="case-list">${cases.map(c => renderAISolutionRow(c)).join('')}</div>`
    }
  `;
}

function renderAISolutionRow(c) {
  const steps = c.aiSteps || [];
  const done = steps.filter(s => s.done).length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const dueRem = getDueReminders().filter(r => r.caseId === c.id);
  return `
    <div class="case-item ${c.priority ? 'priority' : ''}" onclick="openAISolutionCase('${c.id}')">
      ${avatarHTML(c.contactName || '?')}
      <div class="case-info">
        <div class="case-name">${escHtml(c.contactName || 'Unknown')}</div>
        <div class="case-meta">
          ${c.label ? `<span class="label-badge">${escHtml(c.label)}</span>` : ''}
          ${c.kiv ? '<span class="status-badge kiv">KIV</span>' : ''}
          ${dueRem.length > 0 ? `<span class="status-badge overdue">🔔 ${dueRem.length}</span>` : ''}
          <span class="text-xs text-muted">${done}/${total} steps done</span>
        </div>
        ${total > 0 ? `
          <div style="margin-top:4px;background:var(--border);border-radius:4px;height:4px;width:100%;max-width:200px">
            <div style="background:#5856D6;border-radius:4px;height:4px;width:${pct}%;transition:width 0.3s"></div>
          </div>` : ''}
      </div>
      <div class="case-right">
        ${c.priority ? '<span class="priority-tag">★ Priority</span>' : ''}
        <span class="text-xs text-muted">${formatDate(c.updatedAt)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-tertiary)"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>`;
}

function openNewAISolutionCase() {
  playClick();
  document.getElementById('modalTitle').textContent = 'New AI Solution Case';
  document.getElementById('modalSubtitle').textContent = 'Create a custom workflow case';
  document.getElementById('modalBody').innerHTML = renderNewAISolutionForm();
  openModal('caseModal');
}

function renderNewAISolutionForm(existingCase = null) {
  const isEdit = !!existingCase;
  const allBuiltinCats = ['sales','claims','servicing','recruitment','onboarding','snapwill','aisolution','others'];
  const allCustomCats = getCustomCategories();
  const allCats = [...allBuiltinCats.map(id => ({ id, ...catMeta(id) })), ...allCustomCats.map(c => ({ id: c.id, label: c.name, icon: c.icon }))];
  const existingCats = existingCase?.categories || ['aisolution'];
  const existingSteps = existingCase?.aiSteps || [];

  return `
    <div class="form-group">
      <label class="form-label">Name / Contact *</label>
      <input class="form-control" id="ai_name" placeholder="Enter name..." value="${escHtml(existingCase?.contactName||'')}" oninput="autofillContact(this.value)" autocomplete="off" />
      <div id="contactSuggestions" class="suggestion-chips"></div>
    </div>

    <div class="form-group">
      <label class="form-label">Label / Tag</label>
      <input class="form-control" id="ai_label" placeholder="e.g. Client A, Project X..." value="${escHtml(existingCase?.label||'')}" />
    </div>

    <div class="form-group">
      <label class="form-label">Categories</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${allCats.map(c => `
          <label class="checkbox-wrap" style="background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer">
            <input type="checkbox" name="ai_categories" value="${c.id}" ${existingCats.includes(c.id)?'checked':''} onchange="playClick()">
            ${c.icon || ''} ${c.label}
          </label>`).join('')}
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Custom Steps (your to-do checklist)</label>
      <div id="ai_step_list" style="margin-bottom:8px">
        ${existingSteps.map((s, i) => `
          <div class="flex gap-6 mb-4" id="ai_step_row_${i}">
            <input class="form-control" style="flex:1" id="ai_step_${i}" value="${escHtml(s.label)}" placeholder="Step ${i+1}..." />
            <button class="btn btn-danger btn-icon" onclick="removeAIStepRow(${i})">✕</button>
          </div>`).join('')}
      </div>
      <button class="btn btn-secondary btn-sm" onclick="addAIStepRow()">+ Add Step</button>
    </div>

    <div class="form-group">
      <label class="form-label">Remarks</label>
      <textarea class="form-control" id="ai_remarks" rows="2" placeholder="Optional notes...">${escHtml(existingCase?.remarks||'')}</textarea>
    </div>
    <div class="flex gap-8 mb-16">
      <label class="checkbox-wrap"><input type="checkbox" id="ai_priority" ${existingCase?.priority?'checked':''}> Priority</label>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeCaseModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAISolutionCase('${existingCase?.id||''}')">${isEdit ? 'Save Changes' : 'Create Case'}</button>
    </div>
  `;
}

let _aiStepRowCount = 0;
function addAIStepRow() {
  const list = document.getElementById('ai_step_list');
  if (!list) return;
  const i = _aiStepRowCount++;
  const div = document.createElement('div');
  div.className = 'flex gap-6 mb-4';
  div.id = `ai_step_row_${i}`;
  div.innerHTML = `
    <input class="form-control" style="flex:1" id="ai_step_${i}" placeholder="Step label..." />
    <button class="btn btn-danger btn-icon" onclick="removeAIStepRow(${i})">✕</button>`;
  list.appendChild(div);
  div.querySelector('input')?.focus();
  playClick();
}

function removeAIStepRow(i) {
  const row = document.getElementById(`ai_step_row_${i}`);
  if (row) row.remove();
  playClick();
}

function saveAISolutionCase(existingId = '') {
  const nameEl = document.getElementById('ai_name');
  const name = nameEl?.value?.trim();
  if (!name) { showToast('Please enter a name', 'error'); return; }

  const catCheckboxes = document.querySelectorAll('input[name="ai_categories"]:checked');
  const selectedCats = catCheckboxes.length > 0 ? [...catCheckboxes].map(cb => cb.value) : ['aisolution'];
  const primaryCat = selectedCats.includes('aisolution') ? 'aisolution' : (selectedCats[0] || 'aisolution');

  const label = document.getElementById('ai_label')?.value?.trim() || '';
  const remarks = document.getElementById('ai_remarks')?.value || '';
  const priority = document.getElementById('ai_priority')?.checked || false;

  // Collect steps from all step input rows
  const stepInputs = document.querySelectorAll('[id^="ai_step_"]');
  const aiSteps = [];
  let stepN = 1;
  stepInputs.forEach(input => {
    const val = input.value?.trim();
    if (val) {
      aiSteps.push({ id: uid(), n: stepN++, label: val, done: false, date: null, remark: '' });
    }
  });

  const contactId = nameEl.dataset.contactId || null;
  const contact = contactId ? getContact(contactId) : findOrCreateContact(name);

  if (existingId) {
    const existing = getCase(existingId);
    // Preserve done state for steps that match by label
    const mergedSteps = aiSteps.map(s => {
      const old = (existing?.aiSteps || []).find(o => o.label === s.label);
      return old ? { ...s, done: old.done, date: old.date, remark: old.remark } : s;
    });
    updateCase(existingId, { contactName: contact.name, contactId: contact.id, category: primaryCat, categories: selectedCats, label, remarks, priority, aiSteps: mergedSteps });
    showToast('Case updated', 'success');
  } else {
    createCase({ contactId: contact.id, contactName: contact.name, category: primaryCat, categories: selectedCats, label, remarks, priority, aiSteps, currentStatus: 0, statusHistory: [] });
    showToast(`AI Solution case created for ${contact.name}`, 'success');
  }
  playSuccess();
  closeCaseModalBtn();
  updateBadges();
  renderCurrentPage();
}

function openAISolutionCase(id) {
  const c = getCase(id);
  if (!c) return;
  playClick();
  const contact = getContact(c.contactId);
  document.getElementById('modalTitle').textContent = c.contactName || 'AI Solution Case';
  document.getElementById('modalSubtitle').textContent = `AI Solution • ${formatDate(c.createdAt)}`;
  document.getElementById('modalBody').innerHTML = renderAISolutionDetail(c, contact);
  openModal('caseModal');
}

function renderAISolutionDetail(c, contact) {
  const steps = c.aiSteps || [];
  const done = steps.filter(s => s.done).length;
  const allRems = (DB.reminders || []).filter(r => r.caseId === c.id && !r.done);

  return `
    <div class="tab-bar">
      <button class="tab-btn active" onclick="switchTab(this,'ai-tab-progress')">Progress</button>
      <button class="tab-btn" onclick="switchTab(this,'ai-tab-remarks')">Remarks & Info</button>
      <button class="tab-btn" onclick="switchTab(this,'ai-tab-reminders')">Reminders ${allRems.length > 0 ? `<span class="nav-badge" style="display:inline">${allRems.length}</span>` : ''}</button>
    </div>

    <!-- Progress Tab -->
    <div id="ai-tab-progress">
      <div class="flex items-center justify-between mb-12" style="flex-wrap:wrap;gap:8px">
        <div>
          ${c.priority ? '<span class="priority-tag" style="display:inline-flex">★ Priority</span>' : ''}
          ${c.kiv ? '<span class="status-badge kiv ml-4">KIV</span>' : ''}
          <span class="text-sm text-muted">${done}/${steps.length} done</span>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" onclick="togglePriority('${c.id}')">
            ${c.priority ? '★ Unmark Priority' : '☆ Mark Priority'}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="editAISolutionCase('${c.id}')">✏ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCaseConfirm('${c.id}')">🗑</button>
        </div>
      </div>

      ${steps.length === 0
        ? `<div class="empty-state" style="padding:24px 0">
             <div class="empty-state-icon">📋</div>
             <div class="empty-state-title">No steps yet</div>
             <div class="empty-state-sub">Edit this case to add custom steps</div>
           </div>`
        : `<div class="status-steps">
            ${steps.map(s => `
              <div class="status-step ${s.done ? 'done-step' : 'current'}" id="ai-step-${c.id}-${s.id}"
                   style="cursor:pointer" onclick="handleAIStepClick('${c.id}','${s.id}','${escHtml(s.label)}')">
                <div class="step-circle">${s.done ? '✓' : s.n}</div>
                <div class="step-info" style="flex:1">
                  <div class="step-label-row">
                    <span class="step-label">${escHtml(s.label)}</span>
                    <button class="step-edit-btn" title="Rename step" onclick="event.stopPropagation();openRenameAIStep('${c.id}','${s.id}','${escHtml(s.label)}')" style="opacity:0.5;background:none;border:none;cursor:pointer;font-size:11px;padding:0 4px">✏</button>
                    <button class="step-edit-btn" title="Delete step" onclick="event.stopPropagation();deleteAIStepConfirm('${c.id}','${s.id}')" style="opacity:0.4;background:none;border:none;cursor:pointer;font-size:11px;padding:0 4px;color:var(--red)">🗑</button>
                  </div>
                  ${s.done && s.date ? `<div class="step-date">📅 ${formatDate(s.date)}</div>` : ''}
                  ${s.remark ? `<div class="step-remark">${escHtml(s.remark)}</div>` : ''}
                </div>
                <div class="step-actions" onclick="event.stopPropagation()">
                  <button class="btn btn-secondary btn-sm" onclick="openQuickReminder('${c.id}','${escHtml(c.contactName)}','aisolution','${escHtml(s.label)}')">🔔</button>
                </div>
              </div>`).join('')}
           </div>`}

      <!-- Add step inline -->
      <div class="card mt-12" style="background:var(--bg)">
        <div class="card-body">
          <div class="form-label">Add New Step</div>
          <div class="flex gap-8">
            <input class="form-control" id="ai_inline_step" placeholder="Step label..." />
            <button class="btn btn-primary btn-sm" onclick="addAIStepInline('${c.id}')">+ Add</button>
          </div>
        </div>
      </div>

      ${done === steps.length && steps.length > 0 ? `
        <div class="card mt-16" style="background:var(--green-light);border-color:var(--green)">
          <div class="card-body text-center">
            <div style="font-size:32px">🎉</div>
            <div class="fw-600" style="color:var(--green)">All steps completed!</div>
          </div>
        </div>` : ''}
    </div>

    <!-- Remarks Tab -->
    <div id="ai-tab-remarks" style="display:none">
      <div class="form-group">
        <label class="form-label">Remarks / Notes</label>
        <textarea class="form-control" id="remarksEdit" rows="4">${escHtml(c.remarks || '')}</textarea>
      </div>
      <div class="btn-row mt-16">
        <button class="btn btn-primary" onclick="saveRemarks('${c.id}')">Save Remarks</button>
      </div>
      ${contact ? `
        <div class="section-divider">Contact Info</div>
        <div class="info-row"><span class="info-label">Name</span><span class="info-value fw-600">${escHtml(contact.name)}</span></div>
        <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${escHtml(contact.phone || '—')}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${escHtml(contact.email || '—')}</span></div>
        <button class="btn btn-secondary btn-sm mt-8" onclick="openEditContact('${contact.id}')">✏ Edit Contact</button>` : ''}
    </div>

    <!-- Reminders Tab -->
    <div id="ai-tab-reminders" style="display:none">
      <div class="form-row mb-16">
        <div class="form-group mb-0">
          <label class="form-label">Title</label>
          <input class="form-control" id="rem_title" placeholder="Reminder description..." />
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Date</label>
          <input type="date" class="form-control" id="rem_date" value="${todayStr()}" />
        </div>
      </div>
      <div class="btn-row mb-16">
        <button class="btn btn-primary" onclick="addCaseReminder('${c.id}','${escHtml(c.contactName)}','aisolution')">Add Reminder</button>
      </div>
      <div class="section-divider">Existing Reminders</div>
      ${allRems.length === 0
        ? '<div class="empty-state" style="padding:20px 0"><div class="empty-state-icon">🔔</div><div class="empty-state-sub">No reminders set</div></div>'
        : allRems.map(r => renderReminderItem(r)).join('')}
    </div>
  `;
}

function handleAIStepClick(caseId, stepId, label) {
  const c = getCase(caseId);
  if (!c) return;
  const step = (c.aiSteps || []).find(s => s.id === stepId);
  if (!step) return;
  if (step.done) {
    toggleAIStep(caseId, stepId, null, '');
    showToast('Step unchecked', 'info');
    playClick();
    openAISolutionCase(caseId);
    updateBadges();
  } else {
    openAIStepDoneModal(caseId, stepId, label);
  }
}

function openAIStepDoneModal(caseId, stepId, label) {
  playClick();
  document.getElementById('contactModalTitle').textContent = `✓ ${label}`;
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Date completed</label>
      <input type="date" class="form-control" id="aisd_date" value="${todayStr()}" />
    </div>
    <div class="form-group">
      <label class="form-label">Remark (optional)</label>
      <textarea class="form-control" id="aisd_remark" rows="2" placeholder="Notes..."></textarea>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAIStepDone('${caseId}','${stepId}')">✓ Mark Done</button>
    </div>`;
  openModal('contactModal');
}

function confirmAIStepDone(caseId, stepId) {
  const date = document.getElementById('aisd_date')?.value;
  const remark = document.getElementById('aisd_remark')?.value || '';
  toggleAIStep(caseId, stepId, date, remark);
  showToast('Step done! ✓', 'success');
  playSuccess();
  closeContactModalBtn();
  openAISolutionCase(caseId);
  updateBadges();
  renderCurrentPage();
}

function addAIStepInline(caseId) {
  const input = document.getElementById('ai_inline_step');
  const val = input?.value?.trim();
  if (!val) { showToast('Please enter a step label', 'error'); return; }
  addAIStep(caseId, val);
  input.value = '';
  showToast('Step added!', 'success');
  playSuccess();
  openAISolutionCase(caseId);
}

function openRenameAIStep(caseId, stepId, currentLabel) {
  playClick();
  document.getElementById('contactModalTitle').textContent = '✏ Rename Step';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">New step name</label>
      <input class="form-control" id="ai_rename_input" value="${escHtml(currentLabel)}" />
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmRenameAIStep('${caseId}','${stepId}')">Save</button>
    </div>`;
  openModal('contactModal');
}

function confirmRenameAIStep(caseId, stepId) {
  const val = document.getElementById('ai_rename_input')?.value?.trim();
  if (!val) { showToast('Please enter a name', 'error'); return; }
  renameAIStep(caseId, stepId, val);
  showToast('Step renamed!', 'success');
  playSuccess();
  closeContactModalBtn();
  openAISolutionCase(caseId);
}

function deleteAIStepConfirm(caseId, stepId) {
  showConfirm('Delete Step', 'Remove this step?', 'Delete').then(ok => {
    if (!ok) return;
    deleteAIStep(caseId, stepId);
    showToast('Step deleted', 'info');
    openAISolutionCase(caseId);
  });
}

function editAISolutionCase(caseId) {
  const c = getCase(caseId);
  if (!c) return;
  playClick();
  document.getElementById('modalTitle').textContent = 'Edit AI Solution Case';
  document.getElementById('modalSubtitle').textContent = '';
  _aiStepRowCount = c.aiSteps?.length || 0;
  document.getElementById('modalBody').innerHTML = renderNewAISolutionForm(c);
  // Don't re-open modal (already open)
}
