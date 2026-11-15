// Layered 64x64 humanoid sprite generator: heroes, organizers and humanoid enemies share one skeleton
// so every character has the same proportions, outline weight and animation language.
import { Buf, OUT } from './gfx.js';

const S = 64;

export const ANIMS = {
  idle: 4, run: 6, jump: 4, fall: 2, dash: 4, p1: 3, p2: 3, kick: 4, upper: 4, air: 4, slam: 2,
  special: 6, throw: 3, hit: 3, ko: 3, win: 4, tele: 2, smash: 3,
};

const skinA = { base: '#f4c49c', mid: '#e1a880', dark: '#bf7f5b', blush: '#e08b79' };
export const CHARS = {
  akin: {
    name: 'AKIN', skin: skinA,
    hair: { base: '#4a2c1d', mid: '#6a4129', light: '#8d5a3a', style: 'spiky' }, brows: '#2c180f',
    shirt: { base: '#7cc6e8', light: '#a9defa', dark: '#4e9cc4', inner: '#f8fafc', floral: ['#f6e7c1', '#e58fa0'] },
    pants: { base: '#1c1b26', light: '#2c2b3a', dark: '#111018' }, shoes: { base: '#f1f5f9', sole: '#b8c2d0' },
    lanyard: '#15151c', badge: ['#15151c', '#f8fafc'], shades: true, expr: 'smirk', sig: '#7cf0ff',
  },
  mert: {
    name: 'MERT', skin: { base: '#eec09d', mid: '#d8a27b', dark: '#b57a55', blush: '#d98470' },
    hair: { base: '#191b22', mid: '#2a2e3a', light: '#444a5c', style: 'curtain' }, brows: '#0c0d12', thickBrows: true,
    shirt: { base: '#272b36', light: '#3b4152', dark: '#1a1d26', logo: true },
    pants: { base: '#20242e', light: '#2f3544', dark: '#14171f' }, shoes: { base: '#191d26', sole: '#cbd5e1' },
    lanyard: '#1a1d24', expr: 'smirk', sig: '#fbbf24',
  },
  tuna: {
    name: 'TUNA', skin: { base: '#f3c5a2', mid: '#e1a880', dark: '#c07f5b', blush: '#e08b79' },
    hair: { base: '#1e1c24', mid: '#2f2b38', light: '#474254', style: 'curly' }, brows: '#111116',
    shirt: { base: '#272b36', light: '#3b4152', dark: '#1a1d26', logo: true },
    pants: { base: '#79a3cf', light: '#99bee3', dark: '#5278a3' }, shoes: { base: '#1b1f29', sole: '#e2e8f0' },
    lanyard: '#b83a44', expr: 'serious', sig: '#22d3ee',
  },
  gokoz: {
    name: 'GÖKÖZ', skin: { base: '#eab690', mid: '#d59971', dark: '#ae724e', blush: '#da7f6c' },
    hair: { base: '#221c1b', mid: '#382e2b', light: '#52443e', style: 'short' }, brows: '#181414',
    shirt: { base: '#2b6f77', light: '#3f919a', dark: '#1d4d54', logo: true },
    pants: { base: '#232834', light: '#343c4e', dark: '#161a23' }, shoes: { base: '#1d222d', sole: '#e2e8f0' },
    lanyard: '#a63646', expr: 'smile', sig: '#34d399',
  },
  ozgur: {
    name: 'ÖZGÜR', skin: { base: '#f5ccb0', mid: '#e2b08e', dark: '#bf8565', blush: '#de8d7c' },
    hair: { base: '#5a4134', mid: '#785745', light: '#9a735c', style: 'fringe' }, brows: '#3a2920',
    shirt: { base: '#252833', light: '#363b4b', dark: '#181a22' },
    pants: { base: '#22252f', light: '#313644', dark: '#15171e' }, shoes: { base: '#16181f', sole: '#64748b' },
    lanyard: '#c93b44', expr: 'intense', sig: '#ff477e', crown: '#facc15', cape: ['#db2777', '#9d174d'],
  },
  troll: {
    name: 'YORUM TROLÜ', skin: { base: '#e9c1a4', mid: '#d3a183', dark: '#ad7a5c', blush: '#d98470' },
    hair: { base: '#2a1d16', mid: '#3d2c22', light: '#5a4234', style: 'curtain' }, brows: '#150d09',
    shirt: { base: '#f97316', light: '#fb9a4a', dark: '#c2540a' },
    pants: { base: '#3a3f4d', light: '#4f5566', dark: '#272b36' }, shoes: { base: '#f1f5f9', sole: '#94a3b8' },
    noLanyard: true, shades: true, expr: 'smirk', sig: '#f97316',
  },
  buglord: {
    name: 'BUG LORD', skin: { base: '#4ade80', mid: '#2fb866', dark: '#1c7a45', blush: '#2fb866' },
    hair: { style: 'none' }, brows: '#052e16',
    shirt: { base: '#14532d', light: '#1f7a43', dark: '#0a2e19' },
    pants: { base: '#052e16', light: '#0c4423', dark: '#021a0c' }, shoes: { base: '#a3e635', sole: '#4d7c0f' },
    noLanyard: true, expr: 'fierce', glow: '#f43f5e', crown: '#a3e635', cape: ['#166534', '#0b3d1e'], horns: '#052e16', sig: '#a3e635',
  },
  imp: {
    name: 'MERGE CONFLICT', skin: { base: '#f87171', mid: '#dc4a4a', dark: '#a83232', blush: '#dc4a4a' },
    hair: { style: 'none' }, brows: '#3b0a0a',
    shirt: { base: '#22c55e', light: '#4ade80', dark: '#15803d', split: ['#ef4444', '#b91c1c'] },
    pants: { base: '#3f1d2e', light: '#5a2a42', dark: '#2a1220' }, shoes: { base: '#1f1220', sole: '#7c3a5a' },
    noLanyard: true, expr: 'fierce', glow: '#fde047', horns: '#fef3c7', ears: true, sig: '#f87171',
  },
  knight: {
    name: 'LAPTOP ŞÖVALYESİ', skin: { base: '#9aa5b8', mid: '#7d889c', dark: '#59637a', blush: '#7d889c' },
    hair: { style: 'none' }, brows: '#1e2433',
    shirt: { base: '#56617a', light: '#7a86a3', dark: '#3a4358' },
    pants: { base: '#3a4358', light: '#56617a', dark: '#262c3d' }, shoes: { base: '#1e2433', sole: '#7a86a3' },
    noLanyard: true, expr: 'fierce', glow: '#a855f7', helmet: { base: '#6b7690', light: '#9aa5b8', dark: '#3a4358', plume: '#a855f7' }, shield: true, sig: '#a855f7',
  },
  goblin: {
    name: 'DEADLINE GOBLIN', skin: { base: '#84cc5a', mid: '#65a843', dark: '#3f7a2b', blush: '#65a843' },
    hair: { base: '#3b2a1a', mid: '#5a4128', light: '#7a5a38', style: 'short' }, brows: '#1a2e0f', thickBrows: true,
    shirt: { base: '#8a4b2a', light: '#b06a3f', dark: '#5c2f18' },
    pants: { base: '#3b3147', light: '#544766', dark: '#261f30' }, shoes: { base: '#2a1c12', sole: '#8a6a4a' },
    lanyard: '#fbbf24', badge: ['#fef3c7', '#ef4444'], expr: 'fierce', ears: true, tusks: true, sig: '#ef4444',
  },
};

CHARS.ozgurFree = { ...CHARS.ozgur, crown: null, cape: null, expr: 'smirk' };

// ---- online character creator: palettes + custom char registration (ids 'c_<hash>', cached by spec)
export const PAL = {
  h: [['SİYAH', '#1e1c24'], ['KAHVE', '#5a3a26'], ['KIZIL', '#b4472a'], ['SARI', '#e3b94f'], ['BEYAZ', '#e5e7eb'], ['MAVİ', '#3b82f6'], ['PEMBE', '#ec6aa8'], ['YEŞİL', '#22a05a']],
  s: [['AÇIK', '#f5ccb0'], ['BUĞDAY', '#eab690'], ['ESMER', '#d09a74'], ['BAKIR', '#b87a52'], ['KOYU', '#8a5a3c'], ['ABANOZ', '#5e3b28']],
  t: [['KIRMIZI', '#d9364a'], ['MAVİ', '#3b82f6'], ['YEŞİL', '#22a05a'], ['SARI', '#f0b429'], ['MOR', '#8b5cf6'], ['TURUNCU', '#f97316'], ['SİYAH', '#2b2f3b'], ['BEYAZ', '#eef2f7']],
  p: [['SİYAH', '#22252f'], ['LACİVERT', '#1e3a8a'], ['KOT', '#4f7cb0'], ['HAKİ', '#7a7a4a'], ['GRİ', '#6b7280'], ['BORDO', '#7a2434']],
  o: [['BEYAZ', '#f1f5f9'], ['SİYAH', '#191d26'], ['KIRMIZI', '#d9364a'], ['MAVİ', '#2563eb'], ['SARI', '#f0b429'], ['KAHVE', '#6a4129']],
  a: [['YOK'], ['GÖZLÜK'], ['TAÇ'], ['PELERİN'], ['ŞAPKA']],
};
export const DEF_SPEC = { n: 'OYUNCU', h: 1, s: 1, t: 1, p: 1, o: 0, a: 0 };
const mix = (a, b, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
const tri = (c) => ({ base: c, light: mix(c, '#ffffff', 0.25), dark: mix(c, '#000000', 0.35) });
export function cleanSpec(sp) {
  const o = { ...DEF_SPEC, ...(sp && typeof sp === 'object' ? sp : {}) };
  for (const k in PAL) o[k] = ((+o[k] || 0) % PAL[k].length + PAL[k].length) % PAL[k].length;
  o.n = [...String(o.n).toLocaleUpperCase('tr')].filter((c) => /[A-ZÇĞİÖŞÜ0-9 ]/.test(c)).join('').slice(0, 12).trim() || DEF_SPEC.n;
  return o;
}
// returns the char id for a spec (or passes a plain id through)
export function makeCustom(sp) {
  if (typeof sp === 'string') return sp;
  sp = cleanSpec(sp);
  const key = JSON.stringify(sp);
  let x = 5381; for (const c of key) x = ((x * 33) ^ c.charCodeAt(0)) >>> 0;
  const id = 'c_' + x.toString(36);
  if (!CHARS[id]) {
    const P = (k) => PAL[k][sp[k]][1], sk = P('s'), hc = P('h'), ac = sp.a;
    CHARS[id] = {
      name: sp.n, skin: { base: sk, mid: mix(sk, '#000', 0.12), dark: mix(sk, '#000', 0.28), blush: mix(sk, '#e0556a', 0.4) },
      hair: { ...tri(hc), mid: mix(hc, '#fff', 0.12), style: 'fringe' }, brows: mix(hc, '#000', 0.5),
      shirt: tri(P('t')), pants: tri(P('p')), shoes: { base: P('o'), sole: mix(P('o'), '#fff', 0.6) },
      lanyard: '#15151c', expr: 'smile', sig: P('t'),
      ...(ac === 1 ? { shades: true } : ac === 2 ? { crown: '#facc15' } : ac === 3 ? { cape: ['#db2777', '#9d174d'] } : ac === 4 ? { cap: tri(P('t')) } : {}),
    };
  }
  return id;
}

function pose(ch, key, f) {
  const p = {
    ox: 0, oy: 0, hx: 0, hy: 0, lean: 0,
    bLeg: [-3, 3, -4, 10], fLeg: [3, 3, 4, 10], bArm: [6, -6, 10, -1], fArm: [-6, -6, -2, -1],
    hand: 'fist', expr: ch.expr, sw: 0, lift: 0, vfx: null,
  };
  if (key === 'idle') {
    const bob = f === 1 || f === 2 ? 1 : 0;
    p.oy = bob; p.hy = bob; p.sw = f === 2 ? 1 : 0;
    p.bArm = [6, -6 + bob, 10, -3 + bob]; p.fArm = [-6, -6 + bob, -1, -2 + bob];
  } else if (key === 'run') {
    const c = [
      { oy: 0, b: [-2, 3, -9, 9], f: [2, 3, 9, 8], ba: [5, -6, 12, -2], fa: [-5, -6, -11, -3] },
      { oy: -1, b: [-2, 3, -4, 10], f: [2, 3, 6, 6], ba: [5, -6, 9, -1], fa: [-5, -6, -8, -1] },
      { oy: 0, b: [-1, 3, 4, 9], f: [1, 3, -6, 9], ba: [4, -6, -4, -1], fa: [-4, -6, 6, -2] },
      { oy: 0, b: [2, 3, 9, 9], f: [-2, 3, -9, 8], ba: [4, -6, -9, -2], fa: [-4, -6, 10, -3] },
      { oy: -1, b: [2, 3, 6, 6], f: [-2, 3, -4, 10], ba: [5, -6, -5, -1], fa: [-5, -6, 7, -1] },
      { oy: 0, b: [1, 3, -6, 9], f: [-1, 3, 4, 9], ba: [5, -6, 7, -1], fa: [-5, -6, -4, -2] },
    ][f % 6];
    p.oy = c.oy; p.hy = c.oy; p.lean = 2; p.hx = 2; p.bLeg = c.b; p.fLeg = c.f; p.bArm = c.ba; p.fArm = c.fa;
    p.sw = -3 - (f % 2); p.lift = 1;
  } else if (key === 'jump') {
    if (f === 0) { p.oy = 3; p.hy = 3; p.bLeg = [-4, 3, -5, 8]; p.fLeg = [4, 3, 5, 8]; p.bArm = [6, -5, 9, 0]; p.fArm = [-6, -5, -9, 0]; }
    else if (f === 1) { p.oy = -4; p.hy = -5; p.bLeg = [-2, 3, -4, 11]; p.fLeg = [2, 3, 3, 8]; p.bArm = [6, -7, 11, -13]; p.fArm = [-6, -7, -10, -12]; }
    else if (f === 2) { p.oy = -6; p.hy = -6; p.bLeg = [-2, 3, -6, 7]; p.fLeg = [3, 3, 5, 6]; p.bArm = [6, -7, 10, -10]; p.fArm = [-6, -7, -9, -9]; p.lift = 2; }
    else { p.oy = -5; p.hy = -5; p.lean = 1; p.bLeg = [-3, 3, -7, 6]; p.fLeg = [3, 3, 7, 5]; p.bArm = [6, -6, 12, -4]; p.fArm = [-6, -6, -11, -5]; p.lift = 2; p.vfx = { t: 'ring', c: ch.sig }; }
    p.sw = -2;
  } else if (key === 'fall') {
    p.oy = -2 + (f % 2); p.hy = p.oy; p.bLeg = [-3, 3, -5, 9]; p.fLeg = [3, 3, 5, 8];
    p.bArm = [6, -7, 12, -11 - (f % 2)]; p.fArm = [-6, -7, -11, -11 - (f % 2)]; p.hand = 'open'; p.lift = 2 + (f % 2); p.sw = -2;
  } else if (key === 'dash') {
    if (f === 0) { p.ox = -3; p.oy = 2; p.lean = 3; p.hx = 2; p.bLeg = [-3, 3, -8, 9]; p.fLeg = [2, 3, 5, 8]; p.bArm = [5, -6, -3, -3]; p.fArm = [-5, -6, -10, -2]; }
    else if (f < 3) { p.ox = 4; p.oy = 1; p.lean = 4; p.hx = 4; p.bLeg = [-4, 3, -12, 8]; p.fLeg = [3, 3, 9, 8]; p.bArm = [5, -6, -7, -4]; p.fArm = [-5, -6, -12, -3]; p.vfx = { t: 'dash', c: ch.sig }; }
    else { p.ox = 2; p.lean = 1; p.hx = 1; p.bLeg = [-3, 3, -5, 10]; p.fLeg = [3, 3, 6, 10]; p.bArm = [6, -6, 10, -2]; p.fArm = [-6, -6, -3, -2]; }
    p.hand = 'open'; p.sw = -4; p.lift = 2;
  } else if (key === 'p1') {
    p.expr = 'fierce';
    if (f === 0) { p.ox = -2; p.lean = -1; p.hx = -1; p.bLeg = [-3, 3, -6, 10]; p.bArm = [5, -6, 8, -4]; p.fArm = [-5, -6, -10, -5]; }
    else if (f === 1) { p.ox = 4; p.lean = 3; p.hx = 3; p.bLeg = [-3, 3, -9, 10]; p.fLeg = [3, 3, 8, 10]; p.bArm = [6, -6, 19, -6]; p.fArm = [-5, -6, -8, -3]; p.sw = 4; p.vfx = { t: 'slash', x: 54, y: 34, c: '#ffffff' }; }
    else { p.ox = 2; p.lean = 2; p.hx = 2; p.bLeg = [-3, 3, -7, 10]; p.fLeg = [3, 3, 6, 10]; p.bArm = [6, -6, 13, -5]; p.fArm = [-5, -6, -6, -3]; }
  } else if (key === 'p2') {
    p.expr = 'fierce';
    if (f === 0) { p.ox = 1; p.lean = 1; p.bArm = [6, -6, 9, -4]; p.fArm = [-5, -6, -10, -6]; p.bLeg = [-3, 3, -6, 10]; p.fLeg = [3, 3, 6, 10]; }
    else if (f === 1) { p.ox = 5; p.lean = 4; p.hx = 3; p.bLeg = [-3, 3, -10, 10]; p.fLeg = [3, 3, 8, 10]; p.fArm = [-3, -6, 18, -8]; p.bArm = [6, -6, 7, -3]; p.sw = 4; p.vfx = { t: 'slash', x: 55, y: 32, c: ch.sig }; }
    else { p.ox = 3; p.lean = 2; p.hx = 2; p.bLeg = [-3, 3, -7, 10]; p.fLeg = [3, 3, 6, 10]; p.fArm = [-4, -6, 10, -5]; p.bArm = [6, -6, 8, -3]; }
  } else if (key === 'kick') {
    p.expr = 'fierce';
    if (f === 0) { p.lean = -1; p.bLeg = [-3, 3, -5, 10]; p.fLeg = [3, 3, 6, 5]; p.bArm = [6, -6, 9, -6]; p.fArm = [-6, -6, -9, -5]; }
    else if (f < 3) { p.ox = 2; p.lean = -3; p.hx = -2; p.bLeg = [-3, 3, -5, 10]; p.fLeg = [4, 2, f === 1 ? 19 : 18, f === 1 ? 0 : 2]; p.bArm = [6, -6, 8, -10]; p.fArm = [-6, -6, -11, -3]; p.lift = 1; p.vfx = { t: 'arc', c: ch.sig }; }
    else { p.ox = 1; p.bLeg = [-3, 3, -5, 10]; p.fLeg = [3, 3, 8, 8]; p.bArm = [6, -6, 9, -4]; p.fArm = [-6, -6, -6, -3]; }
  } else if (key === 'upper') {
    p.expr = 'fierce';
    if (f === 0) { p.oy = 3; p.hy = 3; p.lean = 2; p.bLeg = [-4, 3, -6, 8]; p.fLeg = [4, 3, 6, 8]; p.bArm = [6, -5, 9, 2]; p.fArm = [-6, -5, -8, 0]; }
    else if (f < 3) { p.oy = f === 1 ? -3 : -6; p.hy = p.oy; p.lean = 1; p.bLeg = [-2, 3, -5, 10]; p.fLeg = [3, 3, 6, 7]; p.bArm = [6, -7, 11, -18]; p.fArm = [-6, -6, -9, -2]; p.lift = 2; p.vfx = { t: 'rise', c: ch.sig }; }
    else { p.oy = -3; p.hy = -3; p.bLeg = [-3, 3, -5, 9]; p.fLeg = [3, 3, 5, 8]; p.bArm = [6, -7, 10, -11]; p.fArm = [-6, -6, -8, -3]; p.lift = 1; }
  } else if (key === 'air') {
    p.expr = 'fierce'; p.oy = -4; p.hy = -4; p.lean = 2; p.lift = 2;
    if (f === 0) { p.bLeg = [-3, 3, -6, 6]; p.fLeg = [3, 3, 1, 5]; p.bArm = [6, -6, 10, -10]; p.fArm = [-6, -6, -8, -8]; }
    else if (f < 3) { p.bLeg = [-3, 3, -8, 7]; p.fLeg = [3, 3, 17, 3]; p.bArm = [6, -6, 12, -3]; p.fArm = [-6, -6, -10, -7]; p.vfx = { t: 'arc', c: ch.sig }; }
    else { p.bLeg = [-3, 3, -5, 8]; p.fLeg = [3, 3, 5, 8]; p.bArm = [6, -6, 9, -5]; p.fArm = [-6, -6, -8, -5]; }
  } else if (key === 'slam') {
    p.expr = 'fierce'; p.lean = 3; p.hx = 2; p.oy = -2 + f; p.hy = p.oy; p.lift = 3;
    p.bLeg = [-3, 3, -9, 5]; p.fLeg = [3, 3, 7, 11]; p.bArm = [6, -6, 11, 3]; p.fArm = [-6, -6, -11, -11]; p.vfx = { t: 'dive', c: ch.sig };
  } else if (key === 'special') {
    p.expr = 'fierce';
    if (f < 2) { p.oy = 2; p.hy = 2; p.ox = -2; p.bLeg = [-4, 3, -7, 9]; p.fLeg = [4, 3, 7, 9]; p.bArm = [6, -6, -4, -4]; p.fArm = [-6, -6, -9, -5]; p.vfx = { t: 'charge', f, c: ch.sig }; }
    else if (f < 5) { p.ox = 4; p.lean = 3; p.hx = 3; p.bLeg = [-4, 3, -10, 10]; p.fLeg = [4, 3, 9, 10]; p.bArm = [6, -6, 18, -6]; p.fArm = [-4, -6, 16, -3]; p.hand = 'open'; p.lift = 2; p.sw = 4; p.vfx = { t: 'burst', f: f - 2, c: ch.sig }; }
    else { p.ox = 1; p.bLeg = [-3, 3, -5, 10]; p.fLeg = [3, 3, 5, 10]; p.bArm = [6, -6, 9, -2]; p.fArm = [-6, -6, -2, -2]; }
  } else if (key === 'throw') {
    p.expr = 'fierce';
    if (f === 0) { p.ox = -2; p.lean = -2; p.hx = -1; p.bArm = [5, -7, -3, -14]; p.fArm = [-6, -6, 4, -5]; p.bLeg = [-3, 3, -7, 10]; }
    else if (f === 1) { p.ox = 4; p.lean = 4; p.hx = 3; p.bArm = [6, -6, 18, -9]; p.fArm = [-5, -6, -9, -2]; p.hand = 'open'; p.bLeg = [-3, 3, -9, 10]; p.fLeg = [3, 3, 8, 10]; p.sw = 4; }
    else { p.ox = 2; p.lean = 2; p.bArm = [6, -6, 12, -3]; p.fArm = [-5, -6, -5, -2]; }
  } else if (key === 'hit' || key === 'ko') {
    p.expr = key === 'ko' && f > 0 ? 'ko' : 'shock';
    p.ox = f === 0 ? -2 : -4; p.oy = f === 1 ? -2 : 0; p.lean = -3; p.hx = -3; p.hy = p.oy - 1;
    p.bLeg = [-3, 3, -1, 10]; p.fLeg = [3, 3, 7, 9]; p.bArm = [5, -6, 12, -10]; p.fArm = [-5, -6, -11, -9]; p.hand = 'open'; p.lift = 2; p.sw = 3;
    if (key === 'hit') p.vfx = { t: 'spark', f };
    if (key === 'ko' && f > 0) { p.ox = 0; p.lean = 0; p.hx = 0; p.oy = 0; p.hy = 0; p.bLeg = [-3, 3, -6, 10]; p.fLeg = [3, 3, 6, 10]; p.bArm = [6, -6, 13, -8 + f]; p.fArm = [-6, -6, -12, -7]; }
  } else if (key === 'win') {
    const b = f === 1 || f === 3 ? -2 : 0;
    p.oy = b; p.hy = b; p.expr = 'smile'; p.bLeg = [-3, 3, -5, 10 - b]; p.fLeg = [3, 3, 5, 10 - b];
    p.bArm = [6, -7 + b, 11, -14 + b]; p.fArm = [-6, -7 + b, -10, -12 + b]; p.hand = 'thumbs'; p.vfx = { t: 'sparkle', f, c: ch.sig };
  } else if (key === 'tele') {
    p.expr = 'fierce'; p.oy = f; p.hy = f; p.lean = -1; p.bLeg = [-4, 3, -7, 10 - f]; p.fLeg = [4, 3, 7, 10 - f];
    p.bArm = [6, -7, 10, -16 + f]; p.fArm = [-6, -7, -8, -15 + f]; p.lift = 1; p.vfx = { t: 'warn', f };
  } else if (key === 'smash') {
    p.expr = 'fierce';
    if (f === 0) { p.lean = -2; p.bArm = [6, -7, 9, -17]; p.fArm = [-6, -7, -6, -16]; p.bLeg = [-4, 3, -7, 10]; p.fLeg = [4, 3, 7, 10]; }
    else { p.ox = 4; p.oy = 2; p.hy = 2; p.lean = 4; p.hx = 3; p.bArm = [6, -5, 17, 2]; p.fArm = [-4, -5, 14, 4]; p.bLeg = [-4, 3, -10, 8]; p.fLeg = [4, 3, 9, 8]; if (f === 1) p.vfx = { t: 'impact', c: ch.sig }; }
  }
  return p;
}

function hairBack(b, ch, hx, hy) {
  const c = ch.hair;
  if (c.style === 'none') return;
  if (c.style === 'curly') { b.ell(hx, hy - 3, 12, 11, c.base); b.ell(hx - 9, hy + 1, 4, 5, c.base); b.ell(hx + 9, hy + 1, 4, 5, c.base); }
  else if (c.style === 'fringe') { b.ell(hx - 1, hy - 4, 11, 9, c.base); b.ell(hx - 9, hy, 3, 4, c.base); }
  else if (c.style === 'curtain') b.ell(hx, hy - 4, 12, 10, c.base);
  else if (c.style === 'spiky') { b.ell(hx - 1, hy - 5, 11, 9, c.base); b.rect(hx - 12, hy - 5, 3, 5, c.base); }
  else b.ell(hx, hy - 5, 10, 9, c.base);
}
function hairFront(b, ch, hx, hy, l) {
  const c = ch.hair;
  if (c.style === 'none') return;
  if (c.style === 'curly') {
    b.ell(hx, hy - 9 - l, 11, 5, c.base); b.ell(hx - 6, hy - 7 - l, 5, 4, c.mid); b.ell(hx + 5, hy - 7 - l, 5, 4, c.mid); b.ell(hx - 1, hy - 10 - l, 6, 3, c.mid);
    b.rect(hx - 7, hy - 6 - l, 4, 3, c.base); b.rect(hx - 2, hy - 6 - l, 5, 4, c.mid); b.rect(hx + 4, hy - 6 - l, 4, 3, c.base);
    b.rect(hx - 10, hy - 4, 3, 6, c.base); b.rect(hx + 8, hy - 4, 3, 5, c.base); b.rect(hx - 4, hy - 11 - l, 4, 1, c.light); b.rect(hx + 2, hy - 10 - l, 3, 1, c.light);
  } else if (c.style === 'fringe') {
    b.ell(hx, hy - 9 - l, 10, 5, c.base); b.ell(hx - 3, hy - 10 - l, 5, 3, c.mid);
    b.rect(hx - 7, hy - 7 - l, 4, 4, c.mid); b.rect(hx - 3, hy - 6 - l, 5, 4, c.base); b.rect(hx + 2, hy - 6 - l, 5, 5, c.mid);
    b.set(hx - 1, hy - 2 - l, c.base); b.set(hx + 4, hy - 1 - l, c.base); b.rect(hx - 9, hy - 4, 2, 5, c.base);
    b.rect(hx - 4, hy - 11 - l, 5, 1, c.light); b.rect(hx + 2, hy - 9 - l, 3, 1, c.light);
  } else if (c.style === 'curtain') {
    b.ell(hx - 4, hy - 9 - l, 7, 5, c.base); b.ell(hx + 4, hy - 9 - l, 7, 5, c.base); b.ell(hx - 4, hy - 9 - l, 4, 3, c.mid); b.ell(hx + 4, hy - 9 - l, 4, 3, c.mid);
    b.rect(hx - 8, hy - 7 - l, 6, 4, c.base); b.rect(hx + 2, hy - 7 - l, 6, 4, c.base); b.rect(hx - 9, hy - 4, 2, 4, c.base); b.rect(hx + 8, hy - 4, 2, 4, c.base);
    b.rect(hx - 6, hy - 11 - l, 3, 1, c.light); b.rect(hx + 3, hy - 11 - l, 3, 1, c.light);
  } else if (c.style === 'spiky') {
    b.ell(hx, hy - 9 - l, 10, 4, c.base); b.ell(hx - 2, hy - 10 - l, 6, 3, c.mid);
    // windswept spikes, back-swept
    const sp = [[-10, -9, 3], [-7, -13, 3], [-3, -15, 3], [1, -15, 3], [5, -13, 3], [8, -10, 2]];
    for (const [sx, sy, sz] of sp) { b.rect(hx + sx, hy + sy - l, sz, 4, c.base); b.set(hx + sx, hy + sy - l, c.mid); }
    b.rect(hx - 8, hy - 7 - l, 5, 3, c.base); b.rect(hx - 2, hy - 7 - l, 4, 2, c.mid); b.rect(hx + 3, hy - 7 - l, 5, 3, c.base);
    b.rect(hx - 10, hy - 5, 2, 4, c.base); b.rect(hx - 4, hy - 12 - l, 4, 1, c.light); b.rect(hx + 2, hy - 11 - l, 3, 1, c.light);
  } else {
    b.ell(hx, hy - 9 - l, 9, 5, c.base); b.ell(hx - 4, hy - 10 - l, 4, 3, c.mid); b.ell(hx + 3, hy - 10 - l, 4, 3, c.mid);
    b.set(hx - 6, hy - 13 - l, c.base); b.set(hx - 2, hy - 14 - l, c.mid); b.set(hx + 2, hy - 14 - l, c.base); b.set(hx + 6, hy - 12 - l, c.mid);
    b.rect(hx - 6, hy - 6 - l, 3, 2, c.base); b.rect(hx - 1, hy - 6 - l, 4, 2, c.mid); b.rect(hx + 4, hy - 6 - l, 3, 2, c.base); b.rect(hx - 3, hy - 12 - l, 3, 1, c.light);
  }
}
function face(b, ch, hx, hy, expr) {
  const s = ch.skin;
  if (ch.ears) { // pointy ears
    b.rect(hx - 13, hy - 2, 4, 3, s.mid); b.rect(hx - 15, hy - 4, 3, 2, s.mid); b.set(hx - 16, hy - 5, s.dark);
    b.rect(hx + 9, hy - 2, 4, 3, s.mid); b.rect(hx + 12, hy - 4, 3, 2, s.mid); b.set(hx + 15, hy - 5, s.dark);
  }
  b.ell(hx, hy + 1, 9, 8, s.base);
  b.rect(hx - 7, hy + 5, 14, 3, s.mid); b.rect(hx - 5, hy + 7, 10, 2, s.dark);
  b.rect(hx - 10, hy, 2, 4, s.mid); b.set(hx - 9, hy + 1, s.dark);
  b.rect(hx - 4, hy + 3, 2, 1, s.blush); b.rect(hx + 4, hy + 3, 2, 1, s.blush); b.set(hx + 1, hy + 3, s.dark);
  const bt = ch.thickBrows ? 2 : 1;
  if (ch.helmet) {
    const h = ch.helmet;
    b.ell(hx, hy - 3, 11, 10, h.base); b.rect(hx - 10, hy - 2, 20, 8, h.base); b.rect(hx - 8, hy - 11, 10, 2, h.light); b.rect(hx + 6, hy - 4, 4, 9, h.dark);
    b.rect(hx - 7, hy - 1, 14, 3, OUT); b.rect(hx - 4, hy, 3, 1, ch.glow); b.rect(hx + 3, hy, 3, 1, ch.glow);
    b.rect(hx - 1, hy + 3, 2, 4, h.dark); b.rect(hx - 6, hy + 4, 3, 1, h.dark); b.rect(hx + 4, hy + 4, 3, 1, h.dark);
    b.rect(hx - 2, hy - 17, 4, 5, h.plume); b.rect(hx - 5, hy - 15, 3, 3, h.plume); b.set(hx - 1, hy - 18, h.plume);
    return;
  }
  if (expr === 'ko') {
    for (const ex of [-4, 3]) { b.set(hx + ex, hy - 1, OUT); b.set(hx + ex + 2, hy - 1, OUT); b.set(hx + ex + 1, hy, OUT); b.set(hx + ex, hy + 1, OUT); b.set(hx + ex + 2, hy + 1, OUT); }
    b.rect(hx - 1, hy + 5, 4, 1, '#7a4538');
  } else if (ch.glow) {
    b.rect(hx - 5, hy - 1, 4, 3, ch.glow); b.rect(hx + 2, hy - 1, 4, 3, ch.glow); b.set(hx - 4, hy - 1, '#ffffff'); b.set(hx + 3, hy - 1, '#ffffff');
    b.rect(hx - 6, hy - 3, 4, bt, ch.brows); b.set(hx - 2, hy - 2, ch.brows); b.rect(hx + 3, hy - 3, 4, bt, ch.brows); b.set(hx + 2, hy - 2, ch.brows);
    if (expr === 'shock') { b.rect(hx - 2, hy + 5, 5, 3, OUT); } else { b.rect(hx - 3, hy + 5, 7, 2, OUT); b.set(hx - 2, hy + 5, '#ffffff'); b.set(hx, hy + 5, '#ffffff'); b.set(hx + 2, hy + 5, '#ffffff'); }
  } else if (expr === 'shock') {
    b.rect(hx - 5, hy - 1, 4, 4, '#ffffff'); b.rect(hx + 2, hy - 1, 4, 4, '#ffffff'); b.set(hx - 3, hy + 1, OUT); b.set(hx + 4, hy + 1, OUT);
    b.rect(hx - 2, hy + 5, 5, 3, OUT); b.rect(hx - 1, hy + 6, 3, 1, '#f87171');
  } else {
    b.rect(hx - 5, hy - 1, 4, 3, '#ffffff'); b.rect(hx + 2, hy - 1, 4, 3, '#ffffff');
    b.rect(hx - 3, hy - 1, 2, 3, OUT); b.rect(hx + 4, hy - 1, 2, 3, OUT); b.set(hx - 3, hy - 1, '#3b4254'); b.set(hx + 4, hy - 1, '#3b4254');
    if (expr === 'fierce') {
      b.rect(hx - 6, hy - 3, 4, bt, ch.brows); b.set(hx - 2, hy - 2, ch.brows); b.rect(hx + 3, hy - 3, 4, bt, ch.brows); b.set(hx + 2, hy - 2, ch.brows);
      b.rect(hx - 2, hy + 5, 6, 2, '#ffffff'); b.set(hx - 3, hy + 5, OUT); b.set(hx + 4, hy + 5, OUT); b.set(hx, hy + 5, '#cbd5e1'); b.set(hx + 2, hy + 5, '#cbd5e1');
    } else if (expr === 'intense' || expr === 'serious') {
      b.rect(hx - 6, hy - 2 - (bt - 1), 4, bt, ch.brows); b.rect(hx + 2, hy - 2 - (bt - 1), 4, bt, ch.brows); b.rect(hx - 1, hy + 5, 4, 1, s.dark); b.set(hx, hy + 5, '#8c5342');
    } else if (expr === 'smirk') {
      b.rect(hx - 6, hy - 3, 4, bt, ch.brows); b.rect(hx + 2, hy - 3, 4, bt, ch.brows); b.rect(hx - 1, hy + 5, 4, 1, '#7a4538'); b.set(hx + 3, hy + 4, '#7a4538');
    } else {
      b.rect(hx - 6, hy - 3, 4, bt, ch.brows); b.rect(hx + 2, hy - 3, 4, bt, ch.brows); b.rect(hx - 2, hy + 5, 5, 1, '#7a4538'); b.set(hx - 3, hy + 4, '#7a4538'); b.set(hx + 3, hy + 4, '#7a4538');
    }
  }
  if (ch.tusks) { b.rect(hx - 3, hy + 4, 1, 2, '#fffbe6'); b.rect(hx + 3, hy + 4, 1, 2, '#fffbe6'); }
  if (ch.shades && expr !== 'ko') {
    b.rect(hx - 7, hy - 2, 6, 4, '#0b0b12'); b.rect(hx, hy - 2, 7, 4, '#0b0b12'); b.rect(hx - 1, hy - 1, 1, 1, '#0b0b12');
    b.rect(hx - 10, hy - 1, 3, 1, '#0b0b12'); b.set(hx - 6, hy - 1, '#56627e'); b.set(hx - 5, hy - 2, '#56627e'); b.set(hx + 1, hy - 1, '#56627e'); b.set(hx + 2, hy - 2, '#56627e');
  }
}
function headExtras(b, ch, hx, hy, l) {
  if (ch.cap) { const c = ch.cap, y = hy - 9 - l; b.ell(hx, y + 3, 9, 5, c.base); b.rect(hx - 9, y + 3, 18, 3, c.base); b.rect(hx - 6, y - 1, 6, 1, c.light); b.rect(hx + 1, y + 5, 12, 2, c.dark); b.rect(hx - 9, y + 5, 10, 1, c.dark); }
  if (ch.horns) { b.rect(hx - 8, hy - 12 - l, 2, 4, ch.horns); b.set(hx - 9, hy - 13 - l, ch.horns); b.rect(hx + 6, hy - 12 - l, 2, 4, ch.horns); b.set(hx + 8, hy - 13 - l, ch.horns); }
  if (ch.crown) {
    const y = hy - 13 - l;
    b.rect(hx - 6, y, 12, 3, ch.crown); b.rect(hx - 6, y - 2, 2, 2, ch.crown); b.rect(hx - 1, y - 3, 2, 3, ch.crown); b.rect(hx + 4, y - 2, 2, 2, ch.crown);
    b.set(hx - 3, y + 1, '#ef4444'); b.set(hx + 2, y + 1, '#38bdf8'); b.rect(hx - 6, y + 2, 12, 1, '#b45309');
  }
}
function hand(b, ch, x, y, mode, front) {
  const s = ch.skin;
  if (mode === 'thumbs') { b.rect(x - 2, y - 1, 4, 4, s.base); b.rect(x - 2, y + 2, 4, 1, s.dark); b.rect(x + (front ? 0 : -1), y - 4, 2, 3, s.base); }
  else if (mode === 'open') { b.rect(x - 2, y - 2, 5, 4, s.base); b.set(x - 2, y - 3, s.mid); b.set(x + 2, y - 3, s.mid); }
  else { b.rect(x - 2, y - 2, 4, 4, s.base); b.rect(x - 2, y + 1, 4, 1, s.dark); }
}
function vfx(b, v, cx, cy) {
  if (!v) return;
  const c = v.c || '#ffffff';
  if (v.t === 'ring') for (let a = -8; a <= 8; a += 2) { b.set(32 + a, 51 + Math.abs(a) * 0.15, c); b.set(32 + a, 52 + Math.abs(a) * 0.15, '#ffffff'); }
  else if (v.t === 'dash') { b.rect(6, 30, 12, 2, c); b.rect(10, 38, 14, 2, '#ffffff'); b.rect(8, 46, 10, 2, c); }
  else if (v.t === 'slash') for (let i = -7; i <= 7; i++) { const px = v.x - Math.abs(i) * 0.7; b.set(px, v.y + i, c); b.set(px - 1, v.y + i, c); b.set(px - 2, v.y + i, '#93c5fd'); }
  else if (v.t === 'arc') for (let i = -9; i <= 9; i++) { const px = 55 - (i * i) / 14; b.set(px, 40 + i, '#ffffff'); b.set(px - 1, 40 + i, c); b.set(px - 2, 40 + i, c); }
  else if (v.t === 'rise') for (let i = 0; i < 18; i++) { const px = 46 + Math.sin(i * 0.2) * 3; b.set(px, 42 - i, '#ffffff'); b.set(px + 1, 42 - i, c); b.set(px + 2, 43 - i, c); }
  else if (v.t === 'dive') { b.rect(20, 8, 1, 10, c); b.rect(30, 4, 1, 12, '#ffffff'); b.rect(42, 9, 1, 9, c); }
  else if (v.t === 'charge') { const r = v.f ? 6 : 3; for (let a = 0; a < 8; a++) { const an = (a / 8) * 6.283; b.set(cx - 6 + Math.cos(an) * r, cy - 5 + Math.sin(an) * r, a % 2 ? c : '#ffffff'); } }
  else if (v.t === 'burst') { const r = 4 + v.f * 2; b.ell(56, 34, 3, r, c); b.ell(57, 34, 1, r - 2, '#ffffff'); }
  else if (v.t === 'spark') { const r = 4 + v.f * 2; b.set(26, 33, '#ffffff'); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.set(26 + sx * r, 33 + sy * r, '#fbbf24'); }
  else if (v.t === 'sparkle') { const sy = 12 + (v.f % 2) * 3; b.set(14, sy, c); b.set(14, sy - 1, '#ffffff'); b.set(50, sy + 4, c); b.set(50, sy + 3, '#ffffff'); }
  else if (v.t === 'warn') { b.rect(31, 2 + v.f, 2, 5, '#ef4444'); b.rect(31, 9 + v.f, 2, 2, '#ef4444'); }
  else if (v.t === 'impact') { for (let i = -10; i <= 10; i += 2) b.set(50 + i, 57 - Math.abs(i) * 0.3, i % 4 ? c : '#ffffff'); b.rect(44, 58, 14, 1, '#ffffff'); }
}

function frame(ch, key, f) {
  const p = pose(ch, key, f);
  const cx = 32 + p.ox, cy = 40 + p.oy, hx = cx + p.hx, hy = cy - 16 + p.hy;
  const sh = ch.shirt, sk = ch.skin;
  const L = [];
  // cape (behind everything)
  if (ch.cape) {
    const b = new Buf(S);
    const fl = p.sw < 0 ? 3 : p.sw > 0 ? -2 : 0;
    for (let y = -8; y <= 9; y++) { const w = 6 + Math.round((y + 8) / 5); b.rect(cx - w - Math.round(((y + 8) / 17) * fl) - 1, cy + y, w + 4, 1, y > 6 ? ch.cape[1] : ch.cape[0]); }
    L.push(b);
  }
  // back arm
  let b = new Buf(S);
  b.seg(cx + p.bArm[0], cy + p.bArm[1], cx + p.bArm[2], cy + p.bArm[3], 2.1, sk.mid, sk.base, sk.dark);
  b.seg(cx + p.bArm[0], cy + p.bArm[1], cx + p.bArm[0] + (p.bArm[2] - p.bArm[0]) * 0.45, cy + p.bArm[1] + (p.bArm[3] - p.bArm[1]) * 0.45, 2.7, sh.base, sh.light, sh.dark);
  hand(b, ch, cx + p.bArm[2], cy + p.bArm[3], p.hand, false);
  L.push(b);
  // back leg
  b = new Buf(S);
  b.seg(cx + p.bLeg[0], cy + p.bLeg[1], cx + p.bLeg[2], cy + p.bLeg[3], 2.7, ch.pants.dark, ch.pants.base, ch.pants.dark);
  b.rect(cx + p.bLeg[2] - 2, cy + p.bLeg[3] + 1, 6, 3, ch.shoes.base); b.rect(cx + p.bLeg[2] - 2, cy + p.bLeg[3] + 3, 6, 1, ch.shoes.sole);
  L.push(b);
  // torso
  b = new Buf(S);
  b.rect(cx - 2 + Math.round(p.lean * 0.4), cy - 10, 5, 4, sk.mid);
  for (let ry = -8; ry <= 4; ry++) {
    const lx = Math.round(p.lean * (1 - (ry + 8) / 14)), hw = ry < -5 ? 6 : 7;
    for (let rx = -hw; rx <= hw; rx++) {
      let col = sh.base;
      if (rx > 3 || ry > 2) col = sh.dark; else if (rx < -3 && ry < 0) col = sh.light;
      if (sh.split && rx > 0) col = ry > 2 ? sh.split[1] : sh.split[0];
      if (sh.floral) { const k = (rx * 7 + ry * 13 + 91) % 11; if (k === 0) col = sh.floral[0]; else if (k === 5) col = sh.floral[1]; }
      if (sh.inner && Math.abs(rx) <= 2) col = ry > 2 ? '#cbd5e1' : sh.inner;
      b.set(cx + rx + lx, cy + ry, col);
    }
  }
  if (sh.split) for (const yy of [-5, -2, 1]) { b.set(cx - 4, cy + yy, '#052e16'); b.set(cx - 3, cy + yy - 1, '#052e16'); b.set(cx + 4, cy + yy, '#450a0a'); b.set(cx + 3, cy + yy - 1, '#450a0a'); }
  if (sh.logo) { const lx = Math.round(p.lean * 0.5); b.rect(cx + 2 + lx, cy - 5, 3, 2, '#e2e8f0'); b.set(cx + 3 + lx, cy - 6, '#ffffff'); }
  if (!ch.noLanyard) {
    const sw = p.sw, tl = Math.round(p.lean * 0.6), bd = ch.badge || ['#11131a', '#ef4444'];
    b.set(cx - 3 + tl, cy - 8, ch.lanyard); b.set(cx + 3 + tl, cy - 8, ch.lanyard); b.set(cx - 2 + tl, cy - 7, ch.lanyard); b.set(cx + 2 + tl, cy - 7, ch.lanyard);
    b.set(cx - 1 + Math.round(sw * 0.3), cy - 6, ch.lanyard); b.set(cx + 1 + Math.round(sw * 0.3), cy - 6, ch.lanyard); b.set(cx + Math.round(sw * 0.5), cy - 5, '#94a3b8');
    const bx = cx - 2 + Math.round(sw * 0.7), by = cy - 4;
    b.rect(bx, by, 5, 2, bd[0]); b.rect(bx, by + 2, 5, 3, bd[1]); b.set(bx + 1, by + 3, bd[0]); b.set(bx + 3, by + 3, bd[0]);
  }
  L.push(b);
  // front leg
  b = new Buf(S);
  b.seg(cx + p.fLeg[0], cy + p.fLeg[1], cx + p.fLeg[2], cy + p.fLeg[3], 2.8, ch.pants.base, ch.pants.light, ch.pants.dark);
  b.rect(cx + p.fLeg[2] - 2, cy + p.fLeg[3] + 1, 6, 3, ch.shoes.base); b.rect(cx + p.fLeg[2] - 2, cy + p.fLeg[3] + 3, 6, 1, ch.shoes.sole);
  L.push(b);
  // head
  b = new Buf(S);
  hairBack(b, ch, hx, hy); face(b, ch, hx, hy, p.expr); if (!ch.helmet) hairFront(b, ch, hx, hy, p.lift); headExtras(b, ch, hx, hy, p.lift);
  L.push(b);
  // front arm (+ shield)
  b = new Buf(S);
  b.seg(cx + p.fArm[0], cy + p.fArm[1], cx + p.fArm[2], cy + p.fArm[3], 2.2, sk.base, sk.base, sk.mid);
  b.seg(cx + p.fArm[0], cy + p.fArm[1], cx + p.fArm[0] + (p.fArm[2] - p.fArm[0]) * 0.48, cy + p.fArm[1] + (p.fArm[3] - p.fArm[1]) * 0.48, 2.8, sh.base, sh.light, sh.dark);
  hand(b, ch, cx + p.fArm[2], cy + p.fArm[3], p.hand, true);
  L.push(b);
  if (ch.shield && key !== 'ko') {
    b = new Buf(S);
    const down = key === 'smash' && f > 0 || key === 'hit';
    const sx = cx + (down ? 2 : 8), sy = cy - (down ? 2 : 9);
    b.rect(sx, sy, 9, 13, '#3a4358'); b.rect(sx + 1, sy + 1, 7, 9, '#1e1b4b'); b.rect(sx + 2, sy + 2, 5, 2, '#a855f7'); b.rect(sx + 2, sy + 5, 3, 1, '#c4b5fd'); b.rect(sx + 2, sy + 7, 4, 1, '#c4b5fd');
    b.rect(sx, sy + 11, 9, 2, '#7a86a3');
    L.push(b);
  }
  let m = new Buf(S);
  for (const l of L) m.blit(l.outline());
  if (key === 'ko' && f > 0) { // lie down on the floor
    const r = m.rot90();
    m = new Buf(S);
    m.blit(r, 0, f === 1 ? 14 : 16);
  }
  const v = new Buf(S);
  vfx(v, p.vfx, cx, cy);
  m.blit(v);
  return m.canvas();
}

const cache = {};
// Returns { animKey: [canvas,...] } for the requested character, generated once.
export function sprites(id, keys) {
  const set = cache[id] || (cache[id] = {});
  for (const k of keys || Object.keys(ANIMS)) {
    if (set[k]) continue;
    set[k] = [];
    for (let f = 0; f < ANIMS[k]; f++) set[k].push(frame(CHARS[id], k, f));
  }
  return set;
}
