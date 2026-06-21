// LifePlanner Pro — Telegram Bot Webhook
// Deploy as: Web App → Execute as Me → Anyone can access
// After deploy: set webhook via browser:
// https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_WEBAPP_URL>

const BOT_TOKEN = ''; // ← paste your Telegram bot token here
const ALLOWED_CHAT_ID = ''; // ← paste your Chat ID here (security: only you can use it)
const SPREADSHEET_ID = ''; // ← paste your Google Sheet ID here
const GROQ_API_KEY = ''; // ← paste your Groq API key here (gsk_...) for the AI Assistant (free)

// ─── ENTRY POINT ───────────────────────────────────────────────
function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);

    // AI Assistant proxy (called from the web app, not Telegram)
    if (update.ai === true) {
      return handleAIProxy(update);
    }

    // Two-factor login OTP (called from the web app)
    if (update.otp === 'send')   return handleOtpSend(update);
    if (update.otp === 'verify') return handleOtpVerify(update);

    const msg = update.message || update.edited_message;
    if (!msg) return ok();

    const chatId = String(msg.chat.id);
    const text = (msg.text || '').trim();

    // Security: only respond to your own chat
    if (chatId !== String(ALLOWED_CHAT_ID)) {
      sendMessage(chatId, '⛔ Unauthorised');
      return ok();
    }

    // Route commands
    if (text.startsWith('/due') || text === '/reminders') {
      handleDue(chatId);
    } else if (text.startsWith('/kiv')) {
      handleKIV(chatId);
    } else if (text.startsWith('/summary')) {
      handleSummary(chatId);
    } else if (text.startsWith('/search ')) {
      handleSearch(chatId, text.replace('/search ', '').trim());
    } else if (text.startsWith('/overdue')) {
      handleOverdue(chatId);
    } else if (text.startsWith('/priority')) {
      handlePriority(chatId);
    } else if (text === '/help' || text === '/start') {
      handleHelp(chatId);
    } else {
      sendMessage(chatId, '❓ Unknown command. Send /help for a list of commands.');
    }
  } catch (err) {
    Logger.log('Error: ' + err);
    // Don't crash silently — log it
  }
  return ok();
}

// ─── COMMANDS ──────────────────────────────────────────────────

function handleHelp(chatId) {
  sendMessage(chatId,
    '🤖 *LifePlanner Pro Bot*\n\n' +
    '/due — Reminders due today\n' +
    '/overdue — Overdue reminders\n' +
    '/kiv — All KIV cases\n' +
    '/priority — Priority cases\n' +
    '/summary — Today\'s dashboard\n' +
    '/search name — Search contacts & cases\n' +
    '/help — Show this menu'
  );
}

function handleDue(chatId) {
  const today = todayStr();
  const rows = getSheet('Reminders');
  // cols: id, owner_email, case_id, contact_name, category, title, date, time, done, created_at
  const due = rows.filter(r => toDateStr(r[6]) === today && !isDone(r[8]));
  if (due.length === 0) {
    sendMessage(chatId, '✅ No reminders due today!');
    return;
  }
  let msg = '📅 *Reminders due today (' + due.length + '):*\n\n';
  due.forEach(r => {
    const time = r[7] ? ' at ' + r[7] : '';
    msg += '• ' + esc(r[5]) + time + '\n  👤 ' + esc(r[3] || '—') + ' • ' + esc(r[4] || '—') + '\n';
  });
  sendMessage(chatId, msg);
}

function handleOverdue(chatId) {
  const today = todayStr();
  const rows = getSheet('Reminders');
  const overdue = rows.filter(r => toDateStr(r[6]) < today && !isDone(r[8]));
  if (overdue.length === 0) {
    sendMessage(chatId, '✅ No overdue reminders!');
    return;
  }
  let msg = '⚠️ *Overdue reminders (' + overdue.length + '):*\n\n';
  overdue.slice(0, 15).forEach(r => {
    msg += '• ' + esc(r[5]) + ' — ' + toDateStr(r[6]) + '\n  👤 ' + esc(r[3] || '—') + '\n';
  });
  if (overdue.length > 15) msg += '\n_...and ' + (overdue.length - 15) + ' more_';
  sendMessage(chatId, msg);
}

function handleKIV(chatId) {
  const rows = getSheet('Cases');
  // cols: id, owner_email, contact_id, contact_name, category, label, sub_label, current_status, status_history, remarks, priority(10), kiv(11)
  const kiv = rows.filter(r => isTrue(r[11]));
  if (kiv.length === 0) {
    sendMessage(chatId, '📌 No KIV cases.');
    return;
  }
  let msg = '📌 *KIV Cases (' + kiv.length + '):*\n\n';
  kiv.slice(0, 15).forEach(r => {
    msg += '• ' + esc(r[3]) + ' — ' + esc(r[4]) + (r[5] ? ' / ' + esc(r[5]) : '') + '\n';
  });
  if (kiv.length > 15) msg += '\n_...and ' + (kiv.length - 15) + ' more_';
  sendMessage(chatId, msg);
}

function handlePriority(chatId) {
  const rows = getSheet('Cases');
  // priority is col 10
  const priority = rows.filter(r => isTrue(r[10]));
  if (priority.length === 0) {
    sendMessage(chatId, '⭐ No priority cases.');
    return;
  }
  let msg = '⭐ *Priority Cases (' + priority.length + '):*\n\n';
  priority.slice(0, 15).forEach(r => {
    const kiv = isTrue(r[11]) ? ' 📌' : '';
    msg += '• ' + esc(r[3]) + ' — ' + esc(r[4]) + kiv + '\n';
  });
  if (priority.length > 15) msg += '\n_...and ' + (priority.length - 15) + ' more_';
  sendMessage(chatId, msg);
}

function handleSummary(chatId) {
  const cases = getSheet('Cases');
  const reminders = getSheet('Reminders');
  const contacts = getSheet('Contacts');
  const today = todayStr();

  const totalCases = cases.length;
  const kivCases = cases.filter(r => isTrue(r[11])).length;
  const priorityCases = cases.filter(r => isTrue(r[10])).length;
  const dueToday = reminders.filter(r => toDateStr(r[6]) === today && !isDone(r[8])).length;
  const overdue = reminders.filter(r => toDateStr(r[6]) < today && !isDone(r[8])).length;
  const totalContacts = contacts.length;

  // Cases by category
  const cats = {};
  cases.forEach(r => {
    const cat = r[4] || 'unknown';
    cats[cat] = (cats[cat] || 0) + 1;
  });
  const catLines = Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => '  • ' + k + ': ' + v)
    .join('\n');

  sendMessage(chatId,
    '📊 *LifePlanner Pro — Summary*\n' +
    '📅 ' + today + '\n\n' +
    '👥 Contacts: *' + totalContacts + '*\n' +
    '📁 Total Cases: *' + totalCases + '*\n' +
    '⭐ Priority: *' + priorityCases + '*\n' +
    '📌 KIV: *' + kivCases + '*\n' +
    '🔔 Due Today: *' + dueToday + '*\n' +
    '⚠️ Overdue: *' + overdue + '*\n\n' +
    '*Cases by category:*\n' + catLines
  );
}

function handleSearch(chatId, query) {
  if (!query) { sendMessage(chatId, 'Usage: /search name'); return; }
  const q = query.toLowerCase();

  const contacts = getSheet('Contacts');
  // cols: id, owner_email, name(2), phone(3)
  const matchedContacts = contacts.filter(r =>
    String(r[2] || '').toLowerCase().includes(q) ||
    String(r[3] || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
  );

  const cases = getSheet('Cases');
  // cols: id, owner_email, contact_id, contact_name(3), category(4)
  const matchedCases = cases.filter(r =>
    String(r[3] || '').toLowerCase().includes(q)
  );

  if (matchedContacts.length === 0 && matchedCases.length === 0) {
    sendMessage(chatId, '🔍 No results for "' + query + '"');
    return;
  }

  let msg = '🔍 *Search: "' + esc(query) + '"*\n\n';

  if (matchedContacts.length > 0) {
    msg += '*Contacts (' + matchedContacts.length + '):*\n';
    matchedContacts.slice(0, 5).forEach(r => {
      msg += '• ' + esc(r[2]) + (r[3] ? ' — ' + r[3] : '') + '\n';
    });
    msg += '\n';
  }

  if (matchedCases.length > 0) {
    msg += '*Cases (' + matchedCases.length + '):*\n';
    matchedCases.slice(0, 8).forEach(r => {
      const kiv = isTrue(r[11]) ? ' 📌' : '';
      const pri = isTrue(r[10]) ? ' ⭐' : '';
      msg += '• ' + esc(r[3]) + ' — ' + esc(r[4]) + (r[5] ? ' / ' + esc(r[5]) : '') + kiv + pri + '\n';
    });
  }

  sendMessage(chatId, msg);
}

// ─── AI ASSISTANT PROXY (Anthropic Claude) ──────────────────────
function handleAIProxy(data) {
  if (!GROQ_API_KEY) {
    return jsonOut({ ok: false, error: 'AI not configured: add GROQ_API_KEY in Apps Script.' });
  }
  try {
    // Groq is OpenAI-compatible: system goes in as the first message.
    const messages = [];
    if (data.system) messages.push({ role: 'system', content: data.system });
    (data.messages || []).forEach(m => messages.push({ role: m.role, content: m.content }));

    const res = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY },
      muteHttpExceptions: true,
      payload: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: data.max_tokens || 1500,
        messages: messages
      })
    });
    const body = JSON.parse(res.getContentText());
    if (body.error) {
      return jsonOut({ ok: false, error: body.error.message || 'AI error' });
    }
    const text = (body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content) || '';
    return jsonOut({ ok: true, text: text });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── TWO-FACTOR LOGIN OTP ───────────────────────────────────────
function handleOtpSend(data) {
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const nonce = Utilities.getUuid();
    CacheService.getScriptCache().put('otp_' + nonce, code, 300); // 5 min
    sendMessage(ALLOWED_CHAT_ID,
      '🔐 Your LifePlanner login code: *' + code + '*\n\nExpires in 5 minutes. If this wasn\'t you, ignore this message.');
    return jsonOut({ ok: true, nonce: nonce });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function handleOtpVerify(data) {
  const cache = CacheService.getScriptCache();
  const key = 'otp_' + (data.nonce || '');
  const stored = cache.get(key);
  if (stored && stored === String(data.code || '').trim()) {
    cache.remove(key);
    return jsonOut({ ok: true });
  }
  return jsonOut({ ok: false, error: 'Invalid or expired code' });
}

// ─── HELPERS ───────────────────────────────────────────────────

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1); // skip header row
}

function sendMessage(chatId, text) {
  const url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';
  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (e) {
    Logger.log('sendMessage failed: ' + e);
  }
}

function todayStr() {
  // Use Malaysia timezone (UTC+8)
  const d = new Date();
  const myt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const y = myt.getUTCFullYear();
  const m = String(myt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(myt.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// Convert Google Sheets date cell (Date object or string) to YYYY-MM-DD
function toDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return String(val).substring(0, 10); // already a string, take YYYY-MM-DD part
}

// Check if a "done" cell is truthy
function isDone(val) {
  return val === true || val === 'true' || val === 1 || val === 'TRUE';
}

// Check if a boolean cell (kiv, priority) is truthy
function isTrue(val) {
  return val === true || val === 'true' || val === 1 || val === 'TRUE';
}

// Escape special Markdown characters in contact names to prevent parse errors
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[*_`\[]/g, '\\$&');
}

function ok() {
  return ContentService.createTextOutput('OK');
}
