/* ============================================================================
   SANCTUARY OS — SVG Confetti
   ----------------------------------------------------------------------------
   Hand-drawn vector shapes on a small physics rig. Not canvas, not emoji,
   not squares.

   THE FLUTTER
   -----------
   What makes falling paper read as paper is not the falling. It is that paper
   is a plane, so it turns edge-on, briefly vanishes, and catches the light
   again on the way back around. Every piece carries independent angular
   velocity on all three axes, so `rotateY` periodically brings it
   perpendicular to the viewer and it thins to a line. Add a lateral sine sway
   for air resistance, per-piece gravity for depth, and drag so nothing ever
   accelerates into a bullet.

   THE PALETTE IS THE HOUR
   -----------------------
   Colors are read live from the phase tokens, so confetti thrown at golden
   hour falls in orange-gold and earthy brown, and confetti thrown at midnight
   falls in moss and muted gold. What drifts slowly behind the page is what
   bursts across it — one world, two speeds, and the same time of day.
   ========================================================================== */

const SanctuaryConfetti = (() => {
  const PALETTE_TOKENS = [
    "--sanc-bloom-1",
    "--sanc-bloom-2",
    "--sanc-bloom-3",
    "--sanc-bloom-4",
    "--sanc-bloom-5",
    "--sanc-accent",
    "--sanc-accent-deep",
    "--sanc-surface",
  ];

  const FALLBACK = ["#efcb84", "#b4c3a8", "#e7c6b4", "#bfd0de", "#d4a72c"];

  /* Weighted so petals and dots carry the volume and sparkles stay rare. A
     sparkle everywhere is not a sparkle, it's a texture. */
  const SHAPES = [
    { name: "petal", weight: 22, svg: '<path d="M12 1C17 7 20 13 12 23C4 13 7 7 12 1Z"/>' },
    { name: "seed", weight: 16, svg: '<path d="M12 2C20 8 20 16 12 22C10 16 10 8 12 2Z"/>' },
    { name: "dot", weight: 16, svg: '<circle cx="12" cy="12" r="6.5"/>' },
    { name: "chip", weight: 13, svg: '<rect x="3.5" y="8.5" width="17" height="7" rx="3.5"/>' },
    { name: "ribbon", weight: 12, svg: '<path d="M3 6C8 2 16 10 21 6L21 14C16 18 8 10 3 14Z"/>' },
    { name: "crescent", weight: 8, svg: '<path d="M12 1A11 11 0 1 0 12 23A8.6 8.6 0 1 1 12 1Z"/>' },
    { name: "sparkle", weight: 8, svg: '<path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/>' },
    { name: "burst", weight: 5, svg: '<path d="M12 0L14.5 8.5L23 6L17 12L23 18L14.5 15.5L12 24L9.5 15.5L1 18L7 12L1 6L9.5 8.5Z"/>' },
  ];

  const WEIGHT_TOTAL = SHAPES.reduce((sum, s) => sum + s.weight, 0);
  const MAX_PIECES = 220;
  const TERMINAL = 620; // px/s — nothing falls faster than this, ever

  const templates = new Map();
  let palette = FALLBACK;
  let layer = null;
  let pieces = [];
  let frame = null;
  let lastTime = 0;
  let reduced = false;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function refreshPalette() {
    const computed = getComputedStyle(document.documentElement);
    const next = PALETTE_TOKENS.map((token) =>
      computed.getPropertyValue(token).trim()
    ).filter(Boolean);
    palette = next.length >= 3 ? next : FALLBACK;
  }

  function pickShape() {
    let roll = Math.random() * WEIGHT_TOTAL;
    for (const shape of SHAPES) {
      roll -= shape.weight;
      if (roll <= 0) return shape;
    }
    return SHAPES[0];
  }

  /* Each shape is parsed exactly once and cloned thereafter. Building 200
     elements from markup strings on every burst is how confetti turns into a
     jank report. */
  function template(shape) {
    let node = templates.get(shape.name);
    if (!node) {
      node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      node.setAttribute("viewBox", "0 0 24 24");
      node.innerHTML = shape.svg;
      templates.set(shape.name, node);
    }
    return node.cloneNode(true);
  }

  function setLayer(element) {
    layer = element;
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (element) refreshPalette();
  }

  function spawn(config) {
    if (!layer || pieces.length >= MAX_PIECES) return;

    const el = template(pickShape());
    const size = rand(config.sizeMin, config.sizeMax);

    el.setAttribute("class", "piece");
    el.setAttribute("fill", palette[(Math.random() * palette.length) | 0]);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;

    pieces.push({
      el,
      x: config.x,
      y: config.y,
      vx: config.vx,
      vy: config.vy,
      /* Per-piece gravity is the depth cue. Identical gravity on every piece
         reads as a flat sheet of dots moving together. */
      gravity: rand(340, 620) * (reduced ? 0.28 : 1),
      drag: rand(0.86, 0.95),
      swayAmp: rand(14, 52),
      swayFreq: rand(0.5, 1.5),
      swayPhase: Math.random() * Math.PI * 2,
      rx: Math.random() * 360,
      ry: Math.random() * 360,
      rz: Math.random() * 360,
      vrx: rand(-260, 260),
      vry: rand(-320, 320),
      vrz: rand(-190, 190),
      scale: rand(0.72, 1.15),
      life: 0,
      maxLife: rand(config.lifeMin, config.lifeMax),
    });

    layer.appendChild(el);
  }

  function step(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    const height = window.innerHeight;
    let alive = 0;

    for (const p of pieces) {
      if (!p.el) continue;

      p.life += dt;
      const t = p.life / p.maxLife;

      if (t >= 1 || p.y > height + 140) {
        p.el.remove();
        p.el = null;
        continue;
      }

      p.vy = Math.min(p.vy + p.gravity * dt, TERMINAL);
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(0.995, dt * 60);

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.rx += p.vrx * dt;
      p.ry += p.vry * dt;
      p.rz += p.vrz * dt;

      const sway = Math.sin(p.life * p.swayFreq * Math.PI * 2 + p.swayPhase) * p.swayAmp;

      /* Fade only across the last third, so pieces stay solid through the part
         of the arc anyone is actually watching. */
      p.el.style.opacity = t > 0.66 ? 1 - (t - 0.66) / 0.34 : 1;
      p.el.style.transform =
        `translate3d(${(p.x + sway).toFixed(2)}px, ${p.y.toFixed(2)}px, 0) ` +
        `rotateX(${p.rx.toFixed(1)}deg) rotateY(${p.ry.toFixed(1)}deg) ` +
        `rotateZ(${p.rz.toFixed(1)}deg) scale(${p.scale.toFixed(3)})`;

      alive++;
    }

    if (alive !== pieces.length) {
      pieces = pieces.filter((p) => p.el);
    }

    /* The loop stops itself the moment the last piece lands. An idle rAF
       running forever in every tab is a battery bug wearing a party hat. */
    frame = pieces.length > 0 ? requestAnimationFrame(step) : null;
  }

  function start() {
    if (frame === null && pieces.length > 0) {
      lastTime = performance.now();
      frame = requestAnimationFrame(step);
    }
  }

  /* A radial burst with an upward bias — thrown, then caught by gravity. */
  function bloom(x, y, count = 34) {
    if (!layer) return;
    const n = reduced ? Math.round(count * 0.4) : count;

    for (let i = 0; i < n; i++) {
      const angle = rand(-Math.PI * 0.92, -Math.PI * 0.08);
      const speed = rand(180, 560) * (reduced ? 0.45 : 1);
      spawn({
        x,
        y,
        vx: Math.cos(angle) * speed + rand(-60, 60),
        vy: Math.sin(angle) * speed,
        sizeMin: 9,
        sizeMax: 21,
        lifeMin: 2.4,
        lifeMax: 4.6,
      });
    }
    start();
  }

  /* A slow fall from just above the fold. This is the ambient one. */
  function cascade(count = 26) {
    if (!layer) return;
    const n = reduced ? Math.round(count * 0.4) : count;
    const width = window.innerWidth;

    for (let i = 0; i < n; i++) {
      spawn({
        x: rand(-40, width + 40),
        y: rand(-220, -20),
        vx: rand(-40, 40),
        vy: rand(30, 110),
        sizeMin: 8,
        sizeMax: 18,
        lifeMin: 4.5,
        lifeMax: 8,
      });
    }
    start();
  }

  /* The full occasion: two blooms from the lower corners, a beat, then a
     center burst and a drift from above. The stagger is what separates a
     celebration from an explosion. */
  function celebrate() {
    refreshPalette();
    const w = window.innerWidth;
    const h = window.innerHeight;

    bloom(w * 0.18, h * 0.82, 32);
    bloom(w * 0.82, h * 0.82, 32);

    setTimeout(() => bloom(w * 0.5, h * 0.72, 40), 170);
    setTimeout(() => cascade(30), 340);
    setTimeout(() => {
      bloom(w * 0.34, h * 0.78, 20);
      bloom(w * 0.66, h * 0.78, 20);
    }, 560);
  }

  /* The page-load greeting: a soft drift plus one small bloom low and off
     center. Quiet enough to be a welcome rather than an interruption. */
  function welcome() {
    cascade(reduced ? 8 : 20);
    setTimeout(
      () => bloom(window.innerWidth * 0.5, window.innerHeight * 0.68, reduced ? 8 : 18),
      420
    );
  }

  function clear() {
    for (const p of pieces) {
      if (p.el) p.el.remove();
    }
    pieces = [];
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });

  return { setLayer, refreshPalette, bloom, cascade, celebrate, welcome, clear };
})();
