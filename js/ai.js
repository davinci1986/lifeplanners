/* ============================================
   AI Assistant — Claude via Apps Script proxy
   ============================================ */

// Default proxy (same Apps Script web app used by the Telegram bot).
const AI_PROXY_URL_DEFAULT = 'https://script.google.com/macros/s/AKfycbyrmVRrjfjRRsg9rBS0RxbRbG2AwkwsjQOE27dFvy1GgB0A_Vzi4PzsvRUosHBapPKq/exec';

let _aiChat = []; // {role:'user'|'assistant', content:'...'}
let _aiBusy = false;

function aiProxyUrl() {
  return DB.settings?.aiProxyUrl || AI_PROXY_URL_DEFAULT;
}

/* ---- Core call: send messages to Claude via the proxy ---- */
async function aiProxyCall(messages, system, maxTokens) {
  const url = aiProxyUrl();
  // text/plain avoids a CORS preflight; Apps Script returns readable JSON.
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ai: true, system: system || '', messages, max_tokens: maxTokens || 1500 })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'AI request failed');
  return data.text;
}

/* ---- Build a compact, privacy-conscious snapshot of the CRM ---- */
function buildCRMContext() {
  const contacts = getContacts();
  const cases = getCases();
  const today = todayStr();

  // Summary counts
  const cats = {};
  cases.forEach(c => { cats[c.category] = (cats[c.category] || 0) + 1; });
  const catLine = Object.entries(cats).map(([k, v]) => `${k}:${v}`).join(', ');

  // Per-contact one-liners (cap to keep tokens sane). No NRIC, no full phone.
  const lines = contacts.slice(0, 120).map(c => {
    const age = c.dob ? ageFromDOB(c.dob) : '';
    const cs = getCasesForContact(c.id);
    const csTxt = cs.map(x => `${x.category}/${getStatusLabel(x.category, x.currentStatus)}${x.kiv ? '(KIV)' : ''}`).join('; ');
    const ins = Array.isArray(c.existingInsurance) ? c.existingInsurance.filter(Boolean).join('/') : (c.existingInsurance || '');
    return `- ${c.name}${age ? ', ' + age + 'yo' : ''}${c.race ? ', ' + c.race : ''}${c.occupation ? ', ' + c.occupation : ''}${c.income ? ', income ' + c.income : ''}${ins ? ', has: ' + ins : ', NO insurance'}${csTxt ? ' | cases: ' + csTxt : ''}`;
  });

  return `Today: ${today}\nTotal contacts: ${contacts.length}. Cases by category: ${catLine || 'none'}.\n\nContacts:\n${lines.join('\n')}`;
}

function aiSystemPrompt() {
  const agent = LOCAL_AUTH.currentUser?.name || GAUTH.currentUser?.name || 'the advisor';
  return `You are an AI assistant inside LifePlanner Pro, a CRM for a Malaysian AIA insurance advisor (${agent}). ` +
    `You help analyse their client base, draft client messages, and suggest next actions. ` +
    `Be concise and practical. Use Malaysian context (RM currency, local norms). ` +
    `When asked about clients, use ONLY the data provided. If data is missing, say so. ` +
    `Never invent policy numbers, prices, or client details.`;
}

/* ---- Page ---- */
function renderAIAssistant() {
  document.getElementById('pageTitle').textContent = 'AI Assistant';
  const configured = !!(DB.settings?.aiProxyUrl || AI_PROXY_URL_DEFAULT);

  document.getElementById('content').innerHTML = `
    <div style="max-width:860px;margin:0 auto">
      <div class="card mb-16" style="background:linear-gradient(135deg,rgba(124,58,237,0.08),rgba(236,72,153,0.08));border-color:rgba(124,58,237,0.3)">
        <div class="card-body">
          <div class="fw-700" style="font-size:16px;margin-bottom:4px">🤖 AI Assistant <span style="font-size:11px;color:var(--text-muted);font-weight:500">· free AI</span></div>
          <div class="text-sm text-muted">Ask about your clients, draft WhatsApp messages, or get next-best-action ideas. It reads your CRM data live.</div>
        </div>
      </div>

      <!-- Quick tools -->
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        <button class="btn btn-secondary btn-sm" onclick="aiQuickPrompt('Which of my clients have NO insurance? List them with a one-line reason each is a good prospect.')">🎯 Who has no insurance?</button>
        <button class="btn btn-secondary btn-sm" onclick="aiQuickPrompt('Give me a prioritised list of who I should follow up with this week and why.')">🔥 Who to follow up?</button>
        <button class="btn btn-secondary btn-sm" onclick="aiQuickPrompt('Summarise my pipeline: where are my sales cases stuck and what should I do?')">📊 Pipeline review</button>
        <button class="btn btn-secondary btn-sm" onclick="aiOpenWriteTool()">✍️ Write WhatsApp message</button>
        <button class="btn btn-secondary btn-sm" onclick="aiOpenSummaryTool()">📋 Summarise a client</button>
      </div>

      <!-- Chat -->
      <div id="aiChatBox" style="border:1px solid var(--border);border-radius:12px;background:var(--card);min-height:280px;max-height:50vh;overflow-y:auto;padding:14px">
        ${_aiChat.length === 0
          ? `<div class="text-sm text-muted" style="text-align:center;padding:40px 0">Ask me anything about your clients 👇</div>`
          : _aiChat.map(renderAIBubble).join('')}
      </div>

      <div style="display:flex;gap:8px;margin-top:12px">
        <textarea id="aiInput" class="form-control" rows="2" placeholder="Ask the AI..." style="resize:none" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();aiSend();}"></textarea>
        <button class="btn btn-primary" id="aiSendBtn" onclick="aiSend()" style="align-self:stretch">Send</button>
      </div>
      ${_aiChat.length > 0 ? `<div style="text-align:right;margin-top:6px"><button class="btn-text-link" style="font-size:11px;color:var(--text-muted)" onclick="aiClearChat()">Clear chat</button></div>` : ''}
    </div>
  `;
  const box = document.getElementById('aiChatBox');
  if (box) box.scrollTop = box.scrollHeight;
}

function renderAIBubble(m) {
  const isUser = m.role === 'user';
  return `<div style="display:flex;justify-content:${isUser ? 'flex-end' : 'flex-start'};margin-bottom:10px">
    <div style="max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;white-space:pre-wrap;line-height:1.5;
      background:${isUser ? 'var(--blue)' : 'var(--bg)'};color:${isUser ? '#fff' : 'var(--text)'};
      border:${isUser ? 'none' : '1px solid var(--border)'}">${escHtml(m.content)}</div>
  </div>`;
}

function aiClearChat() { _aiChat = []; renderAIAssistant(); }

function aiQuickPrompt(text) {
  const input = document.getElementById('aiInput');
  if (input) input.value = text;
  aiSend();
}

async function aiSend() {
  if (_aiBusy) return;
  const input = document.getElementById('aiInput');
  const text = (input?.value || '').trim();
  if (!text) return;

  _aiChat.push({ role: 'user', content: text });
  _aiChat.push({ role: 'assistant', content: '…thinking' });
  _aiBusy = true;
  renderAIAssistant();

  try {
    // First user turn carries the CRM context; later turns rely on history.
    const ctx = buildCRMContext();
    const msgs = _aiChat
      .filter(m => m.content !== '…thinking')
      .map((m, i) => {
        if (m.role === 'user' && i === 0) {
          return { role: 'user', content: `${m.content}\n\n---\nMy CRM data:\n${ctx}` };
        }
        return { role: m.role, content: m.content };
      });
    const reply = await aiProxyCall(msgs, aiSystemPrompt(), 1800);
    _aiChat[_aiChat.length - 1] = { role: 'assistant', content: reply };
  } catch (e) {
    _aiChat[_aiChat.length - 1] = { role: 'assistant', content: '⚠️ ' + e.message };
  }
  _aiBusy = false;
  renderAIAssistant();
}

/* ---- Quick tool: write a WhatsApp message for a contact ---- */
function aiOpenWriteTool() {
  const contacts = getContacts();
  const opts = contacts.slice(0, 300).map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
  document.getElementById('contactModalTitle').textContent = '✍️ Write WhatsApp Message';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group"><label class="form-label">Client</label>
      <select class="form-control" id="aiwt_contact">${opts}</select></div>
    <div class="form-group"><label class="form-label">Purpose</label>
      <select class="form-control" id="aiwt_purpose">
        <option>Birthday greeting</option>
        <option>Follow up on a quotation</option>
        <option>Ask for a meeting appointment</option>
        <option>Policy review reminder</option>
        <option>Festive greeting</option>
        <option>Check in / reconnect</option>
      </select></div>
    <div class="form-group"><label class="form-label">Language</label>
      <select class="form-control" id="aiwt_lang"><option>English</option><option>Bahasa Malaysia</option><option>Chinese (中文)</option></select></div>
    <div class="form-group"><label class="form-label">Extra notes (optional)</label>
      <input class="form-control" id="aiwt_notes" placeholder="e.g. mention the new medical card plan" /></div>
    <div class="btn-row"><button class="btn btn-primary" onclick="aiGenerateWhatsApp()">✨ Generate</button></div>
    <div id="aiwt_out" style="margin-top:12px"></div>
  `;
  openModal('contactModal');
}

async function aiGenerateWhatsApp() {
  const c = getContact(document.getElementById('aiwt_contact').value);
  if (!c) return;
  const purpose = document.getElementById('aiwt_purpose').value;
  const lang = document.getElementById('aiwt_lang').value;
  const notes = document.getElementById('aiwt_notes').value;
  const out = document.getElementById('aiwt_out');
  out.innerHTML = '<div class="spinner"></div> Generating...';

  const age = c.dob ? ageFromDOB(c.dob) : '';
  const profile = `Name: ${c.name}${age ? ', age ' + age : ''}${c.race ? ', ' + c.race : ''}${c.occupation ? ', ' + c.occupation : ''}.`;
  const prompt = `Write a warm, personal WhatsApp message in ${lang} for this insurance client. Purpose: ${purpose}. ${notes ? 'Extra: ' + notes + '. ' : ''}` +
    `Client: ${profile} Keep it short (2-4 sentences), friendly, not salesy. Use their first name. Return ONLY the message text.`;
  try {
    const msg = await aiProxyCall([{ role: 'user', content: prompt }], aiSystemPrompt(), 500);
    const waPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
    out.innerHTML = `
      <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--bg);white-space:pre-wrap;font-size:14px">${escHtml(msg)}</div>
      <div class="btn-row mt-12">
        <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(${JSON.stringify(msg)});showToast('Copied!','success')">📋 Copy</button>
        ${waPhone ? `<a class="btn btn-primary btn-sm" href="https://wa.me/6${waPhone}?text=${encodeURIComponent(msg)}" target="_blank">📱 Open WhatsApp</a>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="aiGenerateWhatsApp()">🔄 Regenerate</button>
      </div>`;
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red)">⚠️ ${escHtml(e.message)}</div>`;
  }
}

/* ---- Quick tool: summarise a client ---- */
function aiOpenSummaryTool() {
  const contacts = getContacts();
  const opts = contacts.slice(0, 300).map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
  document.getElementById('contactModalTitle').textContent = '📋 Summarise a Client';
  document.getElementById('contactModalBody').innerHTML = `
    <div class="form-group"><label class="form-label">Client</label>
      <select class="form-control" id="aisum_contact">${opts}</select></div>
    <div class="btn-row"><button class="btn btn-primary" onclick="aiGenerateSummary()">✨ Generate brief</button></div>
    <div id="aisum_out" style="margin-top:12px"></div>
  `;
  openModal('contactModal');
}

async function aiGenerateSummary() {
  const c = getContact(document.getElementById('aisum_contact').value);
  if (!c) return;
  const out = document.getElementById('aisum_out');
  out.innerHTML = '<div class="spinner"></div> Generating...';

  const cs = getCasesForContact(c.id);
  const age = c.dob ? ageFromDOB(c.dob) : '';
  const ins = Array.isArray(c.existingInsurance) ? c.existingInsurance.filter(Boolean).join(', ') : (c.existingInsurance || 'none recorded');
  const profile = `Name: ${c.name}${age ? ', age ' + age : ''}${c.gender ? ', ' + c.gender : ''}${c.race ? ', ' + c.race : ''}${c.maritalStatus ? ', ' + c.maritalStatus : ''}${c.dependants ? ', ' + c.dependants + ' dependants' : ''}${c.occupation ? ', ' + c.occupation : ''}${c.income ? ', income ' + c.income : ''}. Existing insurance: ${ins}.`;
  const caseTxt = cs.length ? cs.map(x => `${catMeta(x.category).label}: ${getStatusLabel(x.category, x.currentStatus)}${x.kiv ? ' (KIV)' : ''}${x.remarks ? ' — ' + x.remarks : ''}`).join('\n') : 'No cases yet.';
  const policies = Array.isArray(c.aiaPolicies) && c.aiaPolicies.length
    ? '\nAIA policies:\n' + c.aiaPolicies.map(p => `${p.planName || '—'} (${p.policyStatus || '—'}), sum assured ${p.sumAssured || '—'}, premium ${p.annualPremium || '—'}`).join('\n')
    : '';

  const prompt = `Give me a quick pre-meeting brief on this client. Cover: who they are, what protection they have/lack, where their cases stand, and 2-3 concrete talking points or opportunities. Be concise (bullet points).\n\n${profile}\nCases:\n${caseTxt}${policies}`;
  try {
    const brief = await aiProxyCall([{ role: 'user', content: prompt }], aiSystemPrompt(), 1200);
    out.innerHTML = `<div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--bg);white-space:pre-wrap;font-size:14px;line-height:1.55">${escHtml(brief)}</div>
      <div class="btn-row mt-12"><button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(${JSON.stringify(brief)});showToast('Copied!','success')">📋 Copy</button></div>`;
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red)">⚠️ ${escHtml(e.message)}</div>`;
  }
}
