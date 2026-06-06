/* ============================================
   Recruitment Module
   ============================================ */

let recruitFilter = { status: 'all' };

// Reasons for status 4 choices
const CONSIDER_REASONS = {
  agreed:      { label: '✅ Candidate Agreed',                    next: 5, kivReason: null },
  notinterest: { label: '❌ Not Interested',                       next: 6, kivReason: 'Not Interested' },
  timing:      { label: '⏳ Not Right Timing / Will Consider',     next: 6, kivReason: 'Not Right Timing' },
  vip:         { label: '👑 VIP — Not Agree',                      next: 6, kivReason: 'VIP Not Agree' }
};

function renderRecruitment() {
  document.getElementById('pageTitle').textContent = 'Recruitment';
  const cases = getCases('recruitment');
  const stats = getCategoryStats('recruitment');
  const statusDefs = getStatusDef('recruitment');
  const filtered = cases.filter(c => {
    if (recruitFilter.status !== 'all' && c.currentStatus !== recruitFilter.status) return false;
    return true;
  });

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#F3E8FD">👥</div><div class="stat-num" style="color:var(--purple)">${cases.length}</div><div class="stat-label">Total Prospects</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#FFF3E0">⏳</div><div class="stat-num" style="color:var(--orange)">${cases.filter(c=>(c.completedSteps||[]).includes(4)&&!(c.completedSteps||[]).includes(5)&&!(c.completedSteps||[]).includes(6)).length}</div><div class="stat-label">Considering</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">🤝</div><div class="stat-num" style="color:var(--green)">${cases.filter(c=>(c.completedSteps||[]).includes(5)).length}</div><div class="stat-label">Agreed</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--yellow-light)">📌</div><div class="stat-num" style="color:#B8860B">${stats.kivCount}</div><div class="stat-label">KIV</div></div>
    </div>

    <div class="flex items-center justify-between mb-12" style="flex-wrap:wrap;gap:8px">
      <div class="filter-bar" style="margin-bottom:0;flex-wrap:wrap">
        <span class="filter-chip ${recruitFilter.status==='all'?'active':''}" onclick="setRecruitFilter('status','all')">All</span>
        ${statusDefs.map(s => `<span class="filter-chip ${recruitFilter.status==s.n?'active':''}" onclick="setRecruitFilter('status',${s.n})">${s.label}</span>`).join('')}
      </div>
      <button class="btn btn-primary" onclick="openNewCase('recruitment')">+ New Prospect</button>
    </div>

    <div class="section-header">
      <div class="section-title">Recruitment Cases <small>${filtered.length} shown</small></div>
    </div>
    ${filtered.length === 0
      ? emptyState('👥', 'No recruitment cases', 'Add your first prospect')
      : `<div class="case-list">${filtered.map(c => renderCaseRow(c, 'openRecruitCase')).join('')}</div>`
    }
  `;
}

function setRecruitFilter(key, val) {
  recruitFilter[key] = val; playClick(); renderRecruitment();
}

function openRecruitCase(id) {
  const c = getCase(id);
  if (!c) return;
  playClick();
  const contact = getContact(c.contactId);
  document.getElementById('modalTitle').textContent = c.contactName || 'Recruitment Case';
  document.getElementById('modalSubtitle').textContent = `Recruitment • ${formatDate(c.createdAt)}`;
  document.getElementById('modalBody').innerHTML = renderRecruitDetail(c, contact);
  openModal('caseModal');
}

function renderRecruitDetail(c, contact) {
  const allRems = (DB.reminders || []).filter(r => r.caseId === c.id && !r.done);
  const statusDefs = getStatusDef('recruitment');
  const completedSteps = c.completedSteps || [];
  const undone = statusDefs.map(s => s.n).filter(n => !completedSteps.includes(n));
  const nextStep = undone[0] ?? null;

  const hasDecision = completedSteps.includes(4) || completedSteps.includes(5) || completedSteps.includes(6);
  const isAgreed = completedSteps.includes(5) && !completedSteps.includes(6);
  const isKIV = completedSteps.includes(6);
  const allDone = statusDefs.every(s => completedSteps.includes(s.n));

  return `
    <div class="tab-bar">
      <button class="tab-btn active" onclick="switchTab(this,'tab-progress')">Progress</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-remarks')">Remarks</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-reminders')">Reminders ${allRems.length > 0 ? `<span class="nav-badge" style="display:inline">${allRems.length}</span>` : ''}</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-history')">History</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-whatsapp')">WhatsApp</button>
    </div>

    <!-- Progress Tab -->
    <div id="tab-progress">
      <div class="flex items-center justify-between mb-12" style="flex-wrap:wrap;gap:8px">
        <div>
          ${c.priority ? '<span class="priority-tag mb-8" style="display:inline-flex">★ Priority</span>' : ''}
          ${c.kiv ? '<span class="status-badge kiv ml-4">KIV</span>' : ''}
        </div>
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" onclick="togglePriority('${c.id}')">
            ${c.priority ? '★ Unmark Priority' : '☆ Mark Priority'}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="editCase('${c.id}')">✏ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCaseConfirm('${c.id}')">🗑</button>
        </div>
      </div>

      <div class="status-steps">
        ${statusDefs.map(s => {
          const isDone = completedSteps.includes(s.n);
          const isCurrent = !isDone && s.n === nextStep;
          const hist = (c.statusHistory || []).filter(h => h.toStatus === s.n).pop();
          const customLabel = c.customStatusLabels?.[s.n] || s.label;
          const extraContent = (s.n === 6 && c.customFields?.kivReason)
            ? `<div class="step-remark" style="padding:4px 0 0 44px">Reason: ${escHtml(c.customFields.kivReason)}</div>` : '';
          return renderStatusStep(c, s, {
            isDone, isCurrent, histEntry: hist,
            onClickFn: `handleStepClick('${c.id}',${s.n},'${escHtml(customLabel)}','${c._viewCat||c.category}')`,
            extraContent
          });
        }).join('')}
      </div>

      <!-- After step 3: show decision choices if no outcome yet -->
      ${completedSteps.includes(3) && !hasDecision ? renderConsiderChoices(c) : ''}

      <!-- Step 5 agreed: program selection -->
      ${isAgreed ? `
        <div class="section-divider">Programs Agreed</div>
        <div class="flex gap-8 mb-8" style="flex-wrap:wrap">
          ${['RintiZ', 'Next Gen Millionaire', 'Next Gen Leader'].map(prog => `
            <label class="checkbox-wrap">
              <input type="checkbox" ${(c.recruitPrograms||[]).includes(prog)?'checked':''}
                onchange="toggleProgram('${c.id}','${prog}',this.checked)">
              ${prog}
            </label>`).join('')}
        </div>` : ''}

      <!-- Step 6 KIV: reactivate -->
      ${isKIV ? renderKIVReactivate(c) : ''}

      ${allDone ? `
        <div class="card mt-16" style="background:var(--green-light);border-color:var(--green)">
          <div class="card-body text-center">
            <div style="font-size:32px">🎉</div>
            <div class="fw-600" style="color:var(--green)">All steps completed!</div>
          </div>
        </div>` : ''}
    </div>

    <!-- Remarks Tab -->
    <div id="tab-remarks" style="display:none">
      <div class="form-group">
        <label class="form-label">Remarks / Notes</label>
        <textarea class="form-control" id="remarksEdit" rows="4">${escHtml(c.remarks || '')}</textarea>
      </div>
      ${contact ? `
        <div class="section-divider">Contact Info</div>
        <div class="info-row"><span class="info-label">Name</span><span class="info-value fw-600">${escHtml(contact.name)}</span></div>
        <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${escHtml(contact.phone || '—')}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${escHtml(contact.email || '—')}</span></div>
        <button class="btn btn-secondary btn-sm mt-8" onclick="openEditContact('${contact.id}')">✏ Edit Contact</button>
      ` : ''}
      <div class="btn-row mt-16"><button class="btn btn-primary" onclick="saveRemarks('${c.id}')">Save</button></div>
    </div>

    <!-- Reminders Tab -->
    <div id="tab-reminders" style="display:none">
      <div class="section-header"><div class="section-title">Set Reminder</div></div>
      <div class="form-row mb-8">
        <div class="form-group mb-0"><label class="form-label">Title</label><input class="form-control" id="rem_title" placeholder="Reminder..." /></div>
        <div class="form-group mb-0"><label class="form-label">Date</label><input type="date" class="form-control" id="rem_date" value="${todayStr()}" /></div>
      </div>
      <div class="btn-row mb-16">
        <button class="btn btn-secondary btn-sm" onclick="setWorkingDayReminder('${c.id}','${c.contactName}','recruitment',3)">+3 Days</button>
        <button class="btn btn-secondary btn-sm" onclick="setWorkingDayReminder('${c.id}','${c.contactName}','recruitment',7)">+7 Working Days</button>
        <button class="btn btn-primary btn-sm" onclick="addCaseReminder('${c.id}','${c.contactName}','recruitment')">Add</button>
      </div>
      <div class="section-divider">Existing Reminders</div>
      ${allRems.length === 0
        ? '<div class="empty-state" style="padding:20px 0"><div class="empty-state-sub">No reminders set</div></div>'
        : allRems.map(r => renderReminderItem(r)).join('')}
    </div>

    <!-- History Tab -->
    <div id="tab-history" style="display:none">
      <div class="timeline">
        ${(c.statusHistory || []).length === 0
          ? '<div class="empty-state"><div class="empty-state-sub">No history yet</div></div>'
          : [...(c.statusHistory || [])].reverse().map(h => `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-title">${escHtml(getStatusLabel(c.category, h.toStatus))}</div>
                <div class="timeline-date">${formatDateTime(h.date)}</div>
                ${h.remark ? `<div class="timeline-remark">"${escHtml(h.remark)}"</div>` : ''}
              </div>
            </div>`).join('')}
      </div>
    </div>

    <!-- WhatsApp Tab -->
    <div id="tab-whatsapp" style="display:none">
      ${renderWAScriptBox(c.category, c.currentStatus, c.contactName)}
    </div>
  `;
}

function renderConsiderChoices(c) {
  return `
    <div class="card mt-16" style="background:var(--bg);border-color:var(--blue)">
      <div class="card-body">
        <div class="form-label" style="color:var(--blue)">What is the candidate's decision?</div>
        <textarea class="form-control mb-12" id="remarkInput" rows="2" placeholder="Add a remark (optional)..."></textarea>
        <div class="flex gap-8 mb-0" style="flex-wrap:wrap">
          ${Object.entries(CONSIDER_REASONS).map(([key, r]) => `
            <button class="btn ${key==='agreed'?'btn-success':key==='vip'?'btn-warning':'btn-secondary'} btn-sm"
              onclick="handleConsiderChoice('${c.id}','${key}')">
              ${r.label}
            </button>`).join('')}
        </div>
      </div>
    </div>`;
}

function renderKIVReactivate(c) {
  const reason = c.customFields?.kivReason || '';
  return `
    <div class="card mt-16" style="background:var(--yellow-light);border-color:var(--yellow)">
      <div class="card-body">
        <div class="fw-600 mb-8">📌 KIV ${reason ? `— ${reason}` : ''}</div>
        <div class="text-sm text-muted mb-12">Reactivate this candidate by moving them back to any stage:</div>
        <div class="flex gap-8" style="flex-wrap:wrap">
          ${getStatusDef('recruitment').filter(s => s.n < 6).map(s => `
            <button class="btn btn-secondary btn-sm" onclick="reactivateFromKIV('${c.id}',${s.n})">
              → ${s.label}
            </button>`).join('')}
        </div>
      </div>
    </div>`;
}

function handleConsiderChoice(caseId, choiceKey) {
  const choice = CONSIDER_REASONS[choiceKey];
  if (!choice) return;
  const remark = document.getElementById('remarkInput')?.value || choice.label;
  const c = toggleStepDone(caseId, choice.next, remark, null);
  if (!c) return;

  if (choice.kivReason) {
    updateCase(caseId, {
      kiv: true,
      customFields: { ...(c.customFields || {}), kivReason: choice.kivReason }
    });
    addReminder({
      caseId, contactName: c.contactName, category: 'recruitment',
      title: `KIV Follow-up: ${choice.kivReason} — ${c.contactName}`,
      date: workingDaysReminder(new Date(), 30)
    });
    showToast(`Moved to KIV: ${choice.kivReason}`, 'warning');
  } else if (choice.next === 5) {
    checkAutoTransfer(c);
    showToast(`🎉 ${c.contactName} agreed! Moved to Onboarding.`, 'success');
    playComplete();
  }

  if (choiceKey === 'agreed') playSuccess();

  closeCaseModalBtn();
  setTimeout(() => { openCaseById(caseId); updateBadges(); }, 50);
  renderCurrentPage();
}

function reactivateFromKIV(caseId, targetStatus) {
  const c = getCase(caseId);
  if (!c) return;
  // Remove KIV step and any outcome steps (4/5/6) at or beyond targetStatus
  const newSteps = (c.completedSteps || []).filter(n => n < targetStatus && n !== 6);
  const maxStep = newSteps.length > 0 ? Math.max(...newSteps) : 0;
  const histEntry = { fromStatus: 6, toStatus: targetStatus, remark: 'Reactivated from KIV', date: new Date().toISOString() };
  updateCase(caseId, {
    kiv: false,
    customFields: { ...(c.customFields || {}), kivReason: '' },
    completedSteps: newSteps,
    currentStatus: maxStep,
    statusHistory: [...(c.statusHistory || []), histEntry]
  });
  showToast(`Reactivated to: ${getStatusLabel('recruitment', targetStatus)}`, 'success');
  playSuccess();
  closeCaseModalBtn();
  setTimeout(() => { openCaseById(caseId); updateBadges(); }, 50);
  renderCurrentPage();
}

function toggleProgram(caseId, prog, checked) {
  const c = getCase(caseId);
  if (!c) return;
  const programs = new Set(c.recruitPrograms || []);
  if (checked) programs.add(prog); else programs.delete(prog);
  updateCase(caseId, { recruitPrograms: [...programs] });
  playClick();
}
