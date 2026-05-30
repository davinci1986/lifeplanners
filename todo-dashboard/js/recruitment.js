/* ============================================
   Recruitment Module
   ============================================ */

let recruitFilter = { status: 'all' };

function renderRecruitment() {
  document.getElementById('pageTitle').textContent = 'Recruitment';
  const cases = getCases('recruitment');
  const stats = getCategoryStats('recruitment');
  const filtered = cases.filter(c => {
    if (recruitFilter.status !== 'all' && c.currentStatus !== recruitFilter.status) return false;
    return true;
  });

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#F3E8FD">👥</div><div class="stat-num" style="color:var(--purple)">${cases.length}</div><div class="stat-label">Total Prospects</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">⚡</div><div class="stat-num" style="color:var(--blue)">${stats.active}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">🤝</div><div class="stat-num" style="color:var(--green)">${cases.filter(c=>c.currentStatus===5).length}</div><div class="stat-label">Agreed</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--yellow-light)">📌</div><div class="stat-num" style="color:#B8860B">${stats.kivCount}</div><div class="stat-label">KIV</div></div>
    </div>

    <div class="flex items-center justify-between mb-12" style="flex-wrap:wrap;gap:8px">
      <div class="filter-bar" style="margin-bottom:0;flex-wrap:wrap">
        <span class="filter-chip ${recruitFilter.status==='all'?'active':''}" onclick="setRecruitFilter('status','all')">All</span>
        ${STATUS_DEFS.recruitment.map(s => `<span class="filter-chip ${recruitFilter.status==s.n?'active':''}" onclick="setRecruitFilter('status',${s.n})">${s.label}</span>`).join('')}
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
  const baseDetail = renderCaseDetail(c, contact);
  // Add program selection for status 5
  if (c.currentStatus >= 5) {
    return baseDetail.replace('</div>\n    </div>\n\n    <!-- Remarks Tab -->', `
      <div class="section-divider">Programs Agreed</div>
      <div class="flex gap-8 mb-8" style="flex-wrap:wrap">
        ${['RintiZ', 'Next Gen Millionaire', 'Next Gen Leader'].map(prog => `
          <label class="checkbox-wrap">
            <input type="checkbox" ${(c.recruitPrograms||[]).includes(prog)?'checked':''}
              onchange="toggleProgram('${c.id}','${prog}',this.checked)">
            ${prog}
          </label>`).join('')}
      </div>
    </div>
    </div>

    <!-- Remarks Tab -->`);
  }
  return baseDetail;
}

function toggleProgram(caseId, prog, checked) {
  const c = getCase(caseId);
  if (!c) return;
  const programs = new Set(c.recruitPrograms || []);
  if (checked) programs.add(prog); else programs.delete(prog);
  updateCase(caseId, { recruitPrograms: [...programs] });
  playClick();
}
