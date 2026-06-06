/* ============================================
   Claims Module
   ============================================ */

let claimsFilter = { status: 'all', label: 'all' };

function renderClaims() {
  document.getElementById('pageTitle').textContent = 'Claims';
  const cases = getCases('claims');
  const stats = getCategoryStats('claims');

  const labelDefs = getLabelDefs('claims');
  const filtered = cases.filter(c => {
    if (claimsFilter.status !== 'all' && c.currentStatus !== claimsFilter.status) return false;
    if (claimsFilter.label !== 'all' && c.label !== claimsFilter.label) return false;
    return true;
  });

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#FFF3E0">📋</div><div class="stat-num" style="color:var(--orange)">${cases.length}</div><div class="stat-label">Total Claims</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">⚡</div><div class="stat-num" style="color:var(--blue)">${stats.active}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">✅</div><div class="stat-num" style="color:var(--green)">${cases.filter(c=>c.currentStatus===10).length}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--red-light)">🔔</div><div class="stat-num" style="color:var(--red)">${stats.dueReminders}</div><div class="stat-label">Due Reminders</div></div>
    </div>

    <div class="flex items-center justify-between mb-12" style="flex-wrap:wrap;gap:8px">
      <div class="filter-bar" style="margin-bottom:0;flex-wrap:wrap">
        <span class="text-xs text-muted fw-600" style="align-self:center">LABEL:</span>
        <span class="filter-chip ${claimsFilter.label==='all'?'active':''}" onclick="setClaimsFilter('label','all')">All</span>
        ${labelDefs.map(l => `<span class="filter-chip ${claimsFilter.label===l.id?'active':''}" onclick="setClaimsFilter('label','${l.id}')">${l.id} ${l.label}</span>`).join('')}
      </div>
      <button class="btn btn-primary" onclick="openNewCase('claims')">+ New Claim</button>
    </div>
    <div class="filter-bar mb-16" style="flex-wrap:wrap">
      <span class="text-xs text-muted fw-600" style="align-self:center">STATUS:</span>
      <span class="filter-chip ${claimsFilter.status==='all'?'active':''}" onclick="setClaimsFilter('status','all')">All</span>
      ${STATUS_DEFS.claims.map(s => `<span class="filter-chip ${claimsFilter.status==s.n?'active':''}" onclick="setClaimsFilter('status',${s.n})">${s.n}. ${s.label}</span>`).join('')}
    </div>

    <div class="section-header">
      <div class="section-title">Claims <small>${filtered.length} shown</small></div>
    </div>
    ${filtered.length === 0
      ? emptyState('📋', 'No claims', 'Add a new claim to get started')
      : `<div class="case-list">${filtered.map(c => renderCaseRow(c, 'openClaimsCase')).join('')}</div>`
    }
  `;
}

function setClaimsFilter(key, val) {
  claimsFilter[key] = val; playClick(); renderClaims();
}

function openNewCase(category) {
  playClick();
  document.getElementById('modalTitle').textContent = `New ${catMeta(category).label} Case`;
  document.getElementById('modalSubtitle').textContent = '';
  document.getElementById('modalBody').innerHTML = renderNewCaseForm(category);
  openModal('caseModal');
}

function openClaimsCase(id) {
  const c = getCase(id);
  if (!c) return;
  playClick();
  const contact = getContact(c.contactId);
  document.getElementById('modalTitle').textContent = c.contactName || 'Claims Case';
  document.getElementById('modalSubtitle').textContent = `Claims • ${getLabelName('claims', c.label)} • ${formatDate(c.createdAt)}`;
  document.getElementById('modalBody').innerHTML = renderCaseDetail(buildViewCase(c, 'claims'), contact);
  openModal('caseModal');
}
