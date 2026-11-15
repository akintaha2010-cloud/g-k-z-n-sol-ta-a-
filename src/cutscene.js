// In-engine cutscene player: letterbox bars, camera pans/zoom over the real level, walking actors, speech bubbles, cards.
import { clamp, text, textW, wrap, cv, flipH } from './gfx.js';
import { CHARS, sprites } from './heroes.js';
import { SPR, TILE, draw } from './art.js';
import { GR, ROWS } from './levels.js';
import * as G from './game.js';
import { sfx, music } from './audio.js';
import { NAMES, TINT } from './ui.js';
import { STORY } from './story.js';

const INK = '#141021', PAPER = '#fff7ed', RED = '#ec3750', GOLD = '#fde68a';
const FLOOR = GR * TILE, WH = ROWS * TILE;
const LOOP = { idle: 6, run: 13, win: 6, tele: 10 }; // frames per second; other anims play once at 8 fps
const ease = (t) => t * t * (3 - 2 * t);
const HOLD = 0.7;
let off = null;

export function createCut(w, id, VW, VH) {
  const script = STORY[id] || [];
  w.VW = VW; w.VH = VH;
  const p = w.player, arenas = w.lv.arenas || [], a = arenas.find((x) => x.cut === id) || (id === 'bugCrash' && arenas.find((x) => x.boss)), boss = w.enemies.find((e) => e.boss);
  let A = a ? a.x0 * TILE : id.startsWith('intro') ? w.lv.start * TILE : p.x, ctr = 0;
  const intro = !a && (id.startsWith('intro') && !w.camInit || id === 'ending' || id.startsWith('outro')) && !script.some((s) => s.some((v) => typeof v === 'string' && v[0] === '@'));
  if (intro) { // the camera is pinned at the level start, so slide the whole scene to the middle of the screen instead
    const fin = {};
    for (const s of script) { const v = s[0] === 'actor' ? s[3] : s[0] === 'walk' ? s[2] : undefined; if (v !== undefined) fin[s[1]] = typeof v === 'number' ? v : /^P[+-]?\d*$/.test(v) ? +v.slice(1) || 0 : fin[s[1]]; }
    const xs = Object.values(fin).filter((v) => v !== undefined);
    if (xs.length) { ctr = (Math.min(...xs) + Math.max(...xs)) / 2; A = Math.max(A, Math.round(VW / 2 - ctr)); }
  }
  const anc = { P: intro ? A : a && !boss ? A + 76 : p.x, B: boss ? boss.x : a ? Math.max(a.x1 * TILE, A + VW) - 70 : A + 200 };
  // the world is paused: real actors are stashed off-stage and drawn as cutscene actors instead
  const st = { px: p.x, dx: w.devin.x, npcs: w.npcs, enemies: w.enemies, shots: w.shots, go: w.go };
  const npcX = {}; for (const n of st.npcs) npcX[n.id] = n.x;
  p.x = w.devin.x = -999; w.npcs = []; w.enemies = []; w.shots = []; w.hint = null; w.go = 0;
  const ac = {}, tws = [], view = { x: w.camInit ? w.cam.x + VW / 2 : anc.P + ctr, z: 1, fade: 0, f: null };
  w.camInit = true;
  const bars = { cur: 0, tgt: 0 }, c = { id, done: false, holdT: 0, touch: false, skipRect: { x: VW - 46, y: 3, w: 43, h: 14 } };
  let i = 0, blk = null, bub = null, card = null, bossC = null, pop = null, screen = null, shk = 0, fl = 0, freeze = false, cdt = 0;

  const rx = (v) => {
    if (typeof v === 'number') return A + v;
    const m = /^(@?\w+)([+-]\d+)?$/.exec(v), k = m[1];
    const base = k === 'P' ? anc.P : k === 'B' ? anc.B : k === 'M' ? (anc.P + anc.B) / 2 : k[0] === '@' ? (npcX[k.slice(1)] ?? A + 100) : ac[k] ? ac[k].x : A;
    return base + +(m[2] || 0);
  };
  const tween = (o, k, to, d) => { const T = { o, k, f: o[k], to, t: 0, d: Math.max(d, 1e-4) }; tws.push(T); return () => T.t >= T.d; };
  const act = (name) => {
    const hid = w.npcs; w.npcs = st.npcs;
    if (G.storyAction) G.storyAction(w, name); else if (name === 'kidnap') G.removeStoryNpc(w);
    st.npcs = w.npcs; w.npcs = hid;
    shk = Math.max(shk, w.cam.shake); w.cam.shake = 0;
  };
  const mk = (aid, spr, x, face) => {
    const o = { id: aid, x, y: FLOOR, vx: 0, vy: 0, face: face === 'l' ? -1 : 1, anim: 'idle', t0: 0, tx: null, spd: 90, scale: 1, hh: 46, air: false, walking: false };
    if (CHARS[spr]) { o.set = sprites(spr); if (spr === 'goblin') o.scale = 2; o.hh = 46 * o.scale; }
    else if (spr === 'devin') { o.dv = true; o.hh = 34; }
    else if (SPR[spr] && SPR[spr].idle) { o.big = SPR[spr]; o.hh = 92; }
    else { const e = w.boss || st.enemies.find((q) => q.boss); if (e) { o.real = e; w.enemies.push(e); o.hh = (e.h || 40) + 8; } else o.none = true; }
    ac[aid] = o;
  };
  const poof = (o) => { for (let k = 0; k < 8; k++) w.fx.push({ x: o.x + (k - 4) * 3, y: o.y - 8 - (k % 3) * 8, vx: (k - 3.5) * 14, vy: -30 - (k % 2) * 20, life: 0.5, max: 0.5, col: k % 2 ? '#a3e635' : '#ffffff', size: 3, grav: 0 }); };

  function exec(s) {
    const [op, x, y, z] = s, bg = s[s.length - 1] === '&';
    const wait = (fn) => (bg ? null : fn);
    switch (op) {
      case 'bars': bars.tgt = x ? 1 : 0; break;
      case 'fade': return wait(tween(view, 'fade', x, y && y !== '&' ? y : 0));
      case 'card': { const cd = (card = { k: x, title: y, sub: z, t: 0, done: false }); sfx('flag'); return () => cd.done; }
      case 'cam': view.f = null; return wait(tween(view, 'x', clamp(rx(x), 0, w.pxw), typeof y === 'number' ? y : 0.8));
      case 'follow': view.f = x; break;
      case 'zoom': return wait(tween(view, 'z', x, typeof y === 'number' ? y : 0.5));
      case 'actor': mk(x, y, clamp(rx(z), 12, w.pxw - 12), s[4]); break;
      case 'look': if (CHARS[y] && ac[x]) { ac[x].set = sprites(y); poof(ac[x]); } break;
      case 'walk': { const o = ac[x]; if (!o) break; o.tx = clamp(rx(y), 12, w.pxw - 12); o.walking = true; if (typeof z === 'number') o.spd = z; return wait(() => o.tx === null); }
      case 'jump': { const o = ac[x]; if (!o) break; o.vy = -300; o.air = true; sfx('jump'); return wait(() => !o.air); }
      case 'knock': { const o = ac[x]; if (!o) break; o.vy = -230; o.vx = -o.face * 70; o.air = true; o.anim = 'ko'; o.t0 = w.t; sfx('ko'); shk = Math.max(shk, 6); break; }
      case 'face': { const o = ac[x]; if (o) o.face = y === 'l' ? -1 : y === 'r' ? 1 : ac[y] ? Math.sign(ac[y].x - o.x) || 1 : o.face; break; }
      case 'anim': if (ac[x]) { ac[x].anim = y; ac[x].t0 = w.t; } break;
      case 'hide': if (ac[x]) { poof(ac[x]); delete ac[x]; } break;
      case 'say': bub = { id: x, text: y, lines: null, n: 0, age: 0 }; return () => !bub;
      case 'wait': { let t = x; return () => (t -= cdt) <= 0; }
      case 'shake': shk = Math.max(shk, x); break;
      case 'flash': fl = 0.4; break;
      case 'sfx': sfx(x); break;
      case 'music': music(x); break;
      case 'act': act(x); break;
      case 'screen': screen = { x: rx(x), mode: y }; break;
      case 'pop': { const pp = (pop = { text: x, t: 0, col: y || GOLD }); shk = Math.max(shk, 6); sfx('power'); return () => pp.t >= 1.4; }
      case 'boss': {
        const o = ac[x], x0 = view.x;
        const bc = (bossC = { name: y, sub: z, t: 0, done: false });
        sfx('boom'); shk = 9; fl = 0.45; freeze = true;
        if (o) { view.f = null; tween(view, 'x', clamp(o.x, 0, w.pxw), 0.25); if (o.hh <= 50) tween(view, 'z', 2, 0.25); }
        bc.back = x0;
        return () => bc.done;
      }
    }
    return null;
  }
  function skip() {
    if (c.done) return;
    for (; i < script.length; i++) { if (script[i][0] === 'act') act(script[i][1]); else if (script[i][0] === 'music') music(script[i][1]); }
    finish();
  }
  function finish() {
    c.done = true;
    p.x = st.px; w.devin.x = st.dx; w.npcs = st.npcs; w.enemies = st.enemies; w.shots = st.shots; w.go = st.go;
  }
  function advance() {
    if (bub) { if (bub.n < bub.text.length) bub.n = bub.text.length; else if (bub.age > 0.12) bub = null; }
    else if (card && card.t > 0.5) card.t = Math.max(card.t, 2.2);
    else if (bossC && bossC.t > 1) bossC.t = 9;
  }

  function update(dt, esc) {
    if (c.done) return;
    cdt = dt;
    if (esc) { c.holdT += dt; if (c.holdT > HOLD) return skip(); } else c.holdT = 0;
    const tt = freeze ? 0 : dt;
    w.t += tt;
    for (const f of w.fx) { f.life -= dt; if (!f.star) { f.vy += (f.grav || 0) * dt; f.x += f.vx * dt; f.y += f.vy * dt; } }
    w.fx = w.fx.filter((f) => f.life > 0);
    for (const T of tws) { T.t = Math.min(T.d, T.t + dt); T.o[T.k] = T.f + (T.to - T.f) * ease(T.t / T.d); }
    for (let k = tws.length - 1; k >= 0; k--) if (tws[k].t >= tws[k].d) tws.splice(k, 1);
    bars.cur = clamp(bars.cur + (bars.tgt > bars.cur ? dt : -dt) * 2.4, 0, 1);
    if (shk > 0) shk = Math.max(0, shk - 26 * dt);
    if (fl > 0) fl -= dt;
    if (view.f && ac[view.f]) view.x += (ac[view.f].x - view.x) * Math.min(1, 6 * dt);
    for (const o of Object.values(ac)) {
      if (o.real) { o.x = o.real.x; o.y = o.real.y; continue; }
      if (o.tx !== null) { const d = o.tx - o.x, s = o.spd * tt; if (Math.abs(d) <= s) { o.x = o.tx; o.tx = null; o.walking = false; } else { o.x += Math.sign(d) * s; o.face = Math.sign(d); } }
      o.x += o.vx * tt;
      if (!o.air) o.vx -= o.vx * Math.min(1, 7 * tt);
      else { o.vy += 900 * tt; o.y += o.vy * tt; if (o.y >= FLOOR) { o.y = FLOOR; o.vy = 0; o.air = false; if (o.anim === 'ko') shk = Math.max(shk, 3); } }
    }
    if (bub) {
      const len = bub.text.length, n0 = Math.floor(bub.n);
      bub.n = Math.min(len, bub.n + dt * 42); bub.age = bub.n >= len ? bub.age + dt : 0;
      if (Math.floor(bub.n) !== n0 && Math.floor(bub.n) % 3 === 0) sfx(bub.id === 'devin' ? 'devin' : 'talk');
    }
    if (card) { card.t += dt; if (card.t >= 2.6) { card.done = true; card = null; } }
    if (pop) { pop.t += dt; if (pop.t >= 1.4) pop = null; }
    if (bossC) {
      bossC.t += dt;
      if (bossC.t >= 2.8 && !bossC.done) { bossC.done = true; freeze = false; tween(view, 'z', 1, 0.25); tween(view, 'x', bossC.back, 0.3); }
      if (bossC.done && bossC.t > 3.3) bossC = null;
    }
    for (let g = 0; g < 50; g++) {
      if (blk && !blk()) break;
      blk = null;
      if (i >= script.length) { bars.tgt = 0; if (bars.cur <= 0 && !bub && !card) finish(); break; }
      blk = exec(script[i++]);
      if (blk) break;
    }
    // camera: keep whoever is talking inside the frame
    if (bub && ac[bub.id] && !view.f) { const o = ac[bub.id], L = view.x - VW / 2 + 40, R = view.x + VW / 2 - 40, k = Math.min(1, 9 * dt); if (o.x < L) view.x += (o.x - L) * k; else if (o.x > R) view.x += (o.x - R) * k; }
    const cam = w.cam;
    cam.x = clamp(Math.round(view.x - VW / 2), 0, Math.max(0, w.pxw - VW));
    const ty = clamp(FLOOR - VH * 0.66, 0, Math.max(0, WH - VH));
    cam.y += (ty - cam.y) * Math.min(1, 6 * dt);
  }

  const shadow = (g, x, y, r) => { g.fillStyle = 'rgba(10,6,24,0.35)'; g.fillRect(Math.round(x - r), Math.round(y - 1), r * 2, 3); g.fillRect(Math.round(x - r + 2), Math.round(y - 2), r * 2 - 4, 1); g.fillRect(Math.round(x - r + 2), Math.round(y + 2), r * 2 - 4, 1); };
  function paint(g, o, cx, oy) {
    if (o.none || o.real) return;
    const t = w.t, talk = bub && bub.id === o.id && bub.n < bub.text.length && Math.floor(t * 14) % 2 ? 1 : 0;
    const x = o.x - cx, y = o.y + oy - talk;
    shadow(g, x, FLOOR + oy, 9 * o.scale);
    const flip = o.face < 0;
    let an = o.anim !== 'idle' ? o.anim : o.air ? 'air' : o.walking ? 'run' : 'idle';
    if (o.dv) return draw(g, SPR.devin, Math.floor(t * (o.walking ? 9 : 4)) % 4, x, y, flip);
    if (o.big) { const m = o.big[an] || (an === 'ko' || an === 'hit' ? o.big.dizzy : null) || o.big.idle; return draw(g, m, Math.floor(t * 5) % m.f.length, x, y, flip); }
    let fr;
    if (an === 'air') fr = o.vy < 0 ? o.set.jump[o.vy < -180 ? 1 : 2] : o.set.fall[Math.floor(t * 9) % 2];
    else { const arr = o.set[an] || o.set.idle, fps = LOOP[an]; fr = arr[fps ? Math.floor(t * fps) % arr.length : Math.min(arr.length - 1, Math.floor((t - o.t0) * 8))]; }
    const s = o.scale;
    g.drawImage(flip ? flipH(fr) : fr, Math.round(x - 32 * s), Math.round(y - 58 * s), 64 * s, 64 * s);
  }
  function drawScreen(g, cx, oy) {
    if (!screen) return;
    const W = 76, H = 44, x = Math.round(screen.x - cx - W / 2), y = Math.round(FLOOR + oy - 112), t = w.t;
    g.fillStyle = '#3b3050'; g.fillRect(x + 10, y + H, 3, FLOOR + oy - y - H); g.fillRect(x + W - 13, y + H, 3, FLOOR + oy - y - H);
    g.fillStyle = INK; g.fillRect(x - 3, y - 3, W + 6, H + 6);
    if (screen.mode === 'blue') { g.fillStyle = '#2563eb'; g.fillRect(x, y, W, H); text(g, ':(', x + 6, y + 4, PAPER, 3); text(g, 'HATA 0x404', x + 6, y + 30, PAPER); }
    else if (screen.mode === 'demo') {
      g.fillStyle = '#7dd3fc'; g.fillRect(x, y, W, H); g.fillStyle = '#4ade80'; g.fillRect(x, y + H - 9, W, 9); g.fillStyle = '#16a34a'; g.fillRect(x, y + H - 9, W, 1);
      const hx = x + 6 + Math.floor((t * 26) % (W - 14)), hy = y + H - 9 - 8 - Math.round(Math.abs(Math.sin(t * 5)) * 14);
      g.fillStyle = INK; g.fillRect(hx - 1, hy - 1, 8, 10); g.fillStyle = '#ec3750'; g.fillRect(hx, hy, 6, 8);
      g.fillStyle = '#facc15'; g.fillRect(x + 50, y + 10, 4, 4); g.fillRect(x + 12, y + 8, 14, 3); g.fillStyle = '#fff'; g.fillRect(x + 12, y + 8, 14, 1);
    } else { g.fillStyle = '#2a2540'; g.fillRect(x, y, W, H); }
  }

  function drawBubble(g, hx, hy, VW0, VH0, top, bot) {
    if (!bub) return;
    const tag = NAMES[bub.id] || '', maxW = Math.min(200, VW0 - 44);
    bub.lines = bub.lines || wrap(bub.text, maxW);
    const mw = Math.max(...bub.lines.map((l) => textW(l))), bw = Math.max(mw, textW(tag) + 2) + 16, bh = bub.lines.length * 11 + 5;
    const hasTail = hx !== null;
    let bx = clamp(Math.round((hasTail ? hx : VW0 / 2) - bw / 2), 6, VW0 - bw - 6);
    let by = Math.round((hasTail ? hy : top + 16) - bh - 8);
    by = clamp(by, top + 14, bot - bh - 6);
    g.fillStyle = INK; g.fillRect(bx - 1, by - 1, bw + 2, bh + 2); g.fillStyle = PAPER; g.fillRect(bx, by, bw, bh);
    if (hasTail && by + bh + 6 <= hy + 8) {
      const tx = clamp(Math.round(hx), bx + 7, bx + bw - 8);
      [2, 2, 1, 0].forEach((h, r) => { g.fillStyle = INK; g.fillRect(tx - h - 1, by + bh + r, 2 * h + 3, 1); g.fillStyle = PAPER; g.fillRect(tx - h, by + bh + r, 2 * h + 1, 1); });
      g.fillStyle = INK; g.fillRect(tx, by + bh + 4, 1, 1);
    }
    if (tag) { const tw = textW(tag) + 7; g.fillStyle = INK; g.fillRect(bx - 1, by - 12, tw + 2, 12); g.fillStyle = TINT[bub.id] || GOLD; g.fillRect(bx, by - 11, tw, 11); text(g, tag, bx + 4, by - 11, INK); }
    let left = Math.floor(bub.n);
    bub.lines.forEach((l, k) => { if (left > 0) text(g, l.slice(0, left), bx + 6, by + 3 + k * 11, INK); left -= l.length + 1; });
    if (bub.n >= bub.text.length && Math.floor(w.t * 3) % 2) text(g, '▼', bx + bw - 12, by + bh - 9, RED);
  }

  function drawCards(g, VW0, VH0, BH) {
    if (card) {
      const t = card.t, a = clamp(Math.min(t / 0.3, (2.6 - t) / 0.3), 0, 1), sl = (1 - ease(clamp(t / 0.45, 0, 1))) * VW0;
      const y = Math.round(VH0 * 0.5 - 30);
      g.fillStyle = 'rgba(11,9,22,' + 0.78 * a + ')'; g.fillRect(0, 0, VW0, VH0);
      g.globalAlpha = a; g.fillStyle = INK; g.fillRect(0, y - 6, VW0, 68); g.fillStyle = RED; g.fillRect(0, y - 6, VW0, 2); g.fillRect(0, y + 60, VW0, 2);
      text(g, card.k, VW0 / 2 - sl, y + 2, GOLD, 1, 0.5);
      const sc = textW(card.title, 3) <= VW0 - 16 ? 3 : 2;
      text(g, card.title, VW0 / 2 + sl, y + 16, PAPER, sc, 0.5, RED);
      if (card.sub) text(g, card.sub, VW0 / 2 - sl, y + 48, GOLD, 1, 0.5);
      g.globalAlpha = 1;
    }
    if (bossC) {
      const t = bossC.t, a = clamp(Math.min(t / 0.2, (3.3 - t) / 0.4), 0, 1), s1 = (1 - ease(clamp(t / 0.35, 0, 1))) * VW0, s2 = (1 - ease(clamp((t - 0.25) / 0.35, 0, 1))) * VW0;
      const y = Math.round(BH + 12), sc = textW(bossC.name, 3) <= VW0 - 16 ? 3 : 2;
      g.fillStyle = 'rgba(11,9,22,' + 0.5 * a + ')'; g.fillRect(0, 0, VW0, VH0);
      g.fillStyle = INK; g.fillRect(0, y - 4, VW0, sc * 10 + 28); g.fillStyle = RED; g.fillRect(0, y - 4, VW0, 2); g.fillRect(0, y + sc * 10 + 22, VW0, 2);
      text(g, bossC.name, VW0 / 2 + s1, y + 2, PAPER, sc, 0.5, RED);
      text(g, bossC.sub, VW0 / 2 - s2, y + sc * 10 + 8, GOLD, 1, 0.5);
    }
    if (pop) {
      const t = pop.t, sc = clamp(Math.floor((VW0 - 24) / textW(pop.text)), 1, 5), bump = t < 0.15 ? 1 + (1 - t / 0.15) : 1, s = Math.max(1, Math.round(sc * bump));
      if (t < 1.1 || Math.floor(t * 20) % 2) text(g, pop.text, VW0 / 2, Math.round(VH0 * 0.42 - s * 5), pop.col, s, 0.5, INK);
    }
  }

  function render(g, VW0, VH0) {
    if (!off || off.width !== VW0 || off.height !== VH0) { [off] = cv(VW0, VH0); }
    const og = off.getContext('2d'); og.imageSmoothingEnabled = false;
    G.render(w, og, VW0, VH0);
    const cx = Math.round(w.cam.x), oy = VH0 > WH ? VH0 - WH : -Math.round(w.cam.y);
    drawScreen(og, cx, oy);
    for (const o of Object.values(ac)) paint(og, o, cx, oy);
    for (const f of w.fx) { og.fillStyle = f.col; og.fillRect(Math.round(f.x - cx), Math.round(f.y + oy), f.size, f.size); }
    const z = view.z, px = VW0 / 2, py = FLOOR + oy - 4, sx = Math.round((Math.random() - 0.5) * shk * 0.5), sy = Math.round((Math.random() - 0.5) * shk * 0.5);
    g.fillStyle = '#000'; g.fillRect(0, 0, VW0, VH0);
    if (z === 1) g.drawImage(off, sx, sy);
    else g.drawImage(off, px - px / z, py - py / z, VW0 / z, VH0 / z, sx, sy, VW0, VH0);
    const S = (wx, wy) => [px + (wx - cx - px) * z, py + (wy + oy - py) * z];
    if (view.fade > 0) { g.globalAlpha = view.fade; g.fillStyle = '#000'; g.fillRect(0, 0, VW0, VH0); g.globalAlpha = 1; }
    if (fl > 0) { g.globalAlpha = Math.min(0.85, fl * 2.5); g.fillStyle = '#fff'; g.fillRect(0, 0, VW0, VH0); g.globalAlpha = 1; }
    const BH = Math.round(clamp(VH0 * 0.12, 16, 34) * ease(bars.cur));
    drawCards(g, VW0, VH0, BH);
    if (bub && !bossC) {
      const o = ac[bub.id];
      if (o && !o.none) { const [hx, hy] = S(o.x, o.y - o.hh); drawBubble(g, hx, hy, VW0, VH0, BH, VH0 - BH); }
      else drawBubble(g, null, 0, VW0, VH0, BH, VH0 - BH);
    }
    g.fillStyle = '#000'; g.fillRect(0, 0, VW0, BH); g.fillRect(0, VH0 - BH, VW0, BH);
    // skip hint and button
    const r = c.skipRect; r.x = VW0 - 46;
    if (BH >= 14) text(g, c.touch ? 'DOKUN: İLERİ' : 'ENTER: İLERİ   ESC BASILI TUT: ATLA', 8, VH0 - BH + Math.round((BH - 10) / 2), '#8a84a3');
    g.fillStyle = INK; g.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2); g.fillStyle = '#3b3050'; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = RED; g.fillRect(r.x, r.y, Math.round(r.w * clamp(c.holdT / HOLD, 0, 1)), r.h);
    text(g, 'ATLA', r.x + r.w / 2, r.y + 2, PAPER, 1, 0.5);
  }

  c.update = update; c.dbg = () => ({ ac, bub, cx: w.cam.x, VW }); c.render = render; c.advance = advance; c.skip = skip;
  if (!script.length) finish();
  return c;
}
