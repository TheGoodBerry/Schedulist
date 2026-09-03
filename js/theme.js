/* Schedulist — theme engine
   Defines the theme data shape, built-in presets, and the logic to apply a
   theme to the document (colors, background, font, particles, sounds).
*/
(function (global) {

  function defaultTheme() {
    return {
      name: 'Departure Board',
      colors: {
        bg1: '#12151D',
        bg2: '#191D28',
        card: '#1C212C',
        border: 'rgba(237,239,244,0.10)',
        text: '#EDEFF4',
        textDim: '#8891A3',
        accent: '#E8A33D',
        accent2: '#4FD1C5',
        progressTrack: 'rgba(237,239,244,0.10)',
      },
      background: { type: 'gradient', angle: 165, image: null, fit: 'cover', dim: 0 },
      font: { display: 'mono-slab', label: 'system-sans' },
      radius: 4,
      particles: { enabled: false, type: 'none', color: '#E8A33D', color2: '#4FD1C5', density: 40, speed: 1 },
      sounds: { tick: null, tickEnabled: false, classChange: null, classChangeEnabled: true, music: null, musicVolume: 0.4 },
    };
  }

  const FONT_STACKS = {
    'mono-slab': `'JetBrains Mono','Space Mono','SF Mono','Cascadia Code','Roboto Mono',ui-monospace,monospace`,
    'system-sans': `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`,
    'serif-editorial': `Georgia,'Iowan Old Style','Palatino Linotype',Palatino,serif`,
    'rounded-friendly': `-apple-system,'SF Pro Rounded','Segoe UI',Roboto,sans-serif`,
  };

  const PRESETS = [
    defaultTheme(),
    {
      name: 'Night Lab',
      colors: {
        bg1: '#07090A', bg2: '#0C1210', card: '#0F1613',
        border: 'rgba(120,255,180,0.14)', text: '#DFFCEA', textDim: '#5C8C74',
        accent: '#4CFFA0', accent2: '#26C6DA', progressTrack: 'rgba(120,255,180,0.12)',
      },
      background: { type: 'gradient', angle: 180, image: null, fit: 'cover', dim: 0 },
      font: { display: 'mono-slab', label: 'system-sans' },
      radius: 2,
      particles: { enabled: true, type: 'stars', color: '#4CFFA0', color2: '#26C6DA', density: 60, speed: 0.6 },
      sounds: { tick: null, tickEnabled: false, classChange: null, classChangeEnabled: true, music: null, musicVolume: 0.4 },
    },
    {
      name: 'Field Notes',
      colors: {
        bg1: '#F3EEE1', bg2: '#EAE2CE', card: '#FBF8EF',
        border: 'rgba(60,46,24,0.14)', text: '#2E2718', textDim: '#7A6E52',
        accent: '#A8501F', accent2: '#3C6E4F', progressTrack: 'rgba(60,46,24,0.12)',
      },
      background: { type: 'gradient', angle: 160, image: null, fit: 'cover', dim: 0 },
      font: { display: 'serif-editorial', label: 'serif-editorial' },
      radius: 3,
      particles: { enabled: false, type: 'none', color: '#A8501F', color2: '#3C6E4F', density: 30, speed: 1 },
      sounds: { tick: null, tickEnabled: false, classChange: null, classChangeEnabled: true, music: null, musicVolume: 0.4 },
    },
    {
      name: 'Neon Campus',
      colors: {
        bg1: '#160A29', bg2: '#210E38', card: '#22103C',
        border: 'rgba(255,255,255,0.10)', text: '#F5EEFF', textDim: '#9C87C4',
        accent: '#FF5FA2', accent2: '#5FE3FF', progressTrack: 'rgba(255,255,255,0.12)',
      },
      background: { type: 'gradient', angle: 140, image: null, fit: 'cover', dim: 0 },
      font: { display: 'rounded-friendly', label: 'rounded-friendly' },
      radius: 10,
      particles: { enabled: true, type: 'confetti', color: '#FF5FA2', color2: '#5FE3FF', density: 26, speed: 1.1 },
      sounds: { tick: null, tickEnabled: false, classChange: null, classChangeEnabled: true, music: null, musicVolume: 0.4 },
    },
  ];

  function mergeTheme(theme) {
    const base = defaultTheme();
    const out = JSON.parse(JSON.stringify(base));
    if (!theme) return out;
    out.name = theme.name || out.name;
    Object.assign(out.colors, theme.colors || {});
    Object.assign(out.background, theme.background || {});
    Object.assign(out.font, theme.font || {});
    Object.assign(out.particles, theme.particles || {});
    Object.assign(out.sounds, theme.sounds || {});
    if (typeof theme.radius === 'number') out.radius = theme.radius;
    return out;
  }

  function applyTheme(theme, root) {
    root = root || document.documentElement;
    const t = mergeTheme(theme);
    const c = t.colors;
    const set = (k, v) => root.style.setProperty(k, v);
    set('--c-bg1', c.bg1); set('--c-bg2', c.bg2); set('--c-card', c.card);
    set('--c-border', c.border); set('--c-text', c.text); set('--c-text-dim', c.textDim);
    set('--c-accent', c.accent); set('--c-accent2', c.accent2); set('--c-progress-track', c.progressTrack);
    set('--radius', t.radius + 'px');
    set('--font-display', FONT_STACKS[t.font.display] || FONT_STACKS['mono-slab']);
    set('--font-label', FONT_STACKS[t.font.label] || FONT_STACKS['system-sans']);
    set('--bg-angle', (t.background.angle || 165) + 'deg');

    const bgLayer = document.getElementById('bgImageLayer');
    if (bgLayer) {
      if (t.background.type === 'image' && t.background.image) {
        bgLayer.style.backgroundImage = `url(${t.background.image})`;
        bgLayer.style.backgroundSize = t.background.fit === 'contain' ? 'contain' : 'cover';
        bgLayer.style.opacity = '1';
      } else {
        bgLayer.style.backgroundImage = 'none';
        bgLayer.style.opacity = '0';
      }
    }
    const dimLayer = document.getElementById('bgDimLayer');
    if (dimLayer) dimLayer.style.opacity = (t.background.dim || 0) / 100;

    document.body.classList.toggle('bg-solid', t.background.type === 'solid');
    document.body.classList.toggle('bg-gradient', t.background.type === 'gradient');

    return t;
  }

  // --- Synthesized default sounds (used when no custom sound uploaded) ---
  let actx = null;
  function ctx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    return actx;
  }
  function beep({ freq = 880, dur = 0.05, type = 'sine', gain = 0.06, when = 0 }) {
    try {
      const a = ctx();
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = type; osc.frequency.value = freq;
      g.gain.value = gain;
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + when + dur);
      osc.connect(g); g.connect(a.destination);
      osc.start(a.currentTime + when);
      osc.stop(a.currentTime + when + dur + 0.02);
    } catch (e) { /* audio unavailable */ }
  }
  function playTick() { beep({ freq: 1500, dur: 0.02, type: 'square', gain: 0.03 }); }
  function playChime() {
    beep({ freq: 660, dur: 0.16, type: 'sine', gain: 0.09, when: 0 });
    beep({ freq: 880, dur: 0.22, type: 'sine', gain: 0.09, when: 0.1 });
    beep({ freq: 1320, dur: 0.3, type: 'sine', gain: 0.07, when: 0.22 });
  }

  global.Schedulist = global.Schedulist || {};
  global.Schedulist.defaultTheme = defaultTheme;
  global.Schedulist.mergeTheme = mergeTheme;
  global.Schedulist.applyTheme = applyTheme;
  global.Schedulist.PRESETS = PRESETS;
  global.Schedulist.playTick = playTick;
  global.Schedulist.playChime = playChime;
})(window);
