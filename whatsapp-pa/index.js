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
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const http = require('http');

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
  // Notify for group chats too? Default off (groups are noisy).
  watchGroups: process.env.WATCH_GROUPS === 'true',
  // Ignore backlog older than this many seconds (prevents a flood after reconnect).
  maxMessageAgeSec: parseInt(process.env.MAX_MESSAGE_AGE_SEC || '120', 10),
  authDir: process.env.AUTH_DIR || './auth',
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

// ─── Groq: draft reply suggestions ─────────────────────────────────
async function suggestReplies(contactName, jid) {
  if (!CFG.groqApiKey) return [];
  const convo = (history.get(jid) || [])
    .map((m) => `${m.from === 'me' ? CFG.ownerName : contactName}: ${m.text}`)
    .join('\n');

  const system =
    `You are the personal assistant of ${CFG.ownerName}, ${CFG.ownerRole}. ` +
    `Draft WhatsApp replies ${CFG.ownerName} could send. Rules: ` +
    `1) Reply in the SAME language the contact used (English, Malay, Chinese or Manglish mix). ` +
    `2) Keep each reply short and natural like a real WhatsApp message — no signatures, no "Dear". ` +
    `3) Offer 3 options with different tones: (a) warm & personal, (b) professional, (c) short & efficient. ` +
    `4) If they ask about insurance/policy matters, be helpful but never invent policy details — suggest checking and getting back to them, or arranging a call. ` +
    `5) Output STRICTLY a JSON array of 3 strings. No markdown, no commentary.`;

  const user = `Conversation with ${contactName} (last messages, oldest first):\n${convo}\n\nDraft 3 reply options to their latest message.`;

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
    return [];
  }
}

function parseSuggestions(raw) {
  // Model is told to return a JSON array; be forgiving if it wraps it in text.
  const match = raw.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) return arr.map(String).filter(Boolean).slice(0, 3);
    } catch (_) {}
  }
  // Fallback: take non-empty lines
  return raw
    .split('\n')
    .map((l) => l.replace(/^\s*(\d+[.)]|[-*])\s*/, '').trim())
    .filter((l) => l.length > 2)
    .slice(0, 3);
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

  const text = extractText(m.message);
  const media = mediaLabel(m.message);
  if (!text && !media) return;

  const name = m.pushName || jid.split('@')[0];
  const displayText = text || media;
  if (text) remember(jid, 'them', text);

  if (Date.now() < mutedUntil) return; // muted — stay silent

  notifCount++;

  // AI suggestions only make sense for text
  const suggestions = text ? await suggestReplies(name, jid) : [];

  let body =
    `💬 <b>${escHtml(name)}</b>${isGroup ? ' <i>(group)</i>' : ''}\n` +
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

  const sent = await tgSend(body, keyboard ? { reply_markup: keyboard } : {});
  if (sent.ok) {
    trackPending(sent.result.message_id, { jid, name, suggestions });
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
        `AI: ${CFG.groqApiKey ? '🟢 ' + CFG.groqModel : '⚪ off'}`
    );
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
        // Wipe dead credentials so a fresh QR is generated
        const fs = require('fs');
        fs.rmSync(CFG.authDir, { recursive: true, force: true });
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
