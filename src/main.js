// Entry point: screen scaling, input (keyboard + touch), save data and the game-state machine.
import { clamp, text } from './gfx.js';
import { buildArt } from './art.js';
import { CHAPTERS } from './levels.js';
import * as G from './game.js';
import { createWorld, step, render, continueFromCheckpoint, DT } from './game.js';
import { createCut } from './cutscene.js';
import { CH_TITLES, CUTS } from './story.js';
import { drawHUD, drawMenu, drawTitle, drawLobby, titleScale, drawCredits, drawCount, drawResult, drawHelp } from './ui.js';
import { audio, unlock, sfx, music } from './audio.js';
import * as NET from './net.js';
import { CHARS, PAL, cleanSpec, makeCustom, sprites } from './heroes.js';
import { createArena, stepArena, renderArena, readInputs, ROSTER } from './arena.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
let VW = 480, VH = 270, K = 2;

// ---------------------------------------------------------------- save
const SAVE_KEY = 'haven-ankara-save-v1';
const fresh = () => ({ unlocked: 1, stickers: 0, upg: { power: 0, hp: 0, energy: 0 }, badges: {}, sfx: true, music: true });
let save = fresh();
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.upg) save = Object.assign(fresh(), s); } catch (e) { /* storage unavailable */ }
let mySpec = cleanSpec(null), lastKey = '';
try { mySpec = cleanSpec(JSON.parse(localStorage.getItem('haven-char'))); } catch (e) { /* storage unavailable */ }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
audio.sfx = save.sfx; audio.music = save.music;

// ---------------------------------------------------------------- scaling
function resize() {
  const dpr = window.devicePixelRatio || 1, pw = window.innerWidth * dpr, ph = window.innerHeight * dpr;
  K = Math.max(1, Math.round(ph / 270));
  if (ph / K < 216) K = Math.max(1, K - 1);
  if (pw / K < 300) K = Math.max(1, Math.floor(pw / 300));
  VW = clamp(Math.ceil(pw / K), 240, 640); VH = clamp(Math.ceil(ph / K), 180, 288);
  canvas.width = VW; canvas.height = VH;
  canvas.style.width = (VW * K) / dpr + 'px'; canvas.style.height = (VH * K) / dpr + 'px';
  g.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

// ---------------------------------------------------------------- input
const keys = Object.create(null);
const inp = { l: false, r: false, u: false, d: false, jumpHeld: false, jump: 0, atk: 0, kick: 0, use: 0, dash: 0, spec: 0 };
const touch = { on: false, l: false, r: false, u: false, d: false, jump: false };
const HELD = { l: ['ArrowLeft', 'KeyA'], r: ['ArrowRight', 'KeyD'], u: ['ArrowUp', 'KeyW'], d: ['ArrowDown', 'KeyS'], jumpHeld: ['Space', 'ArrowUp', 'KeyW'] };
const PRESS = { Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyJ: 'atk', KeyZ: 'atk', KeyK: 'kick', KeyX: 'kick', KeyL: 'use', KeyC: 'use', ShiftLeft: 'dash', ShiftRight: 'dash', KeyI: 'dash', KeyQ: 'spec', KeyU: 'spec', KeyV: 'spec' };
const BUFFER = 0.14;
function press(a) { inp[a] = BUFFER; }
function readHeld() {
  for (const k in HELD) inp[k] = HELD[k].some((c) => keys[c]);
  if (touch.on) { inp.l = inp.l || touch.l; inp.r = inp.r || touch.r; inp.u = inp.u || touch.u; inp.d = inp.d || touch.d; inp.jumpHeld = inp.jumpHeld || touch.jump; }
}
function clearInput() { for (const k of ['jump', 'atk', 'kick', 'use', 'dash', 'spec']) inp[k] = 0; }
window.addEventListener('keydown', (e) => {
  unlock();
  if (e.repeat) { if (PRESS[e.code] || e.code.startsWith('Arrow')) e.preventDefault(); return; }
  keys[e.code] = true; lastKey = e.key;
  if (PRESS[e.code] || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (S.name === 'play' && PRESS[e.code]) press(PRESS[e.code]);
  uiKey(e.code);
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; touch.l = touch.r = touch.u = touch.d = touch.jump = false; if (S.name === 'play' || S.name === 'count') openPause(); else if (S.name === 'arena') openArenaPause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && (S.name === 'play' || S.name === 'count')) openPause(); else if (document.hidden && S.name === 'arena') openArenaPause(); });

// touch buttons (DOM so that several fingers work at once and they can sit outside the letterbox)
const pad = document.getElementById('pad');
function bindTouch(el, down, up) {
  const d = (e) => { e.preventDefault(); unlock(); el.classList.add('on'); down(); };
  const u = (e) => { e.preventDefault(); el.classList.remove('on'); if (up) up(); };
  el.addEventListener('pointerdown', d); el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); el.addEventListener('pointerleave', u);
}
for (const el of pad.querySelectorAll('[data-h]')) bindTouch(el, () => { touch[el.dataset.h] = true; if (el.dataset.h === 'jump' && S.name === 'play') press('jump'); }, () => { touch[el.dataset.h] = false; });
for (const el of pad.querySelectorAll('[data-p]')) bindTouch(el, () => { if (S.name === 'play') press(el.dataset.p); else if (S.name === 'arena') press(el.dataset.p); else uiKey('Enter'); });
bindTouch(document.getElementById('pauseBtn'), () => { if (S.name === 'arena') openArenaPause(); else if (S.name === 'play') openPause(); else if (S.name === 'pause') S.menu.items[0].fn(); });
window.addEventListener('touchstart', () => { if (!touch.on) { touch.on = true; document.body.classList.add('touch'); } }, { passive: true });

canvas.addEventListener('pointerdown', (e) => {
  unlock();
  const r = canvas.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * VW, y = ((e.clientY - r.top) / r.height) * VH;
  if (S.name === 'cut') { const b = cut.skipRect; if (x >= b.x - 4 && x <= b.x + b.w + 4 && y <= b.y + b.h + 6) cut.skip(); else if (S.armed <= 0) cut.advance(); return; }
  if (S.name === 'credits') { if (S.armed <= 0) endCredits(); return; }
  if (S.menu && S.rects) { for (const b of S.rects) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { if (S.menu.sel === b.i || e.pointerType !== 'mouse') { S.menu.sel = b.i; activate(); } else S.menu.sel = b.i; return; } }
  else if (S.name === 'help') uiKey('Enter');
});
canvas.addEventListener('pointermove', (e) => {
  if (!S.menu || !S.rects || e.pointerType !== 'mouse') return;
  const r = canvas.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * VW, y = ((e.clientY - r.top) / r.height) * VH;
  for (const b of S.rects) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h && !S.menu.items[b.i].disabled) S.menu.sel = b.i;
});

// ---------------------------------------------------------------- states
const S = { name: 'title', menu: null, rects: null, t: 0, armed: 0 };
let arena = null, arenaOpts = null, world = null, demo = null, cut = null, cutDone = null, creditsT = 0, creditsDone = null, count = 0, chapter = 0;
let acc = 0, last = performance.now();

function setMenu(name, menu) { S.name = name; S.menu = menu; S.rects = null; S.armed = 0.25; if (menu) { menu.sel = menu.items.findIndex((i) => !i.disabled); } document.body.dataset.state = name; }
function activate() {
  if (S.armed > 0 || !S.menu) return;
  const it = S.menu.items[S.menu.sel];
  if (!it || it.disabled) return;
  sfx('ui'); it.fn();
}
function uiKey(code) {
  if (S.name === 'ajoin' && (/^(Key[A-Z]|Digit\d)$/.test(code) || code === 'Backspace')) { joinCode = NET.cleanCode(code === 'Backspace' ? joinCode.slice(0, -1) : joinCode + code.slice(-1)); return openJoin(); }
  if (S.name === 'achar' && S.menu.sel === 0 && (lastKey.length === 1 || code === 'Backspace')) {
    const n = code === 'Backspace' ? mySpec.n.slice(0, -1) : mySpec.n + lastKey; mySpec.n = [...n.toLocaleUpperCase('tr')].filter((c) => /[A-ZÇĞİÖŞÜ0-9 ]/.test(c)).join('').slice(0, 12); return openCreator(0);
  }
  if (S.name === 'arena') { if (code === 'Escape' || code === 'KeyP') { if (on) openTitle(); else openArenaPause(); } return; }
  if (S.name === 'play') { if (code === 'Escape' || code === 'KeyP') openPause(); return; }
  if (S.name === 'cut') { if (S.armed <= 0 && ['Enter', 'Space', 'KeyJ', 'KeyZ'].includes(code)) cut.advance(); return; }
  if (S.name === 'credits') { if (S.armed <= 0 && ['Enter', 'Space', 'Escape'].includes(code)) endCredits(); return; }
  if (S.name === 'help') { if (S.armed <= 0) S.back(); return; }
  if (!S.menu) return;
  const m = S.menu, n = m.items.length;
  if (m.lobby && S.rects) {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] }[code];
    if (dir) {
      const cur = S.rects.find((r) => r.i === m.sel), cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2; let best = null, bd = 1e9;
      for (const r of S.rects) { if (r === cur) continue; const dx = r.x + r.w / 2 - cx, dy = r.y + r.h / 2 - cy, along = dx * dir[0] + dy * dir[1]; if (along <= 0) continue; const d = along + Math.abs(dir[0] ? dy : dx) * 2; if (d < bd) { bd = d; best = r; } }
      if (best) { m.sel = best.i; sfx('ui'); }
      return;
    }
  }
  const it = m.items[m.sel], dx = { ArrowLeft: -1, ArrowRight: 1, KeyA: -1, KeyD: 1 }[code];
  if (dx && it && it.step) { it.step(dx); return; }
  const move = (d) => { let i = m.sel; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!m.items[i].disabled) break; } if (i !== m.sel) { m.sel = i; sfx('ui'); } };
  if (code === 'ArrowDown' || code === 'KeyS') move(1);
  else if (code === 'ArrowUp' || code === 'KeyW') move(-1);
  else if (code === 'Enter' || code === 'Space' || code === 'KeyJ') activate();
  else if (code === 'Escape' && m.back) { sfx('ui'); m.back(); }
}

function openTitle() {
  leaveOnline(); world = null; arena = null; music('menu');
  if (!demo) { demo = createWorld(CHAPTERS[1], save, 1); demo.enemies.length = 0; demo.hint = null; }
  setMenu('title', { y: null, lobby: true, items: [
    { label: 'MACERA', fn: openChapters },
    { label: 'HİKÂYE', fn: openStory },
    { label: 'KALE KAPMACA', fn: () => openPicker('kale') },
    { label: 'ÇOK OYUNCULU', fn: openMulti },
    { label: 'DÜKKÂN', fn: () => openShop(openTitle) },
    { label: 'KONTROLLER', fn: () => openHelp(openTitle) },
    { label: 'AYARLAR', fn: () => openSettings(openTitle) },
  ] });
}
function openStory() {
  const items = CHAPTERS.map((mk, i) => ({ label: (i + 1) + '. ' + (CH_TITLES[i] || 'BÖLÜM ' + (i + 1)), value: 'İZLE', fn: () => openStoryChapter(i) }));
  items.push({ label: 'GERİ', fn: openTitle });
  setMenu('story', { title: 'HİKÂYE', note: 'AÇTIĞIN BÖLÜMLERİN SAHNELERİNİ TEKRAR İZLE', wide: true, dim: true, items, back: openTitle });
}
function openStoryChapter(i) {
  const items = (CUTS[i] || []).map(([id, label]) => ({ label, value: 'İZLE', fn: () => replay(i, id) }));
  items.push({ label: 'GERİ', fn: openStory });
  setMenu('story', { title: (i + 1) + '. ' + (CH_TITLES[i] || ''), dim: true, wide: true, items, back: openStory });
}
function replay(i, id) {
  const back = () => { world = null; music('menu'); openStoryChapter(i); };
  chapter = i; world = createWorld(CHAPTERS[i], save, i); music(world.lv.music);
  runCut(id, () => (id === 'ending' ? startCredits(back) : back()));
}
function openChapters() {
  const items = CHAPTERS.map((mk, i) => {
    return { label: (i + 1) + '. ' + (CH_TITLES[i] || 'BÖLÜM ' + (i + 1)), value: 'ROZET ' + (save.badges[i + 1] || 0) + '/2', fn: () => startChapter(i) };
  });
  items.push({ label: 'GERİ', fn: openTitle });
  setMenu('chapters', { title: 'BÖLÜM SEÇ', wide: true, dim: true, items, back: openTitle });
}
const UPG = [['power', 'GÜÇ', 'VURUŞ HASARI +%15'], ['hp', 'CAN', 'AZAMİ CAN +20'], ['energy', 'ENERJİ', 'SHIP IT DAHA HIZLI DOLAR']];
const PRICE = [30, 70, 130];
function openShop(back, keep) {
  const items = UPG.map(([k, name, desc]) => {
    const lv = save.upg[k], max = lv >= 3;
    return { label: name + ' ' + '★'.repeat(lv), desc, value: max ? 'MAKS' : PRICE[lv] + ' STICKER', disabled: max, poor: !max && save.stickers < PRICE[lv], fn: () => { if (!max && save.stickers < PRICE[lv]) return sfx('lose'); save.stickers -= PRICE[lv]; save.upg[k]++; persist(); sfx('power'); openShop(back, k); } };
  });
  items.push({ label: 'GERİ', fn: back });
  setMenu('shop', { title: 'DÜKKÂN', note: 'STICKER: ' + save.stickers, wide: true, dim: true, items, back });
  if (keep) { const i = UPG.findIndex((u) => u[0] === keep); if (!items[i].disabled) S.menu.sel = i; }
  if (S.menu.sel < 0) S.menu.sel = items.length - 1;
}
function openSettings(back) {
  let wipe = false;
  const build = (sel) => {
    setMenu('settings', { title: 'AYARLAR', dim: true, wide: true, back, items: [
      { label: 'SES EFEKTLERİ', value: save.sfx ? 'AÇIK' : 'KAPALI', fn: () => { save.sfx = audio.sfx = !save.sfx; persist(); build(0); } },
      { label: 'MÜZİK', value: save.music ? 'AÇIK' : 'KAPALI', fn: () => { save.music = audio.music = !save.music; persist(); build(1); } },
      { label: 'TAM EKRAN', value: document.fullscreenElement ? 'AÇIK' : 'KAPALI', disabled: !document.documentElement.requestFullscreen, fn: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); setTimeout(() => build(2), 300); } },
      { label: wipe ? 'EMİN MİSİN? TEKRAR BAS' : 'KAYDI SIFIRLA', fn: () => { if (!wipe) { wipe = true; build(3); } else { save = fresh(); persist(); audio.sfx = audio.music = true; wipe = false; build(3); } } },
      { label: 'GERİ', fn: back },
    ] });
    S.menu.sel = sel; S.armed = 0.12;
  };
  build(0);
}
function openHelp(back) { S.name = 'help'; S.menu = null; S.back = back; S.armed = 0.3; document.body.dataset.state = 'help'; }
// ---- arena modes (KALE KAPMACA / ÇOK OYUNCULU)
function openPicker(mode, sel = 0) {
  const o = arenaOpts = Object.assign({ rule: 'lms', char: 'akin', bots: true }, arenaOpts, { mode }), kale = mode === 'kale';
  if (o.char.startsWith('c_')) o.char = makeCustom(mySpec);
  const again = (i) => () => { openPicker(mode, i); };
  const items = [
    { label: 'KURAL', value: o.rule === 'lms' ? 'SON KALAN KAZANIR' : 'TAÇ KAPIŞI', fn: () => { o.rule = o.rule === 'lms' ? 'crown' : 'lms'; again(0)(); } },
    { label: 'KARAKTER', value: CHARS[o.char].name, fn: () => { const i = ROSTER.indexOf(o.char) + 1; o.char = i === ROSTER.length ? makeCustom(mySpec) : ROSTER[i % ROSTER.length]; again(1)(); } },
  ];
  if (!kale) items.push({ label: 'BOTLAR', value: o.bots ? 'AÇIK' : 'KAPALI', fn: () => { o.bots = !o.bots; again(2)(); } });
  items.push({ label: 'BAŞLA', fn: () => startArena() }, { label: 'GERİ', fn: kale ? openTitle : openMulti });
  setMenu('apick', { title: kale ? 'KALE KAPMACA' : 'ÇOK OYUNCULU', note: kale ? '1 OYUNCU + 3 BOT' : 'P1: A D W F   P2: OKLAR + K   + GAMEPAD', dim: true, wide: true, back: kale ? openTitle : openMulti, items });
  S.menu.sel = sel; S.armed = 0.12;
}
function startArena() {
  const pads = [...((navigator.getGamepads && navigator.getGamepads()) || [])].filter(Boolean).map((p) => p.index);
  arena = createArena(Object.assign({}, arenaOpts, { pads }));
  S.name = 'arena'; S.menu = null; document.body.dataset.state = 'play'; music('stage'); clearInput(); last = performance.now();
}
function openArenaPause() {
  if (S.name !== 'arena' || on) return;
  setMenu('apause', { title: 'DURAKLATILDI', dim: true, back: () => resumeArena(), items: [{ label: 'DEVAM', fn: resumeArena }, { label: 'ANA MENÜ', fn: openTitle }] });
}
function resumeArena() { S.name = 'arena'; S.menu = null; document.body.dataset.state = 'play'; clearInput(); last = performance.now(); }
// ---- online (host authoritative; guests send inputs and render snapshots)
let on = null, joinCode = '', tok = 0;
const rd = (v) => Math.round(v * 100) / 100;
const lobbyOf = (i) => ({ k: 'lobby', ps: on.ps.map((p) => p.sp || p.char), rule: on.rule, you: i });
function openMulti() {
  setMenu('amulti', { title: 'ÇOK OYUNCULU', note: 'P1 TUŞLARI: A D W F / OKLAR', dim: true, wide: true, back: openTitle, items: [
    { label: 'ODA KUR', fn: hostRoom }, { label: 'ODAYA KATIL', fn: () => { joinCode = ''; openJoin(); } },
    { label: 'KARAKTERİM', fn: () => openCreator(0) }, { label: 'AYNI KLAVYE', fn: () => openPicker('multi') }, { label: 'GERİ', fn: openTitle }] });
}
function openCreator(sel = 0) {
  const row = (label, k) => ({ label, value: PAL[k][mySpec[k]][0], step: (d) => { mySpec[k] = (mySpec[k] + d + PAL[k].length) % PAL[k].length; sfx('ui'); openCreator(PAL_ROWS.indexOf(k) + 1); }, fn: () => { mySpec[k] = (mySpec[k] + 1) % PAL[k].length; openCreator(PAL_ROWS.indexOf(k) + 1); } });
  const done = () => { mySpec = cleanSpec(mySpec); try { localStorage.setItem('haven-char', JSON.stringify(mySpec)); } catch (e) { /* ignore */ } openMulti(); };
  const cn = S.name === 'achar' ? S.armed : 0.12;
  setMenu('achar', { title: 'KARAKTERİNİ YAP', dim: true, back: done, bw: 142, bh: 14, gap: 3, y: 6,
    get dx() { return Math.round(-(80 + 8) / 2); },
    extra: (g, rs) => drawPreview(g, rs),
    items: [{ label: 'İSİM', value: mySpec.n + (mySpec.n.length < 12 ? '_' : ''), fn: () => { if (touch.on) { const v = prompt('İSİM', mySpec.n); if (v) mySpec.n = cleanSpec({ n: v }).n; openCreator(0); } else { S.menu.sel = 1; } } },
      row('SAÇ', 'h'), row('TEN', 's'), row('TİŞÖRT', 't'), row('PANTOLON', 'p'), row('AYAKKABI', 'o'), row('AKSESUAR', 'a'), { label: 'TAMAM', fn: done }] });
  S.menu.sel = sel; S.armed = cn > 0 ? 0.05 : 0;
}
const PAL_ROWS = ['h', 's', 't', 'p', 'o', 'a'];
function drawPreview(g, rs) {
  const x = rs[0].x + rs[0].w + 6, y = rs[0].y, t = performance.now() / 1000, set = sprites(makeCustom(mySpec), ['idle', 'run']);
  const run = Math.floor(t / 2) % 2, fr = run ? set.run[Math.floor(t * 10) % 6] : set.idle[Math.floor(t * 5) % 4];
  g.fillStyle = '#141021'; g.fillRect(x - 2, y - 2, 84, 112); g.fillStyle = '#3b2d63'; g.fillRect(x, y, 80, 108); g.fillStyle = '#8a84a8'; g.fillRect(x, y + 100, 80, 8);
  g.imageSmoothingEnabled = false; g.drawImage(fr, 12, 8, 40, 52, x, y + 4, 80, 104);
  text(g, run ? 'KOŞU' : 'BEKLE', x + 40, y + 111, '#fde68a', 1, 0.5, '#141021');
}
addEventListener('pagehide', () => leaveOnline());
function leaveOnline() { if (on) { try { on.net && on.net.close(); } catch (e) { /* ignore */ } } on = null; tok++; }
function failOnline(t) { leaveOnline(); arena = null; setMenu('aerr', { title: 'HATA', titleCol: '#f87171', note: t, dim: true, back: openMulti, items: [{ label: 'TAMAM', fn: openMulti }] }); }
function wait(t) { setMenu('amsg', { title: t, dim: true, back: openMulti, items: [{ label: 'GERİ', fn: () => { leaveOnline(); openMulti(); } }] }); }
async function hostRoom() {
  leaveOnline(); const my = ++tok; wait('BAĞLANIYOR...');
  const o = { role: 'host', ps: [{ id: null, char: (arenaOpts || {}).char || 'akin', sp: ((arenaOpts || {}).char || '').startsWith('c_') ? mySpec : null, hi: mySpec, human: true }], rule: (arenaOpts || {}).rule || 'lms', slot: 0, started: false, inp: {}, acc: 0 };
  try {
    const net = await NET.host({
      join: (id) => {
        if (o.started || o.ps.length >= 4) { net.send(id, { k: 'full', t: o.started ? 'OYUN BAŞLAMIŞ' : 'ODA DOLU' }); return setTimeout(() => net.drop(id), 300); }
        o.ps.push({ id, char: ROSTER[o.ps.length % ROSTER.length], sp: null, human: true }); o.inp[id] = { l: 0, r: 0, j: 0, a: 0, sj: 0, sa: 0 }; sync();
      },
      msg: (id, m) => {
        const p = o.ps.find((x) => x.id === id), q = o.inp[id]; if (!p) return;
        if (m.k === 'hi') { p.hi = cleanSpec(m.sp); if (p.sp) { p.sp = p.hi; p.char = makeCustom(p.sp); } sync(); }
        else if (m.k === 'char' && (m.c === 'me' ? p.hi : ROSTER.includes(m.c))) { p.sp = m.c === 'me' ? p.hi : null; p.char = m.c === 'me' ? makeCustom(p.hi) : m.c; sync(); }
        else if (m.k === 'in') { q.l = m.l; q.r = m.r; q.j = m.j; q.a = m.a; if (m.j) q.sj = 1; if (m.a) q.sa = 1; }
      },
      leave: (id) => {
        const i = o.ps.findIndex((x) => x.id === id); if (i < 0) return;
        if (o.started) { o.ps[i].human = false; o.ps[i].id = null; if (arena && arena.F[i]) arena.F[i].src = null; } else { o.ps.splice(i, 1); sync(); }
      },
      error: (t) => { if (on === o) failOnline(t); },
    });
    if (my !== tok) return net.close();
    o.net = net; o.code = net.code; on = o; sync(true);
  } catch (t) { if (my === tok) failOnline(String(t)); }
  function sync(first) { if (!o.net) return; o.ps.forEach((p, i) => p.id && o.net.send(p.id, lobbyOf(i))); if (first || S.name === 'aroom') openRoom(); }
}
function openJoin() {
  const ok = joinCode.length === 6;
  setMenu('ajoin', { title: 'ODAYA KATIL', note: 'KODU YAZ: ' + (joinCode + '------').slice(0, 6), dim: true, wide: true, back: openMulti, items: [
    { label: 'KODU GİR', fn: () => { joinCode = NET.cleanCode(prompt('ODA KODU') || ''); openJoin(); } },
    { label: 'KATIL', disabled: !ok, fn: startJoin }, { label: 'GERİ', fn: openMulti }] });
  S.menu.sel = ok ? 1 : 0; S.armed = 0.05;
}
async function startJoin() {
  const code = joinCode, my = ++tok; wait('BAĞLANIYOR...');
  const o = { role: 'guest', ps: [], rule: 'lms', slot: -1 };
  try {
    const net = await NET.join(code, { msg: (m) => guestMsg(o, m), closed: (t) => { if (on === o) failOnline(t); } });
    if (my !== tok) return net.close();
    o.net = net; on = o; net.send({ k: 'hi', sp: mySpec }); openRoom();
  } catch (t) { if (my === tok) failOnline(String(t)); }
}
function guestMsg(o, m) {
  if (on !== o) return;
  if (m.k === 'lobby') { o.ps = m.ps.map(makeCustom); o.rule = m.rule; o.slot = m.you; if (S.name === 'aroom') openRoom(); }
  else if (m.k === 'full') failOnline(m.t);
  else if (m.k === 'start') { o.rule = m.rule; arena = createArena({ mode: 'online', rule: m.rule, slots: m.slots.map((s) => ({ ...s, char: makeCustom(s.char) })) }); S.name = 'arena'; S.menu = null; document.body.dataset.state = 'play'; music('stage'); clearInput(); last = performance.now(); }
  else if (m.k === 's' && arena && arena.mode === 'online' && S.name === 'arena') applySnap(arena, m);
  else if (m.k === 'over' && arena && S.name === 'arena') showArenaResult();
}
function openRoom() {
  const o = on, host = o.role === 'host', me = o.ps[o.slot], keep = S.name === 'aroom' ? S.menu.sel : 0, armed = S.armed;
  const humans = host ? o.ps.filter((p) => p.human).length : o.ps.length;
  setMenu('aroom', { y: 4, title: o.code || 'ODA', note: 'OYUNCULAR: ' + o.ps.length + '/4', dim: true, wide: true, back: () => { leaveOnline(); openMulti(); },
    extra: (g, rs) => o.ps.forEach((p, i) => text(g, 'P' + (i + 1) + ' ' + CHARS_NAME(host ? p.char : p) + (i === o.slot ? ' (SEN)' : ''), VW / 2, rs[rs.length - 1].y + 26 + i * 9, ['#ec3750', '#38bdf8', '#a3e635', '#fbbf24'][i], 1, 0.5, '#141021')),
    items: [
      { label: 'KARAKTER', value: me && CHARS[host ? me.char : me].name, fn: () => { const cur = host ? me.char : me, i = ROSTER.indexOf(cur) + 1, c = i === ROSTER.length ? 'me' : ROSTER[i % ROSTER.length]; if (host) { me.sp = c === 'me' ? mySpec : null; me.char = c === 'me' ? makeCustom(mySpec) : c; o.ps.forEach((p, i) => p.id && o.net.send(p.id, lobbyOf(i))); openRoom(); } else o.net.send({ k: 'char', c }); } },
      { label: 'KURAL', value: o.rule === 'lms' ? 'SON KALAN' : 'TAÇ KAPIŞI', disabled: !host, fn: () => { o.rule = o.rule === 'lms' ? 'crown' : 'lms'; o.ps.forEach((p, i) => p.id && o.net.send(p.id, lobbyOf(i))); openRoom(); } },
      ...(host ? [{ label: 'BAŞLA', disabled: humans < 2, fn: startOnline }] : []),
      { label: 'GERİ', fn: () => { leaveOnline(); openMulti(); } }] });
  S.menu.sel = Math.min(keep, S.menu.items.length - 1); if (S.menu.items[S.menu.sel].disabled) S.menu.sel = S.menu.items.length - 1; S.armed = Math.max(0.05, armed > 0.1 ? 0.05 : armed);
}
const CHARS_NAME = (id) => CHARS[id].name;
function startOnline() {
  const o = on; o.started = true; o.inp = o.inp || {};
  const slots = o.ps.map((p, i) => ({ char: p.char, human: p.human, pid: p.id, me: i === 0 }));
  arena = createArena({ mode: 'online', rule: o.rule, slots });
  o.ps.forEach((p) => p.id && o.net.send(p.id, { k: 'start', rule: o.rule, slots: slots.map((s, i) => ({ char: o.ps[i].sp || s.char, human: s.human })) }));
  S.name = 'arena'; S.menu = null; document.body.dataset.state = 'play'; music('stage'); clearInput(); last = performance.now();
}
function snapOf(a) {
  const fx = []; for (const p of a.fx) if (!p.s) { p.s = 1; fx.push([rd(p.x), rd(p.y), Math.round(p.vx), Math.round(p.vy), rd(p.t), p.col]); }
  const c = a.crown;
  return { k: 's', t: rd(a.t), c: rd(a.count), o: a.over ? (a.over.winner ? a.over.winner.i : -1) : null, ot: rd(a.overT), cr: c ? [rd(c.x), rd(c.y), c.owner ? c.owner.i : -1] : null, fx,
    F: a.F.map((f) => [f.x, f.y, f.vx, f.vy, f.face, +f.g, f.at, f.stun, f.swing, f.flash, f.inv, f.respT, +f.alive, +f.l, +f.r, f.dmg, f.lives, f.crownT, f.atkT].map(rd)) };
}
function applySnap(a, m) {
  a.t = m.t; a.count = m.c; a.overT = m.ot; a.over = m.o == null ? null : { winner: m.o < 0 ? null : a.F[m.o] };
  m.F.forEach((v, i) => { const f = a.F[i]; [f.x, f.y, f.vx, f.vy, f.face, f.g, f.at, f.stun, f.swing, f.flash, f.inv, f.respT, f.alive, f.l, f.r, f.dmg, f.lives, f.crownT, f.atkT] = v; f.g = !!f.g; f.alive = !!f.alive; f.l = !!f.l; f.r = !!f.r; });
  if (a.crown && m.cr) { a.crown.x = m.cr[0]; a.crown.y = m.cr[1]; a.crown.owner = m.cr[2] < 0 ? null : a.F[m.cr[2]]; }
  for (const [x, y, vx, vy, t, col] of m.fx) a.fx.push({ x, y, vx, vy, t, col });
  if (m.fx.length) sfx('hit');
}
function showArenaResult() {
  if (on && on.role === 'host') on.net.all({ k: 'over' });
  const w = arena.over.winner; sfx(w && w.src ? 'win' : 'lose');
  const items = on ? (on.role === 'host' ? [{ label: 'TEKRAR', fn: startOnline }, { label: 'ANA MENÜ', fn: openTitle }] : [{ label: 'ANA MENÜ', fn: openTitle }]) : [{ label: 'TEKRAR', fn: startArena }, { label: 'ANA MENÜ', fn: openTitle }];
  setMenu('ares', { title: w ? w.name + ' KAZANDI!' : 'BERABERE', titleCol: w ? w.col : '#fff7ed', note: w && w.src ? 'P' + (w.i + 1) + ' ŞAMPİYON' : arena.mode === 'kale' && !arena.F[0].alive ? 'KALEYİ KAYBETTİN' : '', dim: true, items });
  S.armed = 0.6;
}

function openPause() {
  if (S.name !== 'play' && S.name !== 'count') return;
  const resume = () => { S.name = 'play'; S.menu = null; document.body.dataset.state = 'play'; clearInput(); last = performance.now(); if (count > 0) S.name = 'count'; };
  const again = () => setMenu('pause', { title: 'DURAKLATILDI', dim: true, back: resume, items: [
    { label: 'DEVAM', fn: resume },
    { label: 'KONTROLLER', fn: () => openHelp(again) },
    { label: 'AYARLAR', fn: () => openSettings(again) },
    { label: 'BÖLÜMÜ YENİDEN BAŞLAT', fn: () => startChapter(chapter) },
    { label: 'ANA MENÜ', fn: openTitle },
  ] });
  again();
}
function startChapter(i) {
  if (S.name === 'count' || S.name === 'cut') return; // never start twice
  chapter = i; world = createWorld(CHAPTERS[i], save, i);
  music(world.lv.music); clearInput(); acc = 0;
  runCut(world.lv.intro, startCount);
}
function startCount() { count = 2.4; S.name = 'count'; S.menu = null; document.body.dataset.state = 'play'; clearInput(); }
function runCut(id, done) {
  cut = createCut(world, id, VW, VH); cutDone = done;
  S.name = 'cut'; S.menu = null; S.armed = 0.35; document.body.dataset.state = 'cut'; clearInput();
  if (cut.done) endCut();
}
function endCut() { cut = null; clearInput(); const d = cutDone; cutDone = null; d(); }
function startCredits(done) {
  creditsT = 0; creditsDone = done; S.name = 'credits'; S.menu = null; S.armed = 1; document.body.dataset.state = 'credits'; music('menu');
}
function endCredits() { const d = creditsDone; creditsDone = null; d(); }
function resumePlay() { S.name = 'play'; S.menu = null; document.body.dataset.state = 'play'; clearInput(); last = performance.now(); }
function onClear() {
  runCut(world.lv.outro, () => {
    save.stickers += world.stats.stickers;
    save.badges[world.lv.id] = Math.max(save.badges[world.lv.id] || 0, world.stats.badges);
    save.unlocked = Math.max(save.unlocked, Math.min(CHAPTERS.length, chapter + 2));
    world.stats.banked = true; persist(); sfx('win'); music('menu');
    if (world.lv.outro === 'ending') return startCredits(openTitle);
    const items = [];
    if (chapter + 1 < CHAPTERS.length) items.push({ label: 'SONRAKİ BÖLÜM', fn: () => startChapter(chapter + 1) });
    items.push({ label: 'DÜKKÂN', fn: () => openShop(showResult) }, { label: 'ANA MENÜ', fn: openTitle });
    const showResult = () => { setMenu('result', { y: Math.round(VH * 0.08) + 112, items }); };
    showResult();
  });
}
function onGameOver() {
  sfx('lose');
  setMenu('gameover', { title: 'OYUN BİTTİ', titleCol: '#f87171', note: 'DEVİN: "BİR ÇAY İÇ, TEKRAR DENE."', dim: true, items: [
    { label: 'KAYIT NOKTASINDAN DEVAM', fn: () => { continueFromCheckpoint(world); music(world.lv.music); startCount(); } },
    { label: 'ANA MENÜ', fn: () => { save.stickers += world.stats.stickers; persist(); openTitle(); } },
  ] });
  S.armed = 0.8;
}

// ---------------------------------------------------------------- loop
function tick() {
  readHeld();
  step(world, inp);
  for (const k of ['jump', 'atk', 'kick', 'use', 'dash', 'spec']) if (inp[k] > 0) inp[k] -= DT;
  while (world.events.length) {
    const e = world.events.shift();
    if (e.type === 'cut') runCut(e.id, e.id === 'bugCrash' ? () => { if (G.storyAction) G.storyAction(world, 'bounceBack'); resumePlay(); } : resumePlay);
    else if (e.type === 'music') music(e.id);
    else if (e.type === 'clear') { S.name = 'clearing'; S.t = 0; }
    else if (e.type === 'gameover') onGameOver();
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000, 0, 0.1); // rAF stamps can precede performance.now() on the first frame
  last = now;
  if (document.hidden) return;
  S.t += dt; if (S.armed > 0) S.armed -= dt;
  const t = now / 1000;
  if (S.name === 'arena') {
    const tc = { l: touch.l, r: touch.r, j: touch.jump, a: inp.atk > 0 || inp.kick > 0 };
    if (on && on.role === 'guest') {
      on.net.send(Object.assign({ k: 'in' }, readInputs({ F: [{ src: { k: 'kb' } }] }, keys, tc)[0]));
      for (const p of arena.fx) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; }
      arena.fx = arena.fx.filter((p) => p.t > 0);
    } else {
      const ins = readInputs(arena, keys, tc).map((v, i) => { const s = arena.F[i].src; if (!(on && s && s.k === 'net')) return v; const q = on.inp[s.pid]; const r = { l: q.l, r: q.r, j: q.j || q.sj, a: q.a || q.sa }; q.sj = q.sa = 0; return r; });
      stepArena(arena, ins, dt);
      if (on && (on.acc += dt) >= 0.04) { on.acc = 0; on.net.all(snapOf(arena), true); }
      if (arena.over && arena.overT > 1.6) showArenaResult();
    }
    inp.atk -= dt; inp.kick -= dt;
  } else if (S.name === 'play' || S.name === 'clearing') {
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 5) { tick(); acc -= DT; n++; if (S.name !== 'play' && S.name !== 'clearing') { acc = 0; break; } }
    if (n === 5) acc = 0;
    if (S.name === 'clearing' && S.t > 1.6) onClear();
  } else if (S.name === 'count') {
    const before = Math.ceil(count / 0.6);
    count -= dt;
    const after = Math.ceil(count / 0.6);
    if (after !== before) sfx(after <= 1 ? 'go' : 'count');
    if (count <= 0.6 && S.name === 'count') { S.name = 'play'; clearInput(); acc = 0; }
  } else if (S.name === 'cut' && cut) {
    cut.touch = touch.on; cut.update(dt, keys.Escape);
    if (cut.done) endCut();
  } else if (S.name === 'credits') creditsT += dt;
  if (world && S.name !== 'play' && S.name !== 'clearing' && world.flash > 0) world.flash -= dt;
  if (count > 0 && S.name === 'play') count -= dt;
  // draw
  const w = world || demo;
  if (!world) { demo.t += dt; demo.cam.x = (Math.sin(demo.t * 0.07) * 0.5 + 0.5) * Math.max(0, 1500 - VW) + 60; demo.player.x = -200; demo.devin.x = -200; demo.cam.y = Math.max(0, 288 - VH); }
  if (arena && ['arena', 'apause', 'ares'].includes(S.name)) renderArena(arena, g, VW, VH, t);
  else if (S.name === 'cut' && cut) cut.render(g, VW, VH);
  else if (S.name === 'credits') { if (drawCredits(g, creditsT, VW, VH) && Math.floor(t * 2) % 2) text(g, touch.on ? 'DOKUN: ANA MENÜ' : 'ENTER: ANA MENÜ', VW / 2, VH - 16, '#fde68a', 1, 0.5, '#141021'); }
  else {
    render(w, g, VW, VH);
    if (world) {
      if (S.name !== 'result') drawHUD(g, world, VW, VH, t);
      if (count > 0 && (S.name === 'count' || S.name === 'play')) { const n = Math.ceil(count / 0.6) - 1; drawCount(g, n, (count / 0.6) % 1, VW, VH); }
      if (S.name === 'result') drawResult(g, world, VW, VH, 2);
    }
  }
  if (S.name === 'help') drawHelp(g, VW, VH, touch.on);
  else if (S.menu) {
    if (S.menu.lobby) { S.menu.stickers = save.stickers; S.rects = drawLobby(g, S.menu, VW, VH, t); }
    else { S.rects = drawMenu(g, S.menu, VW, VH, t); if (S.menu.extra) S.menu.extra(g, S.rects); }
  }
}

buildArt();
resize();
openTitle();
requestAnimationFrame(frame);
if (location.hash === '#debug') window.__haven = { S, get world() { return world; }, get cut() { return cut; }, inp, get save() { return save; }, startChapter, openMulti, tick, press, keys, skip: () => cut && cut.skip(), cutAdvance: () => cut && cut.advance(), runCut, startCredits, go: () => { count = 0; S.name = 'play'; }, onClear, activate, uiKey };
