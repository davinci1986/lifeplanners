/* ============================================
   Will Referral Network (MLM-style downline)
   - Each person named in a will (executor, beneficiary,
     guardian, witness, other) becomes a CRM contact with
     referredBy = will owner. The referredBy chain IS the tree.
   ============================================ */

const REFERRAL_ROLES = [
  { key: 'executor',             label: 'Executor',             emoji: '⚖️', color: '#2563EB' },
  { key: 'replacement_executor', label: 'Replacement Executor', emoji: '⚖️', color: '#60A5FA' },
  { key: 'beneficiary',          label: 'Beneficiary',          emoji: '🎁', color: '#16A34A' },
  { key: 'guardian',             label: 'Guardian',             emoji: '🛡️', color: '#D97706' },
  { key: 'replacement_guardian', label: 'Replacement Guardian', emoji: '🛡️', color: '#FBBF24' },
  { key: 'witness',              label: 'Witness',              emoji: '✍️', color: '#7C3AED' },
  { key: 'other',                label: 'Other Referral',       emoji: '👤', color: '#6B7280' }
];

const REFERRAL_STATUSES = [
  { key: 'named',       label: 'Named',          color: '#6B7280' },
  { key: 'contacted',   label: 'Contacted',      color: '#2563EB' },
  { key: 'appointment', label: 'Appointment',    color: '#D97706' },
  { key: 'client',      label: 'Client',         color: '#16A34A' },
  { key: 'declined',    label: 'Not Interested', color: '#DC2626' }
];

function roleMeta(key) { return REFERRAL_ROLES.find(r => r.key === key) || REFERRAL_ROLES[6]; }
function refStatusMeta(key) { return REFERRAL_STATUSES.find(s => s.key === key) || REFERRAL_STATUSES[0]; }

/* ---------- Data helpers ---------- */
function getDirectReferrals(contactId) {
  return getContacts().filter(c => c.referredBy === contactId);
}
function getReferralsForCase(caseId) {
  return getContacts().filter(c => c.referralCaseId === caseId);
}
function countDownline(contactId, seen) {
  seen = seen || new Set();
  let total = 0;
  for (const child of getDirectReferrals(contactId)) {
    if (seen.has(child.id)) continue;
    seen.add(child.id);
    total += 1 + countDownline(child.id, seen);
  }
  return total;
}
function getAllReferrals() {
  // any contact that was named in a will
  return getContacts().filter(c => c.referredBy && c.referralType === 'snapwill');
}

/* ---------- Capture (used inside a Snapwill case) ---------- */
function renderWillReferralSection(caseId, ownerContactId) {
  const refs = getReferralsForCase(caseId);
  const roleOpts = REFERRAL_ROLES.map(r => `<option value="${r.key}">${r.emoji} ${r.label}</option>`).join('');

  const rows = refs.length === 0
    ? `<div class="text-sm text-muted" style="padding:8px 0">No referrals captured yet. Add the people named in this will below.</div>`
    : refs.map(r => {
        const rm = roleMeta(r.referralRole);
        const sm = refStatusMeta(r.referralStatus || 'named');
        const wa = r.phone ? r.phone.replace(/\D/g, '') : '';
        const downline = countDownline(r.id);
        const statusSel = REFERRAL_STATUSES.map(s => `<option value="${s.key}" ${s.key === (r.referralStatus || 'named') ? 'selected' : ''}>${s.label}</option>`).join('');
        return `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span title="${rm.label}" style="font-size:15px">${rm.emoji}</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:13px">${escHtml(r.name)}${r.referralRelationship ? ` <span style="font-weight:400;color:var(--text-muted)">· ${escHtml(r.referralRelationship)}</span>` : ''}</div>
            <div style="font-size:11px;color:var(--text-muted)">${rm.label}${r.phone ? ' · ' + escHtml(r.phone) : ''}${downline ? ' · ' + downline + ' downline' : ''}</div>
          </div>
          <select class="form-control" style="width:auto;font-size:11px;padding:3px 6px" onchange="updateReferralStatus('${r.id}','${caseId}',this.value)">${statusSel}</select>
          ${wa ? `<a class="btn btn-secondary btn-sm" href="https://wa.me/6${wa}" target="_blank" title="WhatsApp" onclick="event.stopPropagation()">📱</a>` : ''}
          <button class="btn btn-secondary btn-sm" title="Remove" onclick="removeReferralPerson('${r.id}','${caseId}')">✕</button>
        </div>`;
      }).join('');

  return `
    <div class="section-divider">Will Referrals <small style="color:var(--text-muted)">(${refs.length})</small></div>
    <div id="willRefList">${rows}</div>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px;margin-top:10px">
      <div class="form-row mb-8">
        <div class="form-group mb-0"><label class="form-label">Role</label><select class="form-control" id="ref_role">${roleOpts}</select></div>
        <div class="form-group mb-0"><label class="form-label">Name</label><input class="form-control" id="ref_name" placeholder="Full name" /></div>
      </div>
      <div class="form-row mb-8">
        <div class="form-group mb-0"><label class="form-label">Phone</label><input class="form-control" id="ref_phone" placeholder="01x-xxxxxxx" /></div>
        <div class="form-group mb-0"><label class="form-label">Relationship</label><input class="form-control" id="ref_rel" placeholder="e.g. spouse, son, friend" /></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="addReferralFromForm('${caseId}','${ownerContactId}')">+ Add Referral</button>
    </div>
  `;
}

function addReferralFromForm(caseId, ownerContactId) {
  const name = document.getElementById('ref_name')?.value?.trim();
  if (!name) { showToast('Enter a name', 'warning'); return; }
  const role = document.getElementById('ref_role')?.value || 'other';
  const phone = document.getElementById('ref_phone')?.value?.trim() || '';
  const rel = document.getElementById('ref_rel')?.value?.trim() || '';

  createContact({
    name, phone,
    referredBy: ownerContactId,
    referralRole: role,
    referralStatus: 'named',
    referralType: 'snapwill',
    referralCaseId: caseId,
    referralRelationship: rel,
    referralSource: 'Will referral',
    tags: ['will-referral']
  });
  showToast('Referral added', 'success');
  if (typeof playSuccess === 'function') playSuccess();
  openSnapwillCase(caseId); // re-render the case modal with the new referral
}

function updateReferralStatus(contactId, caseId, status) {
  updateContact(contactId, { referralStatus: status });
  if (typeof playClick === 'function') playClick();
}

async function removeReferralPerson(contactId, caseId) {
  const ok = await showConfirm('Remove referral?', 'This deletes the contact and unlinks any of their own downline referrals.', 'Remove');
  if (!ok) return;
  // unlink children so they aren't orphaned/deleted
  getDirectReferrals(contactId).forEach(child => updateContact(child.id, { referredBy: '' }));
  deleteContact(contactId);
  showToast('Referral removed', 'success');
  openSnapwillCase(caseId);
}

/* ============================================
   PAGE: Referral Network (dashboard + tree + 3D)
   ============================================ */
let _refView = 'tree';

function renderReferralNetwork() {
  document.getElementById('pageTitle').textContent = 'Referral Network';
  const refs = getAllReferrals();

  // stats
  const byStatus = {};
  REFERRAL_STATUSES.forEach(s => byStatus[s.key] = 0);
  refs.forEach(r => { byStatus[r.referralStatus || 'named'] = (byStatus[r.referralStatus || 'named'] || 0) + 1; });
  const clients = byStatus.client || 0;
  const conv = refs.length ? Math.round((clients / refs.length) * 100) : 0;

  const byRole = {};
  REFERRAL_ROLES.forEach(r => byRole[r.key] = 0);
  refs.forEach(r => { byRole[r.referralRole] = (byRole[r.referralRole] || 0) + 1; });

  // top referrers (will owners with most direct referrals)
  const referrerIds = [...new Set(refs.map(r => r.referredBy))].filter(Boolean);
  const topReferrers = referrerIds.map(id => {
    const owner = getContact(id);
    return { owner, name: owner ? owner.name : '(unknown)', direct: getDirectReferrals(id).length, total: countDownline(id) };
  }).sort((a, b) => b.total - a.total).slice(0, 8);

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#EDE9FE">🌐</div><div class="stat-num" style="color:#7C3AED">${refs.length}</div><div class="stat-label">Total Referrals</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">📞</div><div class="stat-num" style="color:var(--blue)">${(byStatus.contacted||0)+(byStatus.appointment||0)}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">✅</div><div class="stat-num" style="color:var(--green)">${clients}</div><div class="stat-label">Converted</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--yellow-light)">📈</div><div class="stat-num" style="color:#B8860B">${conv}%</div><div class="stat-label">Conversion</div></div>
    </div>

    <div class="flex items-center justify-between mb-12" style="flex-wrap:wrap;gap:8px">
      <div class="filter-bar" style="margin-bottom:0">
        <span class="filter-chip ${_refView==='tree'?'active':''}" onclick="setRefView('tree')">🌳 Tree</span>
        <span class="filter-chip ${_refView==='3d'?'active':''}" onclick="setRefView('3d')">🌐 3D Network</span>
        <span class="filter-chip ${_refView==='roles'?'active':''}" onclick="setRefView('roles')">📊 By Role</span>
      </div>
    </div>

    <div id="refViewArea"></div>
  `;
  renderRefView(refs, byRole, topReferrers);
}

function setRefView(v) { _refView = v; renderReferralNetwork(); if (typeof playClick==='function') playClick(); }

function renderRefView(refs, byRole, topReferrers) {
  const area = document.getElementById('refViewArea');
  if (!area) return;
  if (refs.length === 0) {
    area.innerHTML = emptyState('🌐', 'No referrals yet', 'Open a Snapwill case → Will Referrals to add the people named in a will.');
    return;
  }
  if (_refView === 'tree') {
    const roots = [...new Set(refs.map(r => r.referredBy))].filter(Boolean)
      .map(id => getContact(id)).filter(Boolean)
      // only top-level owners (their own referredBy is empty or not a will-referral)
      .filter(o => !o.referredBy);
    const seen = new Set();
    area.innerHTML = `
      <div style="margin-bottom:12px"><div class="section-title">Genealogy Tree</div></div>
      <div style="overflow-x:auto">${roots.map(r => renderTreeNode(r, 0, seen)).join('') || '<div class="text-sm text-muted">No top-level will owners found.</div>'}</div>
    `;
  } else if (_refView === '3d') {
    area.innerHTML = `
      <div class="text-sm text-muted mb-8">Drag to rotate · scroll to zoom · click a node to focus. Colour = role, size = downline.</div>
      <div id="ref3d" style="height:62vh;border:1px solid var(--border);border-radius:12px;background:#0b1020;overflow:hidden"></div>`;
    load3DNetwork(refs);
  } else {
    // by role
    area.innerHTML = `<div class="card"><div class="card-body">
      ${REFERRAL_ROLES.map(r => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:16px">${r.emoji}</span>
          <span style="flex:1;font-weight:600">${r.label}</span>
          <span style="font-weight:700;color:${r.color}">${byRole[r.key] || 0}</span>
        </div>`).join('')}
    </div></div>
    <div class="section-header mt-20"><div class="section-title">Top Referrers</div></div>
    <div class="card"><div class="card-body">
      ${topReferrers.length ? topReferrers.map((t, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="width:22px;color:var(--text-muted)">#${i+1}</span>
          <span style="flex:1;font-weight:600">${escHtml(t.name)}</span>
          <span class="text-sm text-muted">${t.direct} direct</span>
          <span style="font-weight:700;color:#7C3AED">${t.total} total</span>
        </div>`).join('') : '<div class="text-sm text-muted">No referrers yet.</div>'}
    </div></div>`;
  }
}

function renderTreeNode(contact, depth, seen) {
  if (!contact || seen.has(contact.id)) return '';
  seen.add(contact.id);
  const children = getDirectReferrals(contact.id);
  const rm = contact.referralRole ? roleMeta(contact.referralRole) : null;
  const sm = contact.referralStatus ? refStatusMeta(contact.referralStatus) : null;
  const indent = depth * 22;
  const node = `
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0;margin-left:${indent}px">
      ${depth > 0 ? '<span style="color:var(--text-muted)">└─</span>' : '<span style="font-size:14px">👑</span>'}
      ${rm ? `<span title="${rm.label}">${rm.emoji}</span>` : ''}
      <span style="font-weight:${depth===0?'700':'600'};font-size:13px;cursor:pointer" onclick="openContact('${contact.id}')">${escHtml(contact.name)}</span>
      ${rm ? `<span style="font-size:10px;background:${rm.color}22;color:${rm.color};padding:1px 7px;border-radius:10px">${rm.label}</span>` : ''}
      ${sm ? `<span style="font-size:10px;color:${sm.color}">● ${sm.label}</span>` : ''}
      ${children.length ? `<span class="text-sm text-muted">(${children.length})</span>` : ''}
    </div>`;
  return node + children.map(ch => renderTreeNode(ch, depth + 1, seen)).join('');
}

/* ---------- 3D network (lazy-load 3d-force-graph) ---------- */
function load3DNetwork(refs) {
  const build = () => buildRef3D(refs);
  if (window.ForceGraph3D) { build(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/3d-force-graph';
  s.onload = build;
  s.onerror = () => { const el = document.getElementById('ref3d'); if (el) el.innerHTML = '<div style="color:#fff;padding:20px">Could not load 3D library (offline?). Use the Tree view.</div>'; };
  document.head.appendChild(s);
}

function buildRef3D(refs) {
  const el = document.getElementById('ref3d');
  if (!el || !window.ForceGraph3D) return;

  // nodes = referrers + referred; links = referredBy → child
  const ids = new Set();
  const nodes = [];
  const links = [];
  const add = (c) => {
    if (!c || ids.has(c.id)) return;
    ids.add(c.id);
    const rm = c.referralRole ? roleMeta(c.referralRole) : { color: '#A78BFA', label: 'Will Owner' };
    nodes.push({ id: c.id, name: c.name + (c.referralRole ? ' (' + roleMeta(c.referralRole).label + ')' : ' — Owner'), color: rm.color, val: 1 + countDownline(c.id) });
  };
  refs.forEach(r => {
    const owner = getContact(r.referredBy);
    add(owner); add(r);
    if (owner) links.push({ source: owner.id, target: r.id });
  });

  el.innerHTML = '';
  const Graph = window.ForceGraph3D()(el)
    .width(el.clientWidth)
    .height(el.clientHeight)
    .backgroundColor('#0b1020')
    .graphData({ nodes, links })
    .nodeLabel('name')
    .nodeColor('color')
    .nodeVal('val')
    .nodeOpacity(0.95)
    .linkColor(() => 'rgba(255,255,255,0.25)')
    .linkWidth(0.6)
    .linkDirectionalParticles(2)
    .linkDirectionalParticleSpeed(0.006)
    .onNodeClick(node => {
      const distance = 90;
      const r = 1 + (node.x*node.x + node.y*node.y + node.z*node.z) ** 0.5 || 1;
      const ratio = 1 + distance / r;
      Graph.cameraPosition({ x: node.x * ratio, y: node.y * ratio, z: node.z * ratio }, node, 1200);
    });
}
