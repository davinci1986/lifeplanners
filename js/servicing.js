/* ============================================
   Servicing Module
   ============================================ */

let servicingFilter = { status: 'all', label: 'all' };

function renderServicing() {
  document.getElementById('pageTitle').textContent = 'Servicing';
  const cases = getCases('servicing');
  const stats = getCategoryStats('servicing');
  const labelDefs = getLabelDefs('servicing');
  const filtered = cases.filter(c => {
    if (servicingFilter.status !== 'all' && c.currentStatus !== servicingFilter.status) return false;
    if (servicingFilter.label !== 'all' && c.label !== servicingFilter.label) return false;
    return true;
  });

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">⚙️</div><div class="stat-num" style="color:var(--green)">${cases.length}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">⚡</div><div class="stat-num" style="color:var(--blue)">${stats.active}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">✅</div><div class="stat-num" style="color:var(--green)">${cases.filter(c=>c.currentStatus===9).length}</div><div class="stat-label">Approved</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--red-light)">🔔</div><div class="stat-num" style="color:var(--red)">${stats.dueReminders}</div><div class="stat-label">Due Reminders</div></div>
    </div>

    <div class="flex items-center justify-between mb-12" style="flex-wrap:wrap;gap:8px">
      <div class="filter-bar" style="margin-bottom:0;flex-wrap:wrap">
        <span class="filter-chip ${servicingFilter.label==='all'?'active':''}" onclick="setServicingFilter('label','all')">All Types</span>
        ${labelDefs.map(l => `<span class="filter-chip ${servicingFilter.label===l.id?'active':''}" onclick="setServicingFilter('label','${l.id}')">${l.id} ${l.label}</span>`).join('')}
      </div>
      <button class="btn btn-primary" onclick="openNewCase('servicing')">+ New Request</button>
    </div>

    <div class="filter-bar mb-16" style="flex-wrap:wrap">
      <span class="filter-chip ${servicingFilter.status==='all'?'active':''}" onclick="setServicingFilter('status','all')">All Status</span>
      ${STATUS_DEFS.servicing.map(s => `<span class="filter-chip ${servicingFilter.status==s.n?'active':''}" onclick="setServicingFilter('status',${s.n})">${s.n}. ${s.label}</span>`).join('')}
    </div>

    <div class="section-header">
      <div class="section-title">Servicing Cases <small>${filtered.length} shown</small></div>
    </div>
    ${filtered.length === 0
      ? emptyState('⚙️', 'No servicing requests', 'Add a new request to get started')
      : `<div class="case-list">${filtered.map(c => renderCaseRow(c, 'openServicingCase')).join('')}</div>`
    }
  `;
}

function setServicingFilter(key, val) {
  servicingFilter[key] = val; playClick(); renderServicing();
}

function openServicingCase(id) {
  const c = getCase(id);
  if (!c) return;
  playClick();
  const contact = getContact(c.contactId);
  document.getElementById('modalTitle').textContent = c.contactName || 'Servicing Case';
  document.getElementById('modalSubtitle').textContent = `Servicing • ${c.label || ''} • ${formatDate(c.createdAt)}`;
  document.getElementById('modalBody').innerHTML = renderCaseDetail({...c, category:'servicing'}, contact);
  openModal('caseModal');
}
