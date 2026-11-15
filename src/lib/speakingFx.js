let ctx = null;
let raf = 0;
let active = null;   // { el, analyser, data }
let level = 0;

// Browsers only allow audio analysis after a click or key press
function unlock() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  ctx?.resume?.();
}
['pointerdown', 'keydown'].forEach(type => window.addEventListener(type, unlock, { passive: true }));

function ensureGlow() {
  const stage = document.querySelector('.assistant-stage');
  if (!stage || stage.querySelector('.aura-speak-glow')) return;
  if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
  stage.style.isolation = 'isolate';
  const glow = document.createElement('div');
  glow.className = 'aura-speak-glow';
  glow.setAttribute('aria-hidden', 'true');
  stage.prepend(glow);
}

function clearVars() {
  const s = document.body.style;
  ['--aura-level', '--aura-x', '--aura-rot'].forEach(name => s.removeProperty(name));
}

function frame(t) {
  if (!active) return;

  let target;
  if (active.analyser) {
    active.analyser.getByteTimeDomainData(active.data);
    let sum = 0;
    for (const v of active.data) { const d = (v - 128) / 128; sum += d * d; }
    target = Math.min(1, Math.sqrt(sum / active.data.length) * 4);   // 4 = sensitivity
  } else {
    target = 0.45 + 0.35 * Math.sin(t / 90);   // fallback when audio analysis isn't available
  }

  level += (target - level) * 0.35;            // smoothing
  const s = document.body.style;
  s.setProperty('--aura-level', level.toFixed(3));
  s.setProperty('--aura-x', (Math.sin(t / 70) * level).toFixed(3));
  s.setProperty('--aura-rot', (Math.sin(t / 130) * level).toFixed(3));

  ensureGlow();   // the page re-renders sometimes, so re-check every frame
  raf = requestAnimationFrame(frame);
}

export function attachSpeakingFx(el) {
  let analyser = null;
  let data = null;

  if (ctx && ctx.state === 'running') {
    try {
      const source = ctx.createMediaElementSource(el);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      data = new Uint8Array(analyser.fftSize);
    } catch {
      analyser = null;
    }
  }

  const start = () => {
    active = { el, analyser, data };
    document.body.classList.add('aura-speaking');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  };

  const stop = () => {
    if (!active || active.el !== el) return;   // ignore events from an old clip
    active = null;
    cancelAnimationFrame(raf);
    document.body.classList.remove('aura-speaking');
    clearVars();
    level = 0;
  };

  el.addEventListener('playing', start);
  el.addEventListener('pause', stop);
  el.addEventListener('ended', stop);
  el.addEventListener('error', stop);
}