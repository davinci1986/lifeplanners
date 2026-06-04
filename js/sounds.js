/* ============================================
   Sounds — Web Audio API (no external files)
   12 distinct context-aware sounds
   ============================================ */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function _tone(freq, dur, type = 'sine', gain = 0.1, freqEnd = null) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.connect(vol); vol.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
    vol.gain.setValueAtTime(gain, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur + 0.01);
  } catch (e) {}
}

function _sfx(fn) {
  if (typeof DB !== 'undefined' && DB?.settings?.notifySound === false) return;
  fn();
}

/* ── 1. Light UI tap — generic click ── */
function playClick() {
  _sfx(() => _tone(720, 0.05, 'sine', 0.07));
}

/* ── 2. Navigation whoosh — sidebar page change ── */
function playNav() {
  _sfx(() => _tone(320, 0.12, 'sine', 0.07, 580));
}

/* ── 3. Modal open — upward sweep ── */
function playOpen() {
  _sfx(() => {
    _tone(280, 0.14, 'sine', 0.08, 620);
    setTimeout(() => _tone(680, 0.08, 'sine', 0.04), 100);
  });
}

/* ── 4. Modal close — downward sweep ── */
function playClose() {
  _sfx(() => _tone(540, 0.1, 'sine', 0.07, 240));
}

/* ── 5. Success — C-E-G major arpeggio ── */
function playSuccess() {
  _sfx(() => {
    _tone(523, 0.14, 'sine', 0.08);
    setTimeout(() => _tone(659, 0.12, 'sine', 0.07), 85);
    setTimeout(() => _tone(784, 0.2,  'sine', 0.08), 170);
  });
}

/* ── 6. Create new record — ascending 3-note ── */
function playCreate() {
  _sfx(() => {
    _tone(440, 0.08, 'sine', 0.07);
    setTimeout(() => _tone(554, 0.08, 'sine', 0.07), 90);
    setTimeout(() => _tone(659, 0.16, 'sine', 0.08), 180);
  });
}

/* ── 7. Save/update — soft double ping ── */
function playSave() {
  _sfx(() => {
    _tone(580, 0.07, 'sine', 0.07);
    setTimeout(() => _tone(780, 0.1, 'sine', 0.06), 85);
  });
}

/* ── 8. Delete — low thud ── */
function playDelete() {
  _sfx(() => {
    _tone(280, 0.1, 'sine', 0.09, 120);
    setTimeout(() => _tone(90, 0.18, 'sine', 0.07), 80);
  });
}

/* ── 9. Error — dissonant buzz ── */
function playError() {
  _sfx(() => {
    _tone(220, 0.08, 'square', 0.07);
    setTimeout(() => _tone(196, 0.12, 'square', 0.06), 110);
  });
}

/* ── 10. Filter / toggle — quick swoosh ── */
function playFilter() {
  _sfx(() => _tone(480, 0.09, 'sine', 0.06, 720));
}

/* ── 11. View mode toggle — snap-click ── */
function playToggle() {
  _sfx(() => {
    _tone(820, 0.04, 'sine', 0.06);
    setTimeout(() => _tone(1050, 0.05, 'sine', 0.05), 55);
  });
}

/* ── 12. Completion chime — full C chord ── */
function playComplete() {
  _sfx(() => {
    _tone(523, 0.12, 'sine', 0.09);
    setTimeout(() => _tone(659, 0.12, 'sine', 0.08), 100);
    setTimeout(() => _tone(784, 0.24, 'sine', 0.1),  200);
    setTimeout(() => _tone(1046,0.18, 'sine', 0.06), 300);
  });
}

/* ── Bonus: Reminder triple beep ── */
function playReminder() {
  _sfx(() => [0, 190, 380].forEach(d => setTimeout(() => _tone(700, 0.1, 'sine', 0.1), d)));
}

/* ── Bonus: Step done — tick ── */
function playStepDone() {
  _sfx(() => {
    _tone(920, 0.04, 'sine', 0.06);
    setTimeout(() => _tone(1240, 0.08, 'sine', 0.06), 50);
  });
}

/* ── Bonus: Birthday ── */
function playBirthday() {
  _sfx(() => [523,659,784,1046].forEach((f, i) => setTimeout(() => _tone(f, 0.18, 'sine', 0.08), i * 80)));
}

/* ── Bonus: Export ── */
function playExport() {
  _sfx(() => {
    _tone(440, 0.06, 'sine', 0.06);
    setTimeout(() => _tone(554, 0.06, 'sine', 0.05), 70);
    setTimeout(() => _tone(659, 0.12, 'sine', 0.07), 140);
  });
}

/* ── Sound on/off toggle ── */
function toggleSound() {
  if (!DB.settings) DB.settings = {};
  DB.settings.notifySound = (DB.settings.notifySound === false) ? true : false;
  saveDB();
  updateSoundBtn();
  if (DB.settings.notifySound) {
    setTimeout(() => playClick(), 50);
  }
}

function updateSoundBtn() {
  const on = DB?.settings?.notifySound !== false;
  const btn = document.getElementById('soundToggleBtn');
  const iconOn  = document.getElementById('soundIconOn');
  const iconOff = document.getElementById('soundIconOff');
  if (!btn) return;
  if (iconOn)  iconOn.style.display  = on ? '' : 'none';
  if (iconOff) iconOff.style.display = on ? 'none' : '';
  btn.style.opacity = on ? '1' : '0.45';
  btn.title = on ? 'Sound On — click to mute' : 'Sound Off — click to enable';
}

/* ── Context-aware event delegation ── */
document.addEventListener('click', function(e) {
  if (typeof DB !== 'undefined' && DB?.settings?.notifySound === false) return;

  const t = e.target.closest(
    'button, .nav-item, .case-item, .stat-card, .filter-chip, .tab-btn, ' +
    '.crm-list-row, .contact-card, .crm-view-btn, .crm-filter-chip, .kiv-item, .reminder-item'
  );
  if (!t) return;

  // Specific element types — play matching sound
  if (t.classList.contains('nav-item'))                         { playNav();    return; }
  if (t.classList.contains('crm-view-btn'))                     { playToggle(); return; }
  if (t.classList.contains('crm-filter-chip'))                  { playFilter(); return; }
  if (t.classList.contains('filter-chip'))                      { playFilter(); return; }
  if (t.classList.contains('contact-card') ||
      t.classList.contains('crm-list-row') ||
      t.classList.contains('case-item'))                        { playOpen();   return; }
  if (t.classList.contains('stat-card'))                        { playClick();  return; }

  // Button text context
  const txt = (t.textContent || '').trim();
  if (/Delete|🗑/i.test(txt))                                   return; // playDelete() called by fn
  if (/Export|📥/i.test(txt))                                   { playExport(); return; }
  if (/Filter|🔽/i.test(txt))                                   { playFilter(); return; }
  if (/New Contact|New Case|\+ New/i.test(txt))                 { playCreate(); return; }
  if (/Save|Create|Update/i.test(txt))                          return; // playSave() called by fn
  if (/Cancel|Close|✕/i.test(txt))                             { playClose();  return; }

  playClick(); // fallback
}, true);
