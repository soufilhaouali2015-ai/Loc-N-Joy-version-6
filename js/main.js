/* ==========================================================================
   LOCNJOY — Main Script · Night Road Edition (vanilla JS, zero dependency)
   Modules : loader compteur · smooth scroll · traînée de phares · magnétisme ·
             split/scramble text · marquee · canvas autoroute · flotte + modale ·
             calculateur · reveals · accordéons · avis · recherche · chat ·
             mini-jeu Le Slalom · ligne médiane · easter egg
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const EUR = n => n.toLocaleString('fr-FR') + ' €';

  /* ======================================================================
     1. LOADER — compteur de vitesse : aiguille, arc, checks de départ
  ====================================================================== */
  const loader = $('#loader');
  const checks = ['Contrôle des niveaux', 'Pression des pneus', 'Plein d’essence', 'Clés en main'];

  // graduations du compteur
  (function buildTicks() {
    const g = $('#gaugeTicks');
    if (!g) return;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI - (i / 10) * Math.PI; // 180° -> 0°
      const x1 = 110 + Math.cos(a) * 78, y1 = 120 - Math.sin(a) * 78;
      const x2 = 110 + Math.cos(a) * 86, y2 = 120 - Math.sin(a) * 86;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      g.appendChild(l);
    }
  })();

  const gaugeFill = $('#gaugeFill');
  const ARC_LEN = 283; // ≈ π * 90
  if (gaugeFill) {
    gaugeFill.style.strokeDasharray = ARC_LEN;
    gaugeFill.style.strokeDashoffset = ARC_LEN;
  }

  function runLoader() {
    if (!loader || loader.classList.contains('done')) return;
    const fill = $('#loaderFill'), count = $('#loaderCount'), check = $('#loaderCheck'), needle = $('#gaugeNeedle');
    const dur = RM ? 200 : 2100;
    const start = performance.now();
    (function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const pct = Math.round(e * 100);
      fill.style.width = pct + '%';
      count.textContent = pct;
      check.textContent = checks[clamp(Math.floor(e * checks.length), 0, checks.length - 1)];
      gaugeFill.style.strokeDashoffset = ARC_LEN * (1 - e);
      needle.style.transform = `rotate(${e * 180}deg)`;
      if (p < 1) requestAnimationFrame(tick);
      else finishLoader();
    })(start);
  }
  function finishLoader() {
    setTimeout(() => {
      loader.classList.add('done');
      document.body.classList.add('loaded');
      revealHero();
      setTimeout(() => loader.remove(), 1100);
    }, 220);
  }
  window.addEventListener('load', runLoader);
  setTimeout(() => { if (!document.body.classList.contains('loaded')) runLoader(); }, 700);

  /* ======================================================================
     2. SMOOTH SCROLL (inertiel, transform) + bus de vélocité
  ====================================================================== */
  const scrollEl = $('#scroll');
  let scrollTarget = 0, scrollCurrent = 0, velocity = 0;
  const Scroll = { get y() { return scrollCurrent; }, get v() { return velocity; } };

  function initSmooth() {
    if (TOUCH || RM) return;
    const setHeight = () => { document.body.style.height = scrollEl.getBoundingClientRect().height + 'px'; };
    Object.assign(scrollEl.style, { position: 'fixed', top: '0', left: '0', width: '100%', willChange: 'transform' });
    setHeight();
    new ResizeObserver(setHeight).observe(scrollEl);
    window.addEventListener('resize', setHeight);

    (function render() {
      scrollTarget = window.scrollY;
      const prev = scrollCurrent;
      scrollCurrent = lerp(scrollCurrent, scrollTarget, 0.09);
      if (Math.abs(scrollTarget - scrollCurrent) < 0.05) scrollCurrent = scrollTarget;
      velocity = scrollCurrent - prev;
      const skew = clamp(velocity * 0.05, -2.5, 2.5);
      scrollEl.style.transform = `translate3d(0, ${-scrollCurrent}px, 0) skewY(${skew}deg)`;
      applyParallax();
      applyDraw();
      requestAnimationFrame(render);
    })();
  }
  function initNativeBus() {
    if (!TOUCH && !RM) return;
    const upd = () => {
      const prev = scrollCurrent;
      scrollCurrent = window.scrollY;
      velocity = scrollCurrent - prev;
      applyParallax();
      applyDraw();
    };
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ---------- parallax (stickers) ---------- */
  const parallaxItems = [];
  function registerParallax() {
    $$('[data-parallax]').forEach(el => {
      parallaxItems.push({ el, speed: parseFloat(el.dataset.parallax) || 0.1 });
    });
  }
  function applyParallax() {
    for (const p of parallaxItems) {
      const r = p.el.getBoundingClientRect();
      const center = r.top + r.height / 2 - innerHeight / 2;
      p.el.style.translate = `0 ${(-center * p.speed).toFixed(2)}px`;
    }
  }

  /* ---------- tracés SVG dessinés au scroll ---------- */
  const drawItems = [];
  function registerDraw() {
    $$('[data-draw] path').forEach(path => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = '14 18';
      path.style.strokeDashoffset = len;
      drawItems.push({ path, len, svg: path.closest('svg') });
    });
  }
  function applyDraw() {
    for (const d of drawItems) {
      const r = d.svg.getBoundingClientRect();
      const prog = clamp((innerHeight * 0.9 - r.top) / (innerHeight * 0.9), 0, 1);
      d.path.style.strokeDashoffset = d.len * (1 - prog);
    }
  }

  /* ======================================================================
     3. TRAÎNÉE DE PHARES — particules lumineuses derrière le curseur
  ====================================================================== */
  const trail = $('#trailCanvas');
  if (!TOUCH && trail && !RM) {
    const tctx = trail.getContext('2d');
    let tw, th, tdpr, pmx = innerWidth / 2, pmy = innerHeight / 2;
    const sparks = [];
    function sizeTrail() {
      tdpr = Math.min(devicePixelRatio || 1, 2);
      tw = trail.width = innerWidth * tdpr;
      th = trail.height = innerHeight * tdpr;
    }
    sizeTrail();
    window.addEventListener('resize', sizeTrail);

    window.addEventListener('pointermove', e => {
      const mx = e.clientX, my = e.clientY;
      const speed = Math.hypot(mx - pmx, my - pmy);
      const n = clamp(Math.floor(speed / 7), 0, 4);
      for (let i = 0; i < n; i++) {
        const t = (i + 1) / n;
        sparks.push({
          x: lerp(pmx, mx, t) * tdpr,
          y: lerp(pmy, my, t) * tdpr,
          vx: (mx - pmx) * 0.06 * tdpr,
          vy: (my - pmy) * 0.06 * tdpr,
          r: (1.2 + Math.random() * 2.4) * tdpr,
          life: 1,
          decay: 0.02 + Math.random() * 0.03,
          red: Math.random() < 0.14,
        });
      }
      if (sparks.length > 180) sparks.splice(0, sparks.length - 180);
      pmx = mx; pmy = my;
    });

    (function renderTrail() {
      tctx.clearRect(0, 0, tw, th);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life -= p.decay;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.94; p.vy *= 0.94;
        const grad = tctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        const c = p.red ? '226, 61, 46' : '255, 169, 40';
        grad.addColorStop(0, `rgba(${c}, ${0.5 * p.life})`);
        grad.addColorStop(1, `rgba(${c}, 0)`);
        tctx.fillStyle = grad;
        tctx.beginPath();
        tctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        tctx.fill();
      }
      requestAnimationFrame(renderTrail);
    })();
  }

  /* ======================================================================
     4. MAGNÉTISME
  ====================================================================== */
  function makeMagnetic(scope = document) {
    if (TOUCH) return;
    $$('[data-magnetic]', scope).forEach(el => {
      if (el.dataset.magReady) return;
      el.dataset.magReady = '1';
      const strength = parseFloat(el.dataset.magnetic) || 0.35;
      let raf;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => { el.style.transform = `translate(${x}px, ${y}px)`; });
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
        el.style.transform = 'translate(0,0)';
        setTimeout(() => (el.style.transition = ''), 500);
      });
    });
  }

  /* ======================================================================
     5. SPLIT TEXT — hero + scramble des titres
  ====================================================================== */
  $$('[data-char-line]').forEach(line => {
    const words = line.textContent.split(' ');
    line.textContent = '';
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'word';
      [...word].forEach(ch => {
        const s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch;
        w.appendChild(s);
      });
      line.appendChild(w);
      if (wi < words.length - 1) line.appendChild(document.createTextNode(' '));
    });
  });
  function revealHero() {
    $$('.hero-title .char').forEach((c, i) => {
      c.style.transition = 'transform 1s cubic-bezier(.16,1,.3,1)';
      c.style.transitionDelay = (i * 0.02) + 's';
      requestAnimationFrame(() => { c.style.transform = 'translateY(0) rotate(0)'; });
    });
    $$('.hero [data-reveal]').forEach((el, i) => {
      setTimeout(() => el.classList.add('in'), 500 + i * 120);
    });
  }

  const GLYPHS = '!<>-_\\/[]{}—=+*^?#§€@km/h';
  function scramble(el) {
    const final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    const dur = 900, start = performance.now();
    const seeds = [...final].map(() => Math.random());
    (function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      let out = '';
      for (let i = 0; i < final.length; i++) {
        if (p > i / final.length + 0.05) out += final[i];
        else if (final[i] === ' ') out += ' ';
        else out += GLYPHS[Math.floor((seeds[i] + p * 30) * GLYPHS.length) % GLYPHS.length];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = final;
    })(start);
  }

  /* ======================================================================
     6. MARQUEE — dérive + boost par vélocité de scroll
  ====================================================================== */
  const mTrack = $('#marqueeTrack');
  if (mTrack) {
    mTrack.innerHTML += mTrack.innerHTML + mTrack.innerHTML;
    let offset = 0;
    const single = () => mTrack.scrollWidth / 3;
    (function loop() {
      offset -= 0.8 + Scroll.v * 0.3;
      const s = single();
      if (-offset >= s) offset += s;
      if (offset > 0) offset -= s;
      mTrack.style.transform = `translateX(${offset}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ======================================================================
     7. HERO CANVAS — autoroute de nuit générative
     Route en perspective, marquage défilant, phares qui montent,
     feux rouges qui s'éloignent. Le pointeur "braque" le point de fuite.
  ====================================================================== */
  const road = $('#heroCanvas');
  if (road && !RM) {
    const ctx = road.getContext('2d');
    let w, h, dpr, t = 0;
    let vpx = 0.5, vpxTarget = 0.5; // point de fuite (0..1)
    const cars = []; // {p: 0..1 progression, lane: -1|1, speed, oncoming}

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = road.width = road.offsetWidth * dpr;
      h = road.height = road.offsetHeight * dpr;
    }

    function spawnCar() {
      const oncoming = Math.random() < 0.5;
      cars.push({
        p: oncoming ? 0.02 : 1,
        lane: oncoming ? -1 : 1,
        speed: (0.0016 + Math.random() * 0.0022) * (oncoming ? 1 : -0.55),
        oncoming,
        drift: (Math.random() - 0.5) * 0.06,
      });
    }

    function frame() {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      const horizon = h * 0.52;
      const vx = w * lerp(0.35, 0.65, vpx);
      vpx = lerp(vpx, vpxTarget, 0.04);

      // ciel : dégradé + étoiles discrètes
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#0B0F17');
      sky.addColorStop(1, '#131A28');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizon);
      ctx.fillStyle = 'rgba(232,228,216,.5)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 8971) % 997) / 997 * w;
        const sy = ((i * 6329) % 613) / 613 * horizon * 0.85;
        const tw2 = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.01 + i));
        ctx.globalAlpha = 0.25 * tw2;
        ctx.fillRect(sx, sy, 1.6 * dpr, 1.6 * dpr);
      }
      ctx.globalAlpha = 1;

      // lueur de ville à l'horizon
      const glow = ctx.createRadialGradient(vx, horizon, 0, vx, horizon, w * 0.5);
      glow.addColorStop(0, 'rgba(255,169,40,.16)');
      glow.addColorStop(1, 'rgba(255,169,40,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // chaussée
      const roadHalfBottom = w * 0.42;
      ctx.fillStyle = '#10151F';
      ctx.beginPath();
      ctx.moveTo(vx, horizon);
      ctx.lineTo(w / 2 - roadHalfBottom, h);
      ctx.lineTo(w / 2 + roadHalfBottom, h);
      ctx.closePath();
      ctx.fill();

      // bords de chaussée
      ctx.strokeStyle = 'rgba(232,228,216,.22)';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(vx, horizon); ctx.lineTo(w / 2 - roadHalfBottom, h);
      ctx.moveTo(vx, horizon); ctx.lineTo(w / 2 + roadHalfBottom, h);
      ctx.stroke();

      // marquage central défilant (perspective)
      const scrollP = (t * 0.012) % 1;
      ctx.strokeStyle = 'rgba(255,169,40,.85)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        let p0 = ((i / 8) + scrollP) % 1;
        let p1 = p0 + 0.045;
        if (p1 > 1) continue;
        const y0 = horizon + Math.pow(p0, 2.2) * (h - horizon);
        const y1 = horizon + Math.pow(p1, 2.2) * (h - horizon);
        const x0 = lerp(vx, w / 2, Math.pow(p0, 2.2));
        const x1 = lerp(vx, w / 2, Math.pow(p1, 2.2));
        ctx.lineWidth = lerp(0.5, 7, Math.pow(p0, 2)) * dpr;
        ctx.globalAlpha = lerp(0.15, 0.9, p0);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // véhicules : paires de phares / feux arrière
      for (let i = cars.length - 1; i >= 0; i--) {
        const c = cars[i];
        c.p += c.speed;
        if (c.p > 1.05 || c.p < 0.01) { cars.splice(i, 1); continue; }
        const pp = Math.pow(clamp(c.p, 0, 1), 2.2);
        const y = horizon + pp * (h - horizon);
        const laneOff = (c.lane * (0.16 + c.drift)) * lerp(0, roadHalfBottom * 2, pp);
        const x = lerp(vx, w / 2, pp) + laneOff;
        const sep = lerp(1, 26, pp) * dpr;
        const r = lerp(0.6, 7, pp) * dpr;
        const col = c.oncoming ? '244, 240, 220' : '226, 61, 46';
        const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
        halo.addColorStop(0, `rgba(${col}, .5)`);
        halo.addColorStop(1, `rgba(${col}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(x, y, r * 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${col}, .95)`;
        ctx.beginPath(); ctx.arc(x - sep / 2, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + sep / 2, y, r, 0, Math.PI * 2); ctx.fill();
      }
      if (cars.length < 6 && Math.random() < 0.02) spawnCar();

      requestAnimationFrame(frame);
    }

    size(); frame();
    for (let i = 0; i < 3; i++) spawnCar();
    window.addEventListener('resize', size);
    window.addEventListener('pointermove', e => { vpxTarget = e.clientX / innerWidth; });
  } else if (road) {
    // reduced motion : dégradé statique
    road.style.background = 'linear-gradient(to bottom, #0B0F17 50%, #131A28)';
  }

  /* ======================================================================
     8. LA FLOTTE — données, rendu, filtres, tilt, fallback d'images
  ====================================================================== */
  const SIL = {
    car: '<svg viewBox="0 0 120 44" aria-hidden="true"><path d="M6 30 Q8 18 24 16 L38 8 Q40 6 44 6 L70 6 Q76 6 80 10 L90 16 Q112 18 114 28 L114 30 Q114 33 110 33 L10 33 Q6 33 6 30 Z" fill="currentColor"/><circle cx="32" cy="33" r="6.5" fill="#10151F" stroke="currentColor" stroke-width="3"/><circle cx="90" cy="33" r="6.5" fill="#10151F" stroke="currentColor" stroke-width="3"/></svg>',
    van: '<svg viewBox="0 0 120 48" aria-hidden="true"><path d="M8 36 L8 12 Q8 8 12 8 L84 8 L102 18 Q112 20 112 30 L112 36 Q112 38 109 38 L11 38 Q8 38 8 36 Z" fill="currentColor"/><rect x="88" y="13" width="14" height="9" rx="2" fill="#10151F"/><circle cx="30" cy="38" r="7" fill="#10151F" stroke="currentColor" stroke-width="3"/><circle cx="92" cy="38" r="7" fill="#10151F" stroke="currentColor" stroke-width="3"/></svg>',
    moto: '<svg viewBox="0 0 120 52" aria-hidden="true"><circle cx="24" cy="38" r="12" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="96" cy="38" r="12" fill="none" stroke="currentColor" stroke-width="4"/><path d="M24 38 L44 20 L58 20 L52 12 L64 12 M44 20 L60 34 L84 34 L96 38 M60 34 L70 16 L88 16 L96 38" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const FLEET = [
    { id: 'clio6', name: 'Clio 6 Esprit Alpine', cat: 'citadine', catLabel: 'Citadine · Boîte automatique', price: 120,
      imgs: ['01','02','03','04','05','06','07','08'].map(n => `images/clio-6-esprit-alpine/${n}.jpg`),
      sil: 'car', c1: '#12225E', c2: '#2E63D8', stamp: 'Coup de cœur',
      chips: ['5 places', 'Hybride essence', '160 ch'],
      specs: { Places: '5', 'Boîte': 'Automatique E-Tech', Carburant: 'Hybride essence', Puissance: '160 ch', Coffre: '391 L', Consommation: '4,3 L/100', Caution: '1 000 €' } },
    { id: 'classea', name: 'Classe A Pack AMG', cat: 'citadine', catLabel: 'Compacte · Boîte automatique', price: 150,
      imgs: ['01','02','03','04'].map(n => `images/mercedes-classe-a-pack-amg/${n}.jpg`),
      sil: 'car', c1: '#23272E', c2: '#8E959F', stamp: 'Pack AMG',
      chips: ['5 places', 'Essence', '163 ch'],
      specs: { Places: '5', 'Boîte': 'Automatique 7G DCT', Carburant: 'Essence', Puissance: '163 ch', Coffre: '355 L', Consommation: '6,2 L/100', Caution: '1 500 €' } },
    { id: 'golf8', name: 'Golf 8 R-Line', cat: 'citadine', catLabel: 'Compacte · Boîte automatique', price: 130,
      imgs: ['01','02','03','04','05','06'].map(n => `images/golf-8-r-line/${n}.jpg`),
      sil: 'car', c1: '#1F2E45', c2: '#4A7AB5', stamp: '',
      chips: ['5 places', 'Essence', '150 ch'],
      specs: { Places: '5', 'Boîte': 'Automatique DSG7', Carburant: 'Essence', Puissance: '150 ch', Coffre: '380 L', Consommation: '5,9 L/100', Caution: '1 200 €' } },
    { id: 'clio5', name: 'Clio 5 E-Tech', cat: 'citadine', catLabel: 'Citadine · Boîte automatique', price: 80,
      imgs: ['01','02','03','04','05','06','07'].map(n => `images/clio-5-e-tech/${n}.jpg`),
      sil: 'car', c1: '#6E2B10', c2: '#E8712A', stamp: 'Hybride',
      chips: ['5 places', 'Hybride essence', '145 ch'],
      specs: { Places: '5', 'Boîte': 'Automatique E-Tech', Carburant: 'Hybride essence', Puissance: '145 ch', Coffre: '301 L', Consommation: '4,1 L/100', Caution: '800 €' } },
    { id: 'megane4', name: 'Mégane 4 Intense', cat: 'citadine', catLabel: 'Compacte · Boîte automatique', price: 60,
      imgs: ['01','02','03','04','05'].map(n => `images/megane-4-intense/${n}.jpg`),
      sil: 'car', c1: '#4A1220', c2: '#B03A52', stamp: '',
      chips: ['5 places', 'Essence', '140 ch'],
      specs: { Places: '5', 'Boîte': 'Automatique EDC', Carburant: 'Essence', Puissance: '140 ch', Coffre: '434 L', Consommation: '6,0 L/100', Caution: '800 €' } },
  ];

  const fleetGrid = $('#fleetGrid');
  const fleetEmpty = $('#fleetEmpty');

  function mediaHTML(v, single) {
    const list = single ? (v.imgs || []).slice(0, 1) : (v.imgs || []);
    const imgs = list.map((src, i) =>
      `<img class="card-img${i === 0 ? ' is-on' : ''}" src="${src}" alt="Location ${v.name} à Paris, ${v.catLabel.toLowerCase()}, photo ${i + 1}" loading="lazy">`).join('');
    const dots = (!single && list.length > 1)
      ? `<span class="car-dots" aria-hidden="true">${list.map((_, i) => `<i${i === 0 ? ' class="on"' : ''}></i>`).join('')}</span>`
      : '';
    return `
      <div class="card-fallback" style="--c1:${v.c1};--c2:${v.c2}">${SIL[v.sil]}<span>${v.name}</span></div>${imgs}${dots}`;
  }

  function wireMedia(scope) {
    $$('.card-img', scope).forEach(img => {
      const done = () => img.classList.add('loaded');
      const fail = () => {
        const media = img.parentElement;
        const wasOn = img.classList.contains('is-on');
        img.remove();
        const slides = $$('.card-img', media);
        if (wasOn && slides.length) slides[0].classList.add('is-on');
        const dc = $('.car-dots', media);
        if (dc) {
          if (slides.length < 2) dc.remove();
          else dc.innerHTML = slides.map(sl => `<i${sl.classList.contains('is-on') ? ' class="on"' : ''}></i>`).join('');
        }
      };
      img.addEventListener('load', done);
      img.addEventListener('error', fail);
      if (img.complete && img.naturalWidth > 0) done();
      else if (img.complete && img.naturalWidth === 0) fail();
    });
  }

  /* ---- diaporamas : défilement automatique, en pause hors écran ---- */
  function initCarousels(scope) {
    $$('.card-media', scope).forEach((media, mi) => {
      if (media.dataset.carousel || $$('.card-img', media).length < 2) return;
      media.dataset.carousel = '1';
      let visible = false;
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.15 }).observe(media);
      setInterval(() => {
        if (!visible || document.hidden || RM) return;
        const slides = $$('.card-img', media);
        if (slides.length < 2) return;
        const cur = Math.max(0, slides.findIndex(sl => sl.classList.contains('is-on')));
        let next = (cur + 1) % slides.length, guard = 0;
        while (!slides[next].classList.contains('loaded') && guard++ < slides.length) {
          next = (next + 1) % slides.length;
        }
        if (next === cur || !slides[next].classList.contains('loaded')) return;
        slides.forEach((sl, i) => sl.classList.toggle('is-on', i === next));
        $$('.car-dots i', media).forEach((d, i) => d.classList.toggle('on', i === next));
      }, 3600 + (mi % 5) * 340);
    });
  }

  function renderFleet() {
    if (!fleetGrid) return;
    fleetGrid.innerHTML = FLEET.map(v => `
      <article class="card" data-tilt data-id="${v.id}" data-cat="${v.cat}">
        <div class="card-media">${mediaHTML(v)}
          ${v.stamp ? `<span class="card-stamp${/V8|Légende/.test(v.stamp) ? ' red' : ''}">${v.stamp}</span>` : ''}
        </div>
        <div class="card-foot">
          <h3>${v.name}</h3>
          <span class="card-cat">${v.catLabel}</span>
          <ul class="card-specs">${v.chips.map(c => `<li>${c}</li>`).join('')}</ul>
          <div class="card-price">
            <b>${v.price}<small> €/j</small></b>
            <button class="card-more" data-open="${v.id}">Fiche &amp; réservation</button>
          </div>
        </div>
      </article>`).join('');
    wireMedia(fleetGrid);
    initCarousels(fleetGrid);
    wireTilt(fleetGrid);
    $$('.card-more', fleetGrid).forEach(b => b.addEventListener('click', () => openModal(b.dataset.open)));
    $$('.card', fleetGrid).forEach((card, i) => {
      card.classList.add('is-entering');
      setTimeout(() => card.classList.remove('is-entering'), 60 + i * 55);
    });
  }

  /* ---------- filtres ---------- */
  let activeCat = 'all';
  function applyFilter(cat) {
    activeCat = cat;
    $$('#filters .chip').forEach(c => {
      const on = c.dataset.cat === cat;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-selected', on);
    });
    let visible = 0;
    $$('.card', fleetGrid).forEach(card => {
      const show = cat === 'all' || card.dataset.cat === cat;
      if (show) visible++;
      if (show && card.style.display === 'none') {
        card.style.display = '';
        card.classList.add('is-entering');
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('is-entering')));
      } else if (!show) {
        card.classList.add('is-hiding');
        setTimeout(() => { if (card.classList.contains('is-hiding')) { card.style.display = 'none'; card.classList.remove('is-hiding'); } }, 260);
      } else {
        card.classList.remove('is-hiding');
      }
    });
    fleetEmpty.hidden = visible > 0;
  }
  $$('#filters .chip').forEach(chip =>
    chip.addEventListener('click', () => applyFilter(chip.dataset.cat)));

  /* ---------- tilt 3D ---------- */
  function wireTilt(scope) {
    if (TOUCH) return;
    $$('[data-tilt]', scope).forEach(card => {
      const media = $('.card-media', card);
      if (!media) return;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        media.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg)`;
      });
      card.addEventListener('pointerleave', () => {
        media.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1)';
        media.style.transform = '';
        setTimeout(() => (media.style.transition = ''), 600);
      });
    });
  }

  /* ======================================================================
     9. MODALE VÉHICULE + CALCULATEUR
  ====================================================================== */
  const modal = $('#modal');
  let currentVehicle = null, lastFocus = null;
  let searchDays = 0;
  /* véhicule et dates retenus avant l'envoi du formulaire de réservation */
  let pending = null;
  let searchCtx = { city: 'Paris 11ᵉ', from: '', to: '' };

  /* ---- la demande part vers l'espace admin (stockage local) ---- */
  function saveReservation(name, email, notes) {
    const days = (pending && pending.days) || searchDays || 1;
    const from = searchCtx.from || new Date().toISOString().slice(0, 10);
    const to = searchCtx.to || new Date(Date.parse(from) + days * 86400000).toISOString().slice(0, 10);
    const entry = {
      id: 'LNJ-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(),
      car: (pending && pending.car) || 'À définir avec l\'agence',
      cat: (pending && pending.cat) || '',
      price: (pending && pending.price) || 0,
      days,
      total: (pending && pending.total) || 0,
      options: (pending && pending.options) || [],
      name, email, phone: '',
      pickup: searchCtx.city,
      from, to,
      notes,
      status: 'wait',
      created: new Date().toISOString().slice(0, 10),
    };
    try {
      const key = 'lnj_reservations';
      const list = JSON.parse(localStorage.getItem(key)) || [];
      list.unshift(entry);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (_) { /* stockage indisponible : la demande reste affichée à l'écran */ }
    pending = null;
    return entry;
  }

  function openModal(id) {
    const v = FLEET.find(x => x.id === id);
    if (!v || !modal) return;
    currentVehicle = v;
    lastFocus = document.activeElement;
    $('#modalMedia').innerHTML = mediaHTML(v, true);
    wireMedia($('#modalMedia'));
    $('#modalCat').textContent = v.catLabel;
    $('#modalTitle').textContent = v.name;
    $('#modalSpecs').innerHTML = Object.entries(v.specs)
      .map(([k, val]) => `<tr><th>${k}</th><td>${val}</td></tr>`).join('');
    const days = $('#calcDays');
    days.value = clamp(searchDays || 3, 1, 30);
    $$('#calcOpts input').forEach(i => (i.checked = false));
    updateCalc();
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    $('#modalClose').focus();
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }
  function updateCalc() {
    if (!currentVehicle) return;
    const days = parseInt($('#calcDays').value, 10);
    $('#calcDaysOut').textContent = days + (days > 1 ? ' jours' : ' jour');
    const optsPerDay = $$('#calcOpts input:checked').reduce((s, i) => s + parseInt(i.value, 10), 0);
    const base = currentVehicle.price * days;
    const discount = days >= 7 ? 0.10 : 0;
    const total = Math.round(base * (1 - discount) + optsPerDay * days);
    $('#calcDetail').textContent =
      `${currentVehicle.price} € × ${days} j` +
      (discount ? ' avec remise 10 %' : '') +
      (optsPerDay ? ` + options ${optsPerDay} €/j` : '');
    $('#calcTotal').textContent = EUR(total);
  }
  if (modal) {
    $('#modalClose').addEventListener('click', closeModal);
    $('#modalBackdrop').addEventListener('click', closeModal);
    window.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    $('#calcDays').addEventListener('input', updateCalc);
    $$('#calcOpts input').forEach(i => i.addEventListener('change', updateCalc));
    $('#modalBook').addEventListener('click', () => {
      const v = currentVehicle;
      const days = parseInt($('#calcDays').value, 10);
      const total = $('#calcTotal').textContent;
      pending = {
        car: v.name, cat: v.catLabel, price: v.price, days,
        total: parseInt(total.replace(/[^0-9]/g, ''), 10) || v.price * days,
        options: $$('#calcOpts input:checked').map(i => i.dataset.name),
      };
      closeModal();
      const msg = $('#cf-message');
      if (msg) msg.value = `Je souhaite réserver : ${v.name}, ${days} jour(s), estimation ${total}.`;
      scrollToId('#reserver');
      showToast(`<b>${v.name}</b> ajouté à votre demande — finalisez ci-dessous.`);
    });
  }

  /* ======================================================================
     10. TOAST
  ====================================================================== */
  const toast = $('#toast');
  let toastTimer;
  function showToast(html) {
    if (!toast) return;
    toast.innerHTML = html;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
  }

  /* ======================================================================
     11. RECHERCHE — disponibilité
  ====================================================================== */
  const search = $('#search');
  if (search) {
    const from = $('#s-from'), to = $('#s-to');
    const today = new Date().toISOString().slice(0, 10);
    from.min = today;
    to.min = today;
    from.addEventListener('change', () => { if (from.value) to.min = from.value; });

    search.addEventListener('submit', e => {
      e.preventDefault();
      const cat = $('#s-cat').value;
      const city = $('#s-city').value;
      if (from.value && to.value && to.value < from.value) {
        showToast('La date de retour doit suivre la date de départ.');
        return;
      }
      if (from.value && to.value) {
        searchDays = clamp(Math.max(1, Math.round((new Date(to.value) - new Date(from.value)) / 86400000)), 1, 30);
      }
      searchCtx = { city: $('#s-city').selectedOptions[0].textContent, from: from.value, to: to.value };
      applyFilter(cat);
      const n = FLEET.filter(v => cat === 'all' || v.cat === cat).length;
      const period = from.value && to.value
        ? ` du ${new Date(from.value).toLocaleDateString('fr-FR')} au ${new Date(to.value).toLocaleDateString('fr-FR')}`
        : '';
      showToast(`<b>${n} voiture${n > 1 ? 's' : ''}</b> disponible${n > 1 ? 's' : ''} à ${city}${period}.`);
      scrollToId('#flotte');
    });
  }

  /* ======================================================================
     12. REVEALS / SCRAMBLE / COMPTEURS
  ====================================================================== */
  const revIO = new IntersectionObserver((ents) => {
    ents.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      if (el.hasAttribute('data-scramble') && !RM) scramble(el);
      revIO.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });
  $$('[data-reveal]').forEach(el => { if (!el.closest('.hero')) revIO.observe(el); });
  $$('[data-scramble]:not([data-reveal])').forEach(el => revIO.observe(el));

  const cIO = new IntersectionObserver((ents) => {
    ents.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const start = performance.now(), dur = 1600;
      (function step(now) {
        const p = clamp((now - start) / dur, 0, 1);
        const val = (1 - Math.pow(1 - p, 3)) * target;
        el.textContent = dec
          ? val.toFixed(dec).replace('.', ',')
          : Math.round(val).toLocaleString('fr-FR');
        if (p < 1) requestAnimationFrame(step);
      })(start);
      cIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => cIO.observe(el));

  /* ======================================================================
     13. MANIFESTO — allumage des mots au scroll
  ====================================================================== */
  const mText = $('[data-words]');
  if (mText) {
    const words = mText.textContent.trim().split(/\s+/);
    mText.textContent = '';
    words.forEach(word => {
      const s = document.createElement('span');
      s.className = 'w' + (word.includes(`Loc'N'Joy`) ? ' nous' : '');
      s.textContent = word + ' ';
      mText.appendChild(s);
    });
    const wEls = $$('.w', mText);
    function update() {
      const r = mText.getBoundingClientRect();
      const prog = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
      const lit = Math.floor(prog * wEls.length);
      wEls.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
    let queued = false;
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(() => { update(); queued = false; }); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    setInterval(onScroll, 120);
    update();
  }

  /* ======================================================================
     14. ACCORDÉONS (étapes + FAQ)
  ====================================================================== */
  $$('.acc').forEach(acc => {
    $$('.acc-row', acc).forEach(row => {
      const head = $('.acc-head', row);
      head.addEventListener('click', () => {
        const open = row.classList.contains('open');
        $$('.acc-row', acc).forEach(r => {
          r.classList.remove('open');
          $('.acc-head', r).setAttribute('aria-expanded', 'false');
        });
        if (!open) {
          row.classList.add('open');
          head.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });

  /* ======================================================================
     15. AVIS — rotation automatique + navigation
  ====================================================================== */
  const reviews = $$('.review');
  const rdots = $$('.rdot');
  if (reviews.length) {
    let rIdx = 0, rTimer;
    function showReview(i) {
      rIdx = (i + reviews.length) % reviews.length;
      reviews.forEach((r, j) => r.classList.toggle('is-active', j === rIdx));
      rdots.forEach((d, j) => {
        d.classList.toggle('is-on', j === rIdx);
        d.setAttribute('aria-selected', j === rIdx);
      });
    }
    function armReviews() {
      clearInterval(rTimer);
      rTimer = setInterval(() => showReview(rIdx + 1), 5200);
    }
    rdots.forEach((d, i) => d.addEventListener('click', () => { showReview(i); armReviews(); }));
    const stage = $('.reviews-stage');
    stage.addEventListener('pointerenter', () => clearInterval(rTimer));
    stage.addEventListener('pointerleave', armReviews);
    armReviews();
  }

  /* ======================================================================
     16. HEADER hide/show + menu mobile
  ====================================================================== */
  const header = $('#header');
  let lastY = 0;
  (function headerWatch() {
    const y = TOUCH || RM ? window.scrollY : Scroll.y;
    if (y > lastY + 1 && y > 160) header.classList.add('hide');
    else if (y < lastY - 1) header.classList.remove('hide');
    lastY = y;
    requestAnimationFrame(headerWatch);
  })();

  const burger = $('#burger'), menu = $('#menu');
  function toggleMenu(force) {
    const open = force ?? !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.classList.toggle('no-scroll', open && (TOUCH || RM));
  }
  burger.addEventListener('click', () => toggleMenu());
  $$('#menu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* ======================================================================
     17. ANCRES
  ====================================================================== */
  function scrollToId(id) {
    const tgt = $(id);
    if (!tgt) return;
    const top = tgt.getBoundingClientRect().top + (TOUCH || RM ? window.scrollY : scrollCurrent);
    window.scrollTo({ top: top - 40, behavior: (TOUCH || RM) ? 'smooth' : 'auto' });
  }
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      e.preventDefault();
      scrollToId(id);
    });
  });

  /* ======================================================================
     18. FORMULAIRE CONVERSATIONNEL
  ====================================================================== */
  const chat = $('#chat');
  if (chat) {
    const steps = $$('.chat-step', chat);
    const show = n => steps.forEach(s => s.classList.toggle('is-active', s.dataset.step === String(n)));
    $$('.chat-go[data-next]', chat).forEach(btn => {
      btn.addEventListener('click', () => {
        const cur = btn.closest('.chat-step');
        const inp = $('input, textarea', cur);
        if (inp && !inp.checkValidity()) { inp.reportValidity(); return; }
        const next = btn.dataset.next;
        show(next);
        const ni = $(`[data-step="${next}"] input, [data-step="${next}"] textarea`, chat);
        if (ni) setTimeout(() => ni.focus(), 460);
      });
    });
    chat.addEventListener('submit', e => {
      e.preventDefault();
      const msg = $('#cf-message');
      if (msg && !msg.checkValidity()) { msg.reportValidity(); return; }
      const name = $('#cf-name').value.trim() || 'vous';
      const email = $('#cf-email').value.trim();
      const entry = saveReservation(name, email, msg ? msg.value.trim() : '');
      $('#cf-namecheck').textContent = name;
      const ref = $('#cf-ref');
      if (ref) ref.textContent = entry.id;
      show(4);
      /* La demande apparaît aussitôt dans l'espace admin (espace.html).
         Hook : brancher ici un vrai endpoint (Formspree, EmailJS, fetch). */
    });
  }

  /* ======================================================================
     19. MINI-JEU — LE SLALOM
     3 voies, cônes à éviter, 800 m = code promo. Clavier / swipe / d-pad.
  ====================================================================== */
  const slalom = $('#slalomCanvas');
  if (slalom) {
    const sctx = slalom.getContext('2d');
    const startBox = $('#slalomStart'), winBox = $('#slalomWin'), loseBox = $('#slalomLose');
    const distEl = $('#gameDist'), bestEl = $('#gameBest'), loseDistEl = $('#loseDist');
    const WIN_DIST = 800;
    let W, H, dpr2, running = false, finished = false;
    let lane = 1, carX = 0, dist = 0, speed = 0, roadShift = 0;
    let cones = [], sparks2 = [];
    let best = 0;
    try { best = parseInt(localStorage.getItem('locnjoy-slalom-best') || '0', 10) || 0; } catch (_) {}
    bestEl.textContent = best;

    function sizeSlalom() {
      dpr2 = Math.min(devicePixelRatio || 1, 2);
      const cssW = slalom.parentElement.clientWidth;
      const cssH = Math.min(440, Math.max(320, Math.round(cssW * 0.82)));
      slalom.style.height = cssH + 'px';
      W = slalom.width = cssW * dpr2;
      H = slalom.height = cssH * dpr2;
    }

    const laneX = l => W * (0.5 + (l - 1) * 0.27);

    function resetSlalom(autostart) {
      lane = 1; carX = laneX(1); dist = 0; speed = 2.6; roadShift = 0;
      cones = []; sparks2 = []; finished = false;
      distEl.textContent = '0';
      winBox.hidden = true; loseBox.hidden = true;
      running = !!autostart;
      if (autostart) startBox.hidden = true;
    }

    function crash() {
      running = false; finished = true;
      const d = Math.floor(dist);
      loseDistEl.textContent = d;
      if (d > best) {
        best = d;
        bestEl.textContent = best;
        try { localStorage.setItem('locnjoy-slalom-best', String(best)); } catch (_) {}
      }
      // gerbe d'étincelles
      for (let i = 0; i < 50; i++) {
        const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
        sparks2.push({ x: carX, y: H * 0.78, vx: Math.cos(a) * v * dpr2, vy: Math.sin(a) * v * dpr2 - 2 * dpr2,
          life: 1, color: Math.random() < 0.6 ? '#FFA928' : '#E23D2E', size: (2 + Math.random() * 4) * dpr2 });
      }
      setTimeout(() => { loseBox.hidden = false; }, 650);
    }

    function win() {
      running = false; finished = true;
      if (WIN_DIST > best) {
        best = WIN_DIST;
        bestEl.textContent = best;
        try { localStorage.setItem('locnjoy-slalom-best', String(best)); } catch (_) {}
      }
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6;
        sparks2.push({ x: W / 2, y: H * 0.4, vx: Math.cos(a) * v * dpr2, vy: Math.sin(a) * v * dpr2 - 3 * dpr2,
          life: 1, color: Math.random() < 0.7 ? '#FFA928' : '#E8E4D8', size: (3 + Math.random() * 5) * dpr2 });
      }
      setTimeout(() => { winBox.hidden = false; }, 650);
    }

    function steer(dir) {
      if (!running) return;
      if (dir === 'left') lane = clamp(lane - 1, 0, 2);
      if (dir === 'right') lane = clamp(lane + 1, 0, 2);
    }

    function drawCar(x, y, s, color) {
      sctx.save();
      sctx.translate(x, y);
      const w2 = 30 * s, h2 = 52 * s;
      sctx.fillStyle = color;
      sctx.beginPath();
      if (sctx.roundRect) sctx.roundRect(-w2 / 2, -h2 / 2, w2, h2, 9 * s);
      else sctx.rect(-w2 / 2, -h2 / 2, w2, h2);
      sctx.fill();
      sctx.fillStyle = 'rgba(11,15,23,.5)';
      sctx.fillRect(-w2 / 2 + 4 * s, -h2 / 2 + 12 * s, w2 - 8 * s, 12 * s);
      sctx.fillRect(-w2 / 2 + 4 * s, h2 / 2 - 16 * s, w2 - 8 * s, 9 * s);
      // phares
      sctx.fillStyle = 'rgba(255,235,180,.95)';
      sctx.fillRect(-w2 / 2 + 3 * s, -h2 / 2 + 1 * s, 7 * s, 4 * s);
      sctx.fillRect(w2 / 2 - 10 * s, -h2 / 2 + 1 * s, 7 * s, 4 * s);
      sctx.restore();
    }

    function frameSlalom() {
      sctx.clearRect(0, 0, W, H);

      // route
      sctx.fillStyle = '#10151F';
      sctx.fillRect(0, 0, W, H);
      const edge = W * 0.14;
      sctx.fillStyle = '#0B0F17';
      sctx.fillRect(0, 0, edge, H);
      sctx.fillRect(W - edge, 0, edge, H);
      sctx.strokeStyle = 'rgba(232,228,216,.3)';
      sctx.lineWidth = 3 * dpr2;
      sctx.beginPath();
      sctx.moveTo(edge, 0); sctx.lineTo(edge, H);
      sctx.moveTo(W - edge, 0); sctx.lineTo(W - edge, H);
      sctx.stroke();

      // marquage des voies, défilement
      if (running) roadShift = (roadShift + speed * dpr2) % (64 * dpr2);
      sctx.strokeStyle = 'rgba(255,169,40,.55)';
      sctx.lineWidth = 4 * dpr2;
      sctx.setLineDash([28 * dpr2, 36 * dpr2]);
      sctx.lineDashOffset = -roadShift;
      [0.5 - 0.135, 0.5 + 0.135].forEach(fx => {
        sctx.beginPath();
        sctx.moveTo(W * fx, 0); sctx.lineTo(W * fx, H);
        sctx.stroke();
      });
      sctx.setLineDash([]);

      if (running) {
        dist += speed * 0.055;
        speed = Math.min(7.5, speed + 0.0016);
        distEl.textContent = Math.floor(dist);

        // spawn des cônes — jamais 3 voies bloquées d'un coup
        if (Math.random() < 0.022 + speed * 0.004) {
          const l = Math.floor(Math.random() * 3);
          const tooClose = cones.some(c => c.y < 120 * dpr2);
          if (!tooClose) cones.push({ lane: l, y: -30 * dpr2 });
        }
        if (dist >= WIN_DIST) win();
      }

      // cônes
      for (let i = cones.length - 1; i >= 0; i--) {
        const c = cones[i];
        if (running) c.y += speed * 1.9 * dpr2;
        if (c.y > H + 40 * dpr2) { cones.splice(i, 1); continue; }
        const cx = laneX(c.lane);
        const s = dpr2;
        sctx.fillStyle = '#E86A10';
        sctx.beginPath();
        sctx.moveTo(cx, c.y - 16 * s);
        sctx.lineTo(cx + 12 * s, c.y + 12 * s);
        sctx.lineTo(cx - 12 * s, c.y + 12 * s);
        sctx.closePath();
        sctx.fill();
        sctx.fillStyle = '#F2EFE7';
        sctx.fillRect(cx - 7 * s, c.y - 2 * s, 14 * s, 5 * s);
        sctx.fillStyle = '#C24E08';
        sctx.fillRect(cx - 15 * s, c.y + 12 * s, 30 * s, 4 * s);

        // collision
        const carY = H * 0.78;
        if (running && Math.abs(c.y - carY) < 34 * dpr2 && Math.abs(cx - carX) < 26 * dpr2) crash();
      }

      // voiture du joueur (lissée)
      carX = lerp(carX || laneX(lane), laneX(lane), 0.22);
      const tilt = (laneX(lane) - carX) * 0.0009;
      sctx.save();
      sctx.translate(0, 0);
      sctx.translate(carX, H * 0.78);
      sctx.rotate(tilt);
      sctx.translate(-carX, -H * 0.78);
      drawCar(carX, H * 0.78, dpr2, '#FFA928');
      sctx.restore();

      // étincelles / confettis
      for (let i = sparks2.length - 1; i >= 0; i--) {
        const p = sparks2[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.16 * dpr2; p.life -= 0.012;
        if (p.life <= 0) { sparks2.splice(i, 1); continue; }
        sctx.globalAlpha = p.life;
        sctx.fillStyle = p.color;
        sctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.7);
        sctx.globalAlpha = 1;
      }

      requestAnimationFrame(frameSlalom);
    }

    /* ---- contrôles ---- */
    let gameVisible = false;
    new IntersectionObserver(ents => { gameVisible = ents[0].isIntersecting; }, { threshold: 0.25 }).observe(slalom);

    const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', q: 'left', d: 'right', a: 'left' };
    window.addEventListener('keydown', e => {
      const dir = KEYS[e.key];
      if (!dir || !gameVisible) return;
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      steer(dir);
    });

    let tsx = 0;
    slalom.addEventListener('touchstart', e => { tsx = e.touches[0].clientX; }, { passive: true });
    slalom.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tsx;
      if (Math.abs(dx) < 20) return;
      steer(dx > 0 ? 'right' : 'left');
    }, { passive: true });

    $$('#gamePad button').forEach(b => b.addEventListener('click', () => steer(b.dataset.dir)));
    $('#slalomGo').addEventListener('click', () => { resetSlalom(true); slalom.focus({ preventScroll: true }); });
    $('#slalomRetry').addEventListener('click', () => { resetSlalom(true); slalom.focus({ preventScroll: true }); });
    $('#gameReset').addEventListener('click', () => { resetSlalom(false); startBox.hidden = false; });
    $('#promoCopy').addEventListener('click', () => {
      const code = $('#promoCode').textContent;
      const done = () => showToast(`Code <b>${code}</b> copié — valable sur votre prochaine réservation.`);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, done);
      else done();
    });

    window.addEventListener('resize', () => { sizeSlalom(); carX = laneX(lane); });
    sizeSlalom();
    resetSlalom(false);
    frameSlalom();
  }

  /* ======================================================================
     20. SIGNATURE — ligne médiane de progression, horloge, stickers,
         image de secours, easter egg "vroom"
  ====================================================================== */

  /* ---- ligne médiane : marquage dessiné + voiture-curseur ---- */
  const laneDash = $('#laneDash'), laneCar = $('#laneCar');
  if (laneDash && laneCar && !RM) {
    (function laneLoop() {
      const max = Math.max(1, document.body.scrollHeight - innerHeight);
      const p = clamp((TOUCH ? window.scrollY : Scroll.y) / max, 0, 1);
      const px = p * (innerHeight - 46);
      laneDash.style.height = px + 'px';
      const tilt2 = clamp((TOUCH ? 0 : Scroll.v) * 0.5, -14, 14);
      laneCar.style.transform = `translateY(${px - 10}px) rotate(${tilt2}deg)`;
      requestAnimationFrame(laneLoop);
    })();
  }

  /* ---- logo : le fichier images/logo.png prend la place du mot-symbole ---- */
  const brandFile = $('.brand-file');
  if (brandFile) {
    brandFile.addEventListener('load', () => {
      if (brandFile.naturalWidth > 0) {
        brandFile.hidden = false;
        $$('.brand-mark, .brand-text').forEach(el => el.remove());
      }
    });
    brandFile.addEventListener('error', () => brandFile.remove());
  }

  /* ---- horloge (heure de Paris) ---- */
  const clock = $('#clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tickClock = () => { clock.textContent = fmt.format(new Date()); };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ---- lettres du hero qui dansent ---- */
  if (!TOUCH) {
    $$('.hero-title .char').forEach(c => {
      c.addEventListener('mouseenter', () => {
        if (c.classList.contains('jig')) return;
        c.classList.add('jig');
        c.addEventListener('animationend', () => c.classList.remove('jig'), { once: true });
      });
    });
  }

  /* ---- stickers : attraper, lancer, retour élastique ---- */
  $$('.sticker').forEach(st => {
    let ox = 0, oy = 0, sx = 0, sy = 0, vx = 0, vy = 0, lx = 0, ly = 0;
    let dragging = false, raf;

    function onMove(e) {
      if (!dragging) return;
      const nx = e.clientX - sx, ny = e.clientY - sy;
      vx = nx - lx; vy = ny - ly; lx = nx; ly = ny;
      ox = nx; oy = ny;
      st.style.transform = `translate(${ox}px, ${oy}px) rotate(${clamp(vx * 1.2, -20, 20)}deg)`;
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener('pointermove', onMove);
      (function fling() {
        vx *= 0.92; vy = vy * 0.92 + 0.5;
        ox += vx; oy += vy;
        st.style.transform = `translate(${ox}px, ${oy}px) rotate(${clamp(vx * 2, -30, 30)}deg)`;
        if (Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3) raf = requestAnimationFrame(fling);
        else {
          st.style.transition = 'transform .9s cubic-bezier(.34,1.56,.64,1)';
          st.style.transform = 'translate(0,0) rotate(0)';
          setTimeout(() => {
            st.style.transition = '';
            st.classList.remove('grabbed');
            ox = oy = 0;
          }, 900);
        }
      })();
    }
    st.addEventListener('pointerdown', e => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      dragging = true;
      st.classList.add('grabbed');
      st.style.transition = '';
      sx = e.clientX - ox; sy = e.clientY - oy;
      lx = ox; ly = oy; vx = vy = 0;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    });
  });

  /* ---- bannière route : secours si l'image ne charge pas ---- */
  $$('[data-fallback="road"]').forEach(img => {
    img.addEventListener('error', () => {
      img.parentElement.classList.add('no-img');
      img.remove();
    }, { once: true });
  });

  /* ---- easter egg : tapez "vroom" ---- */
  const vroom = $('#vroom');
  if (vroom) {
    let buffer = '';
    window.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-5);
      if (buffer === 'vroom' && !vroom.classList.contains('pop')) {
        vroom.classList.add('pop');
        vroom.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
          vroom.classList.remove('pop');
          vroom.setAttribute('aria-hidden', 'true');
        }, 1650);
      }
    });
  }

  /* ======================================================================
     21. BOOT
  ====================================================================== */
  $('#year').textContent = new Date().getFullYear();
  renderFleet();
  makeMagnetic();
  registerParallax();
  registerDraw();
  initSmooth();
  initNativeBus();
})();
