/* ============================================
   Sounds — Web Audio API (no external files)
   ============================================ */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', gain = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    vol.gain.setValueAtTime(gain, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* audio not supported */ }
}

function playClick() {
  if (!DB.settings?.notifySound) return;
  playTone(800, 0.06, 'sine', 0.1);
}

function playSuccess() {
  if (!DB.settings?.notifySound) return;
  playTone(880, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(1100, 0.18, 'sine', 0.1), 120);
}

function playComplete() {
  if (!DB.settings?.notifySound) return;
  playTone(523, 0.1, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 100);
  setTimeout(() => playTone(784, 0.2, 'sine', 0.12), 200);
}

function playReminder() {
  if (!DB.settings?.notifySound) return;
  playTone(600, 0.1, 'sine', 0.15);
  setTimeout(() => playTone(600, 0.1, 'sine', 0.12), 200);
  setTimeout(() => playTone(600, 0.15, 'sine', 0.15), 400);
}

function playDelete() {
  if (!DB.settings?.notifySound) return;
  playTone(400, 0.08, 'sine', 0.08);
  setTimeout(() => playTone(300, 0.12, 'sine', 0.06), 80);
}

// Attach click sound to all interactive elements
document.addEventListener('click', function(e) {
  const target = e.target.closest('button, .nav-item, .case-item, .stat-card, .filter-chip, .tab-btn');
  if (target && !target.classList.contains('modal-close')) {
    playClick();
  }
}, true);
