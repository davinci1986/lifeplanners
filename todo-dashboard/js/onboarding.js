/* ============================================
   Onboarding Module
   ============================================ */

function renderOnboarding() {
  document.getElementById('pageTitle').textContent = 'Onboarding';
  const cases = getCases('onboarding');
  const stats = getCategoryStats('onboarding');

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#E5F6FF">🚀</div><div class="stat-num" style="color:var(--teal)">${cases.length}</div><div class="stat-label">Total Agents</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">⚡</div><div class="stat-num" style="color:var(--blue)">${stats.active}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">🎓</div><div class="stat-num" style="color:var(--green)">${cases.filter(c=>c.currentStatus===9).length}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--red-light)">🔔</div><div class="stat-num" style="color:var(--red)">${stats.dueReminders}</div><div class="stat-label">Due Reminders</div></div>
    </div>

    <div class="flex items-center justify-between mb-16">
      <div class="section-title">Agent Onboarding <small>${cases.length}</small></div>
      <button class="btn btn-primary" onclick="openNewCase('onboarding')">+ New Agent</button>
    </div>

    ${cases.length === 0
      ? emptyState('🚀', 'No onboarding cases', 'Agents will appear here automatically when recruited')
      : `<div class="grid-auto">${cases.map(c => renderOnboardCard(c)).join('')}</div>`
    }
  `;
}

function renderOnboardCard(c) {
  const defs = getStatusDef('onboarding');
  const progress = Math.round((c.currentStatus / defs.length) * 100);
  const meta = catMeta('onboarding');
  const dueRems = getDueReminders().filter(r => r.caseId === c.id).length;

  return `
    <div class="card" onclick="openOnboardCase('${c.id}')" style="cursor:pointer;transition:all 0.2s" onmouseover="this.style.boxShadow='var(--shadow)'" onmouseout="this.style.boxShadow=''">
      <div class="card-body">
        <div class="flex items-center gap-12 mb-12">
          ${avatarHTML(c.contactName, 42)}
          <div style="flex:1">
            <div class="fw-700">${escHtml(c.contactName)}</div>
            <div class="text-xs text-muted">Joined ${formatDate(c.createdAt)}</div>
          </div>
          ${dueRems > 0 ? `<span class="status-badge overdue">🔔 ${dueRems}</span>` : ''}
        </div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs text-muted">Step ${c.currentStatus} of ${defs.length}</span>
          <span class="text-xs fw-600" style="color:var(--teal)">${progress}%</span>
        </div>
        <div class="progress-bar-wrap mb-8">
          <div class="progress-bar-fill" style="width:${progress}%;background:var(--teal)"></div>
        </div>
        <div class="status-badge s${Math.min(c.currentStatus,9)}">${escHtml(getStatusLabel('onboarding', c.currentStatus))}</div>
        ${c.examinations?.length > 0 ? `<div class="text-xs text-muted mt-8">📚 ${c.examinations.length} exam(s) scheduled</div>` : ''}
        ${c.recruitPrograms?.length > 0 ? `<div class="text-xs text-muted">🎯 ${c.recruitPrograms.join(', ')}</div>` : ''}
      </div>
    </div>`;
}

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
  const examTypes = ['PCIL', 'TBE (A & C)', 'TBE ABC', 'PRS'];
  const base = renderCaseDetail(c, contact);
  // Inject exam section into progress tab
  const examSection = `
    <div class="section-divider">Examinations</div>
    <div id="examList">
      ${(c.examinations || []).map((e, i) => `
        <div class="exam-item">
          <div style="flex:1">
            <div class="exam-type">${escHtml(e.type)}</div>
            <div class="exam-date">${escHtml(e.date || '')} ${escHtml(e.time || '')} — ${escHtml(e.venue || '')}</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="removeExam('${c.id}',${i});event.stopPropagation()">✕</button>
        </div>`).join('')}
    </div>
    <div class="flex gap-8 mt-8" style="flex-wrap:wrap">
      ${examTypes.map(t => `<button class="btn btn-secondary btn-sm" onclick="openAddExam('${c.id}','${t}')">+ ${t}</button>`).join('')}
    </div>

    <div class="section-divider">Agent Programs</div>
    <div class="flex gap-8 mb-8" style="flex-wrap:wrap">
      ${['RintiZ', 'Next Gen Millionaire', 'Next Gen Leader'].map(prog => `
        <label class="checkbox-wrap">
          <input type="checkbox" ${(c.recruitPrograms||[]).includes(prog)?'checked':''}
            onchange="toggleProgram('${c.id}','${prog}',this.checked)">
          ${prog}
        </label>`).join('')}
    </div>

    <div class="section-divider">Fieldwork Records</div>
    <div id="fieldworkList">
      ${(c.fieldwork || []).map((f, i) => `
        <div class="exam-item">
          <div style="flex:1">
            <div class="exam-type">${escHtml(f.customerName)}</div>
            <div class="exam-date">Agent: ${escHtml(f.agentName)} ${f.anp ? '• ANP: RM'+escHtml(f.anp) : ''} • ${formatDate(f.date)}</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="removeFieldwork('${c.id}',${i});event.stopPropagation()">✕</button>
        </div>`).join('')}
    </div>
    <button class="btn btn-secondary btn-sm mt-8" onclick="openAddFieldwork('${c.id}')">+ Add Fieldwork</button>
  `;

  return base.replace(
    '<!-- Special fields for sales status 5 (premiums) -->',
    examSection + '<!-- Special fields for sales status 5 (premiums) -->'
  );
}

function openAddExam(caseId, type) {
  document.getElementById('modalTitle').textContent = `Add Examination: ${type}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Exam Type</label>
      <input class="form-control" id="ex_type" value="${escHtml(type)}" readonly />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" class="form-control" id="ex_date" value="${todayStr()}" />
      </div>
      <div class="form-group">
        <label class="form-label">Time</label>
        <input type="time" class="form-control" id="ex_time" value="09:00" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Venue</label>
      <input class="form-control" id="ex_venue" placeholder="Exam venue..." />
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="openOnboardCase('${caseId}')">Back</button>
      <button class="btn btn-primary" onclick="saveExam('${caseId}')">Save & Set Reminder</button>
    </div>
  `;
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
  // Set reminder
  if (exam.date) {
    addReminder({
      caseId, contactName: c.contactName, category: 'onboarding',
      title: `📚 Exam: ${exam.type} — ${c.contactName}`,
      date: exam.date, time: exam.time
    });
  }
  showToast('Exam added with reminder!', 'success');
  playSuccess();
  openOnboardCase(caseId);
}

function removeExam(caseId, idx) {
  const c = getCase(caseId);
  if (!c) return;
  const exams = (c.examinations || []).filter((_, i) => i !== idx);
  updateCase(caseId, { examinations: exams });
  openOnboardCase(caseId);
}

function openAddFieldwork(caseId) {
  const c = getCase(caseId);
  document.getElementById('modalTitle').textContent = 'Add Fieldwork Record';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Customer Name</label>
      <input class="form-control" id="fw_customer" placeholder="Customer name..." />
    </div>
    <div class="form-group">
      <label class="form-label">Agent Name</label>
      <input class="form-control" id="fw_agent" value="${escHtml(c?.contactName||'')}" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" class="form-control" id="fw_date" value="${todayStr()}" />
      </div>
      <div class="form-group">
        <label class="form-label">Sales ANP (RM) — optional</label>
        <input class="form-control" id="fw_anp" placeholder="e.g. 2500" />
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="openOnboardCase('${caseId}')">Back</button>
      <button class="btn btn-primary" onclick="saveFieldwork('${caseId}')">Save</button>
    </div>
  `;
}

function saveFieldwork(caseId) {
  const c = getCase(caseId);
  if (!c) return;
  const fw = {
    customerName: document.getElementById('fw_customer').value,
    agentName: document.getElementById('fw_agent').value,
    date: document.getElementById('fw_date').value,
    anp: document.getElementById('fw_anp')?.value || ''
  };
  if (!fw.customerName) { showToast('Please enter customer name', 'error'); return; }
  const fieldwork = [...(c.fieldwork || []), fw];
  updateCase(caseId, { fieldwork });
  showToast('Fieldwork record added!', 'success');
  playSuccess();
  openOnboardCase(caseId);
}

function removeFieldwork(caseId, idx) {
  const c = getCase(caseId);
  if (!c) return;
  const fw = (c.fieldwork || []).filter((_, i) => i !== idx);
  updateCase(caseId, { fieldwork: fw });
  openOnboardCase(caseId);
}
