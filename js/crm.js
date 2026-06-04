/* ============================================
   CRM Module
   ============================================ */

let crmSearch = '';
let crmTab = 'contacts'; // 'contacts' | 'blast'

function renderCRM() {
  document.getElementById('pageTitle').textContent = 'CRM Contacts';
  const contacts = getContacts();
  const filtered = crmSearch.length >= 2 ? searchContacts(crmSearch) : contacts;

  document.getElementById('content').innerHTML = `
    <div class="tab-bar mb-16" style="border-bottom:1px solid var(--border)">
      <button class="tab-btn ${crmTab==='contacts'?'active':''}" onclick="switchCRMTab('contacts')">👥 Contacts (${contacts.length})</button>
      <button class="tab-btn ${crmTab==='blast'?'active':''}" onclick="switchCRMTab('blast')">📱 Bulk WhatsApp</button>
    </div>

    <div id="crm-contacts-panel" style="display:${crmTab==='contacts'?'block':'none'}">
      <div class="stats-grid mb-20">
        <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">👥</div><div class="stat-num" style="color:var(--blue)">${contacts.length}</div><div class="stat-label">Total Contacts</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">📈</div><div class="stat-num" style="color:var(--green)">${contacts.filter(c=>getCasesForContact(c.id).some(x=>x.category==='sales')).length}</div><div class="stat-label">With Sales</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#F3E8FD">👤</div><div class="stat-num" style="color:var(--purple)">${contacts.filter(c=>getCasesForContact(c.id).some(x=>x.category==='recruitment'||x.category==='onboarding')).length}</div><div class="stat-label">Agents</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#FFE5EA">🎂</div><div class="stat-num" style="color:var(--pink)">${getUpcomingBirthdays(30).length}</div><div class="stat-label">Birthdays (30d)</div></div>
      </div>
      <div class="flex items-center justify-between mb-16" style="flex-wrap:wrap;gap:8px">
        <div class="search-bar" style="width:300px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search contacts..." value="${escHtml(crmSearch)}" oninput="crmSearch=this.value;renderCRM()" />
        </div>
        <div class="flex gap-8">
          <button class="btn btn-secondary" onclick="exportToExcel()" title="Export all CRM data to Excel">📥 Export Excel</button>
          <button class="btn btn-primary" onclick="openNewContact()">+ New Contact</button>
        </div>
      </div>
      ${filtered.length === 0
        ? emptyState('👥', 'No contacts', crmSearch ? 'No results found' : 'Add your first contact')
        : `<div class="grid-auto">${filtered.map(c => renderContactCard(c)).join('')}</div>`}
    </div>

    <div id="crm-blast-panel" style="display:${crmTab==='blast'?'block':'none'}">
      ${renderBulkWhatsApp()}
    </div>
  `;
}

function switchCRMTab(tab) {
  crmTab = tab;
  renderCRM();
  playClick();
}

function getUpcomingBirthdays(days) {
  const today = new Date(); today.setHours(0,0,0,0);
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + days);
  return getContacts().filter(c => {
    if (!c.dob) return false;
    const dob = new Date(c.dob);
    if (isNaN(dob.getTime())) return false;
    // Set birthday to this year
    const bday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (bday < today) bday.setFullYear(today.getFullYear() + 1);
    return bday <= cutoff;
  });
}

function renderContactCard(contact) {
  const cases = getCasesForContact(contact.id);
  const cats = [...new Set(cases.map(c => c.category))];
  const upcomingBday = (() => {
    if (!contact.dob) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const dob = new Date(contact.dob);
    const bday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (bday < today) bday.setFullYear(today.getFullYear() + 1);
    const diff = Math.round((bday - today) / 86400000);
    return diff <= 30 ? diff : null;
  })();
  return `
    <div class="contact-card" onclick="openContact('${contact.id}')">
      <div class="contact-avatar" style="background:${getAvatarColor(contact.name)}">${getInitials(contact.name)}</div>
      <div class="contact-name">${escHtml(contact.name)}</div>
      ${contact.phone ? `<div class="contact-phone">📱 ${escHtml(contact.phone)}</div>` : ''}
      ${contact.email ? `<div class="contact-phone">✉️ ${escHtml(contact.email)}</div>` : ''}
      ${contact.stayArea ? `<div class="contact-phone" style="font-size:11px">📍 ${escHtml(contact.stayArea)}${contact.state?', '+escHtml(contact.state):''}</div>` : ''}
      ${upcomingBday !== null ? `<div style="font-size:11px;color:var(--pink);margin-top:2px">🎂 Birthday in ${upcomingBday === 0 ? 'Today!' : upcomingBday + 'd'}</div>` : ''}
      <div class="contact-cases">
        ${cats.map(cat => `<span class="contact-case-chip" style="background:${catMeta(cat).bg};color:${catMeta(cat).color}">${catMeta(cat).icon} ${catMeta(cat).label}</span>`).join('')}
      </div>
      ${contact.tags?.length > 0 ? `<div class="contact-tags">${contact.tags.map(t=>`<span class="contact-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="text-xs text-muted mt-8">${cases.length} case${cases.length!==1?'s':''} • Added ${formatDate(contact.createdAt)}</div>
    </div>`;
}

function openContact(id) {
  const contact = getContact(id);
  if (!contact) return;
  playClick();
  const cases = getCasesForContact(id);
  document.getElementById('contactModalTitle').textContent = contact.name;
  document.getElementById('contactModalBody').innerHTML = renderContactDetail(contact, cases);
  openModal('contactModal');
}

function renderContactDetail(contact, cases) {
  const catGroups = {};
  cases.forEach(c => {
    if (!catGroups[c.category]) catGroups[c.category] = [];
    catGroups[c.category].push(c);
  });
  const age = contact.dob ? ageFromDOB(contact.dob) : null;

  const fieldRow = (label, val) => val ? `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${escHtml(val)}</span></div>` : '';

  return `
    <div class="flex items-center gap-12 mb-16">
      <div class="contact-avatar" style="background:${getAvatarColor(contact.name)};width:56px;height:56px;font-size:22px">${getInitials(contact.name)}</div>
      <div style="flex:1">
        <div class="fw-700" style="font-size:18px">${escHtml(contact.name)}</div>
        ${contact.race || contact.langPref ? `<div class="text-sm text-muted">${[contact.race, contact.langPref].filter(Boolean).join(' • ')}</div>` : ''}
        <div class="text-muted text-sm">Added ${formatDate(contact.createdAt)}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="openEditContact('${contact.id}')">✏ Edit</button>
    </div>

    <div class="info-row">
      <span class="info-label">Phone</span>
      <span class="info-value">${escHtml(contact.phone||'—')} ${contact.phone ? `<a href="https://wa.me/6${contact.phone.replace(/\D/g,'')}" target="_blank" style="color:var(--green);font-size:12px;margin-left:8px">📱 WhatsApp</a>` : ''}</span>
    </div>
    ${fieldRow('Email', contact.email)}
    <div class="info-row">
      <span class="info-label">Date of Birth</span>
      <span class="info-value">${contact.dob ? formatDOBDisplay(contact.dob) : '—'}${age !== null ? ` <span style="background:var(--green-light);color:var(--green);border-radius:12px;padding:2px 8px;font-size:11px;font-weight:600">Age ${age}</span>` : ''}</span>
    </div>
    ${fieldRow('NRIC', contact.nric)}
    ${fieldRow('Gender', contact.gender)}
    ${fieldRow('Race', contact.race)}
    ${fieldRow('Religion', contact.religion)}
    ${fieldRow('Stay Area', [contact.stayArea, contact.state].filter(Boolean).join(', '))}
    ${fieldRow('Marital Status', contact.maritalStatus)}
    ${fieldRow('Dependants', contact.dependants !== undefined && contact.dependants !== '' ? contact.dependants + ' person(s)' : null)}
    ${fieldRow('Occupation', contact.occupation)}
    ${fieldRow('Job Type', contact.jobType)}
    ${fieldRow('Monthly Income', contact.income)}
    ${fieldRow('Language Preference', contact.langPref)}
    ${fieldRow('Existing Insurance', Array.isArray(contact.existingInsurance) ? contact.existingInsurance.filter(Boolean).join(', ') || null : contact.existingInsurance || null)}
    ${fieldRow('Referral Source', contact.referralSource)}
    ${fieldRow('Social Media', contact.socialMedia)}
    ${contact.notes ? `<div class="info-row"><span class="info-label">Notes</span><span class="info-value">${escHtml(contact.notes)}</span></div>` : ''}
    ${contact.tags?.length ? `<div class="info-row"><span class="info-label">Tags</span><span class="info-value">${contact.tags.map(t=>`<span class="contact-tag">${escHtml(t)}</span>`).join(' ')}</span></div>` : ''}

    <div class="section-divider">Case History (${cases.length})</div>
    ${Object.entries(catGroups).map(([cat, catCases]) => `
      <div class="mb-12">
        <div class="flex items-center gap-6 mb-6">
          <span>${catMeta(cat).icon}</span>
          <span class="fw-600 text-sm">${catMeta(cat).label}</span>
          <span class="label-badge">${catCases.length}</span>
        </div>
        ${catCases.map(c => `
          <div class="case-item" style="border-radius:8px;margin-bottom:4px" onclick="event.stopPropagation();closeContactModalBtn();setTimeout(()=>openCaseById('${c.id}'),100)">
            <div class="case-info">
              <div class="case-name">${escHtml(c.label||c.subLabel||catMeta(c.category).label)}</div>
              <div class="case-meta">
                <span class="status-badge ${statusClass(c.category,c.currentStatus)}">${escHtml(getStatusLabel(c.category,c.currentStatus))}</span>
                <span class="text-xs text-muted">${formatDate(c.updatedAt)}</span>
              </div>
            </div>
          </div>`).join('')}
      </div>`).join('')}
    ${cases.length === 0 ? '<div class="text-sm text-muted">No cases linked to this contact</div>' : ''}

    <div class="btn-row mt-16">
      <button class="btn btn-danger btn-sm" onclick="deleteContactConfirm('${contact.id}')">🗑 Delete Contact</button>
    </div>
  `;
}

function openNewContact() {
  playClick();
  document.getElementById('contactModalTitle').textContent = 'New Contact';
  document.getElementById('contactModalBody').innerHTML = renderContactForm();
  openModal('contactModal');
}

function openEditContact(id) {
  const contact = getContact(id);
  if (!contact) return;
  playClick();
  document.getElementById('contactModalTitle').textContent = 'Edit Contact';
  document.getElementById('contactModalBody').innerHTML = renderContactForm(contact);
  openModal('contactModal');
}

function crmSelect(fieldId, field, val) {
  const el = document.getElementById(fieldId);
  if (el) el.value = val;
  playClick();
}

function renderCRMDropdown(fieldId, field, currentVal, label) {
  const opts = getCRMOptions(field);
  return `
    <div class="form-group">
      <label class="form-label">${label}</label>
      <div style="display:flex;gap:6px">
        <select class="form-control" id="${fieldId}" style="flex:1">
          <option value="">— Select —</option>
          ${opts.map(o => `<option value="${escHtml(o)}" ${currentVal===o?'selected':''}>${escHtml(o)}</option>`).join('')}
          ${currentVal && !opts.includes(currentVal) ? `<option value="${escHtml(currentVal)}" selected>${escHtml(currentVal)}</option>` : ''}
        </select>
        <button class="btn btn-secondary btn-sm" style="white-space:nowrap" onclick="promptAddCRMOption('${field}','${fieldId}')">+ Add</button>
      </div>
    </div>`;
}

function promptAddCRMOption(field, selectId) {
  document.getElementById('contactModalTitle').textContent = 'Add Option';
  const prevBody = document.getElementById('contactModalBody').innerHTML;
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">New option for "${field}"</label>
      <input class="form-control" id="crm_new_opt" placeholder="Type new option..." autofocus />
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="document.getElementById('contactModalBody').innerHTML=window._crmPrevBody||'';document.getElementById('contactModalTitle').textContent=window._crmPrevTitle||''">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddCRMOption('${field}','${selectId}')">Add</button>
    </div>`;
  window._crmPrevBody = prevBody;
  window._crmPrevTitle = 'New Contact';
}

function confirmAddCRMOption(field, selectId) {
  const val = document.getElementById('crm_new_opt')?.value?.trim();
  if (!val) { showToast('Please enter a value', 'error'); return; }
  addCRMOption(field, val);
  showToast(`"${val}" added to options!`, 'success');
  // Restore form
  document.getElementById('contactModalBody').innerHTML = window._crmPrevBody || '';
  document.getElementById('contactModalTitle').textContent = window._crmPrevTitle || '';
  // Select the new value
  const sel = document.getElementById(selectId);
  if (sel) {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = val; opt.selected = true;
    sel.appendChild(opt);
  }
}

function renderContactForm(contact = null) {
  const v = (field) => escHtml(contact?.[field] || '');
  return `
    <!-- Core Info -->
    <div class="form-group">
      <label class="form-label">Full Name *</label>
      <input class="form-control" id="cf_name" value="${v('name')}" placeholder="Full name..." />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-control" id="cf_phone" value="${v('phone')}" placeholder="e.g. 0123456789" />
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-control" id="cf_email" value="${v('email')}" placeholder="email@example.com" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">NRIC / IC Number</label>
        <input class="form-control" id="cf_nric" value="${v('nric')}" placeholder="901215-10-1234" oninput="onICInput(this,'cf_dob','cf_age_display')" />
      </div>
      <div class="form-group">
        <label class="form-label">Date of Birth</label>
        <input type="date" class="form-control" id="cf_dob" value="${v('dob')}" oninput="onDOBInput(this,'cf_age_display')" />
        <div id="cf_age_display" style="font-size:12px;color:var(--green);margin-top:4px;min-height:16px;font-weight:600">
          ${contact?.dob ? (()=>{ const a=ageFromDOB(contact.dob); return a!==null?`Age: ${a} years old`:'' })() : ''}
        </div>
      </div>
    </div>

    <div class="section-divider" style="cursor:pointer" onclick="toggleCRMExtras()">
      📋 More Info <span id="crm_extras_toggle" style="font-size:11px;color:var(--blue)">${contact && hasExtendedFields(contact) ? '▲ Hide' : '▼ Show'}</span>
    </div>
    <div id="crm_extras" style="display:${contact && hasExtendedFields(contact) ? 'block' : 'none'}">
      <div class="form-row">
        ${renderCRMDropdown('cf_race', 'races', contact?.race || '', 'Race / Ethnicity')}
        ${renderCRMDropdown('cf_religion', 'religions', contact?.religion || '', 'Religion')}
      </div>
      <div class="form-row">
        ${renderCRMDropdown('cf_gender', 'genders', contact?.gender || '', 'Gender')}
        ${renderCRMDropdown('cf_lang', 'langPrefs', contact?.langPref || '', 'Language Preference')}
      </div>
      <div class="form-row">
        ${renderCRMDropdown('cf_area', 'areas', contact?.stayArea || '', 'Stay Area')}
        ${renderCRMDropdown('cf_state', 'states', contact?.state || '', 'State')}
      </div>
      <div class="form-row">
        ${renderCRMDropdown('cf_marital', 'maritalStatuses', contact?.maritalStatus || '', 'Marital Status')}
        <div class="form-group">
          <label class="form-label">No. of Dependants</label>
          <input type="number" class="form-control" id="cf_dep" value="${escHtml(contact?.dependants?.toString()||'')}" placeholder="0" min="0" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Occupation</label>
          <input class="form-control" id="cf_occ" value="${v('occupation')}" placeholder="Job title..." />
        </div>
        ${renderCRMDropdown('cf_jobtype', 'jobTypes', contact?.jobType || '', 'Job Type')}
      </div>
      <div class="form-row">
        ${renderCRMDropdown('cf_income', 'incomes', contact?.income || '', 'Monthly Income')}
      </div>
      <!-- Existing Insurance — multi-select -->
      <div class="form-group">
        <label class="form-label">Existing Insurance (select all that apply)</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px" id="cf_insurance_chips">
          ${getCRMOptions('insurances').map(ins => `
            <label class="checkbox-wrap" style="background:var(--bg);border:1.5px solid ${(Array.isArray(contact?.existingInsurance)?contact.existingInsurance:[]).includes(ins)?'var(--blue)':'var(--border)'};border-radius:16px;padding:4px 12px;cursor:pointer;font-size:12px;color:${(Array.isArray(contact?.existingInsurance)?contact.existingInsurance:[]).includes(ins)?'var(--blue)':'var(--text)'}">
              <input type="checkbox" name="cf_insurance" value="${escHtml(ins)}" ${(Array.isArray(contact?.existingInsurance)?contact.existingInsurance:[]).includes(ins)?'checked':''} onchange="updateInsuranceChip(this)"> ${escHtml(ins)}
            </label>`).join('')}
        </div>
        <div style="display:flex;gap:6px">
          <input class="form-control" id="cf_new_insurance" placeholder="Add other company..." style="font-size:12px" />
          <button class="btn btn-secondary btn-sm" onclick="addInsuranceOption()">+ Add</button>
        </div>
      </div>
      <div class="form-row">
        ${renderCRMDropdown('cf_referral', 'referrals', contact?.referralSource || '', 'Referral Source')}
        <div class="form-group">
          <label class="form-label">Social Media</label>
          <input class="form-control" id="cf_social" value="${v('socialMedia')}" placeholder="FB/IG/TikTok handle..." />
        </div>
      </div>
      <!-- Tags -->
      <div class="form-group">
        <label class="form-label">Tags</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">
          ${getCRMOptions('tags').map(t => `
            <label class="checkbox-wrap" style="background:var(--bg);border:1.5px solid var(--border);border-radius:16px;padding:3px 10px;cursor:pointer;font-size:12px">
              <input type="checkbox" name="cf_tags" value="${escHtml(t)}" ${(contact?.tags||[]).includes(t)?'checked':''}> ${escHtml(t)}
            </label>`).join('')}
        </div>
        <div style="display:flex;gap:6px">
          <input class="form-control" id="cf_new_tag" placeholder="Add custom tag..." style="font-size:12px" />
          <button class="btn btn-secondary btn-sm" onclick="addContactTag()">+ Add</button>
        </div>
      </div>
    </div>

    <div class="form-group mt-8">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="cf_notes" rows="2" placeholder="Any notes...">${v('notes')}</textarea>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveContact('${contact?.id||''}')">${contact ? 'Save Changes' : 'Create Contact'}</button>
    </div>
  `;
}

function hasExtendedFields(contact) {
  const ins = Array.isArray(contact.existingInsurance) ? contact.existingInsurance.length > 0 : !!contact.existingInsurance;
  return !!(contact.gender || contact.race || contact.religion || contact.stayArea || contact.maritalStatus || contact.jobType || contact.income || contact.langPref || ins || contact.referralSource || contact.socialMedia || contact.tags?.length);
}

function toggleCRMExtras() {
  const el = document.getElementById('crm_extras');
  const toggle = document.getElementById('crm_extras_toggle');
  if (!el) return;
  const show = el.style.display === 'none';
  el.style.display = show ? 'block' : 'none';
  if (toggle) toggle.textContent = show ? '▲ Hide' : '▼ Show';
}

function addContactTag() {
  const input = document.getElementById('cf_new_tag');
  const val = input?.value?.trim();
  if (!val) return;
  addCRMOption('tags', val);
  // Append checkbox
  const container = input.closest('.form-group').querySelector('[style*="flex-wrap"]');
  if (container) {
    const lbl = document.createElement('label');
    lbl.className = 'checkbox-wrap';
    lbl.style.cssText = 'background:var(--bg);border:1.5px solid var(--border);border-radius:16px;padding:3px 10px;cursor:pointer;font-size:12px';
    lbl.innerHTML = `<input type="checkbox" name="cf_tags" value="${escHtml(val)}" checked> ${escHtml(val)}`;
    container.appendChild(lbl);
  }
  input.value = '';
  playClick();
}

function onDOBInput(dobEl, ageDisplayId) {
  const ageEl = document.getElementById(ageDisplayId);
  if (!ageEl) return;
  const age = ageFromDOB(dobEl.value);
  ageEl.textContent = age !== null ? `Age: ${age} years old` : '';
}

function saveContact(existingId = '') {
  const name = document.getElementById('cf_name')?.value?.trim();
  if (!name) { showToast('Please enter a name', 'error'); return; }

  const nric = document.getElementById('cf_nric')?.value || '';
  let dob = document.getElementById('cf_dob')?.value || '';
  if (!dob && nric) dob = dobFromIC(nric);

  const tags = [...document.querySelectorAll('input[name="cf_tags"]:checked')].map(cb => cb.value);

  const data = {
    name,
    phone:            document.getElementById('cf_phone')?.value || '',
    email:            document.getElementById('cf_email')?.value || '',
    nric, dob,
    occupation:       document.getElementById('cf_occ')?.value || '',
    notes:            document.getElementById('cf_notes')?.value || '',
    race:             document.getElementById('cf_race')?.value || '',
    stayArea:         document.getElementById('cf_area')?.value || '',
    state:            document.getElementById('cf_state')?.value || '',
    maritalStatus:    document.getElementById('cf_marital')?.value || '',
    dependants:       document.getElementById('cf_dep')?.value || '',
    jobType:          document.getElementById('cf_jobtype')?.value || '',
    income:           document.getElementById('cf_income')?.value || '',
    langPref:         document.getElementById('cf_lang')?.value || '',
    gender:           document.getElementById('cf_gender')?.value || '',
    religion:         document.getElementById('cf_religion')?.value || '',
    existingInsurance:[...document.querySelectorAll('input[name="cf_insurance"]:checked')].map(cb => cb.value),
    referralSource:   document.getElementById('cf_referral')?.value || '',
    socialMedia:      document.getElementById('cf_social')?.value || '',
    tags
  };

  if (existingId) {
    updateContact(existingId, data);
    showToast('Contact updated!', 'success');
  } else {
    createContact(data);
    showToast('Contact created!', 'success');
  }
  playSuccess();
  closeContactModalBtn();
  renderCRM();
}

function updateInsuranceChip(cb) {
  const lbl = cb.closest('label');
  if (!lbl) return;
  lbl.style.borderColor = cb.checked ? 'var(--blue)' : 'var(--border)';
  lbl.style.color = cb.checked ? 'var(--blue)' : 'var(--text)';
  playClick();
}

function addInsuranceOption() {
  const input = document.getElementById('cf_new_insurance');
  const val = input?.value?.trim();
  if (!val) return;
  addCRMOption('insurances', val);
  const chips = document.getElementById('cf_insurance_chips');
  if (chips) {
    const lbl = document.createElement('label');
    lbl.className = 'checkbox-wrap';
    lbl.style.cssText = 'background:var(--bg);border:1.5px solid var(--blue);border-radius:16px;padding:4px 12px;cursor:pointer;font-size:12px;color:var(--blue)';
    lbl.innerHTML = `<input type="checkbox" name="cf_insurance" value="${escHtml(val)}" checked onchange="updateInsuranceChip(this)"> ${escHtml(val)}`;
    chips.appendChild(lbl);
  }
  input.value = '';
  showToast(`"${val}" added!`, 'success');
  playClick();
}

async function deleteContactConfirm(id) {
  const contact = getContact(id);
  if (!contact) return;
  const ok = await showConfirm('Delete Contact', `Delete ${contact.name} and all linked cases? This cannot be undone.`, 'Delete');
  if (!ok) return;
  deleteContact(id);
  showToast('Contact deleted', 'info');
  closeContactModalBtn();
  renderCRM();
}

/* ============================================
   BULK WHATSAPP MODULE
   ============================================ */

const WA_TEMPLATE_GROUPS = [
  {
    group: '🎉 Festive Greetings',
    templates: [
      {
        id: 'birthday',
        name: '🎂 Birthday',
        tip: 'Auto-select contacts with upcoming birthdays. Warm personal touch.',
        msg: `Hi {name}! 🎂\n\nWishing you a very Happy Birthday! May this year bring you great health, happiness, and prosperity! 🎉\n\nDo take care of yourself and your loved ones. If you ever need a health or life protection review, I'm always here for you! 😊\n\n— {agent}`
      },
      {
        id: 'raya',
        name: '🌙 Hari Raya',
        tip: 'Send to Muslim contacts during Aidilfitri.',
        msg: `Salam {name}! 🌙\n\nSelamat Hari Raya Aidilfitri — Maaf Zahir dan Batin! 🌟\n\nSemoga hari raya ini membawa kebahagiaan dan kesejahteraan buat {name} sekeluarga. Jaga kesihatan dan selamat beraya! 😊\n\n— {agent}`
      },
      {
        id: 'raya_haji',
        name: '🐑 Hari Raya Haji',
        tip: 'Send to Muslim contacts during Aidiladha / Hari Raya Haji.',
        msg: `Salam {name}! 🐑\n\nSelamat Hari Raya Aidiladha! Semoga ibadah korban ini membawa berkat dan rahmat kepada {name} sekeluarga. 🌟\n\nSemoga kita semua sentiasa dilindungi dan diberkati. Selamat menyambut Hari Raya Haji! 😊\n\n— {agent}`
      },
      {
        id: 'cny',
        name: '🧧 Chinese New Year',
        tip: 'Send to Chinese / Buddhist contacts during CNY.',
        msg: `Hi {name}! 🧧\n\n恭喜发财！Gong Xi Fa Cai! 新年快乐！\n\nWishing you and your family a prosperous and healthy Chinese New Year! 🎊\n\nMay this year be filled with good health, happiness, and financial success! 🌟\n\n— {agent}`
      },
      {
        id: 'deepavali',
        name: '🪔 Deepavali',
        tip: 'Send to Hindu / Indian contacts during Deepavali.',
        msg: `Hi {name}! 🪔\n\nHappy Deepavali — Festival of Lights! 🎇\n\nWishing you and your family joy, health, and abundance this Deepavali. May the light of the festival brighten your life and bring blessings to your family! ✨\n\n— {agent}`
      },
      {
        id: 'christmas',
        name: '🎄 Christmas',
        tip: 'Send to Christian contacts during Christmas season.',
        msg: `Hi {name}! 🎄\n\nMerry Christmas and a Happy New Year! 🎅🌟\n\nWishing you and your family a season filled with love, joy, peace, and good health. May this Christmas bring many blessings your way! 🎁\n\nHave a wonderful celebration! 😊\n\n— {agent}`
      },
      {
        id: 'wesak',
        name: '🌸 Wesak Day',
        tip: 'Send to Buddhist contacts during Wesak Day.',
        msg: `Hi {name}! 🌸\n\nHappy Wesak Day! 🙏\n\nWishing you peace, compassion, and wisdom on this auspicious occasion. May you and your family be blessed with good health, happiness, and harmony! ☮️\n\n— {agent}`
      },
      {
        id: 'newyear',
        name: '🎆 New Year',
        tip: 'Universal — send to all contacts at the start of the year.',
        msg: `Hi {name}! 🎆\n\nHappy New Year! Wishing you and your family a wonderful ${new Date().getFullYear()} filled with good health and success! 🥂\n\nIf you'd like to review your financial protection plan for the new year, feel free to reach out anytime — I'm always here! 😊\n\n— {agent}`
      },
      {
        id: 'merdeka',
        name: '🇲🇾 Merdeka / Malaysia Day',
        tip: 'Send to all Malaysian contacts on Merdeka (31 Aug) or Malaysia Day (16 Sep).',
        msg: `Hi {name}! 🇲🇾\n\nSelamat Hari Merdeka / Malaysia Day! 🎉\n\nProud to be Malaysian! Wishing you and your family a wonderful celebration. Let's continue to grow and thrive together as a nation! 💪\n\n— {agent}`
      }
    ]
  },
  {
    group: '💼 Sales & Follow-Up',
    templates: [
      {
        id: 'icari',
        name: '🔍 iCari Check',
        tip: 'Promote iCari comparison tool. Great for cold/warm leads with no insurance.',
        msg: `Hi {name}! 👋\n\nHave you ever wondered if your insurance coverage is adequate? 🤔\n\nI'd like to share a FREE tool called iCari that lets you compare insurance plans and find the best coverage for your needs!\n\n🔗 https://icari.com.my\n\nFeel free to explore — and if you have any questions, I'm always here to help! 😊\n\n— {agent}`
      },
      {
        id: 'review',
        name: '📋 Policy Review',
        tip: 'Invite existing clients for a FREE annual policy review.',
        msg: `Hi {name}! 😊\n\nIt's been a while since we last reviewed your insurance coverage. Life changes — and so do your protection needs!\n\nI'd love to schedule a FREE Policy Review with you to make sure:\n✅ Your coverage is still sufficient\n✅ Your family is fully protected\n✅ You're not over-paying\n\nJust a quick 30-min chat — I can meet you at your convenience! 📅\n\n— {agent}`
      },
      {
        id: 'protection_gap',
        name: '🛡 Protection Gap',
        tip: 'Educate contacts about coverage gaps. Best for contacts with no or little insurance.',
        msg: `Hi {name}! 🛡\n\nDid you know that most Malaysians are underinsured by an average of RM400,000? 😮\n\nA quick protection gap analysis can show you exactly where your coverage may be lacking — at NO cost and NO obligation!\n\nWould you like me to do a FREE check for you? It only takes 15 minutes and could make a huge difference for your family's future! 💪\n\n— {agent}`
      },
      {
        id: 'critical_illness',
        name: '💊 Critical Illness',
        tip: 'Raise awareness about critical illness coverage. Great for ages 30-50.',
        msg: `Hi {name}! 💊\n\nDid you know that 1 in 4 Malaysians will face a critical illness in their lifetime? 😯\n\nThe cost of treating cancer, heart disease, or stroke can easily exceed RM200,000 — wiping out life savings in months.\n\nDo you have a Critical Illness plan in place? If you're not sure, let me do a quick FREE check for you! No obligation at all. 😊\n\n— {agent}`
      },
      {
        id: 'medical_card',
        name: '🏥 Medical Card',
        tip: 'Promote the importance of a medical card. Good for contacts without health insurance.',
        msg: `Hi {name}! 🏥\n\nHave you checked your medical card coverage lately?\n\nHospital bills in Malaysia are rising every year — even a 3-day hospital stay can cost RM10,000+. A good medical card can cover all that without touching your savings! 💰\n\nIf you'd like to know what's the best medical plan for your budget, I'd be happy to share some options — FREE, no pressure! 😊\n\n— {agent}`
      },
      {
        id: 'referral',
        name: '🤝 Referral Request',
        tip: 'Ask happy clients to introduce friends or family.',
        msg: `Hi {name}! 😊\n\nThank you so much for trusting me with your insurance needs — it truly means a lot!\n\nI was wondering — do you have any friends or family members who might benefit from a FREE insurance review? I'd love to help them the same way I've helped you! 🙏\n\nIf you can introduce me to 1-2 people, I promise to take great care of them! Would you be able to share their contacts? 😊\n\n— {agent}`
      },
      {
        id: 'retirement',
        name: '🏖 Retirement Planning',
        tip: 'Raise awareness about EPF shortfall and retirement planning. Good for ages 35+.',
        msg: `Hi {name}! 🏖\n\nDid you know that the average Malaysian EPF savings at retirement is only enough to last 3 years? 😮\n\nWith the rising cost of living, most people need at least RM1 million saved up by 60 — but most don't make it.\n\nHave you done a retirement projection? I'd love to share some options that can help you build a more secure future — no obligation! 😊\n\n— {agent}`
      },
      {
        id: 'mortgage',
        name: '🏠 Mortgage Protection',
        tip: 'Target homeowners. Ask if they have mortgage protection in place.',
        msg: `Hi {name}! 🏠\n\nCongratulations on owning a home — it's one of life's biggest achievements! 🎉\n\nQuick question — if something unexpected happened to you, would your family be able to keep up with the monthly mortgage payments? 🤔\n\nMortgage protection insurance can cover that — so your family keeps the home no matter what. Let me share more details? It's more affordable than most people think! 😊\n\n— {agent}`
      },
      {
        id: 'education',
        name: '🎓 Education Planning',
        tip: 'Target married contacts with children (dependants > 0). Education fund focus.',
        msg: `Hi {name}! 🎓\n\nAs a parent, we all want the best for our children's future! 👨‍👩‍👧\n\nDid you know that a university degree in Malaysia could cost RM100,000–300,000 by the time your child is 18? 😮\n\nStarting an education fund early can make all the difference — and some plans even protect the fund if something happens to you!\n\nWould you like to find out more? I'd love to share some options with you — totally FREE! 😊\n\n— {agent}`
      },
      {
        id: 'checkin',
        name: '👋 General Check-In',
        tip: 'Simple, friendly follow-up for anyone you haven\'t spoken to in a while.',
        msg: `Hi {name}! 👋\n\nJust dropping by to say hello and check in on you! Hope you and your family are doing great! 😊\n\nIf there's anything I can help you with — insurance advice, a policy review, or just a general financial chat — feel free to reach out anytime!\n\nHave a wonderful day! 🌟\n\n— {agent}`
      }
    ]
  }
];

// Flat list for backward compatibility
const WA_TEMPLATES = WA_TEMPLATE_GROUPS.flatMap(g => g.templates);

let _blastSelected = new Set();
let _blastFilter = { gender: '', race: '', religion: '', area: '', state: '', tag: '', maritalStatus: '', jobType: '', income: '', ageMin: '', ageMax: '', insuranceFilter: [] };
let _blastTemplate = WA_TEMPLATES[0].id;
let _blastCustomMsg = '';

function renderBulkWhatsApp() {
  const contacts = getContacts().filter(c => c.phone);
  const filtered = _blastFilterContacts(contacts);
  const tpl = WA_TEMPLATES.find(t => t.id === _blastTemplate);
  const agentName = LOCAL_AUTH.currentUser?.name || 'Your Agent';

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="blast-grid">

      <!-- Left: Contact Selection -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">📋 Select Contacts (${_blastSelected.size} selected)</div>
            <div class="flex gap-6">
              <button class="btn btn-secondary btn-sm" onclick="blastSelectAll()">All</button>
              <button class="btn btn-secondary btn-sm" onclick="blastSelectNone()">None</button>
            </div>
          </div>
          <div class="card-body" style="padding-bottom:8px">
            <!-- Filters -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
              ${blastFilterSelect('Gender', 'gender', 'genders')}
              ${blastFilterSelect('Race', 'race', 'races')}
              ${blastFilterSelect('Religion', 'religion', 'religions')}
              ${blastFilterSelect('Area', 'area', 'areas')}
              ${blastFilterSelect('State', 'state', 'states')}
              ${blastFilterSelect('Marital Status', 'maritalStatus', 'maritalStatuses')}
              ${blastFilterSelect('Job Type', 'jobType', 'jobTypes')}
              ${blastFilterSelect('Income', 'income', 'incomes')}
              ${blastFilterSelect('Tag', 'tag', 'tags')}
              <!-- Insurance multi-select filter — spans full width -->
            </div>
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:6px">
              <div style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">INSURANCE FILTER (select one or more)</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                <label class="checkbox-wrap" style="border-radius:16px;padding:3px 10px;font-size:12px;background:${_blastFilter.insuranceFilter.includes('__none__')?'var(--red-light, #FFE5EA)':'var(--surface)'};border:1.5px solid ${_blastFilter.insuranceFilter.includes('__none__')?'var(--red)':'var(--border)'}">
                  <input type="checkbox" value="__none__" ${_blastFilter.insuranceFilter.includes('__none__')?'checked':''} onchange="blastToggleInsurance('__none__',this.checked)"> ❌ No Insurance
                </label>
                ${getCRMOptions('insurances').filter(i => i !== 'None').map(ins => `
                  <label class="checkbox-wrap" style="border-radius:16px;padding:3px 10px;font-size:12px;background:${_blastFilter.insuranceFilter.includes(ins)?'#E8F0FE':'var(--surface)'};border:1.5px solid ${_blastFilter.insuranceFilter.includes(ins)?'var(--blue)':'var(--border)'}">
                    <input type="checkbox" value="${escHtml(ins)}" ${_blastFilter.insuranceFilter.includes(ins)?'checked':''} onchange="blastToggleInsurance('${escHtml(ins)}',this.checked)"> ${escHtml(ins)}
                  </label>`).join('')}
              </div>
              ${_blastFilter.insuranceFilter.length > 0 ? `<div style="font-size:11px;color:var(--blue);margin-top:6px">Filtering by: ${_blastFilter.insuranceFilter.map(v => v==='__none__'?'No Insurance':v).join(', ')}</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;margin-bottom:8px">
              <input class="form-control" style="font-size:12px;width:80px" type="number" min="0" max="100" placeholder="Age from" value="${_blastFilter.ageMin}" onchange="_blastFilter.ageMin=this.value;refreshBlast()" />
              <input class="form-control" style="font-size:12px;width:80px" type="number" min="0" max="100" placeholder="Age to" value="${_blastFilter.ageMax}" onchange="_blastFilter.ageMax=this.value;refreshBlast()" />
              <button class="btn btn-secondary btn-sm" style="white-space:nowrap" onclick="blastClearFilters()">✕ Clear Filters</button>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${filtered.length} contacts with phone numbers</div>
            <div style="max-height:380px;overflow-y:auto">
              ${filtered.length === 0
                ? '<div class="text-sm text-muted text-center" style="padding:16px">No contacts match filter</div>'
                : filtered.map(c => `
                  <label class="flex items-center gap-8 mb-6" style="cursor:pointer;padding:6px 8px;border-radius:8px;background:${_blastSelected.has(c.id)?'var(--blue-light, #E8F0FE)':'var(--bg)'}">
                    <input type="checkbox" ${_blastSelected.has(c.id)?'checked':''} onchange="blastToggle('${c.id}',this.checked)">
                    ${avatarHTML(c.name, 28)}
                    <div style="flex:1;min-width:0">
                      <div class="fw-600" style="font-size:13px">${escHtml(c.name)}</div>
                      <div class="text-xs text-muted">${escHtml(c.phone)} ${c.race?'• '+escHtml(c.race):''}</div>
                    </div>
                  </label>`).join('')}
            </div>
            <!-- Quick Select — grouped -->
            <div class="section-divider" style="margin-top:10px">⚡ Quick Select + Auto-Template</div>

            <div style="font-size:10px;font-weight:700;color:var(--text-muted);margin:6px 0 4px">🎉 BY OCCASION</div>
            <div class="flex gap-5" style="flex-wrap:wrap;margin-bottom:6px">
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastSelectBirthdays(7)">🎂 Bdays This Week</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastSelectBirthdays(30)">🎂 Bdays This Month</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('religion','Islam');_blastTemplate='raya'">🌙 Muslims → Raya</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('religion','Islam');_blastTemplate='raya_haji'">🐑 Muslims → Raya Haji</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('religion','Buddhism');_blastTemplate='cny'">🧧 Buddhist → CNY</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('religion','Buddhism');_blastTemplate='wesak'">🌸 Buddhist → Wesak</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('religion','Hinduism');_blastTemplate='deepavali'">🪔 Hindu → Deepavali</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('religion','Christianity');_blastTemplate='christmas'">🎄 Christian → Christmas</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastSelectAll();_blastTemplate='newyear';refreshBlast()">🎆 All → New Year</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastSelectAll();_blastTemplate='merdeka';refreshBlast()">🇲🇾 All → Merdeka</button>
            </div>

            <div style="font-size:10px;font-weight:700;color:var(--text-muted);margin:6px 0 4px">👥 BY PROFILE</div>
            <div class="flex gap-5" style="flex-wrap:wrap;margin-bottom:6px">
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('gender','Female')">👩 Female Only</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('gender','Male')">👨 Male Only</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickAgeGroup(22,30)">🎯 Age 22–30</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickAgeGroup(30,45)">🎯 Age 30–45</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickAgeGroup(45,60)">🎯 Age 45–60</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickAgeGroup(50,99)">👴 Seniors 50+</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('maritalStatus','Married');_blastTemplate='education'">👨‍👩‍👧 Married → Education</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('jobType','Business Owner');_blastTemplate='checkin'">💼 Business Owners</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickFilter('jobType','Retiree');_blastTemplate='retirement'">🏖 Retirees → Retirement</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickIncomeFilter('RM8,000–15,000','>RM15,000')">💰 High Income</button>
            </div>

            <div style="font-size:10px;font-weight:700;color:var(--text-muted);margin:6px 0 4px">🛡 BY INSURANCE STATUS</div>
            <div class="flex gap-5" style="flex-wrap:wrap;margin-bottom:4px">
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastSelectNoInsurance()">❌ No Insurance → Protection Gap</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastQuickInsurance('AIA');_blastTemplate='review'">✅ AIA Clients → Review</button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="blastAllContacts()">📋 All Contacts</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Template + Send -->
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">✉️ Message Template</div></div>
          <div class="card-body">
            ${WA_TEMPLATE_GROUPS.map(g => `
              <div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:5px;margin-top:8px">${g.group}</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px">
                ${g.templates.map(t => `
                  <button class="btn btn-sm ${_blastTemplate===t.id?'btn-primary':'btn-secondary'}" style="font-size:11px;padding:4px 10px" onclick="_blastTemplate='${t.id}';_blastCustomMsg='';refreshBlast()">${t.name}</button>`).join('')}
              </div>`).join('')}
            <div style="margin-top:10px"></div>
            ${tpl ? `<div style="background:var(--bg);border-radius:8px;padding:8px;font-size:12px;color:var(--text-secondary);margin-bottom:8px">💡 ${escHtml(tpl.tip)}</div>` : ''}
            <label class="form-label">Message (use {name} for contact name, {agent} for your name)</label>
            <textarea class="form-control" id="blast_msg" rows="10" style="font-size:12px;font-family:monospace">${escHtml(_blastCustomMsg || tpl?.msg || '')}</textarea>
            <div class="flex gap-6 mt-8">
              <button class="btn btn-secondary btn-sm" onclick="_blastCustomMsg='';_blastTemplate='custom';document.getElementById('blast_msg').value=''">Clear</button>
              <button class="btn btn-secondary btn-sm" onclick="_blastCustomMsg=document.getElementById('blast_msg').value">Save Draft</button>
            </div>
          </div>
        </div>

        <div class="card" style="border:2px solid var(--green)">
          <div class="card-body">
            <div class="fw-600 mb-8">📱 ${_blastSelected.size} contacts selected</div>
            <p class="text-sm text-muted mb-12">Click "Generate Links" to get one WhatsApp link per contact. Click each link to send via WhatsApp — zero cost, uses your own WhatsApp!</p>
            <button class="btn btn-primary" style="background:var(--green);width:100%" onclick="generateWALinks()">📤 Generate WhatsApp Links</button>
          </div>
        </div>

        <div id="wa_links_output" style="margin-top:12px"></div>
      </div>
    </div>

    <style>
      @media (max-width:768px) { .blast-grid { grid-template-columns: 1fr !important; } }
    </style>
  `;
}

function _blastFilterContacts(contacts) {
  return contacts.filter(c => {
    if (_blastFilter.gender && c.gender !== _blastFilter.gender) return false;
    if (_blastFilter.race && c.race !== _blastFilter.race) return false;
    if (_blastFilter.religion && c.religion !== _blastFilter.religion) return false;
    if (_blastFilter.area && c.stayArea !== _blastFilter.area) return false;
    if (_blastFilter.state && c.state !== _blastFilter.state) return false;
    if (_blastFilter.maritalStatus && c.maritalStatus !== _blastFilter.maritalStatus) return false;
    if (_blastFilter.jobType && c.jobType !== _blastFilter.jobType) return false;
    if (_blastFilter.income && c.income !== _blastFilter.income) return false;
    if (_blastFilter.tag && !(c.tags||[]).includes(_blastFilter.tag)) return false;
    if (_blastFilter.insuranceFilter && _blastFilter.insuranceFilter.length > 0) {
      const cIns = Array.isArray(c.existingInsurance)
        ? c.existingInsurance.filter(i => i && i !== 'None')
        : (c.existingInsurance && c.existingInsurance !== 'None' ? [c.existingInsurance] : []);
      const hasNoneFilter = _blastFilter.insuranceFilter.includes('__none__');
      const companyFilters = _blastFilter.insuranceFilter.filter(v => v !== '__none__');
      // Contact must match AT LEAST ONE selected filter option
      const matchesNone = hasNoneFilter && cIns.length === 0;
      const matchesCompany = companyFilters.some(co => cIns.includes(co));
      if (!matchesNone && !matchesCompany) return false;
    }
    if (_blastFilter.ageMin || _blastFilter.ageMax) {
      if (!c.dob) return false;
      const age = ageFromDOB(c.dob);
      if (age === null) return false;
      if (_blastFilter.ageMin && age < parseInt(_blastFilter.ageMin)) return false;
      if (_blastFilter.ageMax && age > parseInt(_blastFilter.ageMax)) return false;
    }
    return true;
  });
}

function blastFilterSelect(label, field, optionsKey) {
  const opts = getCRMOptions(optionsKey);
  return `
    <select class="form-control" style="font-size:12px" onchange="_blastFilter['${field}']=this.value;refreshBlast()">
      <option value="">All ${label}s</option>
      ${opts.map(o => `<option value="${escHtml(o)}" ${_blastFilter[field]===o?'selected':''}>${escHtml(o)}</option>`).join('')}
    </select>`;
}

function blastClearFilters() {
  Object.keys(_blastFilter).forEach(k => _blastFilter[k] = Array.isArray(_blastFilter[k]) ? [] : '');
  refreshBlast();
}

function blastToggleInsurance(value, checked) {
  if (!Array.isArray(_blastFilter.insuranceFilter)) _blastFilter.insuranceFilter = [];
  if (checked) {
    if (!_blastFilter.insuranceFilter.includes(value)) _blastFilter.insuranceFilter.push(value);
  } else {
    _blastFilter.insuranceFilter = _blastFilter.insuranceFilter.filter(v => v !== value);
  }
  refreshBlast();
}

function refreshBlast() {
  const panel = document.getElementById('crm-blast-panel');
  if (panel) panel.innerHTML = renderBulkWhatsApp();
}

function blastToggle(contactId, checked) {
  if (checked) _blastSelected.add(contactId); else _blastSelected.delete(contactId);
  // Update count display
  const countEl = document.querySelector('.blast-grid .card-title');
  if (countEl) countEl.textContent = `📋 Select Contacts (${_blastSelected.size} selected)`;
  const countEl2 = document.querySelector('.blast-grid [style*="border:2px solid var(--green)"] .fw-600');
  if (countEl2) countEl2.textContent = `📱 ${_blastSelected.size} contacts selected`;
}

function blastSelectAll() {
  const contacts = _blastFilterContacts(getContacts().filter(c => c.phone));
  contacts.forEach(c => _blastSelected.add(c.id));
  refreshBlast();
}

function blastSelectNone() { _blastSelected.clear(); refreshBlast(); }

function blastAllContacts() {
  blastClearFilters();
  blastSelectAll();
}

function blastQuickIncomeFilter(...incomeValues) {
  // Select contacts matching any of the given income values
  blastClearFilters();
  const matching = getContacts().filter(c => c.phone && incomeValues.includes(c.income));
  matching.forEach(c => _blastSelected.add(c.id));
  refreshBlast();
}

function blastQuickInsurance(company) {
  blastClearFilters();
  _blastFilter.insuranceFilter = [company];
  const filtered = _blastFilterContacts(getContacts().filter(c => c.phone));
  filtered.forEach(c => _blastSelected.add(c.id));
  refreshBlast();
}

function blastQuickFilter(field, value) {
  _blastFilter[field] = value;
  const filtered = _blastFilterContacts(getContacts().filter(c => c.phone));
  filtered.forEach(c => _blastSelected.add(c.id));
  refreshBlast();
}

function blastQuickAgeGroup(min, max) {
  _blastFilter.ageMin = String(min);
  _blastFilter.ageMax = String(max);
  const filtered = _blastFilterContacts(getContacts().filter(c => c.phone));
  filtered.forEach(c => _blastSelected.add(c.id));
  refreshBlast();
}

function blastSelectBirthdays(days) {
  getUpcomingBirthdays(days).filter(c => c.phone).forEach(c => _blastSelected.add(c.id));
  // Auto-select birthday template
  _blastTemplate = 'birthday';
  refreshBlast();
}

function blastSelectNoInsurance() {
  _blastFilter.insuranceFilter = ['__none__'];
  const filtered = _blastFilterContacts(getContacts().filter(c => c.phone));
  filtered.forEach(c => _blastSelected.add(c.id));
  _blastTemplate = 'protection_gap';
  refreshBlast();
}

function generateWALinks() {
  if (_blastSelected.size === 0) { showToast('Please select at least one contact', 'error'); return; }
  const msg = document.getElementById('blast_msg')?.value || '';
  if (!msg.trim()) { showToast('Please enter a message', 'error'); return; }
  const agentName = LOCAL_AUTH.currentUser?.name || 'Your Agent';

  const links = [];
  _blastSelected.forEach(id => {
    const c = getContact(id);
    if (!c || !c.phone) return;
    const personalised = msg.replace(/{name}/g, c.name).replace(/{agent}/g, agentName);
    const phone = '6' + c.phone.replace(/\D/g, '').replace(/^6/, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(personalised)}`;
    links.push({ name: c.name, phone: c.phone, url });
  });

  const output = document.getElementById('wa_links_output');
  if (!output) return;
  output.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">📤 ${links.length} WhatsApp Links Ready</div>
        <button class="btn btn-secondary btn-sm" onclick="copyAllPhones()">📋 Copy All Numbers</button>
      </div>
      <div class="card-body" style="max-height:400px;overflow-y:auto">
        <div class="text-sm text-muted mb-12">Click each green button to send via WhatsApp. Message is pre-filled with their name.</div>
        ${links.map((l, i) => `
          <div class="flex items-center gap-8 mb-8" style="padding:8px;background:var(--bg);border-radius:8px">
            <span class="text-muted text-sm" style="width:20px">${i+1}</span>
            ${avatarHTML(l.name, 28)}
            <div style="flex:1">
              <div class="fw-600 text-sm">${escHtml(l.name)}</div>
              <div class="text-xs text-muted">${escHtml(l.phone)}</div>
            </div>
            <a href="${escHtml(l.url)}" target="_blank" class="btn btn-success btn-sm" style="background:var(--green);color:#fff;text-decoration:none" onclick="markSent(${i},this)">
              📱 Send
            </a>
          </div>`).join('')}
      </div>
    </div>`;
  showToast(`${links.length} links generated! Click each to send.`, 'success');
  playSuccess();
}

function markSent(i, btn) {
  btn.textContent = '✓ Sent';
  btn.style.background = 'var(--text-muted)';
  btn.style.pointerEvents = 'none';
}

function copyAllPhones() {
  const nums = [];
  _blastSelected.forEach(id => {
    const c = getContact(id);
    if (c?.phone) nums.push(c.name + ': ' + c.phone);
  });
  if (navigator.clipboard) {
    navigator.clipboard.writeText(nums.join('\n')).then(() => showToast('Phone numbers copied!', 'success'));
  } else {
    showToast('Copy not supported in this browser', 'warning');
  }
}
