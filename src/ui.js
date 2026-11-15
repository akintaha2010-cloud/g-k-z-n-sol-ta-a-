// HUD, menus and overlays. Everything is drawn on the game canvas with the pixel font.
import { text, textW, wrap, clamp } from './gfx.js';
import { SPR, draw } from './art.js';
import { sprites } from './heroes.js';

const INK = '#141021', PAPER = '#fff7ed', RED = '#ec3750', GOLD = '#fde68a';
export const NAMES = { akin: 'AKIN', devin: 'DEVİN', mert: 'MERT', tuna: 'TUNA', gokoz: 'GÖKÖZ', ozgur: 'ÖZGÜR', buglord: 'BUG LORD', goblin: 'DEADLINE GOBLIN', doner: 'DÖNER OVERLORD', spam: 'SPAM MAGE', jury: 'JÜRİ' };
export const TINT = { akin: '#7cc6e8', devin: '#d9a877', mert: '#fbbf24', tuna: '#22d3ee', gokoz: '#34d399', ozgur: '#ff477e', buglord: '#a3e635', goblin: '#ef4444', doner: '#fb923c', spam: '#f0abfc', jury: '#fde68a' };

function bar(g, x, y, w, h, v, col, trail, trailCol = '#ffffff') {
  g.fillStyle = INK; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#3b3050'; g.fillRect(x, y, w, h);
  if (trail !== undefined && trail > v) { g.fillStyle = trailCol; g.fillRect(x, y, Math.round(w * clamp(trail, 0, 1)), h); }
  g.fillStyle = col; g.fillRect(x, y, Math.round(w * clamp(v, 0, 1)), h);
  g.fillStyle = '#ffffff50'; g.fillRect(x, y, Math.round(w * clamp(v, 0, 1)), 1);
}

let hpTrail = 1, bossTrail = 1;
export function drawHUD(g, w, VW, VH, t) {
  const p = w.player, hp = p.hp / p.maxHp;
  hpTrail = hpTrail < hp ? hp : Math.max(hp, hpTrail - 0.006);
  // portrait
  g.fillStyle = INK; g.fillRect(5, 5, 28, 28); g.fillStyle = '#7cc6e8'; g.fillRect(7, 7, 24, 24);
  g.drawImage(p.spr.idle[0], 20, 10, 24, 24, 7, 7, 24, 24);
  const bw = Math.min(96, VW * 0.3);
  bar(g, 37, 8, bw, 7, hp, hp < 0.3 && Math.floor(t * 6) % 2 ? '#fca5a5' : '#ef4444', hpTrail, GOLD);
  bar(g, 37, 19, bw * 0.7, 4, p.en, p.en >= 1 ? (Math.floor(t * 8) % 2 ? '#ffffff' : '#22d3ee') : '#22d3ee');
  for (let i = 0; i < p.lives; i++) draw(g, SPR.heart, 0, 42 + i * 11, 31, false);
  // buffs
  let bx = 37 + bw * 0.7 + 6;
  if (p.cay > 0) { draw(g, SPR.cay, 0, bx + 6, 28, false); bx += 14; }
  if (p.don > 0) { draw(g, SPR.doneri, 0, bx + 9, 28, false); }
  // stickers + weapon
  const s = String(w.save.stickers + w.stats.stickers);
  text(g, s, VW - 8, 6, PAPER, 1, 1, INK); draw(g, SPR.sticker, 0, VW - 16 - textW(s), 18, false);
  if (p.weapon) {
    const sp = SPR[p.weapon.k], lbl = 'x' + p.weapon.ammo;
    text(g, lbl, VW - 8, 21, GOLD, 1, 1, INK); draw(g, sp, 0, VW - 18 - textW(lbl) - (p.weapon.k === 'klavye' ? 6 : 0), 34, false);
  }
  if (p.combo >= 3) { const sc = p.comboT > 1.45 ? 3 : 2; text(g, p.combo + ' KOMBO', VW - 8, 52, p.combo >= 10 ? '#f0abfc' : GOLD, sc === 3 ? 2 : 1, 1, INK); }
  // boss bar
  if (w.boss && !w.boss.dead) {
    const b = w.boss, v = b.hp / b.maxHp, ww = Math.min(220, VW - 60), x = Math.round((VW - ww) / 2), y = VH - 16;
    bossTrail = bossTrail < v ? v : Math.max(v, bossTrail - 0.004);
    text(g, b.name, VW / 2, y - 13, PAPER, 1, 0.5, INK);
    bar(g, x, y, ww, 6, v, b.phase === 2 ? '#f97316' : '#a855f7', bossTrail, PAPER);
    g.fillStyle = INK; g.fillRect(x + ww / 2, y, 1, 6);
  } else bossTrail = 1;
}

// generic vertical menu; returns button rects for pointer input
export function drawMenu(g, m, VW, VH, t) {
  const rows = m.items.length, bw = Math.min(VW - 40, m.bw || (m.wide ? 250 : 170)), bh = m.bh || 17, gap = m.gap === undefined ? 5 : m.gap;
  const totalH = rows * (bh + gap) + (m.title ? 26 : 0) + (m.note ? 14 : 0) + (m.items.some((it) => it.desc) ? 12 : 0);
  let y = Math.round(m.y !== undefined ? m.y : (VH - totalH) / 2);
  const x = Math.round((VW - bw) / 2 + (m.dx || 0)), rects = [];
  if (m.dim) { g.globalAlpha = 0.72; g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
  if (m.title) { text(g, m.title, VW / 2, y, m.titleCol || GOLD, 2, 0.5, INK); y += 26; }
  if (m.note) { text(g, m.note, VW / 2, y - 2, PAPER, 1, 0.5, INK); y += 14; }
  m.items.forEach((it, i) => {
    const sel = i === m.sel, by = y + i * (bh + gap);
    g.fillStyle = INK; g.fillRect(x - 2, by - 2, bw + 4, bh + 4 + 2);
    g.fillStyle = it.disabled ? '#57506e' : sel ? RED : PAPER; g.fillRect(x, by + (sel ? 1 : 0), bw, bh);
    if (!it.disabled) { g.fillStyle = sel ? '#ff8c37' : '#ffffff'; g.fillRect(x, by + (sel ? 1 : 0), bw, 2); }
    const col = it.disabled ? '#9a93b3' : sel ? PAPER : it.poor ? '#8a6f7a' : INK;
    text(g, it.label, it.value !== undefined ? x + 8 : VW / 2, by + 4 + (sel ? 1 : 0), col, 1, it.value !== undefined ? 0 : 0.5);
    if (it.value !== undefined) text(g, it.value, x + bw - 8, by + 4 + (sel ? 1 : 0), col, 1, 1);
    if (sel && Math.floor(t * 4) % 2) text(g, '>', x - 12, by + 4, GOLD, 1, 0, INK);
    rects.push({ x: x - 2, y: by - 2, w: bw + 4, h: bh + 6, i });
  });
  const d = m.items[m.sel] && m.items[m.sel].desc;
  if (d) text(g, d, VW / 2, y + rows * (bh + gap) + 2, '#a5f3fc', 1, 0.5, INK);
  return rects;
}

export const titleScale = (VW, VH) => (VH < 250 ? 2 : VH < 275 || VW < 400 ? 3 : 4);
export function drawTitle(g, VW, VH, t) {
  const y = Math.round(VH * 0.14);
  const sc = titleScale(VW, VH);
  g.globalAlpha = 0.55; g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, y + sc * 21 + 22); g.globalAlpha = 1;
  text(g, 'HAVEN', VW / 2, y, '#141021', sc, 0.5); text(g, 'HAVEN', VW / 2 - 1, y - 2, RED, sc, 0.5); text(g, 'HAVEN', VW / 2 - 1, y - 3, '#ff8c37', sc, 0.5);
  g.save(); g.beginPath(); g.rect(0, y + sc * 5, VW, 99); g.clip(); text(g, 'HAVEN', VW / 2 - 1, y - 3, RED, sc, 0.5); g.restore();
  text(g, 'ANKARA', VW / 2, y + sc * 10 + 2, PAPER, sc, 0.5, INK);
  const sub = 'ÇAY, DÖNER VE CODE JAM';
  const sw = textW(sub) + 12;
  g.fillStyle = INK; g.fillRect(Math.round(VW / 2 - sw / 2), y + sc * 21 + 2, sw, 14); text(g, sub, VW / 2, y + sc * 21 + 4, GOLD, 1, 0.5);
  text(g, 'CODE JAM TEMASI: BOUNCE BACK', VW / 2, VH - 13, PAPER, 1, 0.5, INK);
}

// ---- mobile-style lobby; menu items: 0 MACERA 1 HİKÂYE 2 KALE 3 ÇOK OYUNCULU 4 DÜKKÂN 5 KONTROLLER 6 AYARLAR
function lbox(g, x, y, w, h, fill, top, sel) {
  const yy = sel ? y - 1 : y;
  if (sel) { g.fillStyle = GOLD; g.fillRect(x - 3, yy - 3, w + 6, h + 6 + 1); }
  g.fillStyle = INK; g.fillRect(x - 2, yy - 2, w + 4, h + 4 + 1);
  g.fillStyle = fill; g.fillRect(x, yy, w, h);
  g.fillStyle = top; g.fillRect(x, yy, w, 2);
  return yy;
}
function drawCastle(g, x, y, s) {
  const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a * s, y + b * s, w * s, h * s); };
  r(1, 5, 14, 10, '#9a93b3'); r(1, 5, 14, 1, '#d8d3ea');
  r(0, 2, 4, 13, '#b8b2d0'); r(12, 2, 4, 13, '#b8b2d0'); r(0, 1, 1, 2, '#b8b2d0'); r(2, 1, 1, 2, '#b8b2d0'); r(12, 1, 1, 2, '#b8b2d0'); r(14, 1, 1, 2, '#b8b2d0');
  r(5, 3, 6, 12, '#a8a2c4'); r(5, 2, 1, 1, '#a8a2c4'); r(7, 2, 2, 1, '#a8a2c4'); r(10, 2, 1, 1, '#a8a2c4');
  r(6, 9, 4, 6, '#141021'); r(7, 7, 2, 2, '#fde68a'); r(1, 7, 2, 2, '#141021'); r(13, 7, 2, 2, '#141021');
  r(8, -2, 1, 4, '#141021'); r(9, -2, 3, 2, '#ec3750');
}
function drawGear(g, x, y, s, col) {
  const u = Math.max(1, Math.floor(s / 12));
  g.fillStyle = col;
  const R = (a, b, w, h) => g.fillRect(x + a * u, y + b * u, w * u, h * u);
  R(5, 0, 2, 12); R(0, 5, 12, 2); R(1, 1, 2, 2); R(9, 1, 2, 2); R(1, 9, 2, 2); R(9, 9, 2, 2); R(2, 2, 8, 8);
  g.fillStyle = '#4a3a78'; R(4, 4, 4, 4); g.fillStyle = col; R(5, 5, 2, 2);
}
export function drawLobby(g, m, VW, VH, t) {
  const u = Math.min(VW, VH), rects = [], sel = m.sel;
  // stepped sky bands, drifting glyph pattern, Ankara skyline behind the tiles
  ['#1d2f4f', '#243a5e', '#2e4a6b', '#36557a'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, Math.round(VH * i / 4), VW, Math.ceil(VH / 4) + 1); });
  g.globalAlpha = 0.08;
  const gl = ['</>', '{ }', '^.^'], cw = 40, ch = 22, ox = (t * 6) % cw, oy = (t * 3) % ch;
  for (let r = -1; r * ch < VH + ch; r++) for (let c = -1; c * cw < VW + cw; c++) text(g, gl[(r * 3 + c + 99) % 3], c * cw + (r & 1) * 20 - ox, r * ch - oy, '#9fc0ea', 1, 0);
  g.globalAlpha = 1;
  skyline(g, VW, VH, t);
  // logo: chunky outlined HAVEN with a two-tone fill, ANKARA on a ribbon, slow bob
  const sc = VH < 230 ? 3 : VH < 250 ? 4 : 5, bob = Math.round(Math.sin(t * 2) * 1.5), ly = (VH < 250 ? 6 : Math.round(VH * 0.05)) + bob;
  logoText(g, 'HAVEN', VW / 2, ly, sc, '#ffd23f', '#ff7a1a');
  const rw = textW('ANKARA') * 2 + 26, ry = ly + sc * 7 + 4, rx = Math.round(VW / 2 - rw / 2);
  g.fillStyle = INK; g.fillRect(rx - 8, ry + 2, rw + 16, 20);
  g.fillStyle = '#a3122e'; g.fillRect(rx - 6, ry + 4, 8, 16); g.fillRect(rx + rw - 2, ry + 4, 8, 16);
  g.fillStyle = INK; g.fillRect(rx - 6, ry + 10, 3, 4); g.fillRect(rx + rw + 3, ry + 10, 3, 4);
  g.fillStyle = INK; g.fillRect(rx - 2, ry, rw + 4, 20); g.fillStyle = RED; g.fillRect(rx, ry + 2, rw, 16); g.fillStyle = '#ff6b81'; g.fillRect(rx, ry + 2, rw, 2);
  text(g, 'ANKARA', VW / 2, ry + 4, PAPER, 2, 0.5, INK);
  const sp = Math.floor(t * 3) % 6; if (sp < 3) sparkle(g, VW / 2 + textW('HAVEN') * sc / 2 - 2, ly + 2, sp);
  const logoB = ry + 22;
  // the crew flanking the logo
  if (VW >= 400) [['mert', -1], ['tuna', 1]].forEach(([id, d], k) => { const f = sprites(id, ['idle']).idle; const x = VW / 2 + d * (textW('HAVEN') * sc / 2 + 44) - 32; const c = f[(Math.floor(t * 5) + k * 2) % f.length]; if (d < 0) { g.save(); g.translate(Math.round(x) * 2 + 64, 0); g.scale(-1, 1); } draw64(g, c, x, ly - 6, 64); if (d < 0) g.restore(); });
  // tiles
  const gap = Math.max(4, Math.round(u * 0.02)), ts = clamp(Math.round(u * 0.3), 46, 86), rowW = ts * 3 + gap * 2, tx = Math.round((VW - rowW) / 2), ty = VH - 14 - ts;
  const band = 11, spr = Math.floor((ts - band - 6) / 1);
  const defs = [['MACERA', '#f59e0b', '#ffd27a', 'akin'], ['HİKÂYE', '#4ade80', '#bbf7d0', 'ozgur'], ['KALE KAPMACA', '#a855f7', '#d8b4fe', null]];
  defs.forEach(([lab, col, top, id], k) => {
    const x = tx + k * (ts + gap), s = sel === k, y = lbox(g, x, ty, ts, ts, col, top, s);
    g.fillStyle = 'rgba(20,16,33,.25)'; g.fillRect(x, y + ts - band - 6, ts, 6);
    if (id) { const f = sprites(id, ['idle']).idle; draw64(g, f[Math.floor(t * 5) % f.length], x + (ts - spr) / 2, y + 4, spr); }
    else { const cs = Math.max(1, Math.floor((ts - band - 12) / 16)); drawCastle(g, x + Math.round((ts - 16 * cs) / 2), y + 8 + cs * 2, cs); }
    g.fillStyle = INK; g.fillRect(x, y + ts - band, ts, band);
    text(g, lab, x + ts / 2, y + ts - band + 2, s ? GOLD : PAPER, 1, 0.5);
    if (k === 2) { const rw = textW('YENİ!') + 6; g.fillStyle = INK; g.fillRect(x - 1, y + 3, rw + 2, 11); g.fillStyle = RED; g.fillRect(x, y + 4, rw, 9); text(g, 'YENİ!', x + rw / 2, y + 5, PAPER, 1, 0.5); }
    rects.push({ x: x - 2, y: ty - 3, w: ts + 4, h: ts + 6, i: k });
  });
  // wide purple button
  const bh = VH < 250 ? 14 : 18, wy = ty - bh - 8, ww = rowW;
  { const s = sel === 3, y = lbox(g, tx, wy, ww, bh, '#7c3aed', '#c4b5fd', s); text(g, 'ÇOK OYUNCULU', tx + ww / 2, y + Math.round((bh - 7) / 2) + 1, s ? GOLD : PAPER, 1, 0.5, INK); rects.push({ x: tx - 2, y: wy - 3, w: ww + 4, h: bh + 6, i: 3 }); }
  // left stack
  const lw = VW < 300 ? 62 : 84, lbh = VH < 250 ? 13 : 17, lx = 6;
  let ly2 = logoB + 4;
  [[4, 'DÜKKÂN', '#0ea5e9', '#7dd3fc'], [5, 'KONTROLLER', '#475569', '#94a3b8']].forEach(([i, lab, c, tp]) => {
    if (ly2 + lbh > wy - 2) return;
    const s = sel === i, y = lbox(g, lx, ly2, lw, lbh, c, tp, s); text(g, lab, lx + lw / 2, y + Math.round((lbh - 7) / 2) + 1, s ? GOLD : PAPER, 1, 0.5, INK);
    rects.push({ x: lx - 2, y: ly2 - 3, w: lw + 4, h: lbh + 6, i }); ly2 += lbh + 6;
  });
  // sticker counter
  const num = String(m.stickers || 0).padStart(4, '0'), bw = 12 + 6 + num.length * 6 + 8;
  g.fillStyle = INK; g.fillRect(VW - bw - 6, 3, bw + 4, 17); g.fillStyle = '#1e1b3a'; g.fillRect(VW - bw - 4, 5, bw, 13);
  draw(g, SPR.sticker, Math.floor(t * 6) % 4, VW - bw + 2, 15);
  text(g, num, VW - 8, 8, GOLD, 1, 1);
  // gear
  const gs = clamp(Math.round(u * 0.09), 20, 30), gx = VW - gs - 6, gy = VH - gs - 4, gsel = sel === 6, yy = lbox(g, gx, gy, gs, gs, '#6d28d9', '#c4b5fd', gsel);
  drawGear(g, gx + Math.round((gs - Math.floor(gs * 0.6 / 12) * 12) / 2) + 0, yy + Math.round((gs - Math.floor(gs * 0.6 / 12) * 12) / 2), Math.floor(gs * 0.6), gsel ? GOLD : PAPER);
  rects.push({ x: gx - 2, y: gy - 3, w: gs + 4, h: gs + 6, i: 6 });
  text(g, 'CODE JAM TEMASI: BOUNCE BACK', VW / 2, VH - 9, '#a9bdd8', 1, 0.5, INK);
  return rects;
}

function logoText(g, str, cx, y, sc, top, bot) {
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, -2], [-2, 2], [2, 2], [0, 4], [-2, 4], [2, 4]]) text(g, str, cx + dx, y + dy, INK, sc, 0.5);
  text(g, str, cx, y, bot, sc, 0.5);
  g.save(); g.beginPath(); g.rect(0, y, 4000, Math.round(sc * 3.5)); g.clip(); text(g, str, cx, y, top, sc, 0.5); g.restore();
  g.save(); g.beginPath(); g.rect(0, y, 4000, 1); g.clip(); text(g, str, cx, y, '#fff7d6', sc, 0.5); g.restore();
}
function sparkle(g, x, y, f) { g.fillStyle = PAPER; const r = 2 + f; g.fillRect(x - r, y, r * 2 + 1, 1); g.fillRect(x, y - r, 1, r * 2 + 1); g.fillRect(x - 1, y - 1, 3, 3); }
function skyline(g, VW, VH, t) {
  const base = VH - 10;
  g.fillStyle = '#1a2a46';
  for (let x = 0, i = 0; x < VW; i++) { const w = 14 + ((i * 37) % 22), h = 18 + ((i * 53) % 34); g.fillRect(x, base - h, w, h); x += w + 2; }
  const ax = Math.round(VW * 0.82); g.fillRect(ax - 1, base - 92, 3, 92); g.fillRect(ax - 7, base - 78, 15, 9); g.fillRect(ax - 4, base - 84, 9, 6); g.fillRect(ax, base - 104, 1, 12);
  g.fillStyle = Math.floor(t * 2) % 2 ? '#ff4d6d' : '#7a1a2c'; g.fillRect(ax, base - 105, 1, 1);
  g.fillStyle = '#ffd27a'; for (let i = 0; i < 26; i++) { const wx = (i * 71 + 9) % VW, wy = base - 8 - ((i * 29) % 26); if ((i + Math.floor(t / 3)) % 7) g.fillRect(wx, wy, 1, 2); }
  g.fillStyle = '#141021'; g.fillRect(0, base, VW, 10);
}
function draw64(g, c, x, y, s) { const d = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, c.width, c.height, Math.round(x), Math.round(y), s, s); g.imageSmoothingEnabled = d; }
const CREDITS = [['HAVEN ANKARA', 3, GOLD], ['ÇAY, DÖNER VE CODE JAM', 1, PAPER], [], ['TEMA', 1, '#a5f3fc'], ['BOUNCE BACK', 2, PAPER], [], ['EKİP', 1, '#a5f3fc'],
  ['AKIN', 2, PAPER], ['MERT', 2, PAPER], ['TUNA', 2, PAPER], ['GÖKÖZ', 2, PAPER], ['ÖZGÜR', 2, PAPER], ['DEVİN', 2, PAPER], [], ['HACK CLUB', 1, '#a5f3fc'], ['HAVEN ANKARA', 2, GOLD], [], ['OYNADIĞIN İÇİN TEŞEKKÜRLER', 1, PAPER], ['DÜŞERSEN KALK.', 2, RED]];
// returns true once the last line has settled, so the caller can show the exit hint
export function drawCredits(g, t, VW, VH) {
  g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 40; i++) { g.fillStyle = (i + Math.floor(t * 2)) % 5 ? '#3b3050' : PAPER; g.fillRect((i * i * 37 + i * 91 + 13) % VW, (i * i * 29 + i * 53 + 7) % VH, 1, 1); }
  const hs = CREDITS.map((c) => (c.length ? c[1] * 10 + 8 : 12)), total = hs.reduce((a, b) => a + b, 0), last = hs[hs.length - 1];
  const off = Math.min(t * 26, VH / 2 + 10 + total - last);
  let y = VH + 10 - off;
  CREDITS.forEach((c, i) => { if (c.length && y > -30 && y < VH) text(g, c[0], VW / 2, Math.round(y), c[2], c[1], 0.5, INK); y += hs[i]; });
  return t * 26 >= VH / 2 + 10 + total - last;
}
export function drawCount(g, n, frac, VW, VH) {
  const label = n > 0 ? String(n) : 'BAŞLA!';
  const sc = n > 0 ? 6 + Math.round((1 - frac) * 2) : 4;
  text(g, label, VW / 2, VH / 2 - sc * 6, n > 0 ? GOLD : PAPER, sc, 0.5, INK);
}
export function drawResult(g, w, VW, VH, total) {
  g.globalAlpha = 0.78; g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1;
  const y = Math.round(VH * 0.08);
  text(g, 'BUG FIXED!', VW / 2, y, '#a3e635', 3, 0.5, INK);
  text(g, 'BÖLÜM ' + w.lv.id + ' TAMAM', VW / 2, y + 34, PAPER, 1, 0.5, INK);
  const s = w.stats, mm = Math.floor(s.time / 60), ss = String(Math.floor(s.time % 60)).padStart(2, '0');
  const rows = [['STICKER', '+' + s.stickers], ['ROZET', s.badges + '/' + total], ['EN UZUN KOMBO', String(s.maxCombo)], ['SÜRE', mm + ':' + ss]];
  rows.forEach(([a, b], i) => { text(g, a, VW / 2 - 70, y + 52 + i * 13, GOLD, 1, 0, INK); text(g, b, VW / 2 + 70, y + 52 + i * 13, PAPER, 1, 1, INK); });
}
export function drawHelp(g, VW, VH, touch) {
  g.globalAlpha = 0.85; g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1;
  text(g, 'KONTROLLER', VW / 2, 12, GOLD, 2, 0.5, INK);
  const rows = touch
    ? [['< >', 'YÜRÜ'], ['▲', 'ZIPLA (İKİ KEZ)'], ['●', 'YUMRUK: ÜÇLÜ KOMBO'], ['◆', 'TEKME / HAVADA ÇAKIL'], ['▼ + ◆', 'HAVAYA KALDIR'], ['»', 'ATIL'], ['T', 'SİLAHI FIRLAT'], ['★', 'SHIP IT (ENERJİ DOLUNCA)']]
    : [['A D / OKLAR', 'YÜRÜ'], ['BOŞLUK / W', 'ZIPLA (İKİ KEZ)'], ['J', 'YUMRUK: ÜÇLÜ KOMBO'], ['K', 'TEKME / HAVADA ÇAKIL'], ['S + K', 'HAVAYA KALDIR'], ['SHIFT', 'ATIL'], ['L', 'SİLAHI FIRLAT'], ['Q', 'SHIP IT (ENERJİ DOLUNCA)'], ['S + BOŞLUK', 'PLATFORMDAN İN'], ['ESC', 'DURAKLAT']];
  const step = VH < 240 ? 11 : 12, y0 = 36;
  rows.forEach(([a, b], i) => { text(g, a, VW / 2 - 12, y0 + i * step, PAPER, 1, 1, INK); text(g, b, VW / 2 + 4, y0 + i * step, '#a5f3fc', 1, 0, INK); });
  // the bounce-back tip sits in its own box so it is not lost in the list
  const lines = wrap(touch ? 'DARBE YİYİNCE YERE DÜŞERKEN ▲ BAS: GERİ SEK!' : 'DARBE YİYİNCE YERE DÜŞERKEN ZIPLA: GERİ SEK!', Math.min(260, VW - 40));
  const bw = Math.max(...lines.map((l) => textW(l))) + 16, bh = 20 + lines.length * 11, bx = Math.round((VW - bw) / 2), by = Math.min(y0 + rows.length * step + 8, VH - bh - 4);
  g.fillStyle = INK; g.fillRect(bx - 1, by - 1, bw + 2, bh + 2); g.fillStyle = '#7cf0ff'; g.fillRect(bx, by, bw, 2); g.fillStyle = '#1e1b3a'; g.fillRect(bx, by + 2, bw, bh - 2);
  text(g, 'GERİ SEK', VW / 2, by + 6, '#7cf0ff', 1, 0.5);
  lines.forEach((l, k) => text(g, l, VW / 2, by + 19 + k * 11, PAPER, 1, 0.5));
}
