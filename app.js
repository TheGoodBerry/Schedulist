(function () {
  const S = window.Schedulist;
  const LS_SCHEDULE = 'schedulist.schedule';
  const LS_THEME = 'schedulist.theme';
  const LS_PREFS = 'schedulist.prefs';

  let state = {
    schedule: null,
    theme: S.PRESETS[0],
    prefs: { particles: null, tick: false, chime: true, use12h: false, persist: true },
    lastKey: null, // to detect period transitions
  };

  const el = (id) => document.getElementById(id);
  const clockTime = el('clockTime'), clockDate = el('clockDate');
  const stateStrip = el('stateStrip'), periodName = el('periodName'), countdown = el('countdown');
  const progressFill = el('progressFill'), upNext = el('upNext');
  const todayRows = el('todayRows'), scheduleNameLbl = el('scheduleName');

  let particleSystem = null;

  function loadPersisted() {
    try {
      const rawPrefs = localStorage.getItem(LS_PREFS);
      if (rawPrefs) Object.assign(state.prefs, JSON.parse(rawPrefs));
    } catch (e) {}
    try {
      const rawSchedule = localStorage.getItem(LS_SCHEDULE);
      if (rawSchedule) state.schedule = JSON.parse(rawSchedule);
    } catch (e) {}
    try {
      const rawTheme = localStorage.getItem(LS_THEME);
      if (rawTheme) state.theme = JSON.parse(rawTheme);
    } catch (e) {}
    if (!state.schedule) state.schedule = S.sampleSchedule();
  }

  function persist() {
    if (!state.prefs.persist) return;
    try {
      localStorage.setItem(LS_SCHEDULE, JSON.stringify(state.schedule));
      localStorage.setItem(LS_THEME, JSON.stringify(state.theme));
      localStorage.setItem(LS_PREFS, JSON.stringify(state.prefs));
    } catch (e) {}
  }

  function initParticles() {
    const canvas = el('particleCanvas');
    particleSystem = new window.SchedulistParticles(canvas, { type: 'none' });
  }

  function applyThemeToUI() {
    const t = S.applyTheme(state.theme);
    const particlesOn = state.prefs.particles === null ? t.particles.enabled : state.prefs.particles;
    if (particleSystem) {
      particleSystem.setOptions({
        type: particlesOn ? t.particles.type : 'none',
        color: t.particles.color, color2: t.particles.color2,
        density: t.particles.density, speed: t.particles.speed,
      });
      if (particlesOn && t.particles.type !== 'none') particleSystem.start(); else particleSystem.stop();
    }
    const musicAudio = el('musicAudio');
    const musicBtn = el('musicBtn');
    if (t.sounds.music) {
      musicAudio.src = t.sounds.music;
      musicAudio.volume = t.sounds.musicVolume;
      musicBtn.disabled = false;
      musicBtn.textContent = musicAudio.paused ? 'Play music' : 'Pause music';
    } else {
      musicAudio.pause(); musicAudio.removeAttribute('src');
      musicBtn.disabled = true; musicBtn.textContent = 'No music in theme';
    }
    renderPresetGrid();
  }

  function renderPresetGrid() {
    const grid = el('presetGrid');
    grid.innerHTML = '';
    S.PRESETS.forEach((preset) => {
      const b = document.createElement('button');
      b.className = 'preset-swatch' + (preset.name === state.theme.name ? ' active' : '');
      b.type = 'button';
      b.innerHTML = `<div class="preset-dots">
          <span style="background:${preset.colors.bg1}"></span>
          <span style="background:${preset.colors.accent}"></span>
          <span style="background:${preset.colors.accent2}"></span>
        </div><div class="pname">${preset.name}</div>`;
      b.addEventListener('click', () => {
        state.theme = JSON.parse(JSON.stringify(preset));
        applyThemeToUI(); persist();
      });
      grid.appendChild(b);
    });
  }

  function fmtClock(now) {
    let h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    let suffix = '';
    if (state.prefs.use12h) {
      suffix = h >= 12 ? ' PM' : ' AM';
      h = h % 12; if (h === 0) h = 12;
    }
    const pad = (n) => String(n).padStart(2, '0');
    return `${state.prefs.use12h ? h : pad(h)}:${pad(m)}:${pad(s)}${suffix}`;
  }

  function renderTodayRows(now) {
    const periods = S.periodsForDate(state.schedule, now);
    scheduleNameLbl.textContent = state.schedule.name || 'untitled schedule';
    todayRows.innerHTML = '';
    if (periods.length === 0) {
      const div = document.createElement('div');
      div.className = 'today-row'; div.innerHTML = '<span></span><span class="n">No periods scheduled today.</span>';
      todayRows.appendChild(div);
      return;
    }
    const nowMin = now.getHours() * 60 + now.getMinutes();
    periods.forEach((p) => {
      const row = document.createElement('div');
      const isCurrent = nowMin >= p.startMin && nowMin < p.endMin;
      const isDone = nowMin >= p.endMin;
      row.className = 'today-row' + (isCurrent ? ' current' : '') + (isDone ? ' done' : '');
      row.innerHTML = `<span class="t">${p.start}–${p.end}</span><span class="n">${p.name}</span><span class="k">${p.kind || ''}</span>`;
      todayRows.appendChild(row);
    });
  }

  function stateLabel(status) {
    switch (status.state) {
      case 'in-class': return 'NOW IN SESSION';
      case 'passing': return 'PASSING PERIOD';
      case 'before-school': return 'BEFORE SCHOOL';
      case 'after-school': return 'SCHOOL\u2019S OUT';
      case 'no-school': return 'NO SCHOOL TODAY';
      default: return '';
    }
  }

  function transitionKeyFor(status) {
    if (status.state === 'in-class') return 'class:' + status.current.name + status.current.start;
    if (status.state === 'passing') return 'pass:' + status.next.name;
    return status.state + ':' + (status.next ? status.next.name : '');
  }

  function tick() {
    const now = new Date();
    clockTime.textContent = fmtClock(now);
    clockDate.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    if (!state.schedule) return;
    const status = S.computeStatus(state.schedule, now);
    const key = transitionKeyFor(status);
    const transitioned = state.lastKey !== null && state.lastKey !== key;
    state.lastKey = key;

    stateStrip.textContent = stateLabel(status);

    if (status.state === 'in-class') {
      periodName.innerHTML = status.current.name;
      countdown.innerHTML = S.formatDuration(status.remainingMs) + '<span class="unit">left</span>';
      progressFill.style.width = (status.progress * 100).toFixed(2) + '%';
      if (status.next) {
        upNext.style.visibility = 'visible';
        upNext.querySelector('.name').textContent = status.next.name + ' at ' + status.next.start;
      } else {
        upNext.style.visibility = 'hidden';
      }
    } else if (status.state === 'passing') {
      periodName.innerHTML = `Heading to <span class="dim">›</span> ${status.next.name}`;
      countdown.innerHTML = S.formatDuration(status.remainingMs) + '<span class="unit">until start</span>';
      progressFill.style.width = '0%';
      upNext.style.visibility = 'hidden';
    } else if (status.state === 'before-school') {
      periodName.innerHTML = `First up: ${status.next.name}`;
      countdown.innerHTML = S.formatDuration(status.remainingMs) + '<span class="unit">until start</span>';
      progressFill.style.width = '0%';
      upNext.style.visibility = 'hidden';
    } else if (status.state === 'after-school' || status.state === 'no-school') {
      if (status.next) {
        const dayLabel = status.nextDate ? status.nextDate.toLocaleDateString(undefined, { weekday: 'long' }) : '';
        periodName.innerHTML = `Next class: ${status.next.name} <span class="dim">· ${dayLabel}</span>`;
        countdown.innerHTML = S.formatDuration(status.remainingMs) + '<span class="unit">until next class</span>';
      } else {
        periodName.innerHTML = 'No upcoming classes found';
        countdown.innerHTML = '—';
      }
      progressFill.style.width = '0%';
      upNext.style.visibility = 'hidden';
    }

    countdown.classList.remove('flip'); void countdown.offsetWidth; countdown.classList.add('flip');

    if (state.prefs.tick) S.playTick();
    if (transitioned) {
      if (state.prefs.chime) playChimeSound();
      maybeNotify(status);
    }

    if (now.getSeconds() === 0 || todayRows.dataset.day !== String(now.getDate())) {
      renderTodayRows(now);
      todayRows.dataset.day = String(now.getDate());
    }
  }

  function playChimeSound() {
    const t = S.mergeTheme(state.theme);
    if (t.sounds.classChange) {
      const a = new Audio(t.sounds.classChange);
      a.volume = 0.7; a.play().catch(() => {});
    } else {
      S.playChime();
    }
  }

  function maybeNotify(status) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    let title, body;
    if (status.state === 'in-class') { title = status.current.name; body = 'Now in session'; }
    else if (status.next) { title = 'Up next: ' + status.next.name; body = 'Starting soon'; }
    else return;
    try { new Notification(title, { body, silent: true }); } catch (e) {}
  }

  // ---------- Settings modal wiring ----------
  function openModal() { el('modalBackdrop').classList.add('open'); syncSettingsUI(); }
  function closeModal() { el('modalBackdrop').classList.remove('open'); }
  function syncSettingsUI() {
    el('scheduleStatus').textContent = state.schedule ? (state.schedule.name || 'untitled') : 'none';
    el('toggleParticles').checked = state.prefs.particles === null ? state.theme.particles?.enabled : state.prefs.particles;
    el('toggleTick').checked = state.prefs.tick;
    el('toggleChime').checked = state.prefs.chime;
    el('toggle12h').checked = state.prefs.use12h;
    el('togglePersist').checked = state.prefs.persist;
    el('notifBtn').textContent = ('Notification' in window && Notification.permission === 'granted') ? 'Enabled' : 'Enable';
    el('notifBtn').disabled = ('Notification' in window && Notification.permission === 'granted');
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsText(file);
    });
  }

  function wireUI() {
    el('settingsBtn').addEventListener('click', openModal);
    el('closeModalBtn').addEventListener('click', closeModal);
    el('modalBackdrop').addEventListener('click', (e) => { if (e.target === el('modalBackdrop')) closeModal(); });

    el('fullscreenBtn').addEventListener('click', toggleKiosk);

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'f') toggleKiosk();
      if (e.key === 's') openModal();
      if (e.key === 'Escape') closeModal();
    });

    el('scheduleFile').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const msg = el('scheduleMsg');
      try {
        const json = JSON.parse(await readFileAsText(file));
        S.validateSchedule(json);
        state.schedule = json; state.lastKey = null;
        msg.textContent = `Loaded “${json.name || 'schedule'}” with ${json.periods.length} periods.`;
        msg.classList.remove('err');
        syncSettingsUI(); persist(); tick();
      } catch (err) {
        msg.textContent = 'Could not load file: ' + err.message; msg.classList.add('err');
      }
      e.target.value = '';
    });

    el('loadSampleScheduleBtn').addEventListener('click', () => {
      state.schedule = S.sampleSchedule(); state.lastKey = null;
      el('scheduleMsg').textContent = 'Sample schedule loaded.'; el('scheduleMsg').classList.remove('err');
      syncSettingsUI(); persist(); tick();
    });

    el('downloadScheduleBtn').addEventListener('click', () => {
      downloadJSON(state.schedule, (state.schedule.name || 'schedule').replace(/\s+/g, '-').toLowerCase() + '.json');
    });

    el('themeFile').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const msg = el('themeMsg');
      try {
        const json = JSON.parse(await readFileAsText(file));
        state.theme = S.mergeTheme(json);
        msg.textContent = `Loaded theme “${state.theme.name}”.`; msg.classList.remove('err');
        applyThemeToUI(); persist();
      } catch (err) {
        msg.textContent = 'Could not load theme: ' + err.message; msg.classList.add('err');
      }
      e.target.value = '';
    });

    el('openBuilderBtn').addEventListener('click', () => window.open('theme-builder.html', '_blank'));

    el('toggleParticles').addEventListener('change', (e) => { state.prefs.particles = e.target.checked; applyThemeToUI(); persist(); });
    el('toggleTick').addEventListener('change', (e) => { state.prefs.tick = e.target.checked; persist(); });
    el('toggleChime').addEventListener('change', (e) => { state.prefs.chime = e.target.checked; persist(); });
    el('toggle12h').addEventListener('change', (e) => { state.prefs.use12h = e.target.checked; persist(); });
    el('togglePersist').addEventListener('change', (e) => { state.prefs.persist = e.target.checked; if (e.target.checked) persist(); });

    el('notifBtn').addEventListener('click', () => {
      if (!('Notification' in window)) return;
      Notification.requestPermission().then(() => syncSettingsUI());
    });

    el('musicBtn').addEventListener('click', () => {
      const a = el('musicAudio');
      if (a.paused) { a.play().catch(() => {}); } else { a.pause(); }
      setTimeout(() => { el('musicBtn').textContent = a.paused ? 'Play music' : 'Pause music'; }, 50);
    });
  }

  function toggleKiosk() {
    document.body.classList.toggle('kiosk');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function init() {
    loadPersisted();
    initParticles();
    applyThemeToUI();
    wireUI();
    renderTodayRows(new Date());
    tick();
    setInterval(tick, 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
