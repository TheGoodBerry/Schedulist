/* Schedulist — particle engine
   A small canvas particle system shared by the main app and the theme builder.
   Types: none, snow, stars, bubbles, embers, confetti, fireflies
*/
(function (global) {
  function rand(min, max) { return Math.random() * (max - min) + min; }

  class ParticleSystem {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.running = false;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.options = Object.assign({
        type: 'none',
        color: '#E8A33D',
        color2: '#4FD1C5',
        density: 40,
        speed: 1,
      }, options || {});
      this._resizeHandler = () => this.resize();
      window.addEventListener('resize', this._resizeHandler);
      this.resize();
    }

    setOptions(options) {
      const typeChanged = options.type && options.type !== this.options.type;
      this.options = Object.assign(this.options, options);
      if (typeChanged || this.particles.length === 0) this.seed();
    }

    resize() {
      const rect = this.canvas.parentElement
        ? this.canvas.parentElement.getBoundingClientRect()
        : this.canvas.getBoundingClientRect();
      const w = Math.max(rect.width, 1);
      const h = Math.max(rect.height, 1);
      this.canvas.width = w * this.dpr;
      this.canvas.height = h * this.dpr;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.w = w; this.h = h;
      this.seed();
    }

    seed() {
      const { type, density } = this.options;
      const count = type === 'none' ? 0 : Math.round(density);
      this.particles = [];
      for (let i = 0; i < count; i++) this.particles.push(this.spawn(true));
    }

    spawn(initial) {
      const { type } = this.options;
      const w = this.w, h = this.h;
      const base = { x: rand(0, w), y: initial ? rand(0, h) : -10 };
      switch (type) {
        case 'snow':
          return Object.assign(base, { r: rand(1.5, 3.5), vy: rand(0.3, 1), vx: rand(-0.3, 0.3), drift: rand(0, Math.PI * 2), o: rand(0.4, 0.9) });
        case 'stars':
          return { x: rand(0, w), y: rand(0, h), r: rand(0.6, 2), o: rand(0.2, 1), tw: rand(0.005, 0.02), phase: rand(0, Math.PI * 2) };
        case 'bubbles':
          return { x: rand(0, w), y: h + rand(0, 40), r: rand(3, 10), vy: rand(0.4, 1.2), vx: rand(-0.2, 0.2), drift: rand(0, Math.PI * 2), o: rand(0.15, 0.5) };
        case 'embers':
          return { x: rand(0, w), y: h + rand(0, 40), r: rand(1, 2.6), vy: rand(0.5, 1.6), vx: rand(-0.4, 0.4), o: rand(0.3, 0.9), life: rand(0.6, 1) };
        case 'confetti':
          return { x: rand(0, w), y: initial ? rand(0, h) : -10, r: rand(3, 6), vy: rand(0.8, 2), vx: rand(-0.6, 0.6), rot: rand(0, Math.PI * 2), vr: rand(-0.08, 0.08), c: Math.random() < 0.5 ? this.options.color : this.options.color2 };
        case 'fireflies':
          return { x: rand(0, w), y: rand(0, h), r: rand(1.2, 2.4), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), o: rand(0.2, 1), phase: rand(0, Math.PI * 2) };
        default:
          return base;
      }
    }

    step() {
      const { type, speed, color, color2 } = this.options;
      const ctx = this.ctx, w = this.w, h = this.h;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (type === 'none') return;

      for (let p of this.particles) {
        ctx.save();
        switch (type) {
          case 'snow': {
            p.drift += 0.01;
            p.y += p.vy * speed;
            p.x += Math.sin(p.drift) * 0.4 + p.vx * speed;
            if (p.y > h + 5) { p.y = -5; p.x = rand(0, w); }
            ctx.globalAlpha = p.o;
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
            break;
          }
          case 'stars': {
            p.phase += p.tw;
            ctx.globalAlpha = 0.5 + Math.sin(p.phase) * 0.5 * p.o;
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
            break;
          }
          case 'bubbles': {
            p.drift += 0.02;
            p.y -= p.vy * speed;
            p.x += Math.sin(p.drift) * 0.5;
            if (p.y < -10) { p.y = h + 10; p.x = rand(0, w); }
            ctx.globalAlpha = p.o;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke();
            break;
          }
          case 'embers': {
            p.y -= p.vy * speed;
            p.x += p.vx * speed;
            p.life -= 0.003 * speed;
            if (p.life <= 0 || p.y < -10) Object.assign(p, this.spawn(false));
            ctx.globalAlpha = Math.max(p.life, 0) * p.o;
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
            break;
          }
          case 'confetti': {
            p.y += p.vy * speed;
            p.x += p.vx * speed;
            p.rot += p.vr;
            if (p.y > h + 10) { p.y = -10; p.x = rand(0, w); }
            ctx.globalAlpha = 0.85;
            ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r * 0.6);
            break;
          }
          case 'fireflies': {
            p.phase += 0.02;
            p.x += p.vx * speed; p.y += p.vy * speed;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
            const glow = 0.3 + Math.sin(p.phase) * 0.5 * p.o;
            ctx.globalAlpha = Math.max(glow, 0);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
            break;
          }
        }
        ctx.restore();
      }
    }

    start() {
      if (this.running) return;
      this.running = true;
      const loop = () => {
        if (!this.running) return;
        this.step();
        this._raf = requestAnimationFrame(loop);
      };
      loop();
    }

    stop() {
      this.running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    destroy() {
      this.stop();
      window.removeEventListener('resize', this._resizeHandler);
    }
  }

  global.SchedulistParticles = ParticleSystem;
})(window);
