/* Softbound v3: SCENE. The sunlit studio, the clay plinth, the shelf physics, CRUD, the helix overview, the autoplay. Exposes window.SB. */
(function () {
'use strict';
const T3 = window.THREE;
const screenEl = document.getElementById('screen');
if (!screenEl) return;
const QS = new URLSearchParams(location.search);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || QS.has('rm');
const NOAUTO = QS.has('noauto');
const CLOTH = window.SB_CLOTH || {Travel:'#A9C8EE', Recipes:'#F5B98A', Personal:'#EFB3C2', Work:'#A8DCC4', Reading:'#F3DB8C', Ideas:'#CDBDF2'};
const RIB = window.SB_RIBBON || {Travel:'#E98C73', Recipes:'#5FA98A', Personal:'#8E7DD2', Work:'#EC8F94', Reading:'#6A93D3', Ideas:'#EBBE5E'};
const INK = window.SB_INK || {Travel:'#2C4E78', Recipes:'#7A3F1C', Personal:'#80344B', Work:'#1E5A43', Reading:'#6A4C07', Ideas:'#4B3D8A'};
const TAGS = ['Travel', 'Recipes', 'Personal', 'Work', 'Reading', 'Ideas'];
const snd = (n, o) => { try { window.SBSound && SBSound.play(n, o || {}); } catch (e) {} };
const hap = k => { try { window.SBHaptics && SBHaptics[k] && SBHaptics[k](); } catch (e) {} };

/* ---------- small math ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, seg = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, eoc = t => 1 - Math.pow(1 - t, 3), eic = t => t * t * t;
const eob = t => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const sstep01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const S = (x, k, z) => ({x, v: 0, t: x, k, z});
function sstep(s, dt) { const c = 2 * Math.sqrt(s.k) * s.z, a = s.k * (s.t - s.x) - c * s.v; s.v += a * dt; s.x += s.v * dt;
  if (Math.abs(s.t - s.x) < 1e-4 && Math.abs(s.v) < 1e-3) { s.x = s.t; s.v = 0; return false; } return true; }
const wrapS = (s, n) => n ? (((s % n) + n + n / 2) % n) - n / 2 : 0;
function hexMix(a, b, t) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], t)).toString(16).padStart(2, '0')).join(''); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function noise(x, w, h, a) { const d = x.getImageData(0, 0, w, h), p = d.data; for (let i = 0; i < p.length; i += 4) { const n = (Math.random() - .5) * a; p[i] += n; p[i + 1] += n; p[i + 2] += n; } x.putImageData(d, 0, 0); }
function wrapLines(x, txt, maxW) { const out = []; String(txt).split('\n').forEach(par => { let line = ''; par.split(/\s+/).filter(Boolean).forEach(w => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }); out.push(line); }); return out; }

/* ---------- UI shell (injected so the orchestrator can inline everything) ---------- */
const IC = (d, s, sw) => `<svg viewBox="0 0 24 24" width="${s || 20}" height="${s || 20}" fill="none" stroke="currentColor" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  search: IC('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>', 19),
  plus: IC('<path d="M12 5v14M5 12h14"/>', 24, 2.4),
  helix: IC('<path d="M6 19c4 0 12-1.5 12-3.5S6 13.5 6 11.5 14 8 18 8M6 8c0-2 8-3.5 12-3.5"/>', 21, 1.9),
  shelf: IC('<rect x="5" y="5" width="4" height="13" rx="1.4"/><rect x="10.5" y="5" width="4" height="13" rx="1.4"/><path d="m16.2 6.2 3.3-.9 2.6 12.3-3.3.8z"/><path d="M3 20.5h18"/>', 21, 1.8),
  sun: IC('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>', 20, 1.9),
  moon: IC('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', 20, 1.9),
  back: IC('<path d="M14.5 5.5 8 12l6.5 6.5"/>', 20, 2.2),
  trash: IC('<path d="M4.5 7h15M10 4h4M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7"/>', 18),
  x: IC('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', 18, 2.2)
};
const css = `
#screen{--ink:#2B2A4A;--mut:#7E7890;--pill:rgba(255,253,249,.82);--fd:'Bricolage Grotesque',system-ui,sans-serif;font-family:var(--fd);color:var(--ink);-webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
#screen[data-time="night"]{--ink:#F6EDE1;--mut:#B8AC9E;--pill:rgba(46,38,52,.72)}
#screen canvas.sb-gl{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none;cursor:grab}
#screen canvas.sb-gl:active{cursor:grabbing}
#screen canvas.sb-gl:focus-visible{box-shadow:inset 0 0 0 2px rgba(43,42,74,.4)}
#screen .sb-st{position:absolute;left:0;right:0;top:0;height:54px;z-index:7;display:flex;align-items:center;justify-content:space-between;padding:4px 30px 0 40px;font:650 15px var(--fd);pointer-events:none;transition:color 1s}
#screen .sb-home{position:absolute;inset:0;pointer-events:none;z-index:3;transition:opacity .4s,transform .6s cubic-bezier(.2,0,0,1)}
#screen .sb-home.away{opacity:0;transform:scale(.97)}
#screen .sb-home.away *{pointer-events:none!important}
#screen .sb-hd{position:absolute;top:64px;left:24px;right:20px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;transition:opacity .4s}
#screen .sb-hd>div{flex:1;min-width:0}
#screen .sb-cnt{margin:0;font:500 13px var(--fd);color:var(--mut);letter-spacing:.01em;transition:color 1s}
#screen .sb-ttl{margin:4px 0 0;font:750 34px/1 var(--fd);letter-spacing:-.035em;font-variation-settings:"opsz" 96;transition:color 1s}
#screen .sb-q{display:none;width:100%;height:44px;margin-top:2px;border:0;outline:0;border-radius:22px;padding:0 16px;background:var(--pill);font:500 15px var(--fd);color:var(--ink);pointer-events:auto;box-shadow:0 10px 24px -14px rgba(60,30,20,.5)}
#screen .sb-hd.searching .sb-ttl,#screen .sb-hd.searching .sb-cnt{display:none}
#screen .sb-hd.searching .sb-q{display:block}
#screen .sb-ib{all:unset;box-sizing:border-box;pointer-events:auto;cursor:pointer;flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--pill);color:var(--ink);box-shadow:0 1px 1px rgba(80,50,40,.06),0 10px 22px -12px rgba(80,50,40,.5);transition:transform .25s cubic-bezier(.3,1.6,.5,1),background 1s,color 1s;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
#screen .sb-ib:active{transform:scale(.9)}
#screen .sb-ib:focus-visible,#screen .sb-fab:focus-visible,#screen .sb-chip:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
#screen .sb-info{position:absolute;left:24px;right:24px;top:578px;transition:opacity .25s,transform .35s cubic-bezier(.2,0,0,1)}
#screen .sb-info.out{opacity:0;transform:translateY(6px)}
#screen .sb-meta{display:flex;align-items:center;gap:8px;font:600 12px var(--fd);color:var(--mut);transition:color 1s}
#screen .sb-tg{display:inline-flex;align-items:center;height:22px;padding:0 10px;border-radius:99px;background:var(--c);color:var(--d);font-weight:700}
#screen .sb-nt{margin:8px 0 0;font:720 25px/1.08 var(--fd);letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color 1s}
#screen .sb-chips{position:absolute;left:0;right:0;top:668px;display:flex;gap:7px;padding:0 24px;overflow-x:auto;scrollbar-width:none;pointer-events:auto}
#screen .sb-chips::-webkit-scrollbar{display:none}
#screen .sb-chip{all:unset;box-sizing:border-box;cursor:pointer;flex:none;display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 13px 0 7px;border-radius:99px;background:var(--pill);font:600 13px var(--fd);color:var(--ink);transition:background .3s,color .3s}
#screen .sb-chip i{width:20px;height:20px;border-radius:50%;background:var(--c);box-shadow:inset 0 -2px 0 rgba(0,0,0,.08)}
#screen .sb-chip[aria-pressed="true"]{background:var(--ink);color:var(--paper,#FFFCF7)}
#screen[data-time="night"] .sb-chip[aria-pressed="true"]{color:#2B2A4A}
#screen .sb-dock{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);width:232px;height:68px;border-radius:34px;background:var(--pill);display:flex;align-items:center;justify-content:space-around;padding:0 6px;box-shadow:0 1px 2px rgba(80,50,40,.06),0 20px 34px -18px rgba(80,50,40,.55);pointer-events:auto;transition:opacity .25s,transform .4s cubic-bezier(.2,0,0,1),background 1s;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#screen.undoing .sb-dock{opacity:0;transform:translate(-50%,12px);pointer-events:none}
#screen .sb-dk{all:unset;cursor:pointer;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;color:var(--ink);opacity:.72;transition:opacity .2s,transform .25s cubic-bezier(.3,1.6,.5,1)}
#screen .sb-dk:active{transform:scale(.88)}
#screen .sb-dk:focus-visible{outline:2px solid var(--ink)}
#screen .sb-fab{all:unset;cursor:pointer;width:54px;height:54px;border-radius:50%;background:#2B2A4A;color:#fff;display:grid;place-items:center;box-shadow:0 12px 22px -8px rgba(43,42,74,.75),inset 0 1px 0 rgba(255,255,255,.2);transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
#screen[data-time="night"] .sb-fab{background:#F3D9A8;color:#2B2A4A}
#screen .sb-fab:active{transform:scale(.88)}
#screen .sb-ovhint{position:absolute;left:0;right:0;bottom:104px;text-align:center;font:600 13px var(--fd);color:var(--mut);opacity:0;transition:opacity .4s;pointer-events:none;z-index:3}
#screen.overview .sb-ovhint{opacity:1}
#screen.overview .sb-info,#screen.overview .sb-chips{opacity:0;pointer-events:none}
#screen .sb-undo{position:absolute;left:50%;bottom:32px;z-index:6;display:flex;align-items:center;gap:12px;padding:7px 7px 7px 18px;border-radius:99px;background:#2B2A4A;color:#fff;font:500 14px var(--fd);white-space:nowrap;max-width:300px;overflow:hidden;transform:translate(-50%,18px) scale(.9);opacity:0;visibility:hidden;transition:transform .45s cubic-bezier(.3,1.5,.5,1),opacity .25s,visibility 0s .45s;box-shadow:0 14px 26px -12px rgba(43,42,74,.7)}
#screen .sb-undo span{overflow:hidden;text-overflow:ellipsis}
#screen .sb-undo.on{transform:translate(-50%,0);opacity:1;visibility:visible;transition:transform .45s cubic-bezier(.3,1.5,.5,1),opacity .25s}
#screen .sb-undo button{all:unset;cursor:pointer;flex:none;padding:9px 16px;border-radius:99px;background:#F3DB8C;color:#2B2A4A;font-weight:700}
#screen .sb-undo i{position:absolute;left:0;bottom:0;height:2px;width:100%;background:rgba(255,255,255,.45);transform-origin:left;transform:scaleX(0)}
#screen .sb-undo.on i{animation:sb-bar 5s linear forwards}
@keyframes sb-bar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
#screen .sb-gf{position:absolute;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;z-index:20;pointer-events:none;background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.8),rgba(255,255,255,.38) 60%,rgba(255,255,255,.16));box-shadow:0 0 0 1.5px rgba(255,255,255,.75),0 8px 22px rgba(60,30,30,.28);opacity:0;transition:opacity .3s,scale .18s}
#screen .sb-gf.on{opacity:1}
#screen .sb-gf.down{scale:.82}
#screen .sb-gf::after{content:"";position:absolute;inset:-2px;border-radius:50%;border:2px solid rgba(255,255,255,.9);opacity:0}
#screen .sb-gf.tap::after{animation:sb-rip .6s ease-out}
@keyframes sb-rip{0%{opacity:.9;transform:scale(.6)}100%{opacity:0;transform:scale(2.2)}}
#screen .sb-tod{position:absolute;right:22px;top:116px;z-index:4;font:700 11px var(--fd);letter-spacing:.14em;text-transform:uppercase;color:var(--mut);opacity:0;transition:opacity .4s;pointer-events:none}
#screen .sb-tod.on{opacity:1}
#screen .sb-fn{position:absolute;inset:0;z-index:8;pointer-events:none;opacity:0;transition:opacity .35s}
#screen .sb-fn.on{opacity:1;pointer-events:auto}
#screen .sb-fn .pg{position:absolute;left:18px;right:18px;top:110px;bottom:110px;border-radius:10px 18px 18px 10px;background:#FFFBF3 repeating-linear-gradient(180deg,transparent 0 25px,rgba(90,110,170,.18) 25px 26px) 0 78px/100% 26px;box-shadow:0 30px 60px -30px rgba(60,30,20,.55);padding:26px 26px}
#screen .sb-fn textarea{all:unset;display:block;width:100%;box-sizing:border-box;color:#2B2A4A;white-space:pre-wrap}
#screen .sb-fn .ti{font:700 24px/26px var(--fd);height:52px}
#screen .sb-fn .bo{font:400 15px/26px Newsreader,Georgia,serif;height:calc(100% - 60px);color:#4A4356}
#screen .sb-fn .bar{position:absolute;top:58px;left:18px;right:18px;display:flex;justify-content:space-between}
#screen .sb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
screenEl.innerHTML = `<canvas class="sb-gl" tabindex="0" role="group" aria-roledescription="carousel" aria-label="Notebook shelf. Left and right arrows spin it, Enter opens the front notebook, Delete removes it, O shows the overview."></canvas>
  <div class="sb-st" aria-hidden="true"><b>9:41</b><span>●●● ▮</span></div>
  <div class="sb-tod" aria-live="polite"></div>
  <div class="sb-ovhint">Scroll the library · tap a book</div>
  <div class="sb-home">
    <div class="sb-hd"><div><p class="sb-cnt"></p><p class="sb-ttl">Your shelf</p><input class="sb-q" type="search" placeholder="Search notes" aria-label="Search notes"></div>
      <button class="sb-ib sb-srch" aria-label="Search" aria-expanded="false">${ICONS.search}</button></div>
    <div class="sb-info" aria-live="polite"></div>
    <div class="sb-chips" role="group" aria-label="Jump to a tag"></div>
    <div class="sb-dock"><button class="sb-dk sb-ovb" aria-label="Library overview">${ICONS.helix}</button><button class="sb-fab" aria-label="New notebook">${ICONS.plus}</button><button class="sb-dk sb-todb" aria-label="Preview the light: morning, golden hour, night">${ICONS.sun}</button></div>
    <div class="sb-sr" role="list" aria-label="Open a notebook"></div>
  </div>
  <div class="sb-fn" role="dialog" aria-label="Note" inert><div class="bar"><button class="sb-ib fb-back" aria-label="Back to shelf">${ICONS.back}</button><button class="sb-ib fb-del" aria-label="Delete note">${ICONS.trash}</button></div>
    <div class="pg"><textarea class="ti" rows="2" aria-label="Title"></textarea><textarea class="bo" aria-label="Note text"></textarea></div></div>
  <div class="sb-undo" role="status"><span>Deleted</span><button>Undo</button><i></i></div>
  <div class="sb-gf" aria-hidden="true"></div>`;
const $ = s => screenEl.querySelector(s);
const cv = $('canvas'), homeEl = $('.sb-home'), infoEl = $('.sb-info'), chipsEl = $('.sb-chips'), cntEl = $('.sb-cnt'), hdEl = $('.sb-hd'), qEl = $('.sb-q'),
  undoEl = $('.sb-undo'), gfEl = $('.sb-gf'), todEl = $('.sb-tod'), fnEl = $('.sb-fn'), srEl = $('.sb-sr'), todBtn = $('.sb-todb');
const SW = 390, SH = 844;

if (!T3) { screenEl.insertAdjacentHTML('beforeend', '<p style="position:absolute;top:300px;left:0;right:0;text-align:center">WebGL is unavailable.</p>'); return; }

/* ---------- world constants ---------- */
const BW = 1.0, BH = 1.4, BD = 0.28;          // book size (contract)
const CZ = -1.6, PR = 1.86, PRR = .16;        // plinth centre z, radius, rim radius
const RX = 1.34, RZ = 1.6, STEP = 2 * Math.PI / 5.4;
const C0 = QS.has('wide') ? new T3.Vector3(0, 12, 16) : new T3.Vector3(0, 3.55, 10.6), L0 = QS.has('wide') ? new T3.Vector3(0, 0, -2.5) : new T3.Vector3(0, .42, -.35);
const HR = 1.22, HSC = .42, HA = 2 * Math.PI / 12, HP = .086;  // helix

/* ---------- renderer ---------- */
let R;
try { R = new T3.WebGLRenderer({canvas: cv, antialias: true, powerPreference: 'high-performance'}); if (!R.getContext()) throw 0; }
catch (e) { screenEl.insertAdjacentHTML('beforeend', '<p style="position:absolute;top:300px;left:0;right:0;text-align:center">WebGL is unavailable.</p>'); return; }
R.outputEncoding = T3.sRGBEncoding; R.toneMapping = T3.LinearToneMapping; R.toneMappingExposure = 1;
R.shadowMap.enabled = true; R.shadowMap.type = T3.PCFShadowMap; R.shadowMap.autoUpdate = false;
R.localClippingEnabled = true;
function phoneScale() { const r = screenEl.getBoundingClientRect(); return r.width / SW || 1; }
function sizeRenderer() { R.setPixelRatio(Math.min(2, (window.devicePixelRatio || 1) * phoneScale())); R.setSize(SW, SH, false); }
sizeRenderer();
const scene = new T3.Scene();
const camera = new T3.PerspectiveCamera(30, SW / SH, .1, 90);
camera.position.copy(C0); camera.lookAt(L0);
const lin = h => new T3.Color(h).convertSRGBToLinear();
const floorPlane = new T3.Plane(new T3.Vector3(0, 1, 0), 0);   // books are clipped at the clay surface (sinking)

/* ---------- textures ---------- */
const TX = {};
function tex(c, srgb) { const t = new T3.CanvasTexture(c); if (srgb) t.encoding = T3.sRGBEncoding; t.anisotropy = 8; return t; }
function h2n(src, s) { const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data, [c, x] = cvs(w, h), o = x.createImageData(w, h), q = o.data;
  const Hh = (i, j) => d[(((j + h) % h) * w + ((i + w) % w)) * 4] / 255;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const nx = -(Hh(i + 1, j) - Hh(i - 1, j)) * s, ny = (Hh(i, j + 1) - Hh(i, j - 1)) * s, l = Math.hypot(nx, ny, 1), k = (j * w + i) * 4;
    q[k] = (nx / l * .5 + .5) * 255; q[k + 1] = (ny / l * .5 + .5) * 255; q[k + 2] = (1 / l * .5 + .5) * 255; q[k + 3] = 255; }
  x.putImageData(o, 0, 0); return c; }
function linenH() { const P = 6, N = P * 12, [c, x] = cvs(N, N), o = x.createImageData(N, N), q = o.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const over = ((Math.floor(i / P) + Math.floor(j / P)) & 1) === 0, v = over ? Math.sin(Math.PI * (j % P) / P) : Math.sin(Math.PI * (i % P) / P);
    const g = 105 + 60 * v + (Math.random() - .5) * 30, k = (j * N + i) * 4; q[k] = q[k + 1] = q[k + 2] = g; q[k + 3] = 255; }
  x.putImageData(o, 0, 0); return c; }
(function makeTextures() {
  const lh = linenH();
  TX.linenN = tex(h2n(lh, 3)); TX.linenN.wrapS = TX.linenN.wrapT = T3.RepeatWrapping; TX.linenN.repeat.set(10, 14);
  let [c, x] = cvs(256, 256); x.fillStyle = '#F2F2F2'; x.fillRect(0, 0, 256, 256); noise(x, 256, 256, 16);
  TX.grain = tex(c, true); TX.grain.wrapS = TX.grain.wrapT = T3.RepeatWrapping; TX.grain.repeat.set(5, 5);
  [c, x] = cvs(128, 128); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  [[0, 1], [.35, .7], [.6, .3], [.85, .06], [1, 0]].forEach(([o, a]) => gr.addColorStop(o, `rgba(255,255,255,${a})`));
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128); TX.blob = tex(c);
  [c, x] = cvs(256, 8); for (let i = 0; i < 256; i++) { const k = Math.random(); x.fillStyle = k < .45 ? '#EADFCA' : k < .8 ? '#FBF5EA' : '#F1E6D4'; x.fillRect(i, 0, 1, 8); }
  TX.edge = tex(c, true);
})();
function makeEnv() {
  const pm = new T3.PMREMGenerator(R), es = new T3.Scene(), sg = new T3.SphereGeometry(20, 32, 16), col = [], P = sg.attributes.position;
  const top = [1, .96, .92], mid = [.8, .74, .7], bot = [.5, .42, .38];
  for (let i = 0; i < P.count; i++) { const t = (P.getY(i) / 20 + 1) / 2, a = t < .5 ? bot : mid, b = t < .5 ? mid : top, k = t < .5 ? t * 2 : (t - .5) * 2; col.push(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)); }
  sg.setAttribute('color', new T3.Float32BufferAttribute(col, 3));
  es.add(new T3.Mesh(sg, new T3.MeshBasicMaterial({vertexColors: true, side: T3.BackSide})));
  const box = (w, h, p, c) => { const m = new T3.Mesh(new T3.PlaneGeometry(w, h), new T3.MeshBasicMaterial({color: new T3.Color(c[0], c[1], c[2]), side: T3.DoubleSide})); m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); es.add(m); };
  box(11, 9, [8, 12, 10], [2.4, 2.2, 2.0]); box(8, 12, [-13, 4, -5], [.9, .95, 1.1]);
  const t = pm.fromScene(es, .035).texture; pm.dispose(); return t;
}
scene.environment = makeEnv();

/* ---------- provisional book: exactly the SBBook.create interface (swapped out when book.js exists) ---------- */
const ProvBook = (function () {
  const W = BW, H = BH, D = BD, CT = .06, PW = W - .08, PH = H - .07, PD = D - 2 * CT - .006;
  const CVW = 512, CVH = Math.round(512 * H / (W - .06)), LBL = {x: 50, y: 56, w: 412, h: 452};
  let G = null, faceN = null, MP = null;
  function rbox(w, h, d, r, k) {
    k = k || 8; const g = new T3.BoxGeometry(1, 1, 1, k, k, k);
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, v = new T3.Vector3(), per = (k + 1) * (k + 1);
    const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); const sx = Math.sign(v.x), sy = Math.sign(v.y), sz = Math.sign(v.z);
      v.normalize(); N.setXYZ(i, v.x, v.y, v.z);
      const X = sx * hw + v.x * r, Y = sy * hh + v.y * r, Z = sz * hd + v.z * r; P.setXYZ(i, X, Y, Z);
      const f = Math.floor(i / per), u = (X + w / 2) / w, vv = (Y + h / 2) / h, z = (Z + d / 2) / d;
      U.setXY(i, f < 2 ? (f === 0 ? 1 - z : z) : f < 4 ? z : (f === 4 ? u : 1 - u), f < 2 || f >= 4 ? vv : u);
    }
    return g;
  }
  function init() {
    if (G) return;
    G = {back: rbox(W - .02, H, CT, .03), cover: rbox(W - .06, H, CT, .03), spine: rbox(.12, H, D, .055), pages: rbox(PW, PH, PD, .016), end: new T3.PlaneGeometry(W - .14, H - .08)};
    const [hc, hx] = cvs(CVW, CVH); hx.fillStyle = hx.createPattern(linenH(), 'repeat'); hx.fillRect(0, 0, CVW, CVH);
    hx.fillStyle = '#5a5a5a'; rr(hx, LBL.x, LBL.y, LBL.w, LBL.h, 10); hx.fill();
    faceN = tex(h2n(hc, 3));
    const [pc, px] = cvs(256, 360); px.fillStyle = '#FFFBF3'; px.fillRect(0, 0, 256, 360); noise(px, 256, 360, 5);
    const mE = new T3.MeshStandardMaterial({map: TX.edge, color: 0xE8E1D6, roughness: .95, clippingPlanes: [floorPlane]});
    const mP = new T3.MeshStandardMaterial({map: tex(pc, true), roughness: .92, clippingPlanes: [floorPlane]});
    MP = [mE, mE, mE, mE, mP, mP];
  }
  function drawLabelArea(x, label, hex) {
    const L = LBL;
    x.save(); x.filter = 'blur(8px)'; x.fillStyle = 'rgba(70,35,30,.28)'; rr(x, L.x - 2, L.y + 3, L.w + 4, L.h + 6, 14); x.fill(); x.restore();
    x.fillStyle = '#FFF8EC'; rr(x, L.x, L.y, L.w, L.h, 10); x.fill();
    x.save(); rr(x, L.x + 12, L.y + 12, L.w - 24, L.h - 24, 5); x.clip();
    if (label) { const s = Math.max((L.w - 24) / label.width, (L.h - 24) / label.height), w = label.width * s, h = label.height * s;
      x.drawImage(label, L.x + 12 + (L.w - 24 - w) / 2, L.y + 12 + (L.h - 24 - h) / 2, w, h); }
    else { x.fillStyle = hexMix(hex, '#FFFFFF', .6); x.fillRect(L.x, L.y, L.w, L.h); }
    x.restore();
  }
  function create(note, o) {
    init(); o = o || {};
    let hex = o.clothHex || CLOTH[note.tag] || '#CDBDF2', label = o.label || null, title = note.title || '';
    const group = new T3.Group(), body = new T3.Group(), inner = new T3.Group();
    body.position.x = W / 2; inner.position.y = H / 2; group.add(body); body.add(inner);
    const mCloth = new T3.MeshPhysicalMaterial({color: lin(hex), roughness: .86, normalMap: TX.linenN, normalScale: new T3.Vector2(.5, .5), sheen: lin(hexMix(hex, '#FFFFFF', .55)).multiplyScalar(.6), clippingPlanes: [floorPlane]});
    const [fc] = cvs(CVW, CVH), [oc] = cvs(CVW, CVH), [sc] = cvs(96, Math.round(96 * H / D)), [ec] = cvs(400, 560);
    const fTex = tex(fc, true), oTex = tex(oc), sTex = tex(sc, true), eTex = tex(ec, true);
    const mFace = new T3.MeshPhysicalMaterial({map: fTex, roughness: 1, metalness: 1, roughnessMap: oTex, metalnessMap: oTex, clearcoat: .3, clearcoatRoughness: .35, clearcoatMap: oTex, normalMap: faceN, normalScale: new T3.Vector2(.6, .6), sheen: mCloth.sheen, clippingPlanes: [floorPlane]});
    const mSpine = new T3.MeshPhysicalMaterial({map: sTex, roughness: .8, sheen: mCloth.sheen, clippingPlanes: [floorPlane]});
    const mEnd = new T3.MeshStandardMaterial({map: eTex, roughness: .85, clippingPlanes: [floorPlane]});
    function paint() {
      let x = fc.getContext('2d'); x.fillStyle = hex; x.fillRect(0, 0, CVW, CVH);
      drawLabelArea(x, label, hex);
      x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      const tf = '700 46px "Bricolage Grotesque", sans-serif'; x.font = tf;
      const tl = wrapLines(x, title || 'Untitled', 420).slice(0, 2), ty = 588;
      x.fillStyle = 'rgba(60,30,20,.35)'; tl.forEach((l, i) => x.fillText(l, CVW / 2, ty + i * 50 + 2));
      x.fillStyle = '#D9B66E'; tl.forEach((l, i) => x.fillText(l, CVW / 2, ty + i * 50));
      x.fillRect(CVW / 2 - 26, ty + tl.length * 50 + 6, 52, 3);
      fTex.needsUpdate = true;
      // R clearcoat, G roughness, B metalness
      x = oc.getContext('2d'); x.fillStyle = 'rgb(0,235,0)'; x.fillRect(0, 0, CVW, CVH);
      x.fillStyle = 'rgb(255,150,0)'; rr(x, LBL.x, LBL.y, LBL.w, LBL.h, 10); x.fill();
      x.fillStyle = 'rgb(0,90,235)'; x.textAlign = 'center'; x.font = tf; tl.forEach((l, i) => x.fillText(l, CVW / 2, ty + i * 50)); x.fillRect(CVW / 2 - 27, ty + tl.length * 50 + 5, 54, 5);
      oTex.needsUpdate = true;
      x = sc.getContext('2d'); const w = sc.width, h = sc.height; x.fillStyle = hexMix(hex, '#000000', .05); x.fillRect(0, 0, w, h);
      x.fillStyle = '#D9B66E'; x.fillRect(0, 40, w, 4); x.fillRect(0, h - 44, w, 4);
      x.save(); x.translate(w / 2, h / 2); x.rotate(Math.PI / 2); x.font = '700 34px "Bricolage Grotesque", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      let t = title || 'Untitled'; while (x.measureText(t).width > h - 140 && t.length > 4) t = t.slice(0, -2).trim() + '…';
      x.fillText(t, 0, 3); x.restore(); sTex.needsUpdate = true;
      x = ec.getContext('2d'); x.fillStyle = '#FFF7EA'; x.fillRect(0, 0, 400, 560);
      if (label) { x.save(); rr(x, 16, 16, 368, 528, 8); x.clip(); const s = Math.max(368 / label.width, 528 / label.height); x.drawImage(label, 200 - label.width * s / 2, 280 - label.height * s / 2, label.width * s, label.height * s); x.restore(); }
      eTex.needsUpdate = true;
    }
    paint();
    const back = new T3.Mesh(G.back, mCloth); back.position.set(.01, 0, -D / 2 + CT / 2);
    const spine = new T3.Mesh(G.spine, [mCloth, mSpine, mCloth, mCloth, mCloth, mCloth]); spine.position.set(-W / 2 + .06, 0, 0);
    const pages = new T3.Mesh(G.pages, MP); pages.position.set(.02, 0, 0);
    const pivot = new T3.Group(); pivot.position.set(-W / 2 + .06, 0, D / 2 - CT / 2);
    const cover = new T3.Mesh(G.cover, [mCloth, mCloth, mCloth, mCloth, mFace, mCloth]); cover.position.x = (W - .06) / 2;
    const end = new T3.Mesh(G.end, mEnd); end.rotation.y = Math.PI; end.position.set((W - .06) / 2, 0, -CT / 2 - .003);
    pivot.add(cover, end); inner.add(back, spine, pages, pivot);
    [back, spine, pages, cover].forEach(m => { m.castShadow = true; m.receiveShadow = true; }); end.receiveShadow = true;
    const ribbonAnchor = new T3.Object3D(); ribbonAnchor.position.set(W / 2 - .02, H / 2 - .015, .03); inner.add(ribbonAnchor);
    let flow = null;
    return {
      group, ribbonAnchor,
      setCover(a) { pivot.rotation.y = -a; },
      setFan() {},
      squash(sx, sy) { body.scale.set(sx, sy, sx); },
      setLabel(c) { label = c; paint(); },
      setTitle(t) { title = t || ''; paint(); },
      setCloth(h) { const from = mCloth.color.clone(), to = lin(h); hex = h; paint(); flow = {t: 0, from, to};
        const run = dt => { flow.t = Math.min(1, flow.t + dt / .7); const e = eio(flow.t); mCloth.color.copy(from).lerp(to, e); mCloth.sheen.copy(mCloth.color).lerp(new T3.Color(1, 1, 1), .5).multiplyScalar(.6); if (window.SB) SB.requestFrame(); if (flow.t >= 1) un(); };
        const un = window.SB ? SB.onTick(run) : () => {}; if (!window.SB) mCloth.color.copy(to); },
      dispose() { [mCloth, mFace, mSpine, mEnd].forEach(m => m.dispose()); [fTex, oTex, sTex, eTex].forEach(t => t.dispose()); }
    };
  }
  return {create};
})();

/* ---------- materials that can be dimmed (search) without knowing the book internals ---------- */
function prepBook(book) {
  const mats = [];
  book.group.traverse(o => { if (!o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
    if (!m.clippingPlanes || m.clippingPlanes.indexOf(floorPlane) < 0) { m.clippingPlanes = (m.clippingPlanes || []).concat([floorPlane]); m.needsUpdate = true; }
    if (m.color && mats.indexOf(m) < 0) mats.push(m); }); o.castShadow = o.castShadow || o.isMesh; o.receiveShadow = true; });
  return mats;
}
const _grey = new T3.Color();
function applyDim(it, d) {
  if (it.book && it.book.setDim) { it.book.setDim(d); return; }
  if (!it.mats) return;
  it.mats.forEach(m => { if (!m.userData.c0) m.userData.c0 = m.color.clone(); const c0 = m.userData.c0, l = (c0.r * .3 + c0.g * .59 + c0.b * .11) * .82;
    _grey.setRGB(l, l, l); m.color.copy(c0).lerp(_grey, d * .8); });
}

/* ---------- the studio: cyc wall, plinth, lights, window gobo, dust ---------- */
function cycGeo() {
  const prof = [], yF = -.4, zB = -6.4, rc = 2.8;
  for (let i = 0; i <= 10; i++) prof.push([12 - i * (12 - (zB + rc)) / 10, yF]);
  for (let i = 1; i <= 18; i++) { const a = i / 18 * Math.PI / 2; prof.push([zB + rc - Math.sin(a) * rc, yF + rc - Math.cos(a) * rc]); }
  for (let i = 1; i <= 6; i++) prof.push([zB, yF + rc + i * 3]);
  const pos = [], uv = [], idx = [];
  prof.forEach(([z, y], j) => { for (let k = 0; k <= 8; k++) { const x = -18 + k * 4.5; pos.push(x, y, z); uv.push(k / 8 * 6, j / prof.length * 6); } });
  for (let j = 0; j < prof.length - 1; j++) for (let k = 0; k < 8; k++) { const a = j * 9 + k; idx.push(a, a + 9, a + 1, a + 1, a + 9, a + 10); }
  const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const cycMat = new T3.MeshStandardMaterial({color: lin('#EFE6DB'), roughness: 1, side: T3.DoubleSide, map: TX.grain, emissive: new T3.Color(), emissiveIntensity: 1});
const cyc = new T3.Mesh(cycGeo(), cycMat); cyc.receiveShadow = true; scene.add(cyc);

function plinthGeo() {
  const p = [new T3.Vector2(PR, -.42)];
  for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; p.push(new T3.Vector2(PR - PRR + Math.cos(a) * PRR, -PRR + Math.sin(a) * PRR)); }
  for (let i = 1; i <= 32; i++) p.push(new T3.Vector2((PR - PRR) * (1 - i / 32), 0));
  return new T3.LatheGeometry(p, 128);
}
const plU = {uTime: {value: 0}, uRip: {value: [new T3.Vector4(), new T3.Vector4(), new T3.Vector4(), new T3.Vector4()]}, uDent: {value: new T3.Vector4(0, 0, .8, 0)}};
const plMat = new T3.MeshStandardMaterial({color: lin('#E9B98F'), roughness: .88, map: TX.grain, emissive: lin('#8A4A2E'), emissiveIntensity: .08});
plMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, plU);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
uniform float uTime; uniform vec4 uRip[4]; uniform vec4 uDent;
float plH(vec2 p){
  float edge = 1.0 - smoothstep(${(PR - PRR - .35).toFixed(2)}, ${(PR - PRR - .02).toFixed(2)}, length(p));
  float h = 0.0;
  for(int i=0;i<4;i++){ vec4 R = uRip[i]; float age = uTime - R.z;
    if(R.w > 0.0 && age > 0.0 && age < 3.0){ float d = distance(p, R.xy); float fr = age*1.25;
      h += R.w * exp(-pow((d-fr)/0.24, 2.0)) * exp(-age*1.5) * cos((d-fr)*19.0); } }
  float dd = distance(p, uDent.xy); h -= uDent.w * exp(-dd*dd/(uDent.z*uDent.z));
  return h*edge; }`)
  .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3(normal); float plTop = step(-0.0001, position.y); float h0 = plH(position.xz)*plTop;
  if(plTop > 0.5){ float e = 0.02; float hx = plH(position.xz + vec2(e,0.0)); float hz = plH(position.xz + vec2(0.0,e)); objectNormal = normalize(vec3(-(hx-h0)/e, 1.0, -(hz-h0)/e)); }`)
  .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position); transformed.y += h0;');
  // subsurface-ish wrap lighting for the clay
  sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', T3.ShaderChunk.lights_physical_pars_fragment.replace(
    'vec3 irradiance = dotNL * directLight.color;', 'vec3 irradiance = (saturate((dot(geometry.normal, directLight.direction) + 0.45) / 1.45) * vec3(1.0, 0.94, 0.9) + vec3(0.06, 0.02, 0.0) * (1.0 - dotNL)) * directLight.color;'));
};
const plinth = new T3.Mesh(plinthGeo(), plMat); plinth.position.set(0, 0, CZ); plinth.receiveShadow = true; plinth.castShadow = true; scene.add(plinth);
// soft contact shadow of the plinth on the floor
const plAO = new T3.Mesh(new T3.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new T3.MeshBasicMaterial({map: TX.blob, color: lin('#5A3426'), transparent: true, opacity: .45, depthWrite: false}));
plAO.scale.set(PR * 2.9, 1, PR * 2.5); plAO.position.set(0, -.398, CZ); scene.add(plAO);

const hemi = new T3.HemisphereLight(0xFFF1E2, 0xB98C70, .5); scene.add(hemi);
const key = new T3.DirectionalLight(0xFFEEDC, 1.2); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -.0005; key.shadow.normalBias = .02;
Object.assign(key.shadow.camera, {left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 30}); key.shadow.camera.updateProjectionMatrix();
scene.add(key, key.target); key.target.position.set(0, 0, CZ + .4);
const rim = new T3.DirectionalLight(0xFFE9DC, .22); rim.position.set(-3, 4, -7); scene.add(rim);
const lamp = new T3.PointLight(0xFFB35C, 0, 4.4, 2); lamp.position.set(-1.1, 2.1, .9); scene.add(lamp);

// the window: an off-screen frame mesh that only casts shadow (a real gobo)
const gobo = new T3.Group();
(function buildGobo() {
  const gm = new T3.MeshBasicMaterial({colorWrite: false, depthWrite: false, side: T3.DoubleSide});
  const bar = (w, h, x, y) => { const m = new T3.Mesh(new T3.PlaneGeometry(w, h), gm); m.position.set(x, y, 0); m.castShadow = true; m.frustumCulled = false; gobo.add(m); return m; };
  const ow = 3.3, oh = 4.3, B = 40, mt = .09;
  bar(B, B, 0, oh / 2 + B / 2); bar(B, B, 0, -oh / 2 - B / 2); bar(B, oh, -ow / 2 - B / 2, 0); bar(B, oh, ow / 2 + B / 2, 0);
  const mv = bar(mt, oh, 0, 0), mh1 = bar(ow, mt, 0, .55), mh2 = bar(ow, mt * .7, 0, -1.05);
  gobo.userData = {mv, mh: [mh1, mh2]};
})();
scene.add(gobo);

// dust motes: instanced points that only glow inside the beam (same gobo projection the shadow uses)
const DUSTN = 260;
const dustU = {uTime: {value: 0}, uG: {value: new T3.Matrix4()}, uL: {value: new T3.Vector3(0, 1, 0)}, uHalf: {value: new T3.Vector4(1.65, 2.15, .045, .55)},
  uOn: {value: 1}, uNight: {value: 0}, uLamp: {value: lamp.position}, uCol: {value: new T3.Color(1, .95, .85)}, uI: {value: 1}, uPR: {value: R.getPixelRatio()}};
const dust = (function () {
  const g = new T3.BufferGeometry(), p = new Float32Array(DUSTN * 3), s = new Float32Array(DUSTN);
  for (let i = 0; i < DUSTN; i++) { p[i * 3] = (Math.random() - .5) * 5.6; p[i * 3 + 1] = Math.random() * 3.8; p[i * 3 + 2] = CZ + (Math.random() - .3) * 4.6; s[i] = Math.random(); }
  g.setAttribute('position', new T3.BufferAttribute(p, 3)); g.setAttribute('aSeed', new T3.BufferAttribute(s, 1));
  const m = new T3.ShaderMaterial({uniforms: dustU, transparent: true, depthWrite: false, blending: T3.AdditiveBlending,
    vertexShader: `uniform float uTime, uOn, uNight, uPR, uI; uniform mat4 uG; uniform vec3 uL, uLamp; uniform vec4 uHalf; attribute float aSeed; varying float vA;
    void main(){ vec3 p = position; float t = uTime;
      p.x += sin(t*.19 + aSeed*6.28)*.22 + sin(t*.47 + aSeed*17.0)*.05;
      p.y = -.3 + mod(p.y + t*(.025 + .03*fract(aSeed*7.3)) + .3, 4.1);
      p.z += cos(t*.15 + aSeed*9.1)*.2;
      vec4 g = uG * vec4(p, 1.0); vec3 ld = normalize(mat3(uG) * uL); float tt = -g.z / ld.z; vec2 q = g.xy + ld.xy*tt;
      float inside = (1.0 - smoothstep(uHalf.x - .12, uHalf.x + .04, abs(q.x))) * (1.0 - smoothstep(uHalf.y - .12, uHalf.y + .04, abs(q.y)));
      float mull = smoothstep(uHalf.z, uHalf.z + .05, abs(q.x)) * smoothstep(uHalf.z, uHalf.z + .05, abs(q.y - uHalf.w));
      float beam = inside * mull * uOn * step(0.0, tt);
      float lampv = uNight * (1.0 - smoothstep(.2, 2.3, distance(p, uLamp)));
      float tw = .55 + .45*sin(t*(1.1 + aSeed*1.7) + aSeed*40.0);
      vA = (beam + lampv) * tw * uI * smoothstep(-.3, .1, p.y);
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
      gl_PointSize = uPR * (1.8 + 3.4*fract(aSeed*13.7)) * (8.0 / -mv.z); }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d); a *= a; if (vA*a < .003) discard; gl_FragColor = vec4(uCol * a * vA, 1.0); }`});
  const pts = new T3.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5; return pts;
})();
scene.add(dust);

// the visible beam: a short ray-march through the same window projection, depth-tested so books and clay occlude it
const shaftU = {uG: dustU.uG, uL: dustU.uL, uHalf: dustU.uHalf, uOn: dustU.uOn, uCol: {value: new T3.Color(1, .85, .6)}, uI: {value: .0},
  uMin: {value: new T3.Vector3(-3.6, -.38, CZ - 3.2)}, uMax: {value: new T3.Vector3(3.6, 4.4, CZ + 3.8)}};
const shaft = new T3.Mesh(new T3.BoxGeometry(1, 1, 1), new T3.ShaderMaterial({uniforms: shaftU, side: T3.BackSide, transparent: true, depthWrite: false, blending: T3.AdditiveBlending,
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform mat4 uG; uniform vec3 uL, uMin, uMax, uCol; uniform vec4 uHalf; uniform float uOn, uI; varying vec3 vW;
  float cookie(vec3 p){ vec4 g = uG * vec4(p, 1.0); vec3 ld = normalize(mat3(uG) * uL); float tt = -g.z / ld.z; vec2 q = g.xy + ld.xy * tt;
    float inside = (1.0 - smoothstep(uHalf.x - .25, uHalf.x + .05, abs(q.x))) * (1.0 - smoothstep(uHalf.y - .25, uHalf.y + .05, abs(q.y)));
    float mull = smoothstep(uHalf.z, uHalf.z + .07, abs(q.x)) * smoothstep(uHalf.z, uHalf.z + .07, abs(q.y - uHalf.w));
    return inside * mull * step(0.0, tt); }
  void main(){
    if (uOn * uI < .001) discard;
    vec3 ro = cameraPosition, rd = normalize(vW - ro);
    vec3 t0 = (uMin - ro) / rd, t1 = (uMax - ro) / rd; vec3 tn = min(t0, t1);
    float tin = max(max(tn.x, tn.y), max(tn.z, 0.0)); float tout = length(vW - ro);
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    float acc = 0.0; const int STEPS = 14; float dt = (tout - tin) / float(STEPS);
    for (int i = 0; i < STEPS; i++) { vec3 p = ro + rd * (tin + (float(i) + n) * dt);
      vec3 e = min(p - uMin, uMax - p); float edge = smoothstep(0.0, .9, min(min(e.x, e.z), e.y * 1.5));
      acc += cookie(p) * edge * smoothstep(-.4, .6, p.y); }
    acc *= dt * uI * uOn;
    gl_FragColor = vec4(uCol * acc, 1.0); }`}));
shaft.position.copy(shaftU.uMin.value).add(shaftU.uMax.value).multiplyScalar(.5); shaft.scale.copy(shaftU.uMax.value).sub(shaftU.uMin.value);
shaft.renderOrder = 4; shaft.frustumCulled = false; scene.add(shaft);

// landing puffs: a small CPU particle pool, updated only while alive
const PUFFN = 180;
const puffs = (function () {
  const g = new T3.BufferGeometry(), p = new Float32Array(PUFFN * 3), a = new Float32Array(PUFFN), s = new Float32Array(PUFFN);
  g.setAttribute('position', new T3.BufferAttribute(p, 3)); g.setAttribute('aA', new T3.BufferAttribute(a, 1)); g.setAttribute('aS', new T3.BufferAttribute(s, 1));
  const m = new T3.ShaderMaterial({uniforms: {uPR: dustU.uPR, uCol: {value: new T3.Color(1, .93, .84)}}, transparent: true, depthWrite: false,
    vertexShader: `uniform float uPR; attribute float aA, aS; varying float vA; void main(){ vA = aA; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uPR*aS*(9.0/-mv.z); }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.1,d)*vA; if(a<.004) discard; gl_FragColor = vec4(uCol, a); }`});
  const pts = new T3.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 6;
  const st = {pts, p, a, s, v: new Float32Array(PUFFN * 3), life: new Float32Array(PUFFN), max: new Float32Array(PUFFN), size0: new Float32Array(PUFFN), next: 0, alive: 0};
  return st;
})();
scene.add(puffs.pts);
function spawnPuff(x, z, n, str, tint) {
  for (let k = 0; k < n; k++) {
    const i = puffs.next; puffs.next = (puffs.next + 1) % PUFFN;
    const a = Math.random() * Math.PI * 2, r = .3 + Math.random() * .3, sp = (.5 + Math.random() * .9) * str;
    puffs.p[i * 3] = x + Math.cos(a) * r; puffs.p[i * 3 + 1] = .02 + Math.random() * .05; puffs.p[i * 3 + 2] = z + Math.sin(a) * r * .5;
    puffs.v[i * 3] = Math.cos(a) * sp; puffs.v[i * 3 + 1] = (.25 + Math.random() * .6) * str; puffs.v[i * 3 + 2] = Math.sin(a) * sp * .6;
    puffs.max[i] = puffs.life[i] = .9 + Math.random() * .9; puffs.size0[i] = 6 + Math.random() * 10;
  }
  puffs.alive = 2;
}
function stepPuffs(dt) {
  if (!puffs.alive) return false; let any = false; const p = puffs.p, v = puffs.v;
  for (let i = 0; i < PUFFN; i++) {
    if (puffs.life[i] <= 0) { puffs.a[i] = 0; continue; }
    any = true; puffs.life[i] -= dt; const k = Math.exp(-3.2 * dt);
    v[i * 3] *= k; v[i * 3 + 2] *= k; v[i * 3 + 1] = v[i * 3 + 1] * Math.exp(-1.6 * dt) + .05 * dt;
    p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
    const t = 1 - puffs.life[i] / puffs.max[i]; puffs.a[i] = Math.sin(Math.min(1, t * 3) * Math.PI / 2) * (1 - t) * .62; puffs.s[i] = puffs.size0[i] * (1 + t * 2.2);
  }
  const g = puffs.pts.geometry; g.attributes.position.needsUpdate = g.attributes.aA.needsUpdate = g.attributes.aS.needsUpdate = true;
  if (!any) puffs.alive = 0; return any;
}

/* ---------- time of day ---------- */
const TOD = {
  morning: {dir: [2.6, 7.6, 5.4], kc: '#FFF4EA', ki: 1.9, hs: '#EEF2FA', hg: '#D2AE94', hi: .42, lamp: 0, gobo: 1, wall: '#EFEAE5', clay: '#E9B98F', dc: '#FFFFFF', di: 1.6, exp: 1.0, rimI: .25, env: .42, bounce: .16, shaft: .022},
  golden:  {dir: [6.4, 3.9, 4.6], kc: '#FFC07E', ki: 2.8, hs: '#FFE0C4', hg: '#A86F52', hi: .26, lamp: 0, gobo: 1, wall: '#F2E0CC', clay: '#EDB28A', dc: '#FFD9A3', di: 1.6, exp: .96, rimI: .2, env: .3, bounce: .2, shaft: .055},
  night:   {dir: [-3.4, 6.0, 3.4], kc: '#FFA458', ki: .2, hs: '#3A3D66', hg: '#1E1418', hi: .2, lamp: 6, gobo: 0, wall: '#C9B6A6', clay: '#D9A07C', dc: '#FFC27A', di: .9, exp: .9, rimI: .1, env: .12, bounce: .02, shaft: 0}
};
const TODN = ['morning', 'golden', 'night'];
function timeNow() { try { if (window.SBArt && SBArt.timeNow) return SBArt.timeNow(); } catch (e) {} const h = new Date().getHours(); return h >= 20 || h < 6 ? 'night' : h >= 16 ? 'golden' : 'morning'; }
let curTime = TOD[QS.get('time')] ? QS.get('time') : timeNow();
const todNow = {}; const _c1 = new T3.Color(), _c2 = new T3.Color(), _d1 = new T3.Vector3(), _d2 = new T3.Vector3();
let todFrom = curTime, todTo = curTime, todP = 1;
function setTime(t, instant) {
  if (!TOD[t]) return; if (t === todTo && todP >= 1 && !instant) return;
  todFrom = todP >= 1 ? todTo : todTo; todTo = t; todP = instant ? 1 : 0; curTime = t; SB.time = t;
  screenEl.dataset.time = t; document.documentElement.dataset.time = t;
  todBtn.innerHTML = t === 'night' ? ICONS.moon : ICONS.sun;
  todEl.textContent = t === 'golden' ? 'Golden hour' : t[0].toUpperCase() + t.slice(1); todEl.classList.add('on'); clearTimeout(setTime.tm); setTime.tm = setTimeout(() => todEl.classList.remove('on'), 1600);
  setTimeout(() => refreshLabels(), instant || RM ? 0 : 500);
  wake(1500);
}
let goboDrift = 0, envK = -1;
function setEnvK(k, force) {
  if (!force && Math.abs(k - envK) < .005) return; envK = k;
  scene.traverse(o => { if (!o.material) return; [].concat(o.material).forEach(m => { if (m.envMapIntensity === undefined) return; if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; m.envMapIntensity = m.userData.env0 * k; }); });
}
function applyTod(p) {
  const A = TOD[todFrom], B = TOD[todTo], e = eio(p);
  const c = (a, b, tgt) => tgt.copy(_c1.set(a).convertSRGBToLinear()).lerp(_c2.set(b).convertSRGBToLinear(), e);
  _d1.fromArray(A.dir).normalize(); _d2.fromArray(B.dir).normalize(); _d1.lerp(_d2, e).normalize();
  key.position.copy(key.target.position).addScaledVector(_d1, 14);
  c(A.kc, B.kc, key.color); key.intensity = lerp(A.ki, B.ki, e);
  c(A.hs, B.hs, hemi.color); c(A.hg, B.hg, hemi.groundColor); hemi.intensity = lerp(A.hi, B.hi, e);
  lamp.intensity = lerp(A.lamp, B.lamp, e); rim.intensity = lerp(A.rimI, B.rimI, e);
  c(A.wall, B.wall, cycMat.color); c(A.clay, B.clay, plMat.color);
  cycMat.emissive.copy(cycMat.color).multiplyScalar(lerp(A.bounce, B.bounce, e));
  c(A.dc, B.dc, dustU.uCol.value); dustU.uI.value = lerp(A.di, B.di, e);
  c(A.kc, B.kc, shaftU.uCol.value); shaftU.uI.value = lerp(A.shaft, B.shaft, e);
  const on = lerp(A.gobo, B.gobo, e); dustU.uOn.value = on; dustU.uNight.value = 1 - on;
  R.toneMappingExposure = lerp(A.exp, B.exp, e); setEnvK(lerp(A.env, B.env, e));
  todNow.on = on; placeGobo(on);
}
function placeGobo(on) {
  gobo.position.copy(key.target.position).addScaledVector(_d1, 4.6);
  gobo.position.x += Math.sin(goboDrift * .23) * .05; gobo.position.y += Math.sin(goboDrift * .17 + 1) * .03;
  gobo.lookAt(key.target.position); gobo.rotateZ(-.32 + Math.sin(goboDrift * .11) * .015);
  const gs = 1 + (1 - on) * 10; gobo.scale.setScalar(gs); gobo.visible = on > .01;
  gobo.userData.mv.scale.x = 1 / gs; gobo.userData.mh.forEach(m => m.scale.y = 1 / gs);
  gobo.updateMatrixWorld(true);
  dustU.uG.value.copy(gobo.matrixWorld).invert(); dustU.uL.value.copy(_d1);
}

/* ---------- items (one per note) ---------- */
const items = [];
let artReady = false;
const coverCache = {};
function flatLabel(tag) {
  if (coverCache['flat' + tag]) return coverCache['flat' + tag];
  const [c, x] = cvs(384, 512), h = CLOTH[tag] || '#CDBDF2';
  const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, hexMix(h, '#FFFFFF', .75)); g.addColorStop(1, hexMix(h, '#FFFFFF', .35)); x.fillStyle = g; x.fillRect(0, 0, 384, 512);
  for (let i = 0; i < 7; i++) { x.globalAlpha = .18; x.fillStyle = hexMix(h, i % 2 ? '#FFFFFF' : '#000000', .25); x.beginPath(); x.arc(60 + (i * 97) % 300, 360 + Math.sin(i) * 60, 70 + i * 9, 0, 7); x.fill(); }
  x.globalAlpha = 1; return coverCache['flat' + tag] = c;
}
function coverFor(tag) { // Promise<canvas>
  try { if (window.SBArt && SBArt.cover) return Promise.resolve(SBArt.cover(tag, {time: curTime})).then(c => c || flatLabel(tag)).catch(() => flatLabel(tag)); } catch (e) {}
  return Promise.resolve(flatLabel(tag));
}
function linenFor(hex) { try { if (window.SBArt && SBArt.linen) return SBArt.linen(hex, 512); } catch (e) {} return null; }
function paperTex() { try { if (window.SBArt && SBArt.paper) return SBArt.paper(1024); } catch (e) {} return null; }
function newItem(note) {
  return {note, book: null, slotAngle: 0, s: 0,
    off: S(0, 90, .82), sq: S(0, 260, .2), lx: S(0, 70, .32), lt: S(0, 70, .32), rise: S(0, 120, .7), dim: S(0, 60, 1), pr: S(0, 220, .4),
    yo: 0, vy: 0, falling: false, pre: false, sink: 0, hidden: false, blend: null, lastDim: 0,
    rope: null, ribbon: null, blob: null, mats: null, box: null, labelBusy: false};
}
function ensureBook(it) {
  if (it.book) return it.book;
  const tag = it.note.tag, hex = CLOTH[tag] || '#CDBDF2';
  const opts = {clothHex: hex, label: flatLabel(tag), linen: linenFor(hex), paper: paperTex()};
  let book;
  try { book = (window.SBBook && SBBook.create) ? SBBook.create(it.note, opts) : ProvBook.create(it.note, opts); }
  catch (e) { console.warn('SBBook.create failed, using provisional', e); book = ProvBook.create(it.note, opts); }
  it.book = book; book.group.rotation.order = 'YXZ';
  book.group.updateMatrixWorld(true);
  it.box = new T3.Box3().setFromObject(book.group).expandByScalar(.008);
  it.mats = prepBook(book);
  scene.add(book.group);
  book.group.traverse(o => { o.userData.it = it; });
  setEnvK(envK, true);
  // contact AO
  it.blob = new T3.Mesh(blobGeo, new T3.MeshBasicMaterial({map: TX.blob, color: lin('#4A2A20'), transparent: true, opacity: .32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}));
  it.blob.renderOrder = 1; scene.add(it.blob);
  makeRibbon(it);
  if (!it.noAutoLabel) coverFor(tag).then(c => { if (it.book === book && c) { book.setLabel(c); it.labelTag = tag; it.labelTime = curTime; wake(); } });
  return book;
}
function dropBook(it) {
  if (!it.book) return;
  scene.remove(it.book.group, it.blob, it.ribbon); try { it.book.dispose(); } catch (e) {}
  it.blob.material.dispose(); it.ribbon.geometry.dispose(); it.ribbon.material.dispose();
  it.book = null; it.rope = null; it.ribbon = null; it.blob = null; it.mats = null;
}
const blobGeo = new T3.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
function refreshLabels() { items.forEach(it => { if (it.book && it.labelTime !== curTime) { const b = it.book; coverFor(it.note.tag).then(c => { if (it.book === b && c) { b.setLabel(c); it.labelTime = curTime; wake(); } }); } }); }

/* ---------- ribbons: a Verlet rope hanging from book.ribbonAnchor ---------- */
const RP = 8, RSEG = .062, RWID = .072;
const _v1 = new T3.Vector3(), _v2 = new T3.Vector3(), _v3 = new T3.Vector3(), _m1 = new T3.Matrix4(), _q1 = new T3.Quaternion(), _q2 = new T3.Quaternion(), _e1 = new T3.Euler(0, 0, 0, 'YXZ');
function makeRibbon(it) {
  const g = new T3.BufferGeometry(), pos = new Float32Array(RP * 2 * 3), nor = new Float32Array(RP * 2 * 3), idx = [];
  for (let i = 0; i < RP - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  g.setAttribute('position', new T3.BufferAttribute(pos, 3)); g.setAttribute('normal', new T3.BufferAttribute(nor, 3)); g.setIndex(idx);
  const m = new T3.MeshStandardMaterial({color: lin(RIB[it.note.tag] || '#E98C73'), roughness: .45, side: T3.DoubleSide, clippingPlanes: [floorPlane]});
  it.ribbon = new T3.Mesh(g, m); it.ribbon.castShadow = true; it.ribbon.frustumCulled = false; scene.add(it.ribbon);
  it.rope = {p: new Float32Array(RP * 3), o: new Float32Array(RP * 3), init: false, energy: 1, lastM: new Float32Array(16), open: false, shelfA: null, openA: null};
}
const _m2 = new T3.Matrix4();
function stepRope(it, dt) {
  const rp = it.rope, b = it.book; if (!rp || !b) return false;
  const p = rp.p, o = rp.o, G = b.group, mw = G.matrixWorld, open = it === openIt && openState !== 'none';
  if (!rp.shelfA) { // anchors in book space: SBBook's own anchor (open page) and the fore-edge head (on the shelf)
    _m2.copy(mw).invert(); b.ribbonAnchor.getWorldPosition(_v1); rp.openA = _v1.clone().applyMatrix4(_m2);
    rp.shelfA = new T3.Vector3(it.box.max.x - .075, it.box.max.y - .01, clamp(rp.openA.z, it.box.min.z + .03, it.box.max.z - .03)); }
  // sleep: nothing moved and the rope is at rest
  let moved = false; for (let i = 0; i < 16; i++) if (mw.elements[i] !== rp.lastM[i]) { moved = true; break; }
  if (!moved && rp.init && rp.energy < 1e-9 && rp.open === open) return false;
  rp.lastM.set(mw.elements); rp.open = open;
  let en = 0;
  if (open) { // the ribbon rests on the open page, from book.ribbonAnchor down the right page
    const k = 1 - Math.exp(-16 * dt);
    for (let i = 0; i < RP; i++) { const j = i * 3; _v2.set(rp.openA.x, rp.openA.y - i * RSEG * .99, rp.openA.z + .016).applyMatrix4(mw);
      if (!rp.init) { p[j] = _v2.x; p[j + 1] = _v2.y; p[j + 2] = _v2.z; }
      const dx = (_v2.x - p[j]) * k, dy = (_v2.y - p[j + 1]) * k, dz = (_v2.z - p[j + 2]) * k; en += dx * dx + dy * dy + dz * dz;
      p[j] += dx; p[j + 1] += dy; p[j + 2] += dz; o[j] = p[j]; o[j + 1] = p[j + 1]; o[j + 2] = p[j + 2]; }
    rp.init = true;
  } else {
    _v1.copy(rp.shelfA).applyMatrix4(mw);
    if (!rp.init) { for (let i = 0; i < RP; i++) { p[i * 3] = o[i * 3] = _v1.x; p[i * 3 + 1] = o[i * 3 + 1] = _v1.y - i * RSEG; p[i * 3 + 2] = o[i * 3 + 2] = _v1.z; } rp.init = true; }
    const g = -9.8 * dt * dt, damp = Math.pow(.03, dt);
    for (let i = 1; i < RP; i++) { const k = i * 3;
      const vx = (p[k] - o[k]) * damp, vy = (p[k + 1] - o[k + 1]) * damp, vz = (p[k + 2] - o[k + 2]) * damp;
      o[k] = p[k]; o[k + 1] = p[k + 1]; o[k + 2] = p[k + 2]; p[k] += vx; p[k + 1] += vy + g; p[k + 2] += vz; }
    p[0] = _v1.x; p[1] = _v1.y; p[2] = _v1.z;
    _m1.copy(mw).invert(); const bx = it.box;
    for (let it2 = 0; it2 < 5; it2++) {
      for (let i = 1; i < RP; i++) { const a = (i - 1) * 3, k = i * 3; let dx = p[k] - p[a], dy = p[k + 1] - p[a + 1], dz = p[k + 2] - p[a + 2]; const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6, f = (d - RSEG) / d;
        if (i === 1) { p[k] -= dx * f; p[k + 1] -= dy * f; p[k + 2] -= dz * f; } else { dx *= f * .5; dy *= f * .5; dz *= f * .5; p[a] += dx; p[a + 1] += dy; p[a + 2] += dz; p[k] -= dx; p[k + 1] -= dy; p[k + 2] -= dz; } }
      for (let i = 1; i < RP; i++) { const k = i * 3;
        _v2.set(p[k], p[k + 1], p[k + 2]).applyMatrix4(_m1);
        if (bx.containsPoint(_v2)) { // over the head, then down the fore-edge
          if (bx.max.x - _v2.x < bx.max.y - _v2.y) _v2.x = bx.max.x; else _v2.y = bx.max.y;
          _v2.applyMatrix4(mw); p[k] = _v2.x; p[k + 1] = _v2.y; p[k + 2] = _v2.z; }
        if (p[k + 1] < .004) p[k + 1] = .004; }
    }
    for (let i = 1; i < RP; i++) { const k = i * 3, dx = p[k] - o[k], dy = p[k + 1] - o[k + 1], dz = p[k + 2] - o[k + 2]; en += dx * dx + dy * dy + dz * dz; }
  }
  // strip: on the shelf it lies against the fore-edge (width along z); open, it lies on the page (width along x)
  G.getWorldQuaternion(_q1);
  if (open) { _v3.set(1, 0, 0).applyQuaternion(_q1); _v2.set(0, 0, 1).applyQuaternion(_q1); } else { _v3.set(0, 0, 1).applyQuaternion(_q1); _v2.set(1, 0, 0).applyQuaternion(_q1); }
  const pa = it.ribbon.geometry.attributes.position.array, na = it.ribbon.geometry.attributes.normal.array, s = G.scale.x;
  for (let i = 0; i < RP; i++) { const k = i * 3, w = RWID * s * (i === RP - 1 ? .5 : 1) / 2, j = i * 6;
    pa[j] = p[k] - _v3.x * w; pa[j + 1] = p[k + 1] - _v3.y * w; pa[j + 2] = p[k + 2] - _v3.z * w;
    pa[j + 3] = p[k] + _v3.x * w; pa[j + 4] = p[k + 1] + _v3.y * w; pa[j + 5] = p[k + 2] + _v3.z * w;
    na[j] = na[j + 3] = _v2.x; na[j + 1] = na[j + 4] = _v2.y; na[j + 2] = na[j + 5] = _v2.z; }
  it.ribbon.geometry.attributes.position.needsUpdate = it.ribbon.geometry.attributes.normal.needsUpdate = true;
  rp.energy = en; return en > 1e-9;
}
function puff(origin, strength) {
  strength = strength == null ? 1 : strength;
  items.forEach(it => {
    if (!it.rope || !it.book) return; const p = it.rope.p, o = it.rope.o;
    for (let i = 1; i < RP; i++) { const k = i * 3, dx = p[k] - origin.x, dy = p[k + 1] - origin.y, dz = p[k + 2] - origin.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + .15, f = strength * .035 / (d * d) * (i / RP);
      o[k] -= dx / d * f; o[k + 1] -= dy / d * f * .5 - f * .3; o[k + 2] -= dz / d * f; }
    it.rope.energy = 1;
    const bp = it.book.group.position, d = Math.hypot(bp.x - origin.x, bp.z - origin.z) + .3;
    it.sq.v -= strength * .6 / d; it.lt.v += strength * (bp.x > origin.x ? .5 : -.5) / d;
  });
  wake(1200);
}

/* ---------- spin physics: momentum, friction, magnetic detents ---------- */
const spin = {pos: 0, vel: 0, mode: 'rest', target: 0, lastFront: 0};
const N = () => items.length;
const frontIndex = () => { const n = N(); return n ? ((Math.round(spin.pos) % n) + n) % n : -1; };
const slotOf = i => wrapS(i - spin.pos, N());
function normPos() { const n = N(); if (!n) { spin.pos = spin.target = 0; return; } const r = Math.round(spin.pos), f = ((r % n) + n) % n; spin.pos += f - r; spin.target += f - r; }
function spinTo(i) { if (!N()) return; spin.target = Math.round(spin.pos + wrapS(i - spin.pos, N())); spin.mode = 'target'; wake(); }
function spinBy(d) { spin.target = Math.round(spin.mode === 'target' ? spin.target : spin.pos) + d; spin.mode = 'target'; wake(); }
function stepSpin(dt) {
  if (spin.mode === 'drag' || spin.mode === 'rest') return spin.mode === 'drag';
  if (spin.mode === 'target') {
    const k = 70, c = 2 * Math.sqrt(k) * .8; spin.vel += (k * (spin.target - spin.pos) - c * spin.vel) * dt; spin.pos += spin.vel * dt;
    if (Math.abs(spin.target - spin.pos) < 1e-4 && Math.abs(spin.vel) < 1e-3) { spin.pos = spin.target; spin.vel = 0; spin.mode = 'rest'; normPos(); }
    return true;
  }
  // free: friction plus a detent potential that captures the shelf as it slows
  const sp = Math.abs(spin.vel), cap = 1 - sstep01(1.2, 4.5, sp);
  const near = Math.round(spin.pos), d = spin.pos - near;
  const acc = -150 * Math.sin(2 * Math.PI * d) / (2 * Math.PI) * (.25 + .75 * cap) - (1.7 + 10 * cap) * spin.vel;
  spin.vel += acc * dt; spin.pos += spin.vel * dt;
  if (Math.abs(spin.pos - near) < 5e-4 && Math.abs(spin.vel) < 4e-3) { spin.pos = near; spin.vel = 0; spin.mode = 'rest'; normPos(); }
  return true;
}
function frontChanged() {
  const fi = frontIndex(); if (fi === spin.lastFront) return; spin.lastFront = fi;
  if (spin.mode !== 'rest') { snd('tick', {pitch: .92 + Math.random() * .16, gain: .7}); hap('selection'); const it = items[fi]; if (it) { it.sq.v -= .35; } }
  setInfo(); wake(2500);
}

/* ---------- placement ---------- */
const pose = {p: new T3.Vector3(), q: new T3.Quaternion(), sc: 1};
const _base = new T3.Vector3(), _piv = new T3.Vector3(), _ax = new T3.Vector3(), _off = new T3.Vector3();
let breathAmp = 0, clock = 0, shelfScale = S(1, 120, .5);
function shelfPose(s, out) {
  const as = Math.abs(s), th = s * STEP, f = Math.max(0, 1 - as), fe = f * f * (3 - 2 * f);
  out.p.set(Math.sin(th) * RX, 0, CZ + Math.cos(th) * RZ + .1 * fe);
  _e1.set(0, th * .5 - .27 * fe, 0); out.q.setFromEuler(_e1);
  out.sc = (1 - .05 * Math.min(as, 2.5)) * clamp((2.7 - as) / .45, 0, 1);
  return th;
}
function placeItem(it, i, dt) {
  const s = slotOf(i) + it.off.x; it.s = s; it.slotAngle = s * STEP;
  const th = shelfPose(s, pose), b = it.book;
  const f = Math.max(0, 1 - Math.abs(s)), fe = f * f * (3 - 2 * f);
  // lean: centrifugal (outward, grows with w^2) and trailing (against the motion), on springs so the books rock back
  const w = (spin.mode === 'drag' ? dragVel : spin.vel) * STEP;
  it.lx.t = Math.min(.122, .0042 * w * w);
  it.lt.t = clamp(w * .016, -.075, .075) + Math.sin(clock * 2 * Math.PI / 3.2) * .0105 * breathAmp * fe;
  const busy = sstep(it.lx, dt) | sstep(it.lt, dt) | sstep(it.sq, dt) | sstep(it.rise, dt) | sstep(it.pr, dt) | sstep(it.off, dt);
  const rx = Math.sin(th), rz = Math.cos(th), tx = Math.cos(th), tz = -Math.sin(th);
  const dx = rx * it.lx.x + tx * it.lt.x, dz = rz * it.lx.x + tz * it.lt.x, ang = Math.hypot(dx, dz);
  _base.copy(pose.p); _base.y = it.yo + it.rise.x - it.pr.x * .1 - it.sink * BH * 1.12;
  let sc = pose.sc * shelfScale.x;
  if (ang > 1e-5) {
    _ax.set(dz / ang, 0, -dx / ang); _q1.setFromAxisAngle(_ax, ang);
    _piv.set(_base.x + dx / ang * BD / 2 * sc, _base.y, _base.z + dz / ang * BD / 2 * sc);
    _base.sub(_piv).applyQuaternion(_q1).add(_piv);
    pose.q.premultiply(_q1);
  }
  if (it.blend) { it.blend.t = Math.min(1, it.blend.t + dt / .45); const e = eio(it.blend.t); _base.lerpVectors(it.blend.p, _base, e); pose.q.slerpQuaternions ? pose.q.slerpQuaternions(it.blend.q, pose.q, e) : T3.Quaternion.slerp(it.blend.q, pose.q, pose.q, e); if (it.blend.t >= 1) it.blend = null; }
  if (it.pre || it.hidden) sc = 0;
  const g = b.group; g.visible = sc > .01 && !ovActive();
  _off.set(-BW / 2 * sc, 0, 0).applyQuaternion(pose.q);
  g.position.copy(_base).add(_off); g.quaternion.copy(pose.q); g.scale.setScalar(Math.max(sc, .001));
  const sq = it.sq.x; b.squash(1 - sq * .5, 1 + sq);
  g.updateMatrixWorld(true);
  // contact shadow
  const h = Math.max(0, _base.y), bl = it.blob; bl.visible = g.visible && it.sink < .98;
  bl.position.set(pose.p.x, .006, pose.p.z); bl.quaternion.setFromAxisAngle(_v3.set(0, 1, 0), th * .5 - .27 * fe);
  bl.scale.set(BW * 1.25 * sc * (1 + h * 1.2), 1, BD * 2.4 * sc * (1 + h * 1.2)); bl.material.opacity = .34 / (1 + h * 6) * Math.min(1, sc * 1.2);
  it.ribbon.visible = g.visible;
  if (it.lastDim !== it.dim.x) { applyDim(it, it.dim.x); it.lastDim = it.dim.x; }
  return busy || sstep(it.dim, dt);
}

/* ---------- frame loop ---------- */
let raf = 0, last = 0, awakeUntil = 0, want = false, visible = true, shadowDirty = true, frameN = 0;
const tickFns = [];
let inFrame = false;
function wake(ms) { if (ms) awakeUntil = Math.max(awakeUntil, performance.now() + ms); if (inFrame) { want = true; return; } if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } }
function frame(t) {
  inFrame = true; const dt = Math.min(.034, Math.max(.001, (t - last) / 1000)); last = t; frameN++;
  const ext = want; want = false;
  for (let i = 0; i < tickFns.length; i++) tickFns[i](dt);
  const amb = clamp((awakeUntil - t) / 1200, 0, 1);
  const busy = step(dt, amb) || want || ext;
  if (busy || ext) shadowDirty = true;
  R.shadowMap.needsUpdate = shadowDirty || (amb > 0 && frameN % 4 === 0);
  shadowDirty = false;
  R.render(scene, camera);
  inFrame = false; raf = 0;
  if ((busy || amb > 0 || want) && visible) raf = requestAnimationFrame(frame);
}

let dragVel = 0;
const camCur = {p: C0.clone(), l: L0.clone()}, camFrom = {p: new T3.Vector3(), l: new T3.Vector3(), t: 1};
const tilt = {x: S(0, 40, 1), y: S(0, 40, 1)};
function step(dt, amb) {
  let busy = false;
  clock += dt; plU.uTime.value = clock; dustU.uTime.value = clock;
  breathAmp = RM ? 0 : amb;
  if (amb > 0) goboDrift += dt;
  if (todP < 1) { todP = Math.min(1, todP + dt / (RM ? .01 : 1.4)); busy = true; }
  applyTod(todP);
  if (stepSpin(dt)) busy = true;
  frontChanged();
  if (sstep(shelfScale, dt)) busy = true;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (Math.abs(slotOf(i) + it.off.x) < 2.9 && !ovActive()) ensureBook(it);
    else if (it.book && items.length > 14 && it !== openIt) { if (Math.abs(slotOf(i)) > 4.5) dropBook(it); else { it.book.group.visible = false; it.blob.visible = false; it.ribbon.visible = false; } continue; }
    if (!it.book) continue;
    if (it.falling) { busy = true; it.vy -= 22 * dt; it.yo += it.vy * dt; it.sq.t = clamp(-it.vy * .003, 0, .03);
      if (it.yo <= 0) { const imp = -it.vy; it.yo = 0; it.vy = 0; it.falling = false; it.sq.t = 0; it.sq.v = -imp * .1; landed(it, imp); } }
    if (it === openIt && openState !== 'none') { if (stepRope(it, dt)) busy = true; continue; }
    if (placeItem(it, i, dt)) busy = true;
    if (stepRope(it, dt)) busy = true;
  }
  if (stepPuffs(dt)) busy = true;
  if (ripplesActive()) busy = true;
  if (stepOverview(dt)) busy = true;
  if (sstep(tilt.x, dt) | sstep(tilt.y, dt)) busy = true;
  if (openState === 'none' || openState === 'fallback') placeCamera(dt);
  if (stepTimeline(dt)) busy = true;
  return busy;
}
function placeCamera(dt) {
  const ov = ovE();
  _v1.copy(C0); _v2.copy(L0); _v1.x += tilt.x.x * .5; _v1.y -= tilt.y.x * .3;
  if (ov > 0) { _v3.set(0, ovCam.x + 2.3, CZ + 13.2); _v1.lerp(_v3, ov); _v3.set(0, ovCam.x - .15, CZ); _v2.lerp(_v3, ov); }
  if (fb.x > 0 && fb.it) { _v1.lerp(fb.camP, eio(seg(fb.x, .35, 1))); _v2.lerp(fb.camL, eio(seg(fb.x, .25, 1))); }
  if (camFrom.t < 1) { camFrom.t = Math.min(1, camFrom.t + dt / .6); const e = eio(camFrom.t); _v1.lerpVectors(camFrom.p, _v1, e); _v2.lerpVectors(camFrom.l, _v2, e); }
  camera.position.copy(_v1); camera.lookAt(_v2); camCur.l.copy(_v2);
  // the shadow box follows the overview climb
  const ty = ov * ovCam.x * .8; key.target.position.y = ty; key.shadow.camera.top = 8 + ov * 3; key.shadow.camera.bottom = -8 - ov * 3;
  if (ov > 0 && ov < 1) key.shadow.camera.updateProjectionMatrix();
  key.target.updateMatrixWorld();
}

/* ---------- ripples & dents in the clay ---------- */
let ripN = 0;
function ripple(x, z, amp) { const r = plU.uRip.value[ripN++ % 4]; r.set(x, z - CZ, clock, amp == null ? .02 : amp); wake(3200); }
function ripplesActive() { const r = plU.uRip.value; for (let i = 0; i < 4; i++) if (r[i].w > 0 && clock - r[i].z < 3) return true; return plU.uDent.value.w > 1e-4; }

/* ---------- landing ---------- */
function landed(it, imp) {
  const bx = it.blob.position.x, bz = it.blob.position.z;
  spawnPuff(bx, bz, 22, .55 + imp * .035);
  ripple(bx, bz, .008);
  snd('thup', {pitch: .85 + Math.random() * .3, gain: .9}); hap('light');
  wake(2500);
}

/* ---------- drop-in ---------- */
function hideAll() { items.forEach(it => { it.pre = true; it.falling = false; it.yo = 0; }); }
function dropIn(stagger) {
  const order = items.map((it, i) => ({it, s: Math.abs(slotOf(i))})).filter(o => o.s < 2.9).sort((a, b) => b.s - a.s || 0);
  items.forEach(it => { if (!order.find(o => o.it === it)) it.pre = false; });
  order.forEach((o, k) => { const it = o.it; it.pre = true;
    later(k * (stagger || 90), () => { it.pre = false; if (RM) return; it.falling = true; it.yo = 2.7; it.vy = -.6; it.sq.x = .03; if (it.rope) it.rope.init = false; wake(); }); });
  wake(4000);
}

/* ---------- timeline (driven by the frame clock so recordings are deterministic) ---------- */
let tl = [];
function later(ms, fn) { tl.push({t: performance.now() / 1000 + ms / 1000, fn}); wake(); } // wall clock: the storyboard is pinned to real seconds
function stepTimeline() { if (!tl.length) return false; const now = performance.now() / 1000, due = tl.filter(e => e.t <= now); if (due.length) { tl = tl.filter(e => e.t > now); due.forEach(e => e.fn()); } return tl.length > 0; }

/* ---------- home UI ---------- */
function setInfo() {
  const it = items[frontIndex()];
  infoEl.classList.add('out'); clearTimeout(setInfo.t);
  setInfo.t = setTimeout(() => {
    if (!it) infoEl.innerHTML = '<p class="sb-nt">Your shelf is empty</p><div class="sb-meta">Tap + to drop in a fresh notebook.</div>';
    else { const n = it.note, c = hexMix(CLOTH[n.tag] || '#CDBDF2', '#FFFFFF', .35);
      infoEl.innerHTML = `<div class="sb-meta"><span class="sb-tg" style="--c:${c};--d:${INK[n.tag] || '#2B2A4A'}">${esc(n.tag)}</span><span>${esc(n.date)}</span></div><p class="sb-nt">${esc(n.title || 'Untitled')}</p>`; }
    infoEl.classList.remove('out');
    chipsEl.querySelectorAll('.sb-chip').forEach(c => c.setAttribute('aria-pressed', String(!!it && c.dataset.tag === it.note.tag)));
  }, RM ? 0 : 140);
}
function syncLists() {
  cntEl.textContent = `${items.length} notebook${items.length === 1 ? '' : 's'}`;
  const present = TAGS.filter(k => items.some(it => it.note.tag === k));
  chipsEl.innerHTML = present.map(k => `<button class="sb-chip" data-tag="${k}" aria-pressed="false" style="--c:${CLOTH[k]}"><i></i>${k}</button>`).join('');
  srEl.innerHTML = items.slice(0, 200).map((it, i) => `<button data-i="${i}" aria-label="Open ${esc(it.note.title || 'Untitled')}"></button>`).join('');
  spin.lastFront = -1; frontChanged(); setInfo();
}
function homeOverlay(show) { homeEl.classList.toggle('away', !show); }

/* ---------- mutate the list while keeping books visually in place ---------- */
function mutate(fn) {
  const before = new Map(); items.forEach((it, i) => before.set(it, slotOf(i) + it.off.x));
  fn();
  items.forEach((it, i) => { if (before.has(it)) it.off.x = wrapS(before.get(it) - slotOf(i), items.length); });
}

/* ---------- delete / undo ---------- */
let mode = 'shelf', undoRec = null, undoT = 0;
function deleteItem(it) {
  if (!it || !it.book || (mode !== 'shelf' && mode !== 'press')) return; mode = 'deleting';
  if (spin.mode !== 'rest') { spin.pos = Math.round(spin.pos); spin.vel = 0; spin.mode = 'rest'; }
  homeEl.querySelector('.sb-info').classList.add('out');
  const bp = new T3.Vector3(); it.book.group.getWorldPosition(bp); const cx = pose.p.x, cz = it.blob.position.z, bx = it.blob.position.x;
  snd('sink', {gain: 1}); hap('medium'); ripple(bx, cz, .022); later(280, () => ripple(bx, cz, .03));
  const d = plU.uDent.value; d.set(bx, cz - CZ, .75, 0);
  const pr0 = it.pr.x; let t = 0;
  const un = onTick(dt => { t = Math.min(1, t + dt / (RM ? .01 : .95));
    it.pr.x = it.pr.t = pr0 * (1 - seg(t, 0, .3)); it.sink = eic(seg(t, .08, 1));
    it.sq.x = it.sq.t = -(.12 + .1 * Math.sin(t * 22)) * (1 - seg(t, .75, 1)) * Math.min(1, t * 6);
    d.w = .07 * Math.sin(Math.min(1, t * 1.3) * Math.PI) ; floorPlane.constant = d.w * .9; want = true;
    if (t >= 1) { un(); d.w = 0; floorPlane.constant = 0; finish(); } });
  function finish() {
    normPos(); const idx = items.indexOf(it);
    mutate(() => { items.splice(idx, 1); if (items.length) { spin.pos = spin.target = idx % items.length; } });
    it.sink = 0; it.pr.x = it.pr.t = 0; it.sq.x = it.sq.t = it.sq.v = 0;
    if (it.book) { it.book.group.visible = false; it.blob.visible = false; it.ribbon.visible = false; }
    mode = 'shelf'; syncLists(); showUndo({it, idx}); wake(1500);
  }
}
function showUndo(rec) {
  if (undoRec) finalize(undoRec); undoRec = rec;
  undoEl.querySelector('span').textContent = `“${rec.it.note.title || 'Untitled'}” sank into the clay`;
  undoEl.classList.remove('on'); void undoEl.offsetWidth; undoEl.classList.add('on'); screenEl.classList.add('undoing');
  clearTimeout(undoT); undoT = setTimeout(() => { undoEl.classList.remove('on'); screenEl.classList.remove('undoing'); finalize(undoRec); undoRec = null; }, 5000);
}
function finalize(rec) { if (rec && rec.it.book) dropBook(rec.it); }
function undo() {
  const rec = undoRec; if (!rec || mode !== 'shelf') return; undoRec = null; clearTimeout(undoT); undoEl.classList.remove('on'); screenEl.classList.remove('undoing');
  const it = rec.it; normPos();
  mutate(() => { const idx = Math.min(rec.idx, items.length); items.splice(idx, 0, it); spin.pos = spin.target = idx; it.off.x = 0; });
  syncLists(); mode = 'restoring'; it.sink = 1;
  ensureBook(it); const x0 = 0, z0 = CZ + RZ + .1;
  snd('pop', {}); hap('light'); later(160, () => ripple(x0, z0, .025));
  let t = 0; const un = onTick(dt => { t = Math.min(1, t + dt / (RM ? .01 : .85)); it.sink = 1 - eob(t); it.sq.x = it.sq.t = -.18 * Math.sin(Math.min(1, t * 1.4) * Math.PI); want = true;
    if (t >= 1) { un(); it.sink = 0; it.sq.t = 0; it.sq.v = 5; mode = 'shelf'; spawnPuff(x0, z0, 16, .7); wake(2000); } });
}

/* ---------- create: drop a blank book, then paint its label in with a watercolour bleed ---------- */
function create(tag) {
  if (mode !== 'shelf' || ovActive()) return null; tag = TAGS.indexOf(tag) >= 0 ? tag : 'Ideas';
  const note = {id: Date.now(), title: '', body: '', tag, date: 'Today', mood: 'calm'};
  normPos(); const fi = Math.max(0, frontIndex()); let it;
  mutate(() => { it = newItem(note); items.splice(fi, 0, it); spin.pos = spin.target = fi; });
  mode = 'create'; syncLists();
  it.noAutoLabel = true; ensureBook(it); const blank = blankLabel(); it.book.setLabel(blank.c);
  if (RM) { it.pre = false; bleed(it, () => openItem(it, true)); return note; }
  it.falling = true; it.yo = 3.2; it.vy = 0; if (it.rope) it.rope.init = false; wake();
  later(1000, () => bleed(it, () => openItem(it, true)));
  return note;
}
function blankLabel() { const [c, x] = cvs(384, 512); x.fillStyle = '#F7F0E4'; x.fillRect(0, 0, 384, 512); noise(x, 384, 512, 6); return {c, x}; }
function bleed(it, done) {
  const tag = it.note.tag;
  coverFor(tag).then(src => {
    if (!it.book) return done && done();
    const W = 192, H = 256, [c, x] = cvs(W, H), [sc, sx] = cvs(W, H); sx.drawImage(src, 0, 0, W, H);
    const S0 = sx.getImageData(0, 0, W, H).data, out = x.createImageData(W, H), O = out.data;
    // bleed field: value-noise fbm plus distance from a few wet seeds
    const F = new Float32Array(W * H), seeds = [[.35, .62], [.66, .38], [.52, .78]], rnd = new Float32Array(17 * 17).map(() => Math.random());
    const vn = (u, v) => { const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, a = rnd[(j % 17) * 17 + i % 17], b = rnd[(j % 17) * 17 + (i + 1) % 17], c2 = rnd[((j + 1) % 17) * 17 + i % 17], d = rnd[((j + 1) % 17) * 17 + (i + 1) % 17], su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv); return lerp(lerp(a, b, su), lerp(c2, d, su), sv); };
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const u = i / W, v = j / H; let dmin = 9; seeds.forEach(s => { dmin = Math.min(dmin, Math.hypot(u - s[0], (v - s[1]) * .8)); });
      F[j * W + i] = dmin * 1.25 + (vn(u * 6, v * 6) * .5 + vn(u * 13, v * 13) * .25 + vn(u * 3, v * 3) * .5) * .45; }
    snd('bleed', {}); hap('light');
    let t = 0, k = 0;
    const un = onTick(dt => {
      t = Math.min(1, t + dt / (RM ? .01 : 1.8)); want = true; if ((k++ & 1) && t < 1) return;
      const p = t * 1.5 - .12;
      for (let i = 0, n = W * H; i < n; i++) { const f = F[i], a = clamp((p - f) / .07, 0, 1), edge = Math.exp(-Math.pow((p - f - .04) / .035, 2)) * (t < 1 ? 1 : 0), q = i * 4;
        const dk = 1 - edge * .28;
        O[q] = lerp(247, S0[q] * dk, a); O[q + 1] = lerp(240, S0[q + 1] * dk, a); O[q + 2] = lerp(228, S0[q + 2] * dk, a); O[q + 3] = 255; }
      x.putImageData(out, 0, 0);
      if (it.book) it.book.setLabel(t >= 1 ? src : c);
      if (t >= 1) { un(); it.labelTime = curTime; done && done(); }
    });
  });
}

/* ---------- open / close (SBOpen, or a v2-style fallback) ---------- */
let openIt = null, openState = 'none';
const fb = {x: 0, it: null, camP: new T3.Vector3(), camL: new T3.Vector3(), p0: new T3.Vector3(), q0: new T3.Quaternion()};
function openItem(it, isNew) {
  if (!it || !it.book || openState !== 'none') { mode = 'shelf'; return Promise.resolve(); }
  const i = items.indexOf(it); if (i !== frontIndex()) { spin.pos = spin.target = i; normPos(); }
  spin.vel = 0; spin.mode = 'rest'; mode = 'open'; openIt = it; homeOverlay(false);
  if (window.SBOpen && SBOpen.open && it.book.pageQuad) {
    openState = 'sbopen';
    let pr; try { pr = Promise.resolve(SBOpen.open(it.book, SB)).catch(e => console.warn(e)); } catch (e) { console.warn(e); pr = Promise.resolve(); }
    return pr.then(() => { openState = 'sbopen-open'; watchClose(); });
  }
  snd('whoosh', {gain: .6}); hap('selection');
  return fallbackOpen(it, isNew);
}
function watchClose() {
  const un = onTick(() => { want = true; if (window.SBOpen && (SBOpen.busy !== undefined ? SBOpen.busy : SBOpen.isOpen)) return; un(); afterClose(); });
}
function afterClose() {
  const it = openIt; openIt = null; openState = 'none'; mode = 'shelf';
  if (it && it.book) { const g = it.book.group; if (g.parent !== scene) scene.attach(g);
    it.blend = {t: 0, p: new T3.Vector3(), q: g.quaternion.clone()};
    _off.set(-BW / 2 * g.scale.x, 0, 0).applyQuaternion(g.quaternion); it.blend.p.copy(g.position).sub(_off); }
  camFrom.p.copy(camera.position); camFrom.l.copy(camCur.l); camFrom.t = 0;
  homeOverlay(true); setInfo();
  shelfScale.v = -.25; // the shelf exhales (SBOpen fires the clap puff itself)
  if (pendingRemove) { const n = pendingRemove; pendingRemove = null; later(200, () => SB.remove(n)); }
  wake(2500);
}
function closeOpen() {
  if (openState === 'sbopen-open' && window.SBOpen && SBOpen.close) { openState = 'sbopen'; return Promise.resolve(SBOpen.close()).catch(() => {}); }
  if (openState === 'fallback-open') return fallbackClose();
  return Promise.resolve();
}
function fallbackOpen(it, isNew) {
  openState = 'fallback'; fb.it = it; const g = it.book.group;
  fb.p0.copy(g.position); fb.q0.copy(g.quaternion);
  fb.camP.set(.42, 1.25, 3.0); fb.camL.set(.42, 1.05, 0);
  return new Promise(res => {
    let t = 0; const un = onTick(dt => { t = Math.min(1, t + dt / (RM ? .01 : 1.5)); fb.x = t; want = true;
      const e = eoc(seg(t, 0, .55)), lift = Math.sin(seg(t, 0, .55) * Math.PI) * .35;
      _v1.set(0, .35 + e * .1, .9).lerp(fb.p0, 1 - e); _v1.y += lift; g.position.copy(_v1);
      _e1.set(0, 0, 0); _q2.setFromEuler(_e1); g.quaternion.copy(fb.q0).slerp(_q2, e); g.scale.setScalar(1);
      const c = seg(t, .3, 1); it.book.setCover(Math.PI * .95 * Math.min(1.04, eob(c)));
      if (it.book.setFan) it.book.setFan(Math.sin(c * Math.PI) * .6);
      if (t >= 1) { un(); openState = 'fallback-open';
        fnEl.querySelector('.ti').value = it.note.title; fnEl.querySelector('.bo').value = it.note.body;
        fnEl.classList.add('on'); fnEl.inert = false; if (isNew && !autoplaying) fnEl.querySelector('.ti').focus({preventScroll: true}); res(); } });
  });
}
function fallbackClose() {
  const it = fb.it; if (!it) return Promise.resolve();
  it.note.title = fnEl.querySelector('.ti').value.trim(); it.note.body = fnEl.querySelector('.bo').value.trim(); SB.save(it.note);
  fnEl.classList.remove('on'); fnEl.inert = true; openState = 'fallback';
  const g = it.book.group, p1 = g.position.clone(), q1 = g.quaternion.clone();
  return new Promise(res => {
    let t = 0; const un = onTick(dt => { t = Math.min(1, t + dt / (RM ? .01 : 1.1)); fb.x = 1 - eio(t); want = true;
      const c = 1 - seg(t, 0, .55); it.book.setCover(Math.PI * .95 * eio(c));
      const e = eio(seg(t, .35, 1)); g.position.lerpVectors(p1, fb.p0, e); g.position.y += Math.sin(e * Math.PI) * .2; g.quaternion.copy(q1).slerp(fb.q0, e);
      if (t >= 1) { un(); fb.x = 0; fb.it = null; snd('clap', {}); hap('medium'); puff(g.position, .8); afterClose(); res(); } });
  });
}
let pendingRemove = null;
function settleOpen() { // close whatever is open (or opening) and resolve once the shelf owns every book again
  return new Promise(res => { let asked = false;
    const un = onTick(() => { want = true; const so = window.SBOpen;
      if (!asked && ((so && so.isOpen && openState === 'sbopen-open') || openState === 'fallback-open')) { asked = true; closeOpen(); }
      if (openState === 'none' && mode !== 'deleting' && mode !== 'create') { un(); res(); } }); });
}

/* ---------- search ---------- */
function search(q) {
  q = (q || '').trim().toLowerCase(); let first = -1;
  items.forEach((it, i) => { const m = !q || (it.note.title + ' ' + it.note.body + ' ' + it.note.tag).toLowerCase().includes(q);
    it.rise.t = q ? (m ? .07 : -.035) : 0; it.dim.t = q && !m ? 1 : 0; if (m && q && first < 0) first = i; });
  if (first >= 0) spinTo(first); wake(1500);
}

/* ---------- overview: the helix library (instanced proxies so 100+ notes cost a handful of draw calls) ---------- */
const ov = {x: 0, t: 0, v: 0, prox: null, tagIdx: null, built: -1};
const ovCam = S(1, 60, 1); let ovScrollV = 0;
const ovActive = () => ov.x > .001 || ov.t > 0;
const ovE = () => eio(clamp(ov.x, 0, 1));
function buildProxies() {
  if (ov.prox) { ov.prox.forEach(m => { scene.remove(m); m.dispose && m.dispose(); }); }
  const geo = new T3.BoxGeometry(BW, BH, BD); geo.translate(0, BH / 2, 0);
  const edge = new T3.MeshStandardMaterial({map: TX.edge, color: 0xEDE6DA, roughness: .95});
  ov.prox = []; ov.tagIdx = {};
  TAGS.forEach(tag => {
    const list = []; items.forEach((it, i) => { if (it.note.tag === tag) list.push(i); }); if (!list.length) return;
    const cloth = new T3.MeshStandardMaterial({color: lin(CLOTH[tag]), roughness: .85, normalMap: TX.linenN, normalScale: new T3.Vector2(.4, .4)});
    const [c, x] = cvs(256, 358); const face = new T3.MeshStandardMaterial({map: tex(c, true), roughness: .8});
    const draw = lbl => { x.fillStyle = CLOTH[tag]; x.fillRect(0, 0, 256, 358); x.fillStyle = '#FFF8EC'; rr(x, 26, 28, 204, 222, 6); x.fill();
      x.save(); rr(x, 32, 34, 192, 210, 3); x.clip(); x.drawImage(lbl, 0, 0, lbl.width, lbl.height, 32, 34, 192, 210 * (lbl.width ? 1 : 1)); x.restore();
      x.fillStyle = '#D9B66E'; x.fillRect(98, 290, 60, 6); x.fillRect(84, 306, 88, 6); face.map.needsUpdate = true; };
    draw(flatLabel(tag)); coverFor(tag).then(l => { draw(l); wake(); });
    const m = new T3.InstancedMesh(geo, [edge, cloth, edge, cloth, face, cloth], list.length);
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.userData.list = list; m.visible = false;
    scene.add(m); ov.prox.push(m);
  });
  // the spiral ramp the books stand on, rising out of the plinth
  const n = items.length, segs = Math.max(24, n * 4), pos = [], idx = [];
  for (let k = 0; k <= segs; k++) { const u = k / segs * (n - .5) - .5, a = u * HA, y = .012 + u * HP * 1 - .012;
    [[HR - .34, -.03], [HR + .32, -.03], [HR + .32, -.0], [HR - .34, 0]].forEach(([r, dy]) => pos.push(Math.sin(a) * r, Math.max(-.03, y + dy), CZ + Math.cos(a) * r)); }
  for (let k = 0; k < segs; k++) for (let f = 0; f < 4; f++) { const a = k * 4 + f, b = k * 4 + (f + 1) % 4; idx.push(a, b, a + 4, b, b + 4, a + 4); }
  const rg = new T3.BufferGeometry(); rg.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
  if (ov.ramp) { scene.remove(ov.ramp); ov.ramp.geometry.dispose(); }
  ov.rampClip = new T3.Plane(new T3.Vector3(0, -1, 0), 0);
  ov.ramp = new T3.Mesh(rg, new T3.MeshStandardMaterial({color: lin('#E3AF86'), roughness: .9, side: T3.DoubleSide, clippingPlanes: [ov.rampClip]}));
  ov.ramp.castShadow = ov.ramp.receiveShadow = true; ov.ramp.visible = false; scene.add(ov.ramp);
  ov.built = n; ov.order = items.slice();
}
const _mx = new T3.Matrix4(), _sc = new T3.Vector3(), _hp = {p: new T3.Vector3(), q: new T3.Quaternion(), sc: 1}, _sp = {p: new T3.Vector3(), q: new T3.Quaternion(), sc: 1};
function helixPose(i, out) {
  const u = i - ov.anchor, a = u * HA; out.p.set(Math.sin(a) * HR, i * HP, CZ + Math.cos(a) * HR);
  _e1.set(0, a, 0); out.q.setFromEuler(_e1); out.sc = HSC; }
function setOverview(on) {
  if (on === (ov.t > 0) || openState !== 'none' || mode !== 'shelf') return;
  if (on) { normPos(); buildProxies(); ov.anchor = 0; const fi = frontIndex(); ovCam.x = ovCam.t = clamp(fi * HP + .9, 1.1, Math.max(1.1, items.length * HP - .3)); ov.anchor = 0; ov.rot = fi * HA; }
  ov.t = on ? 1 : 0; screenEl.classList.toggle('overview', on); snd('whoosh', {gain: .5, pitch: on ? .8 : 1.1}); hap('selection');
  $('.sb-ovb').innerHTML = on ? ICONS.shelf : ICONS.helix; $('.sb-ovb').setAttribute('aria-label', on ? 'Back to the shelf' : 'Library overview');
  wake(2000);
}
function stepOverview(dt) {
  const moving = Math.abs(ov.t - ov.x) > 1e-4 || Math.abs(ovScrollV) > 1e-3;
  if (!ov.prox || (!moving && ov.x === 0)) { if (ov.prox && ov.x === 0) { ov.prox.forEach(m => m.visible = false); ov.ramp.visible = false; } return false; }
  ov.x += clamp(ov.t - ov.x, -dt / 1.15, dt / 1.15);
  if (Math.abs(ov.t - ov.x) < 1e-4) ov.x = ov.t;
  const top = Math.max(1.1, ov.built * HP - .3);
  ovCam.x = clamp(ovCam.x + ovScrollV * dt, 1.1, top); ovScrollV *= Math.exp(-4 * dt); if (Math.abs(ovScrollV) < 1e-3) ovScrollV = 0;
  const n = ov.order.length, E = ov.x;
  ov.rampClip.constant = (E * 1.35 - .1) * (ov.built * HP + 1.2); ov.ramp.visible = E > .001;
  ov.prox.forEach(m => {
    m.visible = E > .001; const list = m.userData.list;
    for (let k = 0; k < list.length; k++) {
      const it = ov.order[list[k]], ii = items.indexOf(it), d = ii < 0 ? 0 : Math.abs(wrapS(ii - spin.pos, n)) / Math.max(1, n / 2);
      const lp = eio(clamp(E * 1.6 - d * .6, 0, 1));
      helixPose(ii < 0 ? list[k] : ii, _hp); _hp.q.premultiply(_q2.setFromAxisAngle(_v3.set(0, 1, 0), -ov.rot));
      _hp.p.sub(_v2.set(0, 0, CZ)).applyAxisAngle(_v3, -ov.rot).add(_v2);
      shelfPose(ii < 0 ? 0 : wrapS(ii - spin.pos, n), _sp); if (_sp.sc < .01) { _sp.p.y = -1.2; _sp.sc = .3; }
      _sp.p.lerp(_hp.p, lp); _sp.q.slerp(_hp.q, lp); const s = lerp(_sp.sc, _hp.sc, lp) * (lp > 0 || E > .999 ? 1 : 1);
      _mx.compose(_sp.p, _sp.q, _sc.set(s, s, s)); m.setMatrixAt(k, _mx);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return moving || E > 0 && E < 1;
}
function flyTo(i) {
  if (i < 0) return; spin.pos = spin.target = i; spin.vel = 0; spin.mode = 'rest'; normPos(); spin.lastFront = -1; frontChanged();
  for (let k = -2; k <= 2; k++) { const it = items[((i + k) % N() + N()) % N()]; if (it) ensureBook(it); }
  ov.t = 0; screenEl.classList.remove('overview'); $('.sb-ovb').innerHTML = ICONS.helix; snd('whoosh', {gain: .5, pitch: 1.1}); hap('selection');
  later(1200, () => { const it = items[frontIndex()]; if (it) { it.sq.v = -1.2; spawnPuff(0, CZ + RZ + .1, 12, .6); } });
  wake(2500);
}

/* ---------- picking & input ---------- */
const RC = new T3.Raycaster(), NDC = new T3.Vector2();
function toNDC(e) { const r = cv.getBoundingClientRect(); NDC.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); return r; }
function pick(e) {
  toNDC(e); RC.setFromCamera(NDC, camera);
  if (ovActive() && ov.prox) { const h = RC.intersectObjects(ov.prox, false)[0]; return h ? {ov: items.indexOf(ov.order[h.object.userData.list[h.instanceId]])} : null; }
  const objs = []; items.forEach(it => { if (it.book && it.book.group.visible) objs.push(it.book.group); });
  const h = RC.intersectObjects(objs, true)[0]; return h ? h.object.userData.it || null : null;
}
let drag = null, pinch = null; const ptrs = new Map();
const PX = 118;
cv.addEventListener('pointerdown', e => {
  ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY});
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = {d0: Math.hypot(a.x - b.x, a.y - b.y), done: false}; drag = null; return; }
  if (openState !== 'none' || (mode !== 'shelf' && !ovActive())) return;
  cv.setPointerCapture(e.pointerId);
  const r = cv.getBoundingClientRect(), lx = (e.clientX - r.left) / r.width, ly = (e.clientY - r.top) / r.height;
  drag = {x0: e.clientX, y0: e.clientY, p0: spin.pos, axis: null, hit: pick(e), lx: e.clientX, ly: e.clientY, lt: performance.now(), v: 0, t0: performance.now(),
    lp: (lx > .55 && ly < .3 && !ovActive()) ? setTimeout(() => { if (drag && !drag.axis) { drag.lpDone = true; cycleTime(); } }, 600) : 0};
  if (!ovActive() && spin.mode !== 'rest') { spin.mode = 'drag'; drag.p0 = spin.pos; drag.caught = true; }
  dragVel = 0;
});
cv.addEventListener('pointermove', e => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY});
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (!pinch.done && Math.abs(d - pinch.d0) > 40) { pinch.done = true; setOverview(d < pinch.d0 ? !ovActive() || true : false); if (d > pinch.d0 && ovActive()) setOverview(false); } return; }
  if (!drag) { if (e.pointerType === 'mouse' && mode === 'shelf' && !ovActive() && openState === 'none') { const r = screenEl.getBoundingClientRect(); tilt.x.t = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1) * .6; tilt.y.t = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1) * .6; wake(); } return; }
  const k = phoneScale(), dx = (e.clientX - drag.x0) / k, dy = (e.clientY - drag.y0) / k;
  if (!drag.axis && Math.hypot(dx, dy) > 7) {
    clearTimeout(drag.lp);
    if (ovActive()) drag.axis = 'scroll';
    else { const front = items[frontIndex()]; drag.axis = (dy > Math.abs(dx) * 1.1 && drag.hit === front && front && !drag.caught) ? 'press' : 'spin';
      if (drag.axis === 'press') { mode = 'press'; drag.it = front; } else { spin.mode = 'drag'; } }
  }
  const now = performance.now(), dtt = Math.max(1, now - drag.lt) / 1000;
  if (drag.axis === 'spin') { spin.pos = drag.p0 - dx / PX; const v = -((e.clientX - drag.lx) / k) / PX / dtt; drag.v = lerp(drag.v, v, .45); dragVel = drag.v; wake(); }
  if (drag.axis === 'press') { const it = drag.it, p = clamp(dy / 160, 0, 1.1); it.pr.x = it.pr.t = p; it.sq.x = it.sq.t = -p * .2; plU.uDent.value.set(it.blob.position.x, it.blob.position.z - CZ, .75, p * .045); floorPlane.constant = p * .04; wake(); }
  if (drag.axis === 'scroll') { const v = ((e.clientY - drag.ly) / k) * .012; ovCam.x = clamp(ovCam.x + v, 1.1, Math.max(1.1, ov.built * HP - .3)); drag.v = lerp(drag.v, v / dtt, .4); wake(); }
  drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
});
function up(e) {
  ptrs.delete(e.pointerId); if (pinch) { if (ptrs.size === 0) pinch = null; return; }
  if (!drag) return; const d = drag; drag = null; clearTimeout(d.lp); if (d.lpDone) return;
  if (d.axis === 'spin') { if (performance.now() - d.lt > 90) d.v = 0; spin.vel = clamp(d.v, -14, 14); spin.mode = 'free'; dragVel = 0; }
  else if (d.axis === 'press') { const it = d.it; mode = 'shelf';
    if (it.pr.x > .5) deleteItem(it); else { it.pr.t = 0; it.sq.t = 0; it.sq.v = 2; const dn = plU.uDent.value; const w0 = dn.w; let t = 0; const un = onTick(dt => { t = Math.min(1, t + dt / .3); dn.w = w0 * (1 - t); floorPlane.constant = dn.w * .9; want = true; if (t >= 1) un(); }); } }
  else if (d.axis === 'scroll') { ovScrollV = clamp(d.v, -8, 8); }
  else if (e.type === 'pointerup') {
    if (d.caught) { spin.mode = 'free'; spin.vel = 0; }
    else if (d.hit && d.hit.ov != null) flyTo(d.hit.ov);
    else if (d.hit && d.hit === items[frontIndex()]) openItem(d.hit);
    else if (d.hit && d.hit.note) spinTo(items.indexOf(d.hit));
  }
  wake(2500);
}
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
screenEl.addEventListener('pointerleave', () => { tilt.x.t = tilt.y.t = 0; wake(); });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  if (e.ctrlKey) { if (e.deltaY > 2 && !ovActive()) setOverview(true); else if (e.deltaY < -2 && ovActive()) setOverview(false); return; }
  if (ovActive()) { ovScrollV = clamp(ovScrollV - e.deltaY * .02, -10, 10); wake(); }
  else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && mode === 'shelf' && openState === 'none') { spin.pos += e.deltaX / 400; spin.vel = e.deltaX / 400 / .016 * .5; spin.mode = 'free'; wake(); }
}, {passive: false});
cv.addEventListener('keydown', e => {
  if (openState !== 'none') return;
  if (e.key === 'ArrowRight') { spinBy(1); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { spinBy(-1); e.preventDefault(); }
  else if ((e.key === 'Enter' || e.key === ' ') && !ovActive()) { openItem(items[frontIndex()]); e.preventDefault(); }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && !ovActive()) { deleteItem(items[frontIndex()]); e.preventDefault(); }
  else if (e.key === 'o' || e.key === 'O') setOverview(!ovActive());
});
function cycleTime() { setTime(TODN[(TODN.indexOf(curTime) + 1) % 3]); hap('selection'); snd('tick', {pitch: .7}); }
todBtn.addEventListener('click', cycleTime);
$('.sb-ovb').addEventListener('click', () => setOverview(!ovActive()));
$('.sb-fab').addEventListener('click', () => create('Ideas'));
undoEl.querySelector('button').addEventListener('click', undo);
chipsEl.addEventListener('click', e => { const b = e.target.closest('.sb-chip'); if (!b) return; const i = items.findIndex(it => it.note.tag === b.dataset.tag); if (i >= 0) spinTo(i); });
srEl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i; spin.pos = spin.target = i; normPos(); openItem(items[i]); });
const srchBtn = $('.sb-srch');
srchBtn.addEventListener('click', () => { const on = !hdEl.classList.contains('searching'); hdEl.classList.toggle('searching', on); srchBtn.setAttribute('aria-expanded', String(on)); if (on) qEl.focus(); else { qEl.value = ''; search(''); } });
qEl.addEventListener('input', () => search(qEl.value));
qEl.addEventListener('keydown', e => { if (e.key === 'Escape') { hdEl.classList.remove('searching'); srchBtn.setAttribute('aria-expanded', 'false'); qEl.value = ''; search(''); srchBtn.focus(); } });
fnEl.querySelector('.fb-back').addEventListener('click', () => closeOpen());
fnEl.querySelector('.fb-del').addEventListener('click', () => { const n = openIt && openIt.note; closeOpen().then(() => n && SB.remove(n)); });
fnEl.addEventListener('keydown', e => { if (e.key === 'Escape') closeOpen(); });

/* ---------- autoplay: the 10-second "fall in love" sequence ---------- */
let autoplaying = false, played = false, inView = false, booted = false, apOpened = null, apClosing = false;
function gf(x, y, ms) { gfEl.style.transition = `opacity .3s, transform ${ms || 0}ms cubic-bezier(.4,0,.2,1), scale .18s`; gfEl.style.transform = `translate(${x}px,${y}px)`; }
function typeInto(text, msPer) {
  const ta = [...screenEl.querySelectorAll('textarea')].find(t => t.offsetParent !== null && !t.closest('[inert]') && t.getBoundingClientRect().height > 30 && t.classList.contains('bo')) ||
    [...screenEl.querySelectorAll('textarea')].reverse().find(t => t.offsetParent !== null && !t.closest('[inert]'));
  if (!ta) return;
  let i = 0; const base = ta.value ? ta.value.replace(/\s*$/, '') + '\n' : '';
  const tick = () => { if (!autoplaying || apClosing) return; i++; ta.value = base + text.slice(0, i); ta.dispatchEvent(new Event('input', {bubbles: true}));
    if (text[i - 1] === ' ') snd('scratch', {gain: .5, pitch: .9 + Math.random() * .2}); if (i < text.length) later(msPer, tick); };
  later(msPer, tick);
}
function autoplay() {
  if (RM || !items.length) { items.forEach(it => it.pre = false); wake(1000); return; }
  stopAuto(); autoplaying = true; played = true; tl = []; apOpened = null; apClosing = false; gfEl.classList.remove('on', 'down', 'tap');
  spin.pos = spin.target = 0; spin.vel = 0; spin.mode = 'rest'; spin.lastFront = -1; frontChanged();
  hideAll(); later(60, () => dropIn(90));
  later(2250, () => { gf(300, 380, 0); gfEl.classList.add('on'); });
  later(2500, () => { gfEl.classList.add('down'); spin.mode = 'drag'; const p0 = spin.pos; let t = 0;
    const un = onTick(dt => { if (!autoplaying) return un(); t = Math.min(1, t + dt / .24); const e = t * t; spin.pos = p0 + .62 * e; dragVel = 5.4 * t; want = true;
      if (t >= 1) { un(); spin.vel = 6.2; spin.mode = 'free'; dragVel = 0; gfEl.classList.remove('down'); } });
    gf(300 - 72, 384, 240); });
  later(2950, () => gf(205, 360, 700));
  later(4050, () => { gfEl.classList.add('down', 'tap'); setTimeout(() => gfEl.classList.remove('down'), 160); });
  later(4150, () => { if (!autoplaying) return; spin.mode = 'rest'; normPos(); const it = items[frontIndex()]; it.sq.v = -.8;
    later(90, () => { if (!autoplaying) return; apOpened = openItem(it); apOpened.then(() => { if (!autoplaying || apClosing) return;
      later(120, () => { if (!apClosing) typeInto(' Lanterns by the river.', 42); });
    }); }); });
  // the close is pinned to the storyboard clock (8.4s), so the demo always ends resting on the shelf by 10s
  later(7850, () => { if (!autoplaying) return; apClosing = true;
    const doClose = () => { if (!autoplaying) return; closeOpen().then(() => later(700, () => { autoplaying = false; })); };
    if (openState === 'sbopen-open' || openState === 'fallback-open') doClose(); else if (apOpened) apOpened.then(doClose); });
  later(4500, () => gfEl.classList.remove('on', 'tap'));
}
function stopAuto() {
  if (!autoplaying) return; autoplaying = false; tl = []; gfEl.classList.remove('on', 'down', 'tap');
  items.forEach(it => { if (it.pre) { it.pre = false; } });
  if (spin.mode === 'drag' && !drag) { spin.mode = 'free'; }
  wake(1500);
}
screenEl.addEventListener('pointerdown', e => { if (e.isTrusted && autoplaying) stopAuto(); }, true);
screenEl.addEventListener('keydown', e => { if (e.isTrusted && autoplaying) stopAuto(); }, true);
function tryAuto() { if (booted && inView && !played && !NOAUTO) autoplay(); }

/* ---------- page chrome: sound + replay + phone scale ---------- */
function fit() {
  const wrap = document.querySelector('.wrap'); if (!wrap) return;
  const capH = 120, k = Math.min((innerHeight - capH) / 868, (innerWidth - 32) / 414, 1.25);
  document.documentElement.style.setProperty('--k', Math.max(.3, k).toFixed(4));
  sizeRenderer(); dustU.uPR.value = R.getPixelRatio(); wake();
}
addEventListener('resize', fit); fit();
const sndBtn = document.getElementById('snd'), repBtn = document.getElementById('replay');
let unlocked = false;
function unlock() { if (unlocked) return; unlocked = true; try { window.SBSound && SBSound.unlock(); } catch (e) {} }
document.addEventListener('pointerdown', unlock, true); document.addEventListener('keydown', unlock, true);
function syncSnd() { if (!sndBtn) return; const m = !window.SBSound || SBSound.muted; sndBtn.textContent = m ? 'Sound off' : 'Sound on'; sndBtn.setAttribute('aria-pressed', String(!m)); }
if (sndBtn) sndBtn.addEventListener('click', () => { unlock(); try { SBSound.setMuted(!SBSound.muted); if (!SBSound.muted) SBSound.room && SBSound.room(true); } catch (e) {} syncSnd(); });
if (repBtn) repBtn.addEventListener('click', () => {
  const go = () => { if (ovActive()) { ov.t = ov.x = 0; screenEl.classList.remove('overview'); } played = false; homeOverlay(true); autoplay(); };
  stopAuto(); settleOpen().then(go);
});
syncSnd();
document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) wake(1000); });

/* ---------- SB API ---------- */
function onTick(fn) { tickFns.push(fn); wake(); return () => { const i = tickFns.indexOf(fn); if (i >= 0) tickFns.splice(i, 1); }; }
const SB = window.SB = {
  renderer: R, scene, camera, screenEl, books: items, light: {key, gobo, hemi, lamp},
  time: curTime,
  requestFrame() { want = true; wake(); },
  onTick,
  puff,
  save(note) {
    const it = items.find(x => x.note === note || x.note.id === note.id); if (!it) return;
    if (it.note !== note) Object.assign(it.note, note);
    const n = it.note;
    if (it.book) {
      if (it.title !== n.title) { it.title = n.title; try { it.book.setTitle(n.title); } catch (e) {} }
      if (it.tag !== n.tag) { const was = it.tag; it.tag = n.tag; if (was) { try { it.book.setCloth(CLOTH[n.tag]); } catch (e) {} it.ribbon.material.color.copy(lin(RIB[n.tag])); coverFor(n.tag).then(c => { if (it.book) it.book.setLabel(c); wake(); }); } }
    }
    syncLists(); wake(800);
  },
  remove(note) {
    const it = items.find(x => x.note === note || x.note.id === note.id); if (!it) return;
    if (openIt === it && openState !== 'none') { pendingRemove = note; return; }
    const i = items.indexOf(it); if (i !== frontIndex()) { spin.pos = spin.target = i; normPos(); }
    deleteItem(it);
  },
  create(tag) { return create(tag); },
  homeOverlay,
  autoplay: () => { stopAuto(); settleOpen().then(() => { played = false; autoplay(); }); },
  setTime, cycleTime, setOverview, search, undo, replay: () => repBtn && repBtn.click(),
  slotPose(book) { const it = items.find(x => x.book === book); if (!it) return null; const i = items.indexOf(it); shelfPose(slotOf(i), pose);
    const out = {position: pose.p.clone(), quaternion: pose.q.clone(), scale: pose.sc}; _off.set(-BW / 2 * pose.sc, 0, 0).applyQuaternion(pose.q); out.position.add(_off); return out; },
  get state() { return {mode, openState, front: frontIndex(), pos: spin.pos, vel: spin.vel, ov: ov.x, autoplaying, time: curTime, n: items.length, books: items.filter(i => i.book).length}; }
};

/* ---------- boot ---------- */
{
  (window.SB_NOTES || []).map(n => Object.assign({}, n)).forEach(n => { const it = newItem(n); it.title = n.title; it.tag = n.tag; items.push(it); });
}
setTime(curTime, true); todEl.classList.remove('on');
syncLists();
items.forEach(it => it.pre = !RM && !NOAUTO);
applyTod(1);
const fontsReady = document.fonts ? Promise.race([Promise.all(['700 46px "Bricolage Grotesque"', '400 15px Newsreader'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]).catch(() => {}) : Promise.resolve();
const artP = (window.SBArt && SBArt.ready) ? Promise.race([SBArt.ready, new Promise(r => setTimeout(r, 2500))]).catch(() => {}) : Promise.resolve();
Promise.all([fontsReady, artP]).then(() => {
  artReady = true;
  for (let i = 0; i < items.length; i++) if (Math.abs(slotOf(i)) < 2.9) ensureBook(items[i]);
  booted = true; wake(1500);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { inView = es[es.length - 1].intersectionRatio >= .6; tryAuto(); }, {threshold: [0, .3, .6, .8, 1]}).observe(screenEl);
  else { inView = true; tryAuto(); }
  if (RM || NOAUTO) { items.forEach(it => it.pre = false); wake(1500); }
});
})();
