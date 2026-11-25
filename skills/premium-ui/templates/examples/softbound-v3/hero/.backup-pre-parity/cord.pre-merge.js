/* Softbound v3: the lamp's pull-cord (from v2 Atelier). Pull it down past the click to move the light on (morning → golden → night); it springs back.
   Lives on its own and talks to the scene only through window.SB (screenEl, onTick, requestFrame, cycleTime, time, state). Loaded after scene.js. */
(function () {
  'use strict';
  const SB = window.SB; if (!SB || !SB.screenEl) return;
  const screenEl = SB.screenEl, homeEl = screenEl.querySelector('.sb-home') || screenEl;
  const onTick = fn => SB.onTick(fn), wake = () => SB.requestFrame(), cycleTime = () => SB.cycleTime();
  const hap = k => { try { window.SBHaptics && SBHaptics[k] && SBHaptics[k](); } catch (e) {} };
  const snd = (n, o) => { try { window.SBSound && SBSound.play(n, o || {}); } catch (e) {} };
  const CX = 290, N = 9, SEG = 12, REST = N * SEG, PULL = 42, G = 1500;
  const st = document.createElement('style');
  st.textContent = `#screen .sb-cord{position:absolute;left:0;top:0;width:390px;height:300px;pointer-events:none;z-index:2}
#screen .sb-cord path{stroke:var(--ink);stroke-opacity:.5;transition:stroke 1s}
#screen .sb-cord .bd{fill:#C9A05E;stroke:#7E5E2C;stroke-width:1}
#screen .sb-cord .hl{fill:rgba(255,248,228,.75)}
#screen .sb-cord-hit{all:unset;position:absolute;left:0;top:0;width:44px;height:56px;margin:-28px 0 0 -22px;pointer-events:auto;cursor:grab;touch-action:none;border-radius:22px}
#screen .sb-cord-hit:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
#screen.overview .sb-cord{opacity:0}`;
  document.head.appendChild(st);
  const wrap = document.createElement('div'); wrap.className = 'sb-cord';
  wrap.innerHTML = `<svg width="390" height="300" aria-hidden="true"><path fill="none" stroke-width="1.6" stroke-linecap="round"/><g><ellipse class="bd" rx="6" ry="8.5"/><ellipse class="hl" rx="1.8" ry="3" cx="-2" cy="-3"/></g></svg><button class="sb-cord-hit" aria-label="Pull the lamp cord to change the light: morning, golden hour, night"></button>`;
  homeEl.appendChild(wrap);
  const path = wrap.querySelector('path'), bead = wrap.querySelector('g'), hit = wrap.querySelector('.sb-cord-hit');
  const P = Array.from({length: N + 1}, (_, i) => ({x: CX, y: -4 + i * SEG, px: CX, py: -4 + i * SEG}));
  let drag = null, L = SEG, maxPull = 0, un = null, still = 0;
  function draw() {
    let d = `M${P[0].x},${P[0].y}`;
    for (let i = 1; i < N; i++) { const mx = (P[i].x + P[i + 1].x) / 2, my = (P[i].y + P[i + 1].y) / 2; d += ` Q${P[i].x},${P[i].y} ${mx},${my}`; }
    const e = P[N], q = P[N - 1]; d += ` L${e.x},${e.y}`; path.setAttribute('d', d);
    const ang = Math.atan2(e.x - q.x, e.y - q.y);
    bead.setAttribute('transform', `translate(${e.x},${e.y + 7}) rotate(${-ang * 57.3})`);
    hit.style.transform = `translate(${e.x}px,${e.y + 7}px)`;
  }
  function step(dt) {
    dt = Math.min(dt, 1 / 30);
    if (drag) { const a = P[0], dx = drag.x - a.x, dy = drag.y - a.y, dist = Math.hypot(dx, dy), lim = REST + PULL * 1.25, k = dist > lim ? lim / dist : 1;
      P[N].x = P[N].px = a.x + dx * k; P[N].y = P[N].py = a.y + dy * k; L = Math.max(SEG, Math.hypot(P[N].x - a.x, P[N].y - a.y) / N); maxPull = Math.max(maxPull, Math.hypot(P[N].x - a.x, P[N].y - a.y) - REST); }
    else L += (SEG - L) * Math.min(1, dt * 18);
    let e = 0;
    for (let i = 1; i <= N; i++) { if (drag && i === N) continue; const p = P[i], vx = (p.x - p.px) * .985, vy = (p.y - p.py) * .985;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G * dt * dt; e += vx * vx + vy * vy; }
    for (let it = 0; it < 10; it++) for (let i = 0; i < N; i++) { const a = P[i], b = P[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, f = (d - L) / d;
      const wa = i === 0 ? 0 : (drag && i + 1 === N ? 1 : .5), wb = drag && i + 1 === N ? 0 : 1 - wa;
      a.x += dx * f * wa; a.y += dy * f * wa; b.x -= dx * f * wb; b.y -= dy * f * wb; }
    P[0].x = CX; P[0].y = -4;
    draw();
    still = e < .002 && !drag && Math.abs(L - SEG) < .01 ? still + 1 : 0;
    if (still > 20 && un) { un(); un = null; }
  }
  const run = () => { still = 0; if (!un) un = onTick(step); wake(); };
  const local = e => { const r = screenEl.getBoundingClientRect(), k = r.width / 390; return {x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k}; };
  function fire() { cycleTime(); hap('medium'); snd('tick', {pitch: .55, gain: 1}); }
  hit.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); hit.setPointerCapture(e.pointerId); drag = local(e); maxPull = 0; hap('selection'); run(); });
  hit.addEventListener('pointermove', e => { if (drag) { drag = local(e); run(); } });
  const end = e => { if (!drag) return; drag = null; if (maxPull > PULL) fire(); else if (maxPull < 6) { P[N].py = P[N].y - 9; fire(); } run(); };
  hit.addEventListener('pointerup', end); hit.addEventListener('pointercancel', end);
  hit.addEventListener('click', e => { if (e.detail === 0) { P[N].py = P[N].y - 9; fire(); run(); } }); // keyboard: a little tug
  draw();
})();
