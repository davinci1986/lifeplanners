/* ============================================
   CRM Module
   ============================================ */

let crmSearch = '';

function renderCRM() {
  document.getElementById('pageTitle').textContent = 'CRM Contacts';
  const contacts = getContacts();
  const filtered = crmSearch.length >= 2 ? searchContacts(crmSearch) : contacts;

  document.getElementById('content').innerHTML = `
    <div class="stats-grid mb-20">
      <div class="stat-card"><div class="stat-icon" style="background:#E8F0FE">👥</div><div class="stat-num" style="color:var(--blue)">${contacts.length}</div><div class="stat-label">Total Contacts</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#E8F8EE">📈</div><div class="stat-num" style="color:var(--green)">${contacts.filter(c=>getCasesForContact(c.id).some(x=>x.category==='sales')).length}</div><div class="stat-label">With Sales</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#F3E8FD">👤</div><div class="stat-num" style="color:var(--purple)">${contacts.filter(c=>getCasesForContact(c.id).some(x=>x.category==='recruitment'||x.category==='onboarding')).length}</div><div class="stat-label">Agents</div></div>
    </div>

    <div class="flex items-center justify-between mb-16" style="flex-wrap:wrap;gap:8px">
      <div class="search-bar" style="width:300px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search contacts..." value="${escHtml(crmSearch)}" oninput="crmSearch=this.value;renderCRM()" />
      </div>
      <button class="btn btn-primary" onclick="openNewContact()">+ New Contact</button>
    </div>

    ${filtered.length === 0
      ? emptyState('👥', 'No contacts', crmSearch ? 'No results found' : 'Add your first contact')
      : `<div class="grid-auto">${filtered.map(c => renderContactCard(c)).join('')}</div>`
    }
  `;
}

function renderContactCard(contact) {
  const cases = getCasesForContact(contact.id);
  const cats = [...new Set(cases.map(c => c.category))];
  return `
    <div class="contact-card" onclick="openContact('${contact.id}')">
      <div class="contact-avatar" style="background:${getAvatarColor(contact.name)}">${getInitials(contact.name)}</div>
      <div class="contact-name">${escHtml(contact.name)}</div>
      ${contact.phone ? `<div class="contact-phone">📱 ${escHtml(contact.phone)}</div>` : ''}
      ${contact.email ? `<div class="contact-phone">✉️ ${escHtml(contact.email)}</div>` : ''}
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

  return `
    <div class="flex items-center gap-12 mb-16">
      <div class="contact-avatar" style="background:${getAvatarColor(contact.name)};width:56px;height:56px;font-size:22px">${getInitials(contact.name)}</div>
      <div style="flex:1">
        <div class="fw-700" style="font-size:18px">${escHtml(contact.name)}</div>
        <div class="text-muted text-sm">Added ${formatDate(contact.createdAt)}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="openEditContact('${contact.id}')">✏ Edit</button>
    </div>

    <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${escHtml(contact.phone||'—')} ${contact.phone?`<a href="https://wa.me/6${contact.phone.replace(/\D/g,'')}" target="_blank" style="color:var(--green);font-size:12px;margin-left:8px">📱 WhatsApp</a>`:''}</span></div>
    <div class="info-row"><span class="info-label">Email</span><span class="info-value">${escHtml(contact.email||'—')}</span></div>
    <div class="info-row"><span class="info-label">NRIC</span><span class="info-value">${escHtml(contact.nric||'—')}</span></div>
    <div class="info-row"><span class="info-label">Date of Birth</span><span class="info-value">${escHtml(contact.dob||'—')}</span></div>
    <div class="info-row"><span class="info-label">Occupation</span><span class="info-value">${escHtml(contact.occupation||'—')}</span></div>
    <div class="info-row"><span class="info-label">Race</span><span class="info-value">${escHtml(contact.race||'—')}</span></div>
    <div class="info-row"><span class="info-label">Religion</span><span class="info-value">${escHtml(contact.religion||'—')}</span></div>
    ${contact.notes ? `<div class="info-row"><span class="info-label">Notes</span><span class="info-value">${escHtml(contact.notes)}</span></div>` : ''}

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

function guessRaceFromName(name) {
  const n = name.toLowerCase();
  const malayKw   = ['ahmad','mohamed','mohammed','siti','nurul','nur ','abdul','farah','hafiz','amirul','izzati','hakim','azri','binti','bin ','anak','mohd','noor','zul','rizal','fadzil','aisyah','hana','aishah'];
  const indianKw  = ['muthu','kumar','rajan','siva','priya','chandran','suresh','rama','krishnan','nair','pillai','a/l','a/p','d/o','s/o','gopal','selvam','velu','raj ','devi','lakshmi','ganesh','anand','bala'];
  const chineseSn = ['tan','lim','wong','ng','chan','ong','yap','khor','goh','teo','cheah','chong','loh','low','khoo','heng','sim','chua','poh','lee','liaw','koay','foo','lau','yeoh','tiong','chia','wee','quah'];
  if (malayKw.some(k => n.includes(k))) return { race: 'Malay', religion: 'Islam' };
  if (indianKw.some(k => n.includes(k))) return { race: 'Indian', religion: 'Hinduism' };
  const first = n.split(' ')[0], last = n.split(' ').slice(-1)[0];
  if (chineseSn.includes(first) || chineseSn.includes(last)) return { race: 'Chinese', religion: 'Buddhism/Taoism' };
  return { race: '', religion: '' };
}

function autoSuggestRace(name) {
  if (!name || name.length < 3) return;
  const guess = guessRaceFromName(name);
  if (!guess.race) return;
  // Only auto-apply if user hasn't manually selected yet
  const raceInput = document.getElementById('cf_race');
  const relInput  = document.getElementById('cf_religion');
  if (raceInput && !raceInput.value) {
    raceInput.value = guess.race;
    applyChipActive('race_picker', guess.race);
  }
  if (relInput && !relInput.value) {
    relInput.value = guess.religion;
    applyChipActive('religion_picker', guess.religion);
  }
}

function pickChip(pickerId, btn) {
  document.querySelectorAll(`#${pickerId} .chip-opt`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const hiddenId = pickerId === 'race_picker' ? 'cf_race' : 'cf_religion';
  const hidden = document.getElementById(hiddenId);
  if (hidden) hidden.value = btn.dataset.val;
  playClick();
}

function applyChipActive(pickerId, val) {
  document.querySelectorAll(`#${pickerId} .chip-opt`).forEach(b => {
    b.classList.toggle('active', b.dataset.val === val);
  });
}

function renderContactForm(contact = null) {
  const raceOpts  = ['Chinese','Malay','Indian','Others'];
  const relOpts   = ['Islam','Buddhism/Taoism','Hinduism','Christianity','Others'];
  return `
    <div class="form-group">
      <label class="form-label">Full Name *</label>
      <input class="form-control" id="cf_name" value="${escHtml(contact?.name||'')}" placeholder="Full name..." oninput="autofillContact(this.value);autoSuggestRace(this.value)" autocomplete="off" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-control" id="cf_phone" value="${escHtml(contact?.phone||'')}" placeholder="e.g. 0123456789" />
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-control" id="cf_email" value="${escHtml(contact?.email||'')}" placeholder="email@example.com" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">NRIC</label>
        <input class="form-control" id="cf_nric" value="${escHtml(contact?.nric||'')}" placeholder="XXXXXX-XX-XXXX" />
      </div>
      <div class="form-group">
        <label class="form-label">Date of Birth</label>
        <input type="date" class="form-control" id="cf_dob" value="${escHtml(contact?.dob||'')}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Occupation</label>
      <input class="form-control" id="cf_occ" value="${escHtml(contact?.occupation||'')}" placeholder="Job title..." />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Race</label>
        <div class="chip-picker" id="race_picker" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${raceOpts.map(r => `<button type="button" class="chip-opt${contact?.race===r?' active':''}" data-val="${r}" onclick="pickChip('race_picker',this)" style="padding:5px 12px;border-radius:20px;border:1.5px solid var(--border);background:var(--bg);cursor:pointer;font-size:12px">${r}</button>`).join('')}
        </div>
        <input type="hidden" id="cf_race" value="${escHtml(contact?.race||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Religion</label>
        <div class="chip-picker" id="religion_picker" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${relOpts.map(r => `<button type="button" class="chip-opt${contact?.religion===r?' active':''}" data-val="${r}" onclick="pickChip('religion_picker',this)" style="padding:5px 12px;border-radius:20px;border:1.5px solid var(--border);background:var(--bg);cursor:pointer;font-size:12px">${r}</button>`).join('')}
        </div>
        <input type="hidden" id="cf_religion" value="${escHtml(contact?.religion||'')}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="cf_notes" rows="2" placeholder="Any notes...">${escHtml(contact?.notes||'')}</textarea>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="closeContactModalBtn()">Cancel</button>
      <button class="btn btn-primary" onclick="saveContact('${contact?.id||''}')">${contact ? 'Save Changes' : 'Create Contact'}</button>
    </div>
  `;
}

function saveContact(existingId = '') {
  const name = document.getElementById('cf_name')?.value?.trim();
  if (!name) { showToast('Please enter a name', 'error'); return; }

  const data = {
    name,
    phone: document.getElementById('cf_phone')?.value || '',
    email: document.getElementById('cf_email')?.value || '',
    nric: document.getElementById('cf_nric')?.value || '',
    dob: document.getElementById('cf_dob')?.value || '',
    occupation: document.getElementById('cf_occ')?.value || '',
    race: document.getElementById('cf_race')?.value || '',
    religion: document.getElementById('cf_religion')?.value || '',
    notes: document.getElementById('cf_notes')?.value || ''
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

async function deleteContactConfirm(id) {
  const contact = getContact(id);
  if (!contact) return;
  const ok = await showConfirm('Delete Contact', `Delete ${contact.name} and all linked cases? This cannot be undone.`, 'Delete');
  if (!ok) return;
  deleteContact(id);
  showToast('Contact deleted', 'info');
  playDelete();
  closeContactModalBtn();
  renderCRM();
}
