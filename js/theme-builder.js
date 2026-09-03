(function () {
  const S = window.Schedulist;
  const LS_GALLERY = 'schedulist.builder.gallery';
  const el = (id) => document.getElementById(id);

  let theme = S.mergeTheme(S.PRESETS[0]);
  let particleSystem = null;

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // ---------- render form from theme ----------
  function syncFormFromTheme() {
    el('themeName').value = theme.name;

    setColorPair('c_bg1', theme.colors.bg1);
    setColorPair('c_bg2', theme.colors.bg2);
    setColorPair('c_card', theme.colors.card);
    setColorPair('c_text', theme.colors.text);
    setColorPair('c_textDim', theme.colors.textDim);
    setColorPair('c_accent', theme.colors.accent);
    setColorPair('c_accent2', theme.colors.accent2);

    setActiveChip('bgTypeChips', theme.background.type);
    el('gradAngleField').style.display = theme.background.type === 'gradient' ? '' : 'none';
    el('bgImageField').style.display = theme.background.type === 'image' ? '' : 'none';
    el('bgAngle').value = theme.background.angle || 165;
    el('angleVal').textContent = (theme.background.angle || 165) + '°';
    el('bgDim').value = theme.background.dim || 0;
    el('dimVal').textContent = (theme.background.dim || 0) + '%';
    if (theme.background.image) {
      el('bgImageThumb').src = theme.background.image;
      el('bgImageThumb').style.display = 'block';
      el('bgImageDrop').classList.add('has-file');
    }

    setActiveChip('fontDisplayChips', theme.font.display);
    setActiveChip('fontLabelChips', theme.font.label);
    el('radius').value = theme.radius;
    el('radiusVal').textContent = theme.radius + 'px';

    el('particlesEnabled').checked = theme.particles.enabled;
    setActiveChip('particleTypeChips', theme.particles.type);
    el('particleDensity').value = theme.particles.density;
    el('densityVal').textContent = theme.particles.density;
    el('particleSpeed').value = Math.round(theme.particles.speed * 10);
    el('speedVal').textContent = theme.particles.speed.toFixed(1);

    el('tickEnabled').checked = theme.sounds.tickEnabled;
    el('chimeEnabled').checked = theme.sounds.classChangeEnabled;
    el('musicVolume').value = Math.round(theme.sounds.musicVolume * 100);
    el('volVal').textContent = Math.round(theme.sounds.musicVolume * 100) + '%';
    updateSoundPreview('tick', theme.sounds.tick);
    updateSoundPreview('chime', theme.sounds.classChange);
    updateSoundPreview('music', theme.sounds.music);

    applyPreview();
  }

  function setColorPair(id, hex) {
    el(id).value = hex; el(id + '_hex').value = hex;
  }
  function setActiveChip(groupId, value) {
    document.querySelectorAll(`#${groupId} .chip`).forEach(c => c.classList.toggle('active', c.dataset.v === value));
  }
  function updateSoundPreview(key, dataUrl) {
    const audio = el(key + 'Preview');
    const drop = el(key === 'chime' ? 'chimeDrop' : key + 'Drop');
    if (dataUrl) { audio.src = dataUrl; audio.style.display = ''; drop.classList.add('has-file'); }
    else { audio.removeAttribute('src'); audio.style.display = 'none'; drop.classList.remove('has-file'); }
  }

  function applyPreview() {
    const pane = document.getElementById('previewPane');
    const t = S.applyTheme(theme, pane.style.setProperty ? document.documentElement : document.documentElement);
    // apply to whole document root so preview panel (which inherits vars) updates
    S.applyTheme(theme);
    if (particleSystem) {
      particleSystem.setOptions({
        type: theme.particles.enabled ? theme.particles.type : 'none',
        color: theme.particles.color, color2: theme.particles.color2,
        density: theme.particles.density, speed: theme.particles.speed,
      });
      if (theme.particles.enabled && theme.particles.type !== 'none') particleSystem.start(); else particleSystem.stop();
    }
  }

  // ---------- wire inputs ----------
  function wireColor(id, key) {
    const colorInput = el(id), hexInput = el(id + '_hex');
    colorInput.addEventListener('input', () => { hexInput.value = colorInput.value; theme.colors[key] = colorInput.value; applyPreview(); });
    hexInput.addEventListener('change', () => {
      let v = hexInput.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { colorInput.value = v; theme.colors[key] = v; applyPreview(); }
    });
  }

  function wireChips(groupId, onPick) {
    document.querySelectorAll(`#${groupId} .chip`).forEach(chip => {
      chip.addEventListener('click', () => {
        setActiveChip(groupId, chip.dataset.v);
        onPick(chip.dataset.v);
        applyPreview();
      });
    });
  }

  function wireUploadDrop(dropId, fileId, onLoaded) {
    el(fileId).addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const dataUrl = await fileToDataURL(file);
      onLoaded(dataUrl);
      applyPreview();
      e.target.value = '';
    });
  }

  function init() {
    particleSystem = new window.SchedulistParticles(document.getElementById('particleCanvas'), { type: 'none' });

    el('themeName').addEventListener('input', () => { theme.name = el('themeName').value; });

    wireColor('c_bg1', 'bg1'); wireColor('c_bg2', 'bg2'); wireColor('c_card', 'card');
    wireColor('c_text', 'text'); wireColor('c_textDim', 'textDim');
    wireColor('c_accent', 'accent'); wireColor('c_accent2', 'accent2');

    wireChips('bgTypeChips', (v) => {
      theme.background.type = v;
      el('gradAngleField').style.display = v === 'gradient' ? '' : 'none';
      el('bgImageField').style.display = v === 'image' ? '' : 'none';
    });
    el('bgAngle').addEventListener('input', () => { theme.background.angle = +el('bgAngle').value; el('angleVal').textContent = theme.background.angle + '°'; applyPreview(); });
    el('bgDim').addEventListener('input', () => { theme.background.dim = +el('bgDim').value; el('dimVal').textContent = theme.background.dim + '%'; applyPreview(); });
    wireUploadDrop('bgImageDrop', 'bgImageFile', (dataUrl) => {
      theme.background.image = dataUrl;
      el('bgImageThumb').src = dataUrl; el('bgImageThumb').style.display = 'block';
      el('bgImageDrop').classList.add('has-file');
    });

    wireChips('fontDisplayChips', (v) => { theme.font.display = v; });
    wireChips('fontLabelChips', (v) => { theme.font.label = v; });
    el('radius').addEventListener('input', () => { theme.radius = +el('radius').value; el('radiusVal').textContent = theme.radius + 'px'; applyPreview(); });

    el('particlesEnabled').addEventListener('change', () => { theme.particles.enabled = el('particlesEnabled').checked; applyPreview(); });
    wireChips('particleTypeChips', (v) => { theme.particles.type = v; });
    el('particleDensity').addEventListener('input', () => { theme.particles.density = +el('particleDensity').value; el('densityVal').textContent = theme.particles.density; applyPreview(); });
    el('particleSpeed').addEventListener('input', () => { theme.particles.speed = (+el('particleSpeed').value) / 10; el('speedVal').textContent = theme.particles.speed.toFixed(1); applyPreview(); });

    el('tickEnabled').addEventListener('change', () => { theme.sounds.tickEnabled = el('tickEnabled').checked; });
    wireUploadDrop('tickDrop', 'tickFile', (dataUrl) => { theme.sounds.tick = dataUrl; updateSoundPreview('tick', dataUrl); });
    el('chimeEnabled').addEventListener('change', () => { theme.sounds.classChangeEnabled = el('chimeEnabled').checked; });
    wireUploadDrop('chimeDrop', 'chimeFile', (dataUrl) => { theme.sounds.classChange = dataUrl; updateSoundPreview('chime', dataUrl); });
    el('previewChimeBtn').addEventListener('click', () => {
      if (theme.sounds.classChange) { const a = new Audio(theme.sounds.classChange); a.play().catch(() => {}); }
      else { S.playChime(); }
    });
    wireUploadDrop('musicDrop', 'musicFile', (dataUrl) => { theme.sounds.music = dataUrl; updateSoundPreview('music', dataUrl); });
    el('musicVolume').addEventListener('input', () => { theme.sounds.musicVolume = (+el('musicVolume').value) / 100; el('volVal').textContent = el('musicVolume').value + '%'; });

    el('newThemeBtn').addEventListener('click', () => {
      theme = S.defaultTheme(); theme.name = 'Untitled Theme'; syncFormFromTheme();
    });

    el('exportBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = (theme.name || 'theme').replace(/\s+/g, '-').toLowerCase() + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });

    el('importFile').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const text = await file.text();
        theme = S.mergeTheme(JSON.parse(text));
        syncFormFromTheme();
      } catch (err) { alert('Could not read that theme file: ' + err.message); }
      e.target.value = '';
    });

    el('saveGalleryBtn').addEventListener('click', () => {
      const gallery = loadGallery();
      const idx = gallery.findIndex(t => t.name === theme.name);
      const copy = JSON.parse(JSON.stringify(theme));
      if (idx >= 0) gallery[idx] = copy; else gallery.push(copy);
      saveGallery(gallery); renderGallery();
    });

    renderGallery();
    syncFormFromTheme();
  }

  function loadGallery() {
    try { return JSON.parse(localStorage.getItem(LS_GALLERY)) || []; } catch (e) { return []; }
  }
  function saveGallery(g) {
    try { localStorage.setItem(LS_GALLERY, JSON.stringify(g)); } catch (e) {}
  }
  function renderGallery() {
    const list = el('galleryList');
    const gallery = loadGallery();
    list.innerHTML = '';
    if (gallery.length === 0) {
      list.innerHTML = '<div class="hint">Nothing saved yet.</div>';
      return;
    }
    gallery.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = 'gallery-item';
      row.innerHTML = `<span>${t.name}</span>`;
      const btns = document.createElement('span');
      const loadBtn = document.createElement('button'); loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', () => { theme = S.mergeTheme(t); syncFormFromTheme(); });
      const delBtn = document.createElement('button'); delBtn.textContent = 'Delete'; delBtn.style.marginLeft = '8px';
      delBtn.addEventListener('click', () => { const g = loadGallery(); g.splice(i, 1); saveGallery(g); renderGallery(); });
      btns.appendChild(loadBtn); btns.appendChild(delBtn);
      row.appendChild(btns);
      list.appendChild(row);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
