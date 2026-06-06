/* ============================================
   Sales Module
   ============================================ */

let salesFilter = { status: 'all', label: 'all', search: '' };

function renderSales() {
  document.getElementById('pageTitle').textContent = 'Sales';
  const cases = getCases('sales');
  const filtered = filterCases(cases, salesFilter);
  const stats = getCategoryStats('sales');

  document.getElementById('content').innerHTML = `
    <!-- Stats -->
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">📈</div><div class="stat-num" style="color:var(--blue)">${cases.length}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#FFF3E0">⚡</div><div class="stat-num" style="color:var(--orange)">${stats.active}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">✅</div><div class="stat-num" style="color:var(--green)">${cases.filter(c=>c.currentStatus===5||c.currentStatus===8).length}</div><div class="stat-label">Closed / KIV</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--red-light)">🔔</div><div class="stat-num" style="color:var(--red)">${stats.dueReminders}</div><div class="stat-label">Due Reminders</div></div>
    </div>

    <!-- Filters + Add -->
    <div class="flex items-center justify-between mb-12" style="flex-wrap:wrap;gap:8px">
      <div class="filter-bar" style="margin-bottom:0;flex-wrap:wrap">
        <span class="filter-chip ${salesFilter.status==='all'?'active':''}" onclick="setSalesFilter('status','all')">All</span>
        ${STATUS_DEFS.sales.map(s => `<span class="filter-chip ${salesFilter.status==s.n?'active':''}" onclick="setSalesFilter('status',${s.n})">${s.label}</span>`).join('')}
      </div>
      <button class="btn btn-primary" onclick="openNewSalesCase()">+ New Case</button>
    </div>

    <!-- Sub filter: AIA / Snapwill -->
    <div class="filter-bar mb-16">
      <span class="filter-chip ${salesFilter.label==='all'?'active':''}" onclick="setSalesFilter('label','all')">All</span>
      <span class="filter-chip ${salesFilter.label==='AIA'?'active':''}" onclick="setSalesFilter('label','AIA')">AIA</span>
      <span class="filter-chip ${salesFilter.label==='Snapwill'?'active':''}" onclick="setSalesFilter('label','Snapwill')">Snapwill</span>
      <span class="filter-chip ${salesFilter.label==='priority'?'active':''}" onclick="setSalesFilter('label','priority')">⭐ Priority</span>
      <span class="filter-chip ${salesFilter.label==='kiv'?'active':''}" onclick="setSalesFilter('label','kiv')">📌 KIV</span>
    </div>

    <!-- Case List -->
    <div class="section-header">
      <div class="section-title">Cases <small>${filtered.length} shown</small></div>
    </div>
    ${filtered.length === 0
      ? emptyState('📈', 'No sales cases', 'Add your first case to get started')
      : `<div class="case-list">${filtered.map(c => renderCaseRow(c, 'openSalesCase')).join('')}</div>`
    }
  `;
}

function setSalesFilter(key, val) {
  salesFilter[key] = val;
  playClick();
  renderSales();
}

function filterCases(cases, f) {
  return cases.filter(c => {
    if (f.status !== 'all' && c.currentStatus !== f.status) return false;
    if (f.label === 'AIA' && c.subLabel !== 'AIA') return false;
    if (f.label === 'Snapwill' && c.subLabel !== 'Snapwill') return false;
    if (f.label === 'priority' && !c.priority) return false;
    if (f.label === 'kiv' && !c.kiv) return false;
    if (f.search && !(c.contactName||'').toLowerCase().includes(f.search.toLowerCase())) return false;
    return true;
  });
}

function openNewSalesCase() {
  playClick();
  const modal = document.getElementById('caseModal');
  document.getElementById('modalTitle').textContent = 'New Sales Case';
  document.getElementById('modalSubtitle').textContent = 'Add a new sales prospect';
  document.getElementById('modalBody').innerHTML = renderNewCaseForm('sales');
  openModal('caseModal');
}

function openSalesCase(id) {
  const c = getCase(id);
  if (!c) return;
  playClick();
  const contact = getContact(c.contactId);
  document.getElementById('modalTitle').textContent = c.contactName || 'Sales Case';
  document.getElementById('modalSubtitle').textContent = `Sales • ${c.subLabel || ''} • Created ${formatDate(c.createdAt)}`;
  document.getElementById('modalBody').innerHTML = renderCaseDetail({...c, category:'sales'}, contact);
  openModal('caseModal');
}

function renderNewCaseForm(category, existingCase = null) {
  const allBuiltinCats = ['sales','claims','servicing','recruitment','onboarding','snapwill','others'];
  const allCustomCats = getCustomCategories();
  const allCats = [...allBuiltinCats.map(id => ({ id, ...catMeta(id) })), ...allCustomCats.map(c => ({ id: c.id, label: c.name, icon: c.icon }))];
  const existingCats = existingCase?.categories || [category];
  const labelDefs = getLabelDefs(category);
  const isEdit = !!existingCase;

  return `
    <div class="form-group">
      <label class="form-label">Name / Contact *</label>
      <input class="form-control" id="nf_name" placeholder="Enter name..." value="${escHtml(existingCase?.contactName||'')}" oninput="autofillContact(this.value)" autocomplete="off" />
      <div id="contactSuggestions" class="suggestion-chips"></div>
    </div>

    <div class="form-group">
      <label class="form-label">Categories (select all that apply)</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${allCats.map(c => `
          <label class="checkbox-wrap" style="background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer">
            <input type="checkbox" name="nf_categories" value="${c.id}" ${existingCats.includes(c.id)?'checked':''} onchange="playClick()">
            ${c.icon || ''} ${c.label}
          </label>`).join('')}
      </div>
    </div>

    ${category === 'sales' ? `
    <div class="form-group">
      <label class="form-label">Company (select all that apply)</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['AIA','Snapwill'].map(co => {
          const existingCos = existingCase?.companies || (existingCase?.subLabel ? existingCase.subLabel.split(',').map(s=>s.trim()) : ['AIA']);
          return `<label class="checkbox-wrap" style="background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:6px 12px;cursor:pointer">
            <input type="checkbox" name="company" value="${co}" ${existingCos.includes(co)?'checked':''} onchange="playClick()"> ${co}
          </label>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${labelDefs.length > 0 ? `
    <div class="form-group">
      <label class="form-label">Label</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px" id="labelChips">
        ${labelDefs.map(l => `
          <label class="checkbox-wrap" style="background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px">
            <input type="radio" name="nf_label" value="${l.id}" ${existingCase?.label===l.id?'checked':''}> ${l.label}
          </label>`).join('')}
      </div>
      <div style="display:flex;gap:6px;margin-top:4px">
        <input class="form-control" id="nf_custom_label" placeholder="Or type a custom label..." style="font-size:12px" value="${existingCase?.label && !labelDefs.find(l=>l.id===existingCase.label) ? escHtml(existingCase.label) : ''}" />
        <button class="btn btn-secondary btn-sm" onclick="addLabelToCategory('${category}')">+ Save</button>
      </div>
    </div>` : `
    <div class="form-group">
      <label class="form-label">Label / Tag</label>
      <div style="display:flex;gap:6px">
        <input class="form-control" id="nf_custom_label" placeholder="Enter a label..." value="${escHtml(existingCase?.label||'')}" />
        <button class="btn btn-secondary btn-sm" onclick="addLabelToCategory('${category}')">+ Save</button>
      </div>
    </div>`}

    <div class="form-group">
      <label class="form-label">Remarks</label>
      <textarea class="form-control" id="nf_remarks" rows="2" placeholder="Optional notes...">${escHtml(existingCase?.remarks||'')}</textarea>
    </div>
    <div class="flex gap-8 mb-16">
      <label class="checkbox-wrap"><input type="checkbox" id="nf_priority" ${existingCase?.priority?'checked':''}> Priority</label>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeCaseModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveNewCase('${category}','${existingCase?.id||''}')">${isEdit ? 'Save Changes' : 'Create Case'}</button>
    </div>
  `;
}

function addLabelToCategory(category) {
  const input = document.getElementById('nf_custom_label');
  const val = input?.value?.trim();
  if (!val) return;
  const entry = addCustomLabel(category, { label: val });
  if (!entry) return;
  // Inject radio button into chip list and auto-select it
  const chips = document.getElementById('labelChips');
  if (chips) {
    let existing = chips.querySelector(`input[value="${entry.id}"]`);
    if (!existing) {
      const lbl = document.createElement('label');
      lbl.className = 'checkbox-wrap';
      lbl.style.cssText = 'background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px';
      lbl.innerHTML = `<input type="radio" name="nf_label" value="${entry.id}"> ${escHtml(entry.label)}`;
      chips.appendChild(lbl);
      existing = lbl.querySelector('input');
    }
    existing.checked = true;
  }
  input.value = '';
  showToast('Label saved!', 'success');
  playClick();
}

function autofillContact(val) {
  if (!val || val.length < 2) { document.getElementById('contactSuggestions').innerHTML = ''; return; }
  const results = searchContacts(val);
  const box = document.getElementById('contactSuggestions');
  if (results.length === 0) { box.innerHTML = ''; return; }
  box.innerHTML = results.slice(0, 5).map(c =>
    `<button class="suggestion-chip" onclick="selectContact('${c.id}','${escHtml(c.name)}')">
      ${escHtml(c.name)} ${c.phone ? `<span class="text-muted">${escHtml(c.phone)}</span>` : ''}
    </button>`
  ).join('');
}

function selectContact(id, name) {
  const el = document.getElementById('nf_name');
  if (el) el.value = name;
  el.dataset.contactId = id;
  document.getElementById('contactSuggestions').innerHTML = '';
  playClick();
}

function saveNewCase(category, existingId = '') {
  const nameEl = document.getElementById('nf_name');
  const name = nameEl?.value?.trim();
  if (!name) { showToast('Please enter a name', 'error'); return; }

  // Multi-category selection
  const catCheckboxes = document.querySelectorAll('input[name="nf_categories"]:checked');
  const selectedCats = catCheckboxes.length > 0 ? [...catCheckboxes].map(cb => cb.value) : [category];
  const primaryCat = selectedCats.includes(category) ? category : (selectedCats[0] || category);

  // Company checkboxes (AIA / Snapwill — multi-select)
  const companyChecks = [...document.querySelectorAll('input[name="company"]:checked')].map(cb => cb.value);
  const companies = companyChecks.length > 0 ? companyChecks : [];
  const subLabelVal = companies.join(', '); // backward-compat display
  // Auto-add snapwill category when Snapwill company is selected
  if (companies.includes('Snapwill') && !selectedCats.includes('snapwill')) {
    selectedCats.push('snapwill');
  }
  // Label: radio selection OR custom text input
  const labelRadio = document.querySelector('input[name="nf_label"]:checked');
  const labelCustom = document.getElementById('nf_custom_label')?.value?.trim();
  let label = labelRadio?.value || '';
  if (!label && labelCustom) {
    // Find by text to reuse saved ID, else use text directly
    const savedEntry = (DB.customLabels?.[category] || []).find(l => l.label.toLowerCase() === labelCustom.toLowerCase());
    label = savedEntry ? savedEntry.id : labelCustom;
  }
  const remarks = document.getElementById('nf_remarks')?.value || '';
  const priority = document.getElementById('nf_priority')?.checked || false;

  // Get or create contact
  const contactId = nameEl.dataset.contactId || null;
  let contact;
  if (contactId) {
    contact = getContact(contactId);
  } else {
    contact = findOrCreateContact(name);
  }

  if (existingId) {
    updateCase(existingId, {
      contactName: contact.name,
      contactId: contact.id,
      category: primaryCat,
      categories: selectedCats,
      companies,
      subLabel: subLabelVal,
      label,
      remarks,
      priority
    });
    showToast('Case updated', 'success');
    playSuccess();
  } else {
    createCase({
      contactId: contact.id,
      contactName: contact.name,
      category: primaryCat,
      categories: selectedCats,
      companies,
      subLabel: subLabelVal,
      label,
      remarks,
      priority,
      currentStatus: 1,
      statusHistory: [{ fromStatus: 0, toStatus: 1, remark: 'Case created', date: new Date().toISOString() }]
    });
    showToast(`Case created for ${contact.name}`, 'success');
    playSuccess();
  }

  closeCaseModalBtn();
  updateBadges();
  renderCurrentPage();
}

function renderCaseDetail(c, contact) {
  const statusDefs = getStatusDef(c.category);
  const maxStatus = statusDefs.length;
  const dueRems = getDueReminders().filter(r => r.caseId === c.id);
  const allRems = (DB.reminders || []).filter(r => r.caseId === c.id && !r.done);

  return `
    <div class="tab-bar">
      <button class="tab-btn active" onclick="switchTab(this,'tab-progress')">Progress</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-remarks')">Remarks & Info</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-reminders')">Reminders ${allRems.length > 0 ? `<span class="nav-badge" style="display:inline">${allRems.length}</span>` : ''}</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-history')">History</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-whatsapp')">WhatsApp</button>
    </div>

    <!-- Progress Tab -->
    <div id="tab-progress">
      <div class="flex items-center justify-between mb-16" style="flex-wrap:wrap;gap:8px">
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
        ${(() => {
          const completedSteps = c.completedSteps || [];
          const undone = statusDefs.map(s => s.n).filter(n => !completedSteps.includes(n));
          const nextStep = undone[0] ?? null;
          return statusDefs.map(s => {
            const isDone = completedSteps.includes(s.n);
            const isCurrent = !isDone && s.n === nextStep;
            const hist = (c.statusHistory || []).filter(h => h.toStatus === s.n).pop();
            const customLabel = c.customStatusLabels?.[s.n] || s.label;
            return renderStatusStep(c, s, {
              isDone, isCurrent, histEntry: hist,
              onClickFn: `handleStepClick('${c.id}',${s.n},'${escHtml(customLabel)}','${c._viewCat||c.category}')`
            });
          }).join('');
        })()}
      </div>

      <!-- Special fields for sales status 5 (premiums) -->
      ${c.category === 'sales' && c.currentStatus >= 5 ? renderPremiumSection(c) : ''}

      <!-- To-do progress summary + branch routing -->
      ${(() => {
        const completedSteps = c.completedSteps || [];
        const allDone = statusDefs.length > 0 && statusDefs.every(s => completedSteps.includes(s.n));
        const latestDone = completedSteps.length > 0 ? Math.max(...completedSteps) : 0;
        const branchBtns = `
          ${c.category === 'sales' && completedSteps.includes(3) ? `
            <button class="btn btn-warning btn-sm" onclick="setStatusWithRemark('${c.id}',8)">📌 Move to KIV</button>` : ''}
          ${c.category === 'recruitment' && completedSteps.includes(3) ? `
            <div class="form-label mt-8">Candidate Decision</div>
            <textarea class="form-control mb-8" id="remarkInput" rows="2" placeholder="Add remark..."></textarea>
            <div class="btn-row">
              <button class="btn btn-warning btn-sm" onclick="setStatusWithRemark('${c.id}',4)">Consider →</button>
              <button class="btn btn-secondary btn-sm" onclick="setStatusWithRemark('${c.id}',6)">KIV →</button>
              <button class="btn btn-success btn-sm" onclick="setStatusWithRemark('${c.id}',5)">Agreed ✓</button>
            </div>` : ''}
          ${c.category === 'claims' && completedSteps.includes(5) ? `
            <div class="form-label mt-8">Claims Routing</div>
            <textarea class="form-control mb-8" id="remarkInput" rows="2" placeholder="Add remark..."></textarea>
            <div class="btn-row">
              <button class="btn btn-warning btn-sm" onclick="setStatusWithRemark('${c.id}',6)">Pending Memo →</button>
              <button class="btn btn-success btn-sm" onclick="setStatusWithRemark('${c.id}',10)">Completed ✓</button>
            </div>` : ''}
          ${c.category === 'servicing' && completedSteps.includes(4) ? `
            <div class="form-label mt-8">Servicing Routing</div>
            <textarea class="form-control mb-8" id="remarkInput" rows="2" placeholder="Add remark..."></textarea>
            <div class="btn-row">
              <button class="btn btn-warning btn-sm" onclick="setStatusWithRemark('${c.id}',5)">Pending Memo →</button>
              <button class="btn btn-success btn-sm" onclick="setStatusWithRemark('${c.id}',9)">Approved ✓</button>
            </div>` : ''}
        `;
        if (allDone) return `
          <div class="card mt-16" style="background:var(--green-light);border-color:var(--green)">
            <div class="card-body text-center">
              <div style="font-size:32px">🎉</div>
              <div class="fw-600" style="color:var(--green)">All steps completed!</div>
              ${c.category === 'sales' ? '<div class="text-sm text-muted mt-8">Consider cementing session and asking for referrals</div>' : ''}
            </div>
          </div>`;
        return branchBtns.trim() ? `<div class="card mt-16" style="background:var(--bg)"><div class="card-body">${branchBtns}</div></div>` : '';
      })()}
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
        <div class="info-row"><span class="info-label">NRIC</span><span class="info-value">${escHtml(contact.nric || '—')}</span></div>
        <div class="info-row"><span class="info-label">DOB</span><span class="info-value">${escHtml(contact.dob || '—')}</span></div>
        <div class="info-row"><span class="info-label">Occupation</span><span class="info-value">${escHtml(contact.occupation || '—')}</span></div>
        <button class="btn btn-secondary btn-sm mt-8" onclick="openEditContact('${contact.id}')">✏ Edit Contact</button>
      ` : ''}
      <div class="btn-row mt-16">
        <button class="btn btn-primary" onclick="saveRemarks('${c.id}')">Save Remarks</button>
      </div>
    </div>

    <!-- Reminders Tab -->
    <div id="tab-reminders" style="display:none">
      <div class="section-header">
        <div class="section-title">Set New Reminder</div>
      </div>
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
        <button class="btn btn-secondary btn-sm" onclick="setWorkingDayReminder('${c.id}', '${c.contactName}', '${c.category}', 7)">+7 Working Days</button>
        <button class="btn btn-secondary btn-sm" onclick="setWorkingDayReminder('${c.id}', '${c.contactName}', '${c.category}', 3)">+3 Days</button>
        <button class="btn btn-secondary btn-sm" onclick="setWorkingDayReminder('${c.id}', '${c.contactName}', '${c.category}', 5)">+5 Days</button>
        <button class="btn btn-primary" onclick="addCaseReminder('${c.id}','${c.contactName}','${c.category}')">Add Reminder</button>
      </div>
      <div class="section-divider">Existing Reminders</div>
      ${allRems.length === 0
        ? '<div class="empty-state" style="padding:20px 0"><div class="empty-state-icon">🔔</div><div class="empty-state-sub">No reminders set</div></div>'
        : allRems.map(r => renderReminderItem(r)).join('')
      }
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
            </div>`).join('')
        }
      </div>
    </div>

    <!-- WhatsApp Tab -->
    <div id="tab-whatsapp" style="display:none">
      ${renderWAScriptBox(c.category, c.currentStatus, c.contactName)}
    </div>
  `;
}

function renderPremiumSection(c) {
  return `
    <div class="section-divider">Premiums & Plans</div>
    <div class="premium-list" id="premiumList">
      ${(c.premiums || []).map((p, i) => `
        <div class="premium-row">
          <input class="form-control" placeholder="Plan name" value="${escHtml(p.plan||'')}" onchange="updatePremium('${c.id}',${i},'plan',this.value)" />
          <input class="form-control" placeholder="Amount (RM)" value="${escHtml(p.amount||'')}" onchange="updatePremium('${c.id}',${i},'amount',this.value)" />
          <input class="form-control" placeholder="Company" value="${escHtml(p.company||'')}" onchange="updatePremium('${c.id}',${i},'company',this.value)" />
          <button class="btn btn-danger btn-icon" onclick="removePremium('${c.id}',${i})">✕</button>
        </div>`).join('')}
    </div>
    <button class="btn btn-secondary btn-sm mt-8" onclick="addPremium('${c.id}')">+ Add Plan</button>
  `;
}

function addPremium(caseId) {
  const c = getCase(caseId);
  if (!c) return;
  const premiums = [...(c.premiums || []), { plan: '', amount: '', company: '' }];
  updateCase(caseId, { premiums });
  openSalesCase(caseId);
  setTimeout(() => switchTabById('tab-progress'), 50);
}

function removePremium(caseId, idx) {
  const c = getCase(caseId);
  if (!c) return;
  const premiums = (c.premiums || []).filter((_, i) => i !== idx);
  updateCase(caseId, { premiums });
  openSalesCase(caseId);
  setTimeout(() => switchTabById('tab-progress'), 50);
}

function updatePremium(caseId, idx, field, val) {
  const c = getCase(caseId);
  if (!c) return;
  const premiums = [...(c.premiums || [])];
  if (premiums[idx]) premiums[idx] = { ...premiums[idx], [field]: val };
  updateCase(caseId, { premiums });
}

/* ---------- SHARED CASE ACTIONS ---------- */
function advanceStatus(caseId) {
  const remark = document.getElementById('remarkInput')?.value || '';
  const c = advanceCaseStatus(caseId, remark);
  if (!c) return;
  checkAutoReminder(c);
  checkAutoTransfer(c);
  showToast(`Moved to: ${getStatusLabel(c.category, c.currentStatus)}`, 'success');
  playSuccess();
  closeCaseModalBtn();
  setTimeout(() => { openCaseById(caseId); updateBadges(); }, 50);
  renderCurrentPage();
}

function advanceStatusWithRemark(caseId) {
  advanceStatus(caseId);
}

function goBackStatus(caseId) {
  const c = getCase(caseId);
  if (!c || c.currentStatus <= 1) return;
  setStatus(caseId, c.currentStatus - 1, 'Moved back');
  showToast('Moved back one step', 'info');
  playClick();
  closeCaseModalBtn();
  setTimeout(() => { openCaseById(caseId); updateBadges(); }, 50);
  renderCurrentPage();
}

function setStatusFromStep(caseId, status) {
  const c = getCase(caseId);
  if (!c) return;
  if (status === c.currentStatus) return;
  setStatus(caseId, status);
  showToast(`Status set to: ${getStatusLabel(c.category, status)}`, 'success');
  playSuccess();
  closeCaseModalBtn();
  setTimeout(() => { openCaseById(caseId); updateBadges(); }, 50);
  renderCurrentPage();
}

function setStatusWithRemark(caseId, status) {
  const remark = document.getElementById('remarkInput')?.value || '';
  const c = setStatus(caseId, status, remark);
  if (!c) return;
  checkAutoReminder(c);
  checkAutoTransfer(c);
  showToast(`Moved to: ${getStatusLabel(c.category, status)}`, 'success');
  playSuccess();
  closeCaseModalBtn();
  setTimeout(() => { openCaseById(caseId); updateBadges(); }, 50);
  renderCurrentPage();
}

function checkAutoReminder(c) {
  const defs = getStatusDef(c.category);
  const def = defs.find(d => d.n === c.currentStatus);
  if (!def) return;
  if (def.autoReminder) {
    const remDate = workingDaysReminder(new Date(), def.autoReminder);
    addReminder({
      caseId: c.id, contactId: c.contactId, contactName: c.contactName,
      category: c.category,
      title: `Follow up: ${def.label} — ${c.contactName}`,
      date: remDate
    });
    showToast(`Reminder set for ${def.autoReminder} working days`, 'info');
  }
  // For KIV in sales
  if (c.category === 'sales' && c.currentStatus === 8) {
    updateCase(c.id, { kiv: true });
  }
  if (c.category === 'recruitment' && c.currentStatus === 6) {
    updateCase(c.id, { kiv: true });
  }
  if (c.category === 'snapwill' && c.currentStatus === 6) {
    updateCase(c.id, { kiv: true });
  }
}

function checkAutoTransfer(c) {
  // Recruitment status 5 → create onboarding case
  if (c.category === 'recruitment' && c.currentStatus === 5) {
    const existing = getCases('onboarding').find(o => o.contactId === c.contactId);
    if (!existing) {
      createCase({
        contactId: c.contactId, contactName: c.contactName,
        category: 'onboarding', currentStatus: 1,
        statusHistory: [{ fromStatus: 0, toStatus: 1, remark: 'Auto-created from recruitment', date: new Date().toISOString() }]
      });
      showToast(`${c.contactName} moved to Onboarding!`, 'success');
    }
  }
}

function togglePriority(caseId) {
  const c = getCase(caseId);
  if (!c) return;
  updateCase(caseId, { priority: !c.priority });
  playClick();
  closeCaseModalBtn();
  setTimeout(() => { openCaseById(caseId); updateBadges(); }, 50);
  renderCurrentPage();
}

function editCase(caseId) {
  const c = getCase(caseId);
  if (!c) return;
  document.getElementById('modalTitle').textContent = 'Edit Case';
  document.getElementById('modalBody').innerHTML = renderNewCaseForm(c.category, c);
  openModal('caseModal');
}

async function deleteCaseConfirm(caseId) {
  const c = getCase(caseId);
  if (!c) return;
  const ok = await showConfirm('Delete Case', `Delete case for ${c.contactName}? This cannot be undone.`, 'Delete');
  if (!ok) return;
  deleteCase(caseId);
  playDelete();
  showToast('Case deleted', 'info');
  closeCaseModalBtn();
  updateBadges();
  renderCurrentPage();
}

function saveRemarks(caseId) {
  const remarks = document.getElementById('remarksEdit')?.value || '';
  updateCase(caseId, { remarks });
  showToast('Remarks saved', 'success');
  playSuccess();
}

function addCaseReminder(caseId, contactName, category) {
  const title = document.getElementById('rem_title')?.value?.trim();
  const date = document.getElementById('rem_date')?.value;
  if (!title || !date) { showToast('Please fill in reminder title and date', 'error'); return; }
  addReminder({ caseId, contactName, category, title, date });
  showToast('Reminder added!', 'success');
  playSuccess();
  closeCaseModalBtn();
  setTimeout(() => { openCaseById(caseId); switchTabById('tab-reminders'); }, 50);
}

function setWorkingDayReminder(caseId, contactName, category, days) {
  const date = workingDaysReminder(new Date(), days);
  document.getElementById('rem_date').value = date;
  const statusLabel = getStatusLabel(category, getCase(caseId)?.currentStatus || 1);
  document.getElementById('rem_title').value = `Follow up: ${statusLabel} — ${contactName}`;
  playClick();
}

/* ---------- TAB SWITCHING ---------- */
function switchTab(btn, tabId) {
  const modal = btn.closest('.modal') || document;
  modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const tabs = modal.querySelectorAll('[id^="tab-"]');
  tabs.forEach(t => t.style.display = 'none');
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';
  playClick();
}

function switchTabById(tabId) {
  const target = document.getElementById(tabId);
  if (!target) return;
  const modal = target.closest('.modal') || document;
  modal.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(tabId));
  });
  modal.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display = 'none');
  target.style.display = 'block';
}

function emptyState(icon, title, sub) {
  return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><div class="empty-state-title">${title}</div><div class="empty-state-sub">${sub}</div></div>`;
}
