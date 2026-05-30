/* ============================================
   Onboarding Module — Full Overhaul
   Multi-status, parallel tracking, Excel upload
   ============================================ */

const ONBOARD_STATUS_DEFS = [
  { n: 1, label: 'Key in Be A Life Planner',    icon: '📝', autoReminderDays: 90, reminderNote: '3-month exam reminder' },
  { n: 2, label: 'Arrange Examination',          icon: '📚', hasExams: true },
  { n: 3, label: 'Do 20 Names Hotlist',          icon: '📋', autoReminderDays: 5,  reminderNote: '5-day hotlist reminder', hasExcelUpload: true },
  { n: 4, label: 'Onboarding Training',          icon: '🎓' },
  { n: 5, label: 'Policy Review Strategy',       icon: '📄', hasClientList: true },
  { n: 6, label: 'Fieldwork',                    icon: '🤝', hasFieldwork: true },
  { n: 7, label: 'Fieldwork Closed Case',        icon: '✅', hasFieldwork: true },
  { n: 8, label: 'Examination Complete',         icon: '🎉' },
  { n: 9, label: 'Completed Onboarding',         icon: '🏆' }
];

const EXAM_TYPES = ['PCIL', 'TBE (A & C)', 'TBE ABC', 'PRS', 'General Insurance'];

function renderOnboarding() {
  document.getElementById('pageTitle').textContent = 'Onboarding';
  const cases = getCases('onboarding');
  const stats = getCategoryStats('onboarding');

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#E5F6FF">🚀</div><div class="stat-num" style="color:var(--teal)">${cases.length}</div><div class="stat-label">Total Agents</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">⚡</div><div class="stat-num" style="color:var(--blue)">${cases.filter(c=>!c.kiv && c.currentStatus < 9).length}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">🏆</div><div class="stat-num" style="color:var(--green)">${cases.filter(c=>c.currentStatus===9).length}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--red-light)">🔔</div><div class="stat-num" style="color:var(--red)">${stats.dueReminders}</div><div class="stat-label">Due Reminders</div></div>
    </div>

    <div class="flex items-center justify-between mb-16">
      <div class="section-title">Agent Onboarding <small>${cases.length}</small></div>
      <button class="btn btn-primary" onclick="openNewCase('onboarding')">+ New Agent</button>
    </div>

    ${cases.length === 0
      ? emptyState('🚀', 'No onboarding cases', 'Agents auto-transfer here when they agree to join')
      : `<div class="grid-auto">${cases.map(c => renderOnboardCard(c)).join('')}</div>`
    }
  `;
}

function renderOnboardCard(c) {
  const statusItems = getStatusItems(c);
  const doneCount = statusItems.filter(s => s.done).length;
  const activeCount = statusItems.filter(s => s.active && !s.done).length;
  const progress = Math.round((doneCount / ONBOARD_STATUS_DEFS.length) * 100);
  const dueRems = getDueReminders().filter(r => r.caseId === c.id).length;

  return `
    <div class="card" onclick="openOnboardCase('${c.id}')" style="cursor:pointer;transition:all 0.2s" onmouseover="this.style.boxShadow='var(--shadow)'" onmouseout="this.style.boxShadow=''">
      <div class="card-body">
        <div class="flex items-center gap-12 mb-12">
          ${avatarHTML(c.contactName, 42)}
          <div style="flex:1">
            <div class="fw-700">${escHtml(c.contactName)}</div>
            <div class="text-xs text-muted">Joined ${formatDate(c.createdAt)}</div>
            ${c.recruitPrograms?.length > 0 ? `<div class="text-xs" style="color:var(--purple)">${c.recruitPrograms.join(', ')}</div>` : ''}
          </div>
          ${dueRems > 0 ? `<span class="status-badge overdue">🔔 ${dueRems}</span>` : ''}
        </div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs text-muted">${doneCount}/${ONBOARD_STATUS_DEFS.length} completed</span>
          ${activeCount > 0 ? `<span class="text-xs" style="color:var(--orange)">${activeCount} in progress</span>` : ''}
          <span class="text-xs fw-600" style="color:var(--teal)">${progress}%</span>
        </div>
        <div class="progress-bar-wrap mb-8">
          <div class="progress-bar-fill" style="width:${progress}%;background:var(--teal)"></div>
        </div>
        <div class="flex gap-4" style="flex-wrap:wrap">
          ${statusItems.filter(s=>s.active||s.done).map(s => {
            const def = ONBOARD_STATUS_DEFS.find(d => d.n === s.status);
            return `<span class="status-badge ${s.done?'done':'s2'}" style="font-size:10px">${def?.icon||''} ${s.done?'✓ ':''} ${escHtml(def?.label||'')}</span>`;
          }).join('')}
          ${statusItems.filter(s=>s.active||s.done).length === 0 ? `<span class="text-xs text-muted">No steps started yet</span>` : ''}
        </div>
      </div>
    </div>`;
}

/* ---------- STATUS ITEMS HELPERS ---------- */
function getStatusItems(c) {
  // Ensure the case has statusItems array (new structure)
  if (!c.statusItems || !Array.isArray(c.statusItems)) {
    // Migrate from old single-status to multi-status
    const items = ONBOARD_STATUS_DEFS.map(def => ({
      id: def.n,
      status: def.n,
      active: def.n === c.currentStatus,
      done: def.n < c.currentStatus,
      date: null,
      remark: '',
      reminders: []
    }));
    return items;
  }
  return c.statusItems;
}

function saveStatusItems(caseId, items) {
  // Also update currentStatus for compatibility
  const doneStatuses = items.filter(s => s.done).map(s => s.status);
  const maxDone = doneStatuses.length > 0 ? Math.max(...doneStatuses) : 0;
  const activeStatuses = items.filter(s => s.active && !s.done).map(s => s.status);
  const currentStatus = activeStatuses.length > 0 ? Math.max(...activeStatuses) : (maxDone || 1);
  updateCase(caseId, { statusItems: items, currentStatus });
}

/* ---------- OPEN ONBOARD CASE ---------- */
function openOnboardCase(id) {
  const c = getCase(id);
  if (!c) return;
  playClick();
  const contact = getContact(c.contactId);
  document.getElementById('modalTitle').textContent = c.contactName || 'Onboarding';
  document.getElementById('modalSubtitle').textContent = `Onboarding • Started ${formatDate(c.createdAt)}`;
  document.getElementById('modalBody').innerHTML = renderOnboardDetail(c, contact);
  openModal('caseModal');
}

function renderOnboardDetail(c, contact) {
  const statusItems = getStatusItems(c);
  const allRems = (DB.reminders || []).filter(r => r.caseId === c.id && !r.done);

  return `
    <div class="tab-bar">
      <button class="tab-btn active" onclick="switchTab(this,'tab-progress')">Progress</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-profile')">Agent Profile</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-reminders')">Reminders ${allRems.length > 0 ? `<span class="nav-badge" style="display:inline">${allRems.length}</span>` : ''}</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-whatsapp')">WhatsApp</button>
    </div>

    <!-- Progress Tab — Multi-Status -->
    <div id="tab-progress">
      <div class="flex items-center justify-between mb-12">
        <div class="text-sm text-muted">Click any step to activate/complete it. Multiple steps can be active simultaneously.</div>
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" onclick="editCase('${c.id}')">✏ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCaseConfirm('${c.id}')">🗑</button>
        </div>
      </div>

      <div class="onboard-status-grid">
        ${ONBOARD_STATUS_DEFS.map(def => {
          const item = statusItems.find(s => s.status === def.n) || { status: def.n, active: false, done: false, date: null, remark: '', reminders: [] };
          const state = item.done ? 'done' : item.active ? 'active' : 'idle';
          return renderOnboardStatusCard(c, def, item, state);
        }).join('')}
      </div>
    </div>

    <!-- Agent Profile Tab -->
    <div id="tab-profile" style="display:none">
      ${renderAgentProfile(c, contact, statusItems)}
    </div>

    <!-- Reminders Tab -->
    <div id="tab-reminders" style="display:none">
      <div class="flex items-center justify-between mb-12">
        <div class="section-title">Reminders</div>
        <button class="btn btn-primary btn-sm" onclick="openQuickReminder('${c.id}','${escHtml(c.contactName)}','onboarding','Follow up')">+ Quick Reminder</button>
      </div>
      <div class="form-row mb-8">
        <div class="form-group mb-0"><label class="form-label">Title</label><input class="form-control" id="rem_title" placeholder="Reminder..." /></div>
        <div class="form-group mb-0"><label class="form-label">Date</label><input type="date" class="form-control" id="rem_date" value="${todayStr()}" /></div>
      </div>
      <div class="btn-row mb-16">
        <button class="btn btn-secondary btn-sm" onclick="setWorkingDayReminder('${c.id}','${c.contactName}','onboarding',5)">+5 Days</button>
        <button class="btn btn-secondary btn-sm" onclick="setWorkingDayReminder('${c.id}','${c.contactName}','onboarding',7)">+7 Working Days</button>
        <button class="btn btn-primary btn-sm" onclick="addCaseReminder('${c.id}','${c.contactName}','onboarding')">Add Reminder</button>
      </div>
      <div class="section-divider">Existing Reminders</div>
      ${allRems.length === 0
        ? '<div class="empty-state" style="padding:20px 0"><div class="empty-state-sub">No reminders</div></div>'
        : allRems.map(r => renderReminderItem(r)).join('')}
    </div>

    <!-- WhatsApp Tab -->
    <div id="tab-whatsapp" style="display:none">
      ${renderWAScriptBox(c.category, c.currentStatus, c.contactName)}
    </div>
  `;
}

function renderOnboardStatusCard(c, def, item, state) {
  const stateColors = {
    done:   { bg: 'var(--green-light)',  border: 'var(--green)',   icon: '✅', label: 'Completed' },
    active: { bg: 'var(--blue-light)',   border: 'var(--blue)',    icon: '🔄', label: 'In Progress' },
    idle:   { bg: 'var(--bg)',           border: 'var(--border)',  icon: def.icon, label: 'Not Started' }
  };
  const s = stateColors[state];

  return `
    <div class="onboard-status-card" style="background:${s.bg};border-color:${s.border}"
      id="onboard-step-${c.id}-${def.n}">
      <div class="onboard-card-header">
        <span class="onboard-step-icon">${s.icon}</span>
        <div style="flex:1">
          <div class="fw-600 text-sm">${def.n}. ${escHtml(def.label)}</div>
          ${item.date ? `<div class="text-xs text-muted">${formatDate(item.date)}</div>` : ''}
          ${item.remark ? `<div class="text-xs" style="color:var(--blue);font-style:italic">${escHtml(item.remark)}</div>` : ''}
        </div>
        <div class="onboard-card-actions">
          ${state !== 'done' ? `
            <button class="btn btn-sm ${state==='active'?'btn-success':'btn-primary'}"
              onclick="toggleOnboardStatus('${c.id}',${def.n},'${state}')">
              ${state === 'active' ? '✓ Done' : '▶ Start'}
            </button>` : `
            <button class="btn btn-secondary btn-sm" onclick="toggleOnboardStatus('${c.id}',${def.n},'done')">
              ↩ Undo
            </button>`}
          <button class="btn btn-secondary btn-sm" onclick="openOnboardStepDetail('${c.id}',${def.n})">
            ✏
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openQuickReminder('${c.id}','${escHtml(c.contactName)}','onboarding','${escHtml(def.label)}')">
            🔔
          </button>
        </div>
      </div>
      ${state === 'active' && def.hasExams ? renderExamSubSection(c, def) : ''}
      ${state === 'active' && def.hasExcelUpload ? renderHotlistSection(c) : ''}
      ${state === 'active' && def.hasFieldwork ? renderFieldworkSubSection(c, def) : ''}
      ${state === 'active' && def.hasClientList ? renderClientListSubSection(c) : ''}
    </div>`;
}

/* ---------- STEP DETAIL MODAL ---------- */
function openOnboardStepDetail(caseId, statusNum) {
  const c = getCase(caseId);
  if (!c) return;
  const def = ONBOARD_STATUS_DEFS.find(d => d.n === statusNum);
  if (!def) return;
  const items = getStatusItems(c);
  const item = items.find(s => s.status === statusNum) || { status: statusNum, active: false, done: false, date: null, remark: '', reminders: [] };
  playClick();

  document.getElementById('contactModalTitle').textContent = `${def.icon} ${def.label}`;
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Date Completed / Started</label>
      <input type="date" class="form-control" id="step_date" value="${escHtml(item.date?.split('T')[0]||todayStr())}" />
    </div>
    <div class="form-group">
      <label class="form-label">Remarks</label>
      <textarea class="form-control" id="step_remark" rows="3" placeholder="Notes for this step...">${escHtml(item.remark||'')}</textarea>
    </div>
    ${def.autoReminderDays ? `
      <div class="form-group">
        <label class="form-label">Auto-Reminder</label>
        <div style="background:var(--blue-light);border-radius:8px;padding:10px;font-size:12px;color:var(--blue)">
          🔔 A reminder will be set ${def.autoReminderDays} days from completion date (${def.reminderNote})
        </div>
      </div>` : ''}
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveOnboardStepDetail('${caseId}',${statusNum})">Save</button>
    </div>
  `;
  openModal('contactModal');
}

function saveOnboardStepDetail(caseId, statusNum) {
  const c = getCase(caseId);
  if (!c) return;
  const date = document.getElementById('step_date')?.value || todayStr();
  const remark = document.getElementById('step_remark')?.value || '';
  const items = getStatusItems(c).map(s => {
    if (s.status === statusNum) return { ...s, date: date + 'T00:00:00.000Z', remark };
    return s;
  });
  saveStatusItems(caseId, items);
  showToast('Step details saved!', 'success');
  playSuccess();
  closeContactModalBtn();
  openOnboardCase(caseId);
}

/* ---------- TOGGLE STATUS ---------- */
function toggleOnboardStatus(caseId, statusNum, currentState) {
  const c = getCase(caseId);
  if (!c) return;
  playClick();
  let items = getStatusItems(c);

  if (currentState === 'idle') {
    // Activate
    items = items.map(s => s.status === statusNum ? { ...s, active: true, done: false, date: null } : s);
    showToast(`Started: ${ONBOARD_STATUS_DEFS.find(d=>d.n===statusNum)?.label}`, 'info');
  } else if (currentState === 'active') {
    // Mark done + set auto-reminder if needed
    const def = ONBOARD_STATUS_DEFS.find(d => d.n === statusNum);
    const today = new Date().toISOString();
    items = items.map(s => s.status === statusNum ? { ...s, active: false, done: true, date: today } : s);
    if (def?.autoReminderDays) {
      const remDate = workingDaysReminder(new Date(), def.autoReminderDays);
      addReminder({
        caseId, contactName: c.contactName, category: 'onboarding',
        title: `${def.reminderNote} — ${c.contactName}`,
        date: remDate
      });
      showToast(`✅ Done! Reminder set for ${def.autoReminderDays} days`, 'success');
    } else {
      showToast(`✅ Completed: ${def?.label}`, 'success');
    }
    playSuccess();

    // Check if all done → mark completed onboarding
    const allDone = items.every(s => s.done);
    if (allDone) {
      showToast(`🎉 ${c.contactName} completed onboarding!`, 'success');
      playComplete();
    }
  } else if (currentState === 'done') {
    // Undo
    items = items.map(s => s.status === statusNum ? { ...s, active: true, done: false } : s);
    showToast('Step undone', 'info');
  }

  saveStatusItems(caseId, items);
  openOnboardCase(caseId);
  updateBadges();
  setTimeout(() => switchTabById('tab-progress'), 50);
}

/* ---------- EXAM SUB-SECTION ---------- */
function renderExamSubSection(c, def) {
  return `
    <div class="onboard-sub-section">
      <div class="text-xs fw-600 mb-6" style="color:var(--blue)">📚 Examinations</div>
      <div>
        ${(c.examinations||[]).map((e,i) => `
          <div class="exam-item">
            <div style="flex:1"><div class="exam-type">${escHtml(e.type)}</div><div class="exam-date">${escHtml(e.date||'')} ${escHtml(e.time||'')} ${e.venue?'— '+escHtml(e.venue):''}</div></div>
            <button class="btn btn-danger btn-sm" onclick="removeExam('${c.id}',${i});event.stopPropagation()">✕</button>
          </div>`).join('') || '<div class="text-xs text-muted mb-6">No exams scheduled yet</div>'}
      </div>
      <div class="flex gap-4 mt-6" style="flex-wrap:wrap">
        ${EXAM_TYPES.map(t => `<button class="btn btn-secondary btn-sm" style="font-size:10px" onclick="openAddExam('${c.id}','${t}');event.stopPropagation()">+ ${t}</button>`).join('')}
      </div>
    </div>`;
}

/* ---------- HOTLIST SUB-SECTION ---------- */
function renderHotlistSection(c) {
  const hotlist = c.hotlist || [];
  return `
    <div class="onboard-sub-section">
      <div class="flex items-center justify-between mb-6">
        <div class="text-xs fw-600" style="color:var(--blue)">📋 20 Names Hotlist (${hotlist.length}/20)</div>
        <div class="flex gap-4">
          <button class="btn btn-secondary btn-sm" style="font-size:10px" onclick="openAddHotlistName('${c.id}');event.stopPropagation()">+ Add Name</button>
          <label class="btn btn-secondary btn-sm" style="font-size:10px;cursor:pointer">
            📤 Upload Excel
            <input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="importHotlistExcel('${c.id}',this);event.stopPropagation()" />
          </label>
        </div>
      </div>
      ${hotlist.length > 0 ? `
        <div style="max-height:120px;overflow-y:auto">
          ${hotlist.map((name,i) => `
            <div class="flex items-center gap-6 mb-4">
              <span class="text-xs text-muted" style="min-width:18px">${i+1}.</span>
              <span class="text-xs fw-600 flex-1">${escHtml(name)}</span>
              <button class="btn btn-secondary btn-sm" style="padding:2px 6px;font-size:10px" onclick="removeHotlistName('${c.id}',${i});event.stopPropagation()">✕</button>
            </div>`).join('')}
        </div>` : '<div class="text-xs text-muted">No names yet. Add manually or upload an Excel file.</div>'}
    </div>`;
}

/* ---------- FIELDWORK SUB-SECTION ---------- */
function renderFieldworkSubSection(c, def) {
  const fieldwork = (c.fieldwork||[]).filter(f => def.n === 7 ? f.anp : !f.anp);
  return `
    <div class="onboard-sub-section">
      <div class="flex items-center justify-between mb-6">
        <div class="text-xs fw-600" style="color:var(--blue)">${def.n === 7 ? '✅ Closed Cases' : '🤝 Fieldwork'}</div>
        <button class="btn btn-secondary btn-sm" style="font-size:10px" onclick="openAddFieldwork('${c.id}',${def.n===7});event.stopPropagation()">+ Add</button>
      </div>
      ${fieldwork.length === 0 ? '<div class="text-xs text-muted">None recorded yet</div>' :
        fieldwork.map((f,i) => `
          <div class="exam-item">
            <div style="flex:1">
              <div class="exam-type">${escHtml(f.customerName)}</div>
              <div class="exam-date">Agent: ${escHtml(f.agentName)} ${f.anp?'• ANP: RM'+escHtml(f.anp):''} • ${formatDate(f.date)}</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="removeFieldwork('${c.id}',${i});event.stopPropagation()">✕</button>
          </div>`).join('')}
    </div>`;
}

/* ---------- CLIENT LIST SUB-SECTION ---------- */
function renderClientListSubSection(c) {
  const clients = c.prsClients || [];
  return `
    <div class="onboard-sub-section">
      <div class="flex items-center justify-between mb-6">
        <div class="text-xs fw-600" style="color:var(--blue)">📄 Policy Review Clients</div>
        <button class="btn btn-secondary btn-sm" style="font-size:10px" onclick="openAddPRSClient('${c.id}');event.stopPropagation()">+ Add</button>
      </div>
      ${clients.length === 0 ? '<div class="text-xs text-muted">No clients recorded</div>' :
        clients.map((name,i) => `
          <div class="flex items-center gap-6 mb-4">
            <span class="text-xs flex-1">${escHtml(name)}</span>
            <button class="btn btn-secondary btn-sm" style="padding:2px 6px;font-size:10px" onclick="removePRSClient('${c.id}',${i});event.stopPropagation()">✕</button>
          </div>`).join('')}
    </div>`;
}

/* ---------- AGENT PROFILE TAB ---------- */
function renderAgentProfile(c, contact, statusItems) {
  const doneItems = statusItems.filter(s => s.done);
  const examTotal = (c.examinations||[]).length;
  const fwTotal = (c.fieldwork||[]).length;
  const fwClosed = (c.fieldwork||[]).filter(f => f.anp).length;
  const totalANP = (c.fieldwork||[]).filter(f => f.anp).reduce((sum, f) => sum + (parseFloat(f.anp)||0), 0);
  const hotlistCount = (c.hotlist||[]).length;

  return `
    <!-- Agent Summary -->
    <div class="flex items-center gap-14 mb-20">
      ${avatarHTML(c.contactName, 52)}
      <div style="flex:1">
        <div class="fw-700" style="font-size:18px">${escHtml(c.contactName)}</div>
        <div class="text-muted text-sm">Onboarding started ${formatDate(c.createdAt)}</div>
        ${c.recruitPrograms?.length > 0 ? `<div style="color:var(--purple);font-size:12px;margin-top:4px">${c.recruitPrograms.join(' • ')}</div>` : ''}
      </div>
    </div>

    <!-- Key Stats -->
    <div class="stats-grid mb-16" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card" style="padding:12px"><div class="stat-num" style="font-size:22px;color:var(--teal)">${doneItems.length}</div><div class="stat-label">Steps Done</div></div>
      <div class="stat-card" style="padding:12px"><div class="stat-num" style="font-size:22px;color:var(--blue)">${examTotal}</div><div class="stat-label">Exams</div></div>
      <div class="stat-card" style="padding:12px"><div class="stat-num" style="font-size:22px;color:var(--green)">${fwClosed}</div><div class="stat-label">Cases Closed</div></div>
      <div class="stat-card" style="padding:12px"><div class="stat-num" style="font-size:22px;color:var(--orange)">RM${totalANP.toLocaleString()}</div><div class="stat-label">Total ANP</div></div>
    </div>

    <!-- Contact Info -->
    ${contact ? `
      <div class="section-divider">Contact Details</div>
      <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${escHtml(contact.phone||'—')}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${escHtml(contact.email||'—')}</span></div>
      <div class="info-row"><span class="info-label">NRIC</span><span class="info-value">${escHtml(contact.nric||'—')}</span></div>
    ` : ''}

    <!-- Step Timeline -->
    <div class="section-divider">Progress Timeline</div>
    <div class="timeline">
      ${doneItems.length === 0 ? '<div class="text-sm text-muted">No completed steps yet</div>' :
        doneItems.map(item => {
          const def = ONBOARD_STATUS_DEFS.find(d => d.n === item.status);
          return `<div class="timeline-item">
            <div class="timeline-dot" style="background:var(--green)"></div>
            <div class="timeline-content">
              <div class="timeline-title">${def?.icon||''} ${escHtml(def?.label||'')}</div>
              <div class="timeline-date">${formatDate(item.date)}</div>
              ${item.remark ? `<div class="timeline-remark">"${escHtml(item.remark)}"</div>` : ''}
            </div>
          </div>`;
        }).join('')}
    </div>

    <!-- Examinations -->
    ${(c.examinations||[]).length > 0 ? `
      <div class="section-divider">Examinations (${c.examinations.length})</div>
      ${c.examinations.map(e => `
        <div class="exam-item">
          <div style="flex:1"><div class="exam-type">${escHtml(e.type)}</div><div class="exam-date">${escHtml(e.date||'')} ${escHtml(e.time||'')} ${e.venue?'@ '+escHtml(e.venue):''}</div></div>
        </div>`).join('')}` : ''}

    <!-- Hotlist -->
    ${(c.hotlist||[]).length > 0 ? `
      <div class="section-divider">Hotlist (${c.hotlist.length} names)</div>
      <div style="column-count:2;column-gap:12px">
        ${c.hotlist.map((name,i) => `<div class="text-sm mb-4">${i+1}. ${escHtml(name)}</div>`).join('')}
      </div>` : ''}

    <!-- Fieldwork -->
    ${fwTotal > 0 ? `
      <div class="section-divider">Fieldwork Records (${fwTotal})</div>
      ${c.fieldwork.map(f => `
        <div class="exam-item">
          <div style="flex:1">
            <div class="exam-type">${escHtml(f.customerName)}</div>
            <div class="exam-date">${escHtml(f.agentName)} • ${formatDate(f.date)} ${f.anp?'• ANP: RM'+escHtml(f.anp):''}${f.anp?' 💰':''}</div>
          </div>
        </div>`).join('')}` : ''}

    <!-- Remarks -->
    <div class="section-divider">Remarks</div>
    <div class="form-group">
      <textarea class="form-control" id="remarksEdit" rows="3">${escHtml(c.remarks||'')}</textarea>
    </div>
    <button class="btn btn-primary btn-sm" onclick="saveRemarks('${c.id}')">Save Remarks</button>
  `;
}

/* ---------- ADD EXAM ---------- */
function openAddExam(caseId, type) {
  playClick();
  document.getElementById('contactModalTitle').textContent = `📚 Add Exam: ${type}`;
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group"><label class="form-label">Exam Type</label><input class="form-control" id="ex_type" value="${escHtml(type)}" readonly /></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-control" id="ex_date" value="${todayStr()}" /></div>
      <div class="form-group"><label class="form-label">Time</label><input type="time" class="form-control" id="ex_time" value="09:00" /></div>
    </div>
    <div class="form-group"><label class="form-label">Venue</label><input class="form-control" id="ex_venue" placeholder="Exam venue..." /></div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveExam('${caseId}')">💾 Save & Set Reminder</button>
    </div>
  `;
  openModal('contactModal');
}

function saveExam(caseId) {
  const c = getCase(caseId);
  if (!c) return;
  const exam = {
    type: document.getElementById('ex_type').value,
    date: document.getElementById('ex_date').value,
    time: document.getElementById('ex_time').value,
    venue: document.getElementById('ex_venue')?.value || ''
  };
  const exams = [...(c.examinations || []), exam];
  updateCase(caseId, { examinations: exams });
  if (exam.date) {
    addReminder({ caseId, contactName: c.contactName, category: 'onboarding', title: `📚 Exam: ${exam.type} — ${c.contactName}`, date: exam.date, time: exam.time });
  }
  showToast('Exam added with reminder!', 'success');
  playSuccess();
  closeContactModalBtn();
  openOnboardCase(caseId);
  setTimeout(() => switchTabById('tab-progress'), 50);
}

function removeExam(caseId, idx) {
  const c = getCase(caseId);
  if (!c) return;
  updateCase(caseId, { examinations: (c.examinations||[]).filter((_,i)=>i!==idx) });
  openOnboardCase(caseId);
  setTimeout(() => switchTabById('tab-progress'), 50);
}

/* ---------- HOTLIST ---------- */
function openAddHotlistName(caseId) {
  playClick();
  document.getElementById('contactModalTitle').textContent = 'Add to Hotlist';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group"><label class="form-label">Contact Name *</label><input class="form-control" id="hl_name" placeholder="Name..." /></div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveHotlistName('${caseId}')">Add</button>
    </div>
  `;
  openModal('contactModal');
}

function saveHotlistName(caseId) {
  const name = document.getElementById('hl_name')?.value?.trim();
  if (!name) { showToast('Please enter a name', 'error'); return; }
  const c = getCase(caseId);
  updateCase(caseId, { hotlist: [...(c.hotlist||[]), name] });
  showToast('Added to hotlist!', 'success');
  playSuccess();
  closeContactModalBtn();
  openOnboardCase(caseId);
  setTimeout(() => switchTabById('tab-progress'), 50);
}

function removeHotlistName(caseId, idx) {
  const c = getCase(caseId);
  if (!c) return;
  updateCase(caseId, { hotlist: (c.hotlist||[]).filter((_,i)=>i!==idx) });
  openOnboardCase(caseId);
  setTimeout(() => switchTabById('tab-progress'), 50);
}

function importHotlistExcel(caseId, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    // Parse CSV or simple tab-delimited
    const lines = text.split('\n').map(l => l.split(',')[0].split('\t')[0].replace(/^"|"$/g,'').trim()).filter(n => n && n.length > 1);
    const c = getCase(caseId);
    const existing = c.hotlist || [];
    const merged = [...new Set([...existing, ...lines])];
    updateCase(caseId, { hotlist: merged });
    showToast(`Imported ${lines.length} names!`, 'success');
    playSuccess();
    openOnboardCase(caseId);
    setTimeout(() => switchTabById('tab-progress'), 50);
  };
  reader.readAsText(file);
  input.value = '';
}

/* ---------- FIELDWORK ---------- */
function openAddFieldwork(caseId, isClosed = false) {
  const c = getCase(caseId);
  playClick();
  document.getElementById('contactModalTitle').textContent = isClosed ? '✅ Record Closed Case' : '🤝 Add Fieldwork';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group"><label class="form-label">Customer Name *</label><input class="form-control" id="fw_customer" placeholder="Customer name..." /></div>
    <div class="form-group"><label class="form-label">Agent Name</label><input class="form-control" id="fw_agent" value="${escHtml(c?.contactName||'')}" /></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-control" id="fw_date" value="${todayStr()}" /></div>
      <div class="form-group"><label class="form-label">${isClosed ? 'Sales ANP (RM) *' : 'Notes'}</label><input class="form-control" id="fw_anp" placeholder="${isClosed ? 'e.g. 2500' : 'Optional notes...'}" /></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveFieldwork('${caseId}',${isClosed})">Save</button>
    </div>
  `;
  openModal('contactModal');
}

function saveFieldwork(caseId, isClosed) {
  const c = getCase(caseId);
  if (!c) return;
  const fw = {
    customerName: document.getElementById('fw_customer')?.value?.trim(),
    agentName: document.getElementById('fw_agent')?.value || c.contactName,
    date: document.getElementById('fw_date')?.value,
    anp: isClosed ? document.getElementById('fw_anp')?.value || '' : '',
    notes: !isClosed ? document.getElementById('fw_anp')?.value || '' : ''
  };
  if (!fw.customerName) { showToast('Please enter customer name', 'error'); return; }
  updateCase(caseId, { fieldwork: [...(c.fieldwork||[]), fw] });
  showToast('Record added!', 'success');
  playSuccess();
  closeContactModalBtn();
  openOnboardCase(caseId);
  setTimeout(() => switchTabById('tab-progress'), 50);
}

function removeFieldwork(caseId, idx) {
  const c = getCase(caseId);
  if (!c) return;
  updateCase(caseId, { fieldwork: (c.fieldwork||[]).filter((_,i)=>i!==idx) });
  openOnboardCase(caseId);
  setTimeout(() => switchTabById('tab-progress'), 50);
}

/* ---------- PRS CLIENTS ---------- */
function openAddPRSClient(caseId) {
  playClick();
  document.getElementById('contactModalTitle').textContent = '📄 Add PRS Client';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group"><label class="form-label">Client Name *</label><input class="form-control" id="prs_name" placeholder="Client name..." /></div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="savePRSClient('${caseId}')">Add</button>
    </div>
  `;
  openModal('contactModal');
}

function savePRSClient(caseId) {
  const name = document.getElementById('prs_name')?.value?.trim();
  if (!name) return;
  const c = getCase(caseId);
  updateCase(caseId, { prsClients: [...(c.prsClients||[]), name] });
  showToast('Client added!', 'success');
  closeContactModalBtn();
  openOnboardCase(caseId);
  setTimeout(() => switchTabById('tab-progress'), 50);
}

function removePRSClient(caseId, idx) {
  const c = getCase(caseId);
  if (!c) return;
  updateCase(caseId, { prsClients: (c.prsClients||[]).filter((_,i)=>i!==idx) });
  openOnboardCase(caseId);
  setTimeout(() => switchTabById('tab-progress'), 50);
}
