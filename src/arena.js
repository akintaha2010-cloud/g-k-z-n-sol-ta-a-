// Single-screen castle-courtyard brawler used by KALE KAPMACA (1 vs bots) and ÇOK OYUNCULU (local + gamepads).
import { clamp, rnd, text, OUT, whiten, flipH } from './gfx.js';
import { CHARS, sprites } from './heroes.js';
import { sfx } from './audio.js';
import { drawCount } from './ui.js';

export const ROSTER = ['akin', 'mert', 'tuna', 'gokoz', 'ozgur'];
const COLS = ['#ec3750', '#38bdf8', '#a3e635', '#fbbf24'];
const W = 400, H = 216, GY = 170, X0 = 70, X1 = 330, WIN = 30;
const PLAT = [{ x0: X0, x1: X1, y: GY }, { x0: 92, x1: 152, y: 126 }, { x0: 248, x1: 308, y: 126 }, { x0: 168, x1: 232, y: 84 }];
const sgn = (v) => (v < 0 ? -1 : 1);

export function createArena(o) {
  const on = o.mode === 'online', humans = on ? o.slots.map((s) => (s.human ? { k: s.me ? 'kb' : 'net', pid: s.pid } : null)) : o.mode === 'kale' ? [{ k: 'kb', pad: -1 }] : [{ k: 'kb1' }, { k: 'kb2' }, ...(o.pads || []).map((p) => ({ k: 'pad', pad: p }))].slice(0, 4);
  const n = on ? o.slots.length : o.mode === 'kale' ? 4 : o.bots ? 4 : humans.length;
  const ids = [o.char || 'akin', ...ROSTER.filter((r) => r !== (o.char || 'akin'))];
  const a = { mode: o.mode, rule: o.rule, t: 0, count: 2.4, over: null, overT: 0, fx: [], F: [], crown: null, crownLock: 0 };
  for (let i = 0; i < n; i++) {
    const h = humans[i], id = on ? o.slots[i].char : ids[i];
    a.F.push({ i, id, name: CHARS[id].name, col: COLS[i], spr: sprites(id), src: h || null, x: 130 + (140 * i) / Math.max(1, n - 1), y: GY, vx: 0, vy: 0, face: i % 2 ? -1 : 1, g: true, jumps: 2, atkT: 0, swing: 0, hitDone: true, stun: 0, inv: 0, respT: 0, alive: true,
      lives: o.rule === 'lms' ? 3 : 99, dmg: 0, crownT: 0, flash: 0, jb: 0, ab: 0, pj: false, pa: false, l: false, r: false, at: 0, ai: { t: rnd(0.1, 0.4), mv: 0, jump: false, atk: false, cd: 0, tx: 200, ty: GY } });
  }
  if (o.rule === 'crown') a.crown = { x: 200, y: 20, vx: 0, vy: 0, owner: null, last: null };
  return a;
}

// ---- inputs: keys (by e.code), tc = touch {l,r,j,a}; returns one {l,r,j,a} per fighter (null for bots)
export function readInputs(a, keys, tc) {
  const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
  const any = (cs) => cs.some((c) => keys[c]);
  return a.F.map((f) => {
    if (!f.src) return null;
    const s = f.src;
    if (s.k === 'kb') return { l: any(['KeyA', 'ArrowLeft']) || tc.l, r: any(['KeyD', 'ArrowRight']) || tc.r, j: any(['KeyW', 'ArrowUp', 'Space']) || tc.j, a: any(['KeyF', 'KeyJ', 'KeyZ', 'KeyK']) || tc.a };
    if (s.k === 'kb1') return { l: any(['KeyA']) || tc.l, r: any(['KeyD']) || tc.r, j: any(['KeyW']) || tc.j, a: any(['KeyF']) || tc.a };
    if (s.k === 'kb2') return { l: any(['ArrowLeft']), r: any(['ArrowRight']), j: any(['ArrowUp']), a: any(['KeyK', 'Numpad1']) };
    const p = pads[s.pad], b = (i) => !!(p && p.buttons[i] && p.buttons[i].pressed), ax = (p && p.axes[0]) || 0;
    return { l: ax < -0.4 || b(14), r: ax > 0.4 || b(15), j: b(0) || b(12) || ((p && p.axes[1]) || 0) < -0.7, a: b(2) || b(1) || b(3) || b(5) };
  });
}

const landed = (o, py) => PLAT.find((p) => o.vy >= 0 && py <= p.y + 0.5 && o.y >= p.y && o.x > p.x0 - 4 && o.x < p.x1 + 4);
const spark = (a, x, y, col, n = 8) => { for (let i = 0; i < n; i++) a.fx.push({ x, y, vx: rnd(-90, 90), vy: rnd(-120, 20), t: rnd(0.25, 0.5), col }); };

function dropCrown(a, f, dir) {
  const c = a.crown;
  if (c && c.owner === f) { c.owner = null; c.last = f; a.crownLock = 0.9; c.vy = -240; c.vx = dir * 70; c.y = f.y - 40; }
}
function hurt(a, f, t, dmg, kb, up, stun) {
  const dir = Math.abs(t.x - f.x) < 2 ? f.face : sgn(t.x - f.x);
  t.dmg += dmg; t.vx = dir * (kb + t.dmg * 3.2); t.vy = -(up + t.dmg * 1.4); t.g = false; t.stun = stun + Math.min(0.35, t.dmg / 300); t.flash = 0.12; t.swing = 0;
  dropCrown(a, t, dir); spark(a, t.x, t.y - 22, '#fff7ed');
}
function lose(a, f) {
  sfx('ko'); spark(a, clamp(f.x, 8, W - 8), clamp(f.y, 8, H - 8), f.col, 16);
  dropCrown(a, f, 0);
  if (a.rule === 'lms') f.lives--;
  if (f.lives <= 0) { f.alive = false; f.respT = 0; return; }
  f.respT = 0.9; f.x = 0; f.y = -999;
}
function spawn(f) { f.x = rnd(150, 250); f.y = -30; f.vx = f.vy = 0; f.dmg = 0; f.inv = 1; f.stun = 0; f.jumps = 1; f.g = false; }

function think(a, f) { // bots: decide every 0.2-0.4s from a snapshot of the target, then act on it until the next decision
  const ai = f.ai, foes = a.F.filter((o) => o !== f && o.alive && o.respT <= 0);
  if (!foes.length) return;
  let tg = foes.reduce((b, o) => (Math.abs(o.x - f.x) < Math.abs(b.x - f.x) ? o : b), foes[0]), flee = false;
  const c = a.crown;
  if (c) { if (c.owner === f) flee = true; else if (c.owner) tg = c.owner; else tg = c; }
  ai.tx = tg.x; ai.ty = tg.y; ai.jump = ai.atk = false;
  const dx = ai.tx - f.x, dy = ai.ty - f.y;
  let mv = flee ? -sgn(tg === f ? 1 : foes.reduce((b, o) => (Math.abs(o.x - f.x) < Math.abs(b.x - f.x) ? o : b), foes[0]).x - f.x) : Math.abs(dx) > 22 ? sgn(dx) : 0;
  if (Math.random() < 0.12) mv = 0;
  const off = f.x < X0 - 2 || f.x > X1 + 2;
  if (off) mv = f.x < W / 2 ? 1 : -1;
  else if (f.y >= GY - 1 && ((f.x < X0 + 16 && mv < 0) || (f.x > X1 - 16 && mv > 0))) mv = -mv || (f.x < W / 2 ? 1 : -1);
  ai.mv = mv; ai.rec = off || f.y > GY + 4;
  if (!flee && dy < -30 && Math.abs(dx) < 70 && Math.random() < 0.6) ai.jump = true;
  else if (Math.random() < 0.04) ai.jump = true;
  if (!flee && Math.abs(dx) < 32 && Math.abs(dy) < 30 && ai.cd <= 0 && Math.random() < 0.7) { ai.atk = true; ai.cd = rnd(0.55, 1.1); }
  ai.t = rnd(0.2, 0.4);
}
function drive(a, f, h) {
  const ai = f.ai;
  ai.cd -= h; ai.t -= h;
  if (ai.t <= 0) think(a, f);
  f.l = ai.mv < 0; f.r = ai.mv > 0;
  if (ai.jump) { f.jb = 0.06; ai.jump = false; }
  if (ai.rec && !f.g && f.vy > 40 && f.jumps > 0 && f.y > GY - 8 && Math.random() < 0.15) f.jb = 0.06;
  if (ai.atk && f.atkT <= 0) { f.ab = 0.06; ai.atk = false; f.face = sgn(ai.tx - f.x); }
}

function stepFighter(a, f, h, others) {
  if (!f.alive) return;
  if (f.respT > 0) { f.respT -= h; if (f.respT <= 0) spawn(f); return; }
  f.atkT -= h; f.swing -= h; f.stun -= h; f.inv -= h; f.flash -= h; f.jb -= h; f.ab -= h; f.at += h;
  if (!f.src) drive(a, f, h);
  const ctrl = f.stun <= 0, dirIn = (f.r ? 1 : 0) - (f.l ? 1 : 0);
  if (ctrl) {
    const acc = (f.g ? 1400 : 700) * h, tv = dirIn * 112;
    f.vx += clamp(tv - f.vx, -acc, acc);
    if (dirIn && f.swing <= 0) f.face = dirIn;
    if (f.jb > 0 && f.jumps > 0) { f.vy = f.g ? -340 : -310; sfx(f.g ? 'jump' : 'djump'); f.jumps--; f.g = false; f.jb = 0; }
    if (f.ab > 0 && f.atkT <= 0) { f.atkT = 0.4; f.swing = 0.2; f.hitDone = false; f.ab = 0; sfx('swing'); }
  } else f.vx *= Math.exp(-(f.g ? 5 : 0.5) * h);
  f.vy = Math.min(720, f.vy + 900 * h);
  const py = f.y; f.x += f.vx * h; f.y += f.vy * h; f.g = false;
  const p = landed(f, py);
  if (p) { f.y = p.y; f.vy = 0; f.g = true; f.jumps = 2; }
  if (f.y > GY + 4 && f.x > X0 - 8 && f.x < X1 + 8) { f.x = f.x < W / 2 ? X0 - 8 : X1 + 8; f.vx = 0; }
  // punch
  if (f.swing > 0 && f.swing < 0.13 && !f.hitDone) {
    for (const t of others) if (t !== f && t.alive && t.respT <= 0 && t.inv <= 0 && Math.abs(t.y - f.y) < 32 && (t.x - f.x) * f.face > -6 && Math.abs(t.x - f.x) < 34) { hurt(a, f, t, 8, 125, 160, 0.2); sfx('hit'); f.hitDone = true; break; }
  }
  // stomp
  if (f.vy > 120) for (const t of others) if (t !== f && t.alive && t.respT <= 0 && t.inv <= 0 && Math.abs(t.x - f.x) < 14 && f.y > t.y - 40 && f.y < t.y - 26 && py < t.y - 30) {
    hurt(a, f, t, 14, 170, 110, 0.5); f.vy = -330; f.jumps = Math.max(f.jumps, 1); sfx('heavy'); spark(a, t.x, t.y - 40, '#fde68a', 10); break;
  }
  if (f.x < -50 || f.x > W + 50 || f.y > H + 70 || f.y < -170) lose(a, f);
}

function stepCrown(a, h) {
  const c = a.crown; if (!c) return;
  a.crownLock -= h;
  if (c.owner) { const o = c.owner; c.x = o.x; c.y = o.y - 42; o.crownT += h; return; }
  c.vy = Math.min(600, c.vy + 900 * h); c.vx *= Math.exp(-2 * h);
  const py = c.y; c.x += c.vx * h; c.y += c.vy * h;
  const p = landed(c, py); if (p) { c.y = p.y - 2; c.vy = 0; }
  if (c.x < -20 || c.x > W + 20 || c.y > H + 30) { c.x = 200; c.y = 20; c.vx = c.vy = 0; }
  if (a.crownLock <= 0) for (const f of a.F) if (f.alive && f.respT <= 0 && Math.abs(f.x - c.x) < 15 && c.y > f.y - 46 && c.y < f.y + 6) { c.owner = f; sfx('pickup'); break; }
}

export function stepArena(a, inputs, dt) {
  dt = Math.min(dt, 0.1);
  for (const f of a.F) {
    const i = inputs && inputs[f.i];
    if (i && f.alive) { f.l = i.l; f.r = i.r; if (i.j && !f.pj) f.jb = 0.1; if (i.a && !f.pa) f.ab = 0.1; f.pj = i.j; f.pa = i.a; }
  }
  a.t += dt;
  if (a.count > 0) {
    const b = Math.ceil(a.count / 0.6); a.count -= dt; const n = Math.ceil(a.count / 0.6);
    if (n !== b) sfx(n <= 1 ? 'go' : 'count');
    if (a.count > 0.6) return;
  }
  const subs = Math.ceil(dt / 0.01), h = dt / subs;
  for (let s = 0; s < subs; s++) { for (const f of a.F) stepFighter(a, f, h, a.F); stepCrown(a, h); }
  for (const p of a.fx) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; }
  a.fx = a.fx.filter((p) => p.t > 0);
  if (a.over) { a.overT += dt; return; }
  const alive = a.F.filter((f) => f.alive), humans = a.F.filter((f) => f.src);
  let w = null;
  if (a.rule === 'crown') w = a.F.find((f) => f.crownT >= WIN);
  else if (alive.length <= 1 || (a.mode === 'kale' && !a.F[0].alive)) w = alive.slice().sort((x, y) => y.lives - x.lives || x.dmg - y.dmg)[0];
  if (w) { a.over = { winner: w }; sfx('win'); } else if (!humans.length) a.over = { winner: null };
}

// ---- drawing
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function drawStage(g, t) {
  for (let i = 0; i < 6; i++) R(g, 0, i * 36, W, 36, ['#1e1b3a', '#2a2350', '#3b2d63', '#5a3a73', '#8a4478', '#c2577a'][i]);
  for (let i = 0; i < 30; i++) R(g, (i * i * 37 + i * 91 + 13) % W, (i * i * 29 + 7) % 90, 1, 1, (i + Math.floor(t * 2)) % 5 ? '#6b6490' : '#fff7ed');
  // far towers
  for (const x of [-4, 366]) {
    R(g, x - 1, 38, 42, H, OUT); R(g, x, 40, 40, H, '#4a4468'); R(g, x, 40, 40, 3, '#8a84a8');
    for (let k = 0; k < 4; k++) R(g, x + k * 12, 32, 8, 8, '#4a4468');
    for (let r = 0; r < 12; r++) R(g, x + (r % 2) * 10, 52 + r * 14, 40, 1, '#3a3556');
    R(g, x + 17, 70, 6, 14, OUT); R(g, x + 18, 72, 4, 8, '#fde68a'); R(g, x + 17, 120, 6, 14, OUT);
  }
  // back wall + arches
  R(g, 40, 96, 320, GY - 96, OUT); R(g, 41, 97, 318, GY - 97, '#6b6490'); R(g, 41, 97, 318, 3, '#9a93b3');
  for (let y = 104; y < GY; y += 10) { R(g, 41, y, 318, 1, '#57506e'); for (let x = 41 + ((y / 10) % 2) * 12; x < 359; x += 24) R(g, x, y, 1, 10, '#57506e'); }
  for (let k = 0; k < 4; k++) { const x = 70 + k * 78; R(g, x - 1, 118, 22, 52, OUT); R(g, x, 124, 20, 46, '#2a2350'); R(g, x + 2, 120, 16, 4, '#2a2350'); R(g, x + 4, 130, 12, 40, '#3b2d63'); }
  for (let k = 0; k < 5; k++) { const x = 52 + k * 74, fl = Math.floor(t * 8 + k) % 2; R(g, x, 134, 3, 6, OUT); R(g, x, 130 - fl, 3, 4 + fl, '#ff8c37'); R(g, x + 1, 131, 1, 3, '#fde68a'); }
  for (let x = 40; x < 360; x += 16) R(g, x, 88, 8, 8, OUT), R(g, x + 1, 89, 6, 7, '#9a93b3');
  // chasm sides
  for (const [x, w] of [[0, X0], [X1, W - X1]]) { g.globalAlpha = 0.55; R(g, x, GY, w, H - GY, '#0b0916'); g.globalAlpha = 1; }
}
function drawGround(g) {
  R(g, X0 - 2, GY - 1, X1 - X0 + 4, H - GY + 2, OUT); R(g, X0, GY, X1 - X0, H - GY, '#9a93b3'); R(g, X0, GY, X1 - X0, 3, '#d8d3ea');
  for (let y = GY + 8; y < H; y += 10) { R(g, X0, y, X1 - X0, 1, '#6b6490'); for (let x = X0 + ((y / 10) % 2) * 12; x < X1; x += 24) R(g, x, y, 1, 10, '#6b6490'); }
  R(g, X0, GY + 3, X1 - X0, 2, '#b8b2d0');
}
function drawPlat(g, p) { R(g, p.x0 - 1, p.y - 1, p.x1 - p.x0 + 2, 9, OUT); R(g, p.x0, p.y, p.x1 - p.x0, 7, '#b8b2d0'); R(g, p.x0, p.y, p.x1 - p.x0, 2, '#e9e4f7'); R(g, p.x0, p.y + 5, p.x1 - p.x0, 2, '#8a84a8'); for (let x = p.x0 + 8; x < p.x1; x += 14) R(g, x, p.y + 3, 1, 3, '#8a84a8'); }
function drawFighter(g, f, t, a) {
  if (!f.alive || f.respT > 0) return;
  if (f.inv > 0 && Math.floor(t * 14) % 2) return;
  const S = f.spr, win = a.over && a.over.winner === f, m = Math.hypot(f.vx, 0);
  let k = 'idle', fr = Math.floor(f.at * 6);
  if (win) { k = 'win'; fr = Math.floor(t * 5); } else if (f.stun > 0) { k = 'hit'; fr = f.stun > 0.3 ? 0 : 1; } else if (f.swing > 0) { k = 'p1'; fr = clamp(Math.floor((1 - f.swing / 0.2) * 3), 0, 2); } else if (!f.g) { k = f.vy < 0 ? 'jump' : 'fall'; fr = k === 'jump' ? clamp(Math.floor(-f.vy / 100), 0, 3) : Math.floor(f.at * 8); } else if (m > 20 && (f.l || f.r)) { k = 'run'; fr = Math.floor(f.at * 12); }
  let c = S[k][fr % S[k].length]; if (f.flash > 0) c = whiten(c);
  R(g, Math.round(f.x - 8), Math.round(f.y - 1), 16, 2, 'rgba(10,6,24,0.4)');
  g.drawImage(f.face < 0 ? flipH(c) : c, Math.round(f.x - 32), Math.round(f.y - 58));
  const tx = Math.round(f.x), ty = Math.round(f.y - 62 - Math.sin(t * 6) * 1);
  text(g, f.src ? 'P' + (f.i + 1) : 'CPU', tx, ty - 9, f.col, 1, 0.5, OUT);
  R(g, tx - 3, ty + 1, 7, 1, OUT); R(g, tx - 2, ty + 2, 5, 1, OUT); R(g, tx - 1, ty + 3, 3, 1, OUT); R(g, tx - 2, ty, 5, 1, f.col); R(g, tx - 1, ty + 1, 3, 1, f.col); R(g, tx, ty + 2, 1, 1, f.col);
  if (f.y > H - 6 || f.x < 6 || f.x > W - 6) { /* off-screen marker kept simple */ }
}
function hud(g, a, VW, VH) {
  const n = a.F.length, bw = Math.min(112, Math.floor((VW - 8 - (n - 1) * 4) / n)), x0 = Math.round((VW - (bw * n + (n - 1) * 4)) / 2), y = VH - 29;
  a.F.forEach((f, i) => {
    const x = x0 + i * (bw + 4), cr = a.crown && a.crown.owner === f;
    R(g, x - 1, y - 1, bw + 2, 28, cr ? '#fde68a' : OUT); R(g, x, y, bw, 26, f.alive ? '#241f3d' : '#3a3556'); R(g, x, y, bw, 3, f.col); R(g, x, y, 3, 26, f.col);
    text(g, f.name, x + 7, y + 5, f.alive ? '#fff7ed' : '#8a84a8', 1, 0);
    if (!f.alive) return text(g, 'ELENDİ', x + bw - 4, y + 15, '#f87171', 1, 1);
    const d = Math.round(f.dmg); text(g, d + '%', x + 7, y + 15, d > 99 ? '#f87171' : d > 50 ? '#fbbf24' : '#fff7ed', 1, 0, OUT);
    if (a.rule === 'lms') for (let k = 0; k < f.lives; k++) R(g, x + bw - 8 - k * 9, y + 16, 6, 6, '#ec3750'), R(g, x + bw - 8 - k * 9, y + 16, 6, 1, '#ff8c37');
    else text(g, f.crownT.toFixed(1) + '/' + WIN, x + bw - 4, y + 15, cr ? '#fde68a' : '#a5f3fc', 1, 1, OUT);
  });
}
export function renderArena(a, g, VW, VH, t) {
  g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, VH);
  const sc = Math.min(1, VW / W), ox = Math.round((VW - W * sc) / 2), oy = Math.max(0, Math.round((VH - 30 - H * sc) / 2));
  g.save(); g.beginPath(); g.rect(0, 0, VW, VH - 30); g.clip(); g.translate(ox, oy); g.scale(sc, sc);
  drawStage(g, t); drawGround(g); PLAT.slice(1).forEach((p) => drawPlat(g, p));
  const c = a.crown;
  if (c && !c.owner) { R(g, c.x - 6, c.y - 12, 13, 12, OUT); R(g, c.x - 5, c.y - 8, 11, 7, '#fbbf24'); R(g, c.x - 5, c.y - 11, 3, 4, '#fbbf24'); R(g, c.x - 1, c.y - 11, 3, 4, '#fbbf24'); R(g, c.x + 3, c.y - 11, 3, 4, '#fbbf24'); R(g, c.x - 5, c.y - 8, 11, 1, '#fde68a'); R(g, c.x - 1, c.y - 5, 3, 2, '#ec3750'); }
  for (const f of a.F) drawFighter(g, f, t, a);
  if (c && c.owner) { const x = Math.round(c.x), y = Math.round(c.y); R(g, x - 6, y - 8, 13, 10, OUT); R(g, x - 5, y - 5, 11, 6, '#fbbf24'); R(g, x - 5, y - 8, 3, 4, '#fbbf24'); R(g, x - 1, y - 8, 3, 4, '#fbbf24'); R(g, x + 3, y - 8, 3, 4, '#fbbf24'); }
  for (const p of a.fx) R(g, Math.round(p.x), Math.round(p.y), 2, 2, p.col);
  g.restore();
  hud(g, a, VW, VH);
  if (a.count > 0) drawCount(g, Math.ceil(a.count / 0.6) - 1, (a.count / 0.6) % 1, VW, VH - 30);
  if (a.rule === 'crown' && a.count <= 0 && a.t < 5 && !a.over) text(g, 'TACI TUT, 30 SANİYE TAŞI!', VW / 2, 6, '#fde68a', 1, 0.5, OUT);
}
