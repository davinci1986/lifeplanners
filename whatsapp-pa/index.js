// ═══════════════════════════════════════════════════════════════════
//  JARVIS — LifePlanner Pro WhatsApp Personal Assistant
//  Monitors your WhatsApp 24/7. Every incoming message is pushed to
//  your Telegram with 3 AI-drafted reply suggestions. Tap a button to
//  send that reply on WhatsApp, or reply to the notification with your
//  own text to send a custom message. No desktop needed.
//
//  Run:  npm install && npm start   (scan the QR once — session is
//  saved in ./auth and survives restarts)
// ═══════════════════════════════════════════════════════════════════

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Config (all via environment variables) ────────────────────────
const CFG = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  ownerName: process.env.OWNER_NAME || 'Keith',
  ownerRole:
    process.env.OWNER_ROLE ||
    'an AIA Life Planner (insurance agent) in Malaysia serving clients in English, Malay and Chinese',
  // LifePlanner Apps Script web app URL + shared secret — lets JARVIS look up
  // the sender in your CRM (name, AIA policies, open cases) for personalised replies.
  crmProxyUrl: process.env.CRM_PROXY_URL || '',
  crmProxySecret: process.env.CRM_PROXY_SECRET || '',
  // Notify for group chats too? Default off (groups are noisy).
  watchGroups: process.env.WATCH_GROUPS === 'true',
  // Transcribe voice notes with Groq Whisper (free). On by default when a Groq key exists.
  transcribeVoice: process.env.TRANSCRIBE_VOICE !== 'false',
  // Ignore backlog older than this many seconds (prevents a flood after reconnect).
  maxMessageAgeSec: parseInt(process.env.MAX_MESSAGE_AGE_SEC || '120', 10),
  authDir: process.env.AUTH_DIR || './auth',
  // Message-topic log for /insights lives here — put it on the same
  // persistent volume as auth (default: subfolder of it) so it survives redeploys.
  dataDir: process.env.DATA_DIR || path.join(process.env.AUTH_DIR || './auth', 'data'),
  port: parseInt(process.env.PORT || '8080', 10),
};

if (!CFG.telegramToken || !CFG.telegramChatId) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. See README.md.');
  process.exit(1);
}
if (!CFG.groqApiKey) {
  console.warn('GROQ_API_KEY not set — notifications will work but without AI suggestions.');
}

const TG_API = `https://api.telegram.org/bot${CFG.telegramToken}`;

// ─── Runtime state ─────────────────────────────────────────────────
let sock = null;
let waConnected = false;
let mutedUntil = 0; // epoch ms; 0 = not muted
let startedAt = Date.now();
let notifCount = 0;

// Telegram notification message_id → { jid, name, suggestions[] }
const pending = new Map();
const PENDING_MAX = 300;

// Per-chat rolling conversation history (for better AI suggestions)
const history = new Map(); // jid → [{ from: 'them'|'me', text }]
const HISTORY_MAX = 10;

function remember(jid, from, text) {
  if (!history.has(jid)) history.set(jid, []);
  const h = history.get(jid);
  h.push({ from, text: String(text).slice(0, 500) });
  if (h.length > HISTORY_MAX) h.shift();
}

function trackPending(msgId, entry) {
  pending.set(msgId, entry);
  if (pending.size > PENDING_MAX) {
    const oldest = pending.keys().next().value;
    pending.delete(oldest);
  }
}

// ─── Telegram helpers ──────────────────────────────────────────────
async function tg(method, payload) {
  try {
    const res = await fetch(`${TG_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.error(`Telegram ${method} failed:`, e.message);
    return { ok: false };
  }
}

function tgSend(text, extra = {}) {
  return tg('sendMessage', {
    chat_id: CFG.telegramChatId,
    text,
    parse_mode: 'HTML',
    ...extra,
  });
}

async function tgSendQr(qrString) {
  try {
    const png = await QRCode.toBuffer(qrString, { width: 480, margin: 2 });
    const form = new FormData();
    form.append('chat_id', CFG.telegramChatId);
    form.append(
      'caption',
      '🔐 JARVIS needs to link to your WhatsApp.\nOpen WhatsApp → Settings → Linked Devices → Link a Device, and scan this QR (valid ~60s).'
    );
    form.append('photo', new Blob([png], { type: 'image/png' }), 'qr.png');
    await fetch(`${TG_API}/sendPhoto`, { method: 'POST', body: form });
  } catch (e) {
    console.error('Failed to send QR to Telegram:', e.message);
  }
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── CRM lookup (LifePlanner Google Sheet via Apps Script) ─────────
const crmCache = new Map(); // phone → { at, client } (client = null if not found)
const CRM_CACHE_TTL = 10 * 60 * 1000;

async function lookupClient(phone) {
  if (!CFG.crmProxyUrl || !CFG.crmProxySecret || !phone) return null;
  const cached = crmCache.get(phone);
  if (cached && Date.now() - cached.at < CRM_CACHE_TTL) return cached.client;
  try {
    const res = await fetch(CFG.crmProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pa: 'lookup', secret: CFG.crmProxySecret, phone }),
      redirect: 'follow', // Apps Script replies via 302 redirect
    });
    const data = await res.json();
    const client = data.ok && data.found ? { ...data.contact, cases: data.cases || [] } : null;
    crmCache.set(phone, { at: Date.now(), client });
    if (crmCache.size > 500) crmCache.delete(crmCache.keys().next().value);
    return client;
  } catch (e) {
    console.error('CRM lookup failed:', e.message);
    return null;
  }
}

function clientRecordText(client) {
  if (!client) return '';
  const lines = [`Name: ${client.name}`];
  if (client.dob) lines.push(`DOB: ${client.dob}`);
  if (client.occupation) lines.push(`Occupation: ${client.occupation}`);
  if (client.tags?.length) lines.push(`Tags: ${client.tags.join(', ')}`);
  if (client.aiaPolicies?.length) {
    lines.push('AIA policies:');
    client.aiaPolicies.forEach((p) => {
      lines.push(
        `  - ${p.planName || 'Unknown plan'} (policy ${p.policyNo || '?'}, status ${p.policyStatus || '?'})` +
          `${p.sumAssured ? `, sum assured ${p.sumAssured}` : ''}` +
          `${p.annualPremium ? `, annual premium ${p.annualPremium}` : ''}` +
          `${p.nextDueDate ? `, next due ${p.nextDueDate}` : ''}`
      );
    });
  }
  if (client.existingInsurance?.length) lines.push(`Other insurance: ${client.existingInsurance.join(', ')}`);
  if (client.cases?.length) {
    lines.push('Open cases with us:');
    client.cases.forEach((c) => {
      const status = c.statusLabel || (c.status ? `step ${c.status}` : '');
      lines.push(
        `  - ${c.category || ''}${c.label ? ' / ' + c.label : ''}${status ? ` — progress: ${status}` : ''}${c.nextStep ? ` — next step: ${c.nextStep}` : ''}`
      );
    });
  }
  if (client.notes) lines.push(`Notes: ${String(client.notes).slice(0, 400)}`);
  return lines.join('\n');
}

// ─── Groq: draft reply suggestions ─────────────────────────────────
async function suggestReplies(contactName, jid, client) {
  if (!CFG.groqApiKey) return [];
  const convo = (history.get(jid) || [])
    .map((m) => `${m.from === 'me' ? CFG.ownerName : contactName}: ${m.text}`)
    .join('\n');

  const record = clientRecordText(client);

  const system =
    `You are the personal assistant of ${CFG.ownerName}, ${CFG.ownerRole}. ` +
    `Draft WhatsApp replies ${CFG.ownerName} could send. Rules: ` +
    `1) Reply in the SAME language the contact used (English, Malay, Chinese or Manglish mix). ` +
    `2) Keep each reply short and natural like a real WhatsApp message — no signatures, no "Dear". ` +
    `3) Offer 3 options with different tones: (a) warm & personal, (b) professional, (c) short & efficient. ` +
    (record
      ? `4) A CLIENT RECORD from ${CFG.ownerName}'s CRM is provided. When they ask about THEIR plan/policy/premium/case, answer using ONLY facts in that record (plan names, status, premiums, due dates, case progress). ` +
        `5) If the answer is NOT in the record, do not guess or invent — draft a reply saying ${CFG.ownerName} will check the details and get back to them, or offer a call. ` +
        `6) The record may be slightly outdated: for money amounts or claim decisions, prefer confirming ("let me double-check and confirm with you"). `
      : `4) If they ask about insurance/policy matters, be helpful but never invent policy details — suggest checking and getting back to them, or arranging a call. `) +
    `Also classify the latest message: topic = exactly one of: ${TOPICS.join(', ')}. ` +
    `urgency = "urgent" (hospital admission, accident, death, angry client/complaint, time-critical money issue), ` +
    `"low" (plain greetings, stickers, festival wishes, casual chit-chat), or "normal" (everything else). ` +
    `Output STRICTLY this JSON object, no markdown, no commentary: ` +
    `{"topic":"<topic>","urgency":"<urgency>","replies":["<reply1>","<reply2>","<reply3>"]}`;

  const user =
    (record ? `CLIENT RECORD (from CRM):\n${record}\n\n` : '') +
    `Conversation with ${contactName} (last messages, oldest first):\n${convo}\n\nDraft 3 reply options to their latest message.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CFG.groqApiKey}`,
      },
      body: JSON.stringify({
        model: CFG.groqModel,
        temperature: 0.7,
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    return parseSuggestions(raw);
  } catch (e) {
    console.error('Groq request failed:', e.message);
    return { topic: 'other', urgency: 'normal', replies: [] };
  }
}

const URGENCIES = ['urgent', 'normal', 'low'];

// Fixed topic list — powers the /insights report
const TOPICS = [
  'claim',
  'premium_payment',
  'coverage_question',
  'new_plan_enquiry',
  'appointment',
  'policy_servicing',
  'greeting_personal',
  'other',
];

function parseSuggestions(raw) {
  // Preferred: {"topic":"...","replies":[...]} — be forgiving if wrapped in text.
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const o = JSON.parse(objMatch[0]);
      if (Array.isArray(o.replies)) {
        return {
          topic: TOPICS.includes(o.topic) ? o.topic : 'other',
          urgency: URGENCIES.includes(o.urgency) ? o.urgency : 'normal',
          replies: o.replies.map(String).filter(Boolean).slice(0, 3),
        };
      }
    } catch (_) {}
  }
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const arr = JSON.parse(arrMatch[0]);
      if (Array.isArray(arr))
        return { topic: 'other', urgency: 'normal', replies: arr.map(String).filter(Boolean).slice(0, 3) };
    } catch (_) {}
  }
  // Fallback: take non-empty lines
  return {
    topic: 'other',
    urgency: 'normal',
    replies: raw
      .split('\n')
      .map((l) => l.replace(/^\s*(\d+[.)]|[-*])\s*/, '').trim())
      .filter((l) => l.length > 2)
      .slice(0, 3),
  };
}

// ─── Insights: log every incoming question, report with /insights ──
const insightsFile = () => path.join(CFG.dataDir, 'messages.jsonl');

function logInsight(entry) {
  try {
    fs.mkdirSync(CFG.dataDir, { recursive: true });
    fs.appendFileSync(insightsFile(), JSON.stringify(entry) + '\n');
    // Keep the log bounded (~5MB → drop oldest half)
    const st = fs.statSync(insightsFile());
    if (st.size > 5 * 1024 * 1024) {
      const lines = fs.readFileSync(insightsFile(), 'utf8').split('\n').filter(Boolean);
      fs.writeFileSync(insightsFile(), lines.slice(Math.floor(lines.length / 2)).join('\n') + '\n');
    }
  } catch (e) {
    console.error('Insight log failed:', e.message);
  }
}

function readInsights(sinceMs) {
  try {
    return fs
      .readFileSync(insightsFile(), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try { return JSON.parse(l); } catch (_) { return null; }
      })
      .filter((e) => e && e.ts >= sinceMs);
  } catch (_) {
    return [];
  }
}

const TOPIC_LABELS = {
  claim: '🏥 Claims',
  premium_payment: '💰 Premium / payment',
  coverage_question: '🛡 Coverage questions',
  new_plan_enquiry: '✨ New plan enquiries',
  appointment: '📅 Appointments',
  policy_servicing: '🔧 Policy servicing',
  greeting_personal: '👋 Greetings / personal',
  media: '📎 Media messages',
  other: '❓ Other',
};

function insightsReport() {
  const now = Date.now();
  const days30 = readInsights(now - 30 * 86400000);
  if (!days30.length) {
    return '📈 <b>Insights</b>\n\nNo messages logged yet — data builds up as clients message you.';
  }
  const days7 = days30.filter((e) => e.ts >= now - 7 * 86400000);

  const count = (arr) => {
    const c = {};
    arr.forEach((e) => (c[e.topic] = (c[e.topic] || 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  };

  const urgent7 = days7.filter((e) => e.urgency === 'urgent').length;
  const urgent30 = days30.filter((e) => e.urgency === 'urgent').length;

  let out = `📈 <b>Insights — what clients ask you</b>\n`;
  if (urgent30) out += `🚨 Urgent: <b>${urgent7}</b> in 7d · <b>${urgent30}</b> in 30d\n`;
  out += `\n<b>Last 7 days</b> (${days7.length} messages):\n`;
  count(days7).forEach(([t, n]) => (out += `${TOPIC_LABELS[t] || t}: <b>${n}</b>\n`));
  out += `\n<b>Last 30 days</b> (${days30.length} messages):\n`;
  count(days30).forEach(([t, n]) => (out += `${TOPIC_LABELS[t] || t}: <b>${n}</b>\n`));

  const byContact = {};
  days30.forEach((e) => (byContact[e.name] = (byContact[e.name] || 0) + 1));
  const top = Object.entries(byContact).sort((a, b) => b[1] - a[1]).slice(0, 5);
  out += `\n<b>Most active contacts (30d)</b>:\n`;
  top.forEach(([n, c]) => (out += `• ${escHtml(n)} — ${c}\n`));
  return out;
}

// ─── Voice note transcription (Groq Whisper, free) ─────────────────
function getVoiceNote(msg) {
  const m = msg?.ephemeralMessage?.message || msg?.viewOnceMessage?.message || msg;
  return m?.audioMessage?.ptt ? m.audioMessage : null;
}

async function transcribeVoice(m, audio) {
  // Guards: skip long/huge notes (>3 min or >10MB)
  if ((audio.seconds || 0) > 180 || Number(audio.fileLength || 0) > 10 * 1024 * 1024) return null;
  try {
    const buf = await downloadMediaMessage(m, 'buffer', {});
    if (!buf || !buf.length) return null;
    const form = new FormData();
    form.append('model', 'whisper-large-v3-turbo');
    form.append('file', new Blob([buf], { type: audio.mimetype || 'audio/ogg' }), 'voice.ogg');
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${CFG.groqApiKey}` },
      body: form,
    });
    const data = await res.json();
    const text = (data.text || '').trim();
    return text.length > 1 ? text : null;
  } catch (e) {
    console.error('Voice transcription failed:', e.message);
    return null;
  }
}

// ─── WhatsApp message handling ─────────────────────────────────────
function extractText(msg) {
  const m = msg?.ephemeralMessage?.message || msg?.viewOnceMessage?.message || msg;
  if (!m) return null;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    null
  );
}

function mediaLabel(msg) {
  const m = msg?.ephemeralMessage?.message || msg?.viewOnceMessage?.message || msg;
  if (!m) return null;
  if (m.imageMessage) return '📷 Photo';
  if (m.videoMessage) return '🎥 Video';
  if (m.audioMessage) return m.audioMessage.ptt ? '🎙 Voice note' : '🎵 Audio';
  if (m.documentMessage) return `📎 Document: ${m.documentMessage.fileName || 'file'}`;
  if (m.stickerMessage) return '💟 Sticker';
  if (m.locationMessage) return '📍 Location';
  if (m.contactMessage || m.contactsArrayMessage) return '👤 Contact card';
  return null;
}

async function onIncomingMessage(m) {
  const jid = m.key.remoteJid;
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@broadcast')) return;
  const isGroup = jid.endsWith('@g.us');
  if (isGroup && !CFG.watchGroups) return;
  if (m.key.fromMe) {
    // Track our own replies (sent from phone or JARVIS) for conversation context
    const ownText = extractText(m.message);
    if (ownText) remember(jid, 'me', ownText);
    return;
  }

  // Skip stale backlog after reconnects
  const ts = Number(m.messageTimestamp) * 1000;
  if (ts && Date.now() - ts > CFG.maxMessageAgeSec * 1000) return;

  let text = extractText(m.message);
  const media = mediaLabel(m.message);
  if (!text && !media) return;

  // Voice notes: transcribe so they get suggestions like any text message
  let isVoice = false;
  if (!text && CFG.transcribeVoice && CFG.groqApiKey) {
    const audio = getVoiceNote(m.message);
    if (audio) {
      const transcript = await transcribeVoice(m, audio);
      if (transcript) {
        text = transcript;
        isVoice = true;
      }
    }
  }

  const displayText = isVoice ? `🎙 Voice note (transcribed):\n“${text}”` : text || media;
  if (text) remember(jid, 'them', text);

  if (Date.now() < mutedUntil) return; // muted — stay silent

  notifCount++;

  // CRM lookup by sender phone (only individual chats carry a usable number)
  const phone = !isGroup && jid.endsWith('@s.whatsapp.net') ? jid.split('@')[0] : '';
  const client = phone ? await lookupClient(phone) : null;
  const name = client?.name || m.pushName || jid.split('@')[0];

  // AI suggestions only make sense for text
  const ai = text
    ? await suggestReplies(name, jid, client)
    : { topic: 'media', urgency: 'normal', replies: [] };
  const suggestions = ai.replies;

  logInsight({
    ts: Date.now(),
    name,
    known: !!client,
    topic: ai.topic,
    urgency: ai.urgency,
    snippet: String(displayText).slice(0, 120),
  });

  let crmLine = '';
  if (client) {
    const bits = [];
    if (client.aiaPolicies?.length) bits.push(`${client.aiaPolicies.length} AIA polic${client.aiaPolicies.length > 1 ? 'ies' : 'y'}`);
    if (client.cases?.length) bits.push(`${client.cases.length} open case${client.cases.length > 1 ? 's' : ''}`);
    crmLine = `📇 <i>CRM: ${escHtml(bits.length ? bits.join(' · ') : 'known contact')}</i>\n`;
  }

  let body =
    (ai.urgency === 'urgent' ? `🚨 <b>URGENT</b>\n` : '') +
    `💬 <b>${escHtml(name)}</b>${isGroup ? ' <i>(group)</i>' : ''}\n` +
    crmLine +
    `${escHtml(displayText)}\n`;
  if (suggestions.length) {
    body += `\n🤖 <b>Suggested replies:</b>\n`;
    suggestions.forEach((s, i) => {
      body += `\n<b>${i + 1}.</b> ${escHtml(s)}\n`;
    });
    body += `\n<i>Tap a button to send, or reply to this message with your own text.</i>`;
  } else if (text) {
    body += `\n<i>Reply to this message with text and I'll send it for you.</i>`;
  } else {
    body += `\n<i>Media message — open WhatsApp to view. You can still reply to this message with text.</i>`;
  }

  const keyboard = suggestions.length
    ? {
        inline_keyboard: [
          suggestions.map((_, i) => ({
            text: `Send ${i + 1}`,
            callback_data: `s:${i}`,
          })),
        ],
      }
    : undefined;

  const extra = {};
  if (keyboard) extra.reply_markup = keyboard;
  if (ai.urgency === 'low') extra.disable_notification = true; // silent ping for chit-chat

  const sent = await tgSend(body, extra);
  if (sent.ok) {
    trackPending(sent.result.message_id, { jid, name, suggestions });
    if (ai.urgency === 'urgent') {
      // Pin urgent messages so they stay on top (best-effort)
      tg('pinChatMessage', {
        chat_id: CFG.telegramChatId,
        message_id: sent.result.message_id,
        disable_notification: true,
      });
    }
  }
}

async function sendWhatsApp(jid, text) {
  if (!sock || !waConnected) throw new Error('WhatsApp not connected');
  await sock.sendMessage(jid, { text });
  remember(jid, 'me', text);
}

// ─── Telegram long-polling (buttons + custom replies + commands) ───
async function pollTelegram() {
  let offset = 0;
  for (;;) {
    try {
      const res = await fetch(
        `${TG_API}/getUpdates?timeout=50&offset=${offset}&allowed_updates=["message","callback_query"]`
      );
      const data = await res.json();
      if (!data.ok) {
        await sleep(5000);
        continue;
      }
      for (const upd of data.result) {
        offset = upd.update_id + 1;
        try {
          await handleTelegramUpdate(upd);
        } catch (e) {
          console.error('Update handling error:', e.message);
        }
      }
    } catch (e) {
      console.error('Telegram poll error:', e.message);
      await sleep(5000);
    }
  }
}

async function handleTelegramUpdate(upd) {
  // ── Inline button: send suggestion N ──
  if (upd.callback_query) {
    const q = upd.callback_query;
    if (String(q.message?.chat?.id) !== String(CFG.telegramChatId)) return;
    const entry = pending.get(q.message.message_id);
    const idx = parseInt((q.data || '').split(':')[1], 10);
    if (!entry || isNaN(idx) || !entry.suggestions[idx]) {
      await tg('answerCallbackQuery', {
        callback_query_id: q.id,
        text: 'Expired — reply to the notification with your own text instead.',
        show_alert: true,
      });
      return;
    }
    try {
      await sendWhatsApp(entry.jid, entry.suggestions[idx]);
      await tg('answerCallbackQuery', { callback_query_id: q.id, text: '✅ Sent!' });
      await tgSend(`✅ Sent to <b>${escHtml(entry.name)}</b>:\n${escHtml(entry.suggestions[idx])}`);
      pending.delete(q.message.message_id);
    } catch (e) {
      await tg('answerCallbackQuery', {
        callback_query_id: q.id,
        text: `❌ Failed: ${e.message}`,
        show_alert: true,
      });
    }
    return;
  }

  const msg = upd.message;
  if (!msg || String(msg.chat.id) !== String(CFG.telegramChatId)) return;
  const text = (msg.text || '').trim();

  // ── Custom reply: user replied to a notification ──
  if (msg.reply_to_message && pending.has(msg.reply_to_message.message_id) && text) {
    const entry = pending.get(msg.reply_to_message.message_id);
    try {
      await sendWhatsApp(entry.jid, text);
      await tgSend(`✅ Sent to <b>${escHtml(entry.name)}</b>:\n${escHtml(text)}`);
    } catch (e) {
      await tgSend(`❌ Could not send: ${escHtml(e.message)}`);
    }
    return;
  }

  // ── Commands ──
  if (text === '/start' || text === '/help') {
    await tgSend(
      `🤖 <b>JARVIS — WhatsApp PA</b>\n\n` +
        `I watch your WhatsApp and notify you here with AI reply suggestions.\n\n` +
        `<b>Commands</b>\n` +
        `/status — connection &amp; stats\n` +
        `/insights — what clients ask you most (7/30 days)\n` +
        `/mute 60 — silence notifications for N minutes\n` +
        `/unmute — resume notifications\n` +
        `/groups on|off — include group chats\n\n` +
        `Tap <b>Send 1/2/3</b> under a notification to send that suggestion, ` +
        `or reply to the notification with your own text.`
    );
  } else if (text === '/status') {
    const upMin = Math.floor((Date.now() - startedAt) / 60000);
    const muted = Date.now() < mutedUntil ? `yes (until ${new Date(mutedUntil).toLocaleTimeString()})` : 'no';
    await tgSend(
      `📊 <b>Status</b>\n` +
        `WhatsApp: ${waConnected ? '🟢 connected' : '🔴 disconnected'}\n` +
        `Uptime: ${Math.floor(upMin / 60)}h ${upMin % 60}m\n` +
        `Notifications sent: ${notifCount}\n` +
        `Groups watched: ${CFG.watchGroups ? 'yes' : 'no'}\n` +
        `Muted: ${muted}\n` +
        `AI: ${CFG.groqApiKey ? '🟢 ' + CFG.groqModel : '⚪ off'}\n` +
        `CRM lookup: ${CFG.crmProxyUrl && CFG.crmProxySecret ? '🟢 on' : '⚪ off'}`
    );
  } else if (text === '/insights') {
    await tgSend(insightsReport());
  } else if (text.startsWith('/mute')) {
    const mins = parseInt(text.split(/\s+/)[1], 10) || 60;
    mutedUntil = Date.now() + mins * 60000;
    await tgSend(`🔇 Muted for ${mins} min. /unmute to resume.`);
  } else if (text === '/unmute') {
    mutedUntil = 0;
    await tgSend('🔔 Notifications resumed.');
  } else if (text.startsWith('/groups')) {
    const arg = text.split(/\s+/)[1];
    if (arg === 'on' || arg === 'off') {
      CFG.watchGroups = arg === 'on';
      await tgSend(`👥 Group chat notifications: <b>${arg}</b>`);
    } else {
      await tgSend('Usage: /groups on  |  /groups off');
    }
  }
}

// ─── WhatsApp connection (with auto-reconnect) ─────────────────────
let qrNotifiedAt = 0;

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(CFG.authDir);
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch (e) {
    console.warn('Could not fetch latest WA version, using library default:', e.message);
  }

  sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger: pino({ level: 'warn' }),
    markOnlineOnConnect: false, // don't suppress your phone's own notifications
    syncFullHistory: false,
    browser: ['JARVIS PA', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('QR received — sending to Telegram…');
      // Don't spam: at most one QR per 45s
      if (Date.now() - qrNotifiedAt > 45000) {
        qrNotifiedAt = Date.now();
        await tgSendQr(qr);
      }
    }

    if (connection === 'open') {
      waConnected = true;
      console.log('WhatsApp connected.');
      await tgSend('🟢 <b>JARVIS online.</b> Watching your WhatsApp. /help for commands.');
    }

    if (connection === 'close') {
      waConnected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('Logged out — need a fresh QR scan.');
        await tgSend('🔴 <b>WhatsApp session logged out.</b> Restarting to generate a new QR…');
        // Wipe dead credentials so a fresh QR is generated (keep the data subfolder)
        try {
          for (const f of fs.readdirSync(CFG.authDir)) {
            if (path.resolve(CFG.authDir, f) !== path.resolve(CFG.dataDir)) {
              fs.rmSync(path.join(CFG.authDir, f), { recursive: true, force: true });
            }
          }
        } catch (e) {
          console.error('Auth wipe failed:', e.message);
        }
        setTimeout(startWhatsApp, 3000);
      } else {
        console.log(`Connection closed (code ${code}) — reconnecting…`);
        setTimeout(startWhatsApp, 5000);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return; // ignore history syncs
    for (const m of messages) {
      try {
        await onIncomingMessage(m);
      } catch (e) {
        console.error('Message handling error:', e.message);
      }
    }
  });
}

// ─── Health endpoint (keeps PaaS hosts happy + easy uptime checks) ─
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        whatsapp: waConnected ? 'connected' : 'disconnected',
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
        notifications: notifCount,
      })
    );
  })
  .listen(CFG.port, () => console.log(`Health endpoint on :${CFG.port}`));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Boot ──────────────────────────────────────────────────────────
console.log('JARVIS starting…');
startWhatsApp().catch((e) => {
  console.error('Fatal WhatsApp start error:', e);
  process.exit(1);
});
pollTelegram();
