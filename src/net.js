// Serverless online play over PeerJS (global `Peer`, public broker). Host browser = room; guests connect by room code.
const PFX = 'kalekapmaca-solo-', CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', GEN = 'BAĞLANTI HATASI', DOWN = 'SUNUCUYA ULAŞILAMADI';
const ERR = { 'peer-unavailable': 'ODA BULUNAMADI', network: DOWN, 'server-error': DOWN, 'socket-error': DOWN, 'socket-closed': DOWN, timeout: DOWN, webrtc: 'DOĞRUDAN BAĞLANTI KURULAMADI' };
export const cleanCode = (s) => [...String(s).toUpperCase()].filter((c) => CH.includes(c)).join('').slice(0, 6);
const newCode = () => Array.from({ length: 6 }, () => CH[(Math.random() * CH.length) | 0]).join('');
const open = (id) => new Promise((res, rej) => {
  if (typeof Peer === 'undefined') return rej({ type: 'network' });
  const p = id ? new Peer(id) : new Peer();
  const fail = (e) => { clearTimeout(to); p.destroy(); rej(e); };
  const to = setTimeout(() => fail({ type: 'timeout' }), 10000);
  p.once('open', () => { clearTimeout(to); p.off('error', fail); res(p); });
  p.once('error', fail);
});
const dead = () => (document.hidden ? 20000 : 10000);

// cb: { join(id), msg(id,m), leave(id), error(text) } -> { code, send(id,m), all(m,lossy), close() }
export async function host(cb) {
  let peer, code, off = false;
  for (let i = 0; i < 4 && !peer; i++) {
    code = newCode();
    try { peer = await open(PFX + code); } catch (e) { if (e.type !== 'unavailable-id') throw ERR[e.type] || GEN; }
  }
  if (!peer) throw GEN;
  const conns = new Map(), seen = new Map();
  const drop = (id) => { const c = conns.get(id); if (!c) return; conns.delete(id); seen.delete(id); try { c.close(); } catch (e) { /* ignore */ } cb.leave(id); };
  const close = () => { if (off) return; off = true; clearInterval(iv); conns.forEach((c) => { try { c.close(); } catch (e) { /* ignore */ } }); peer.destroy(); };
  const iv = setInterval(() => { const n = Date.now(); conns.forEach((c, id) => { if (c.open) c.send({ k: 'ping' }); if (n - seen.get(id) > dead()) drop(id); }); }, 2000);
  peer.on('connection', (c) => {
    c.on('open', () => { conns.set(c.peer, c); seen.set(c.peer, Date.now()); cb.join(c.peer); });
    c.on('data', (m) => { seen.set(c.peer, Date.now()); if (m.k !== 'ping') cb.msg(c.peer, m); });
    c.on('close', () => drop(c.peer)); c.on('error', () => drop(c.peer));
  });
  peer.on('error', (e) => { if (!off && e.type !== 'peer-unavailable') cb.error(ERR[e.type] || GEN); });
  peer.on('disconnected', () => setTimeout(() => { if (!off && peer.disconnected && !peer.destroyed) peer.reconnect(); }, 1500));
  return {
    code, close, drop,
    send: (id, m) => { const c = conns.get(id); if (c && c.open) c.send(m); },
    all: (m, lossy) => conns.forEach((c) => { if (c.open && !(lossy && c.dataChannel && c.dataChannel.bufferedAmount > 262144)) c.send(m); }),
  };
}

// cb: { msg(m), closed(text) } -> { send(m), close() }; rejects with a Turkish message
export async function join(code, cb) {
  let peer;
  try { peer = await open(); } catch (e) { throw ERR[e.type] || GEN; }
  return new Promise((res, rej) => {
    let ok = false, off = false, seen = Date.now();
    const c = peer.connect(PFX + code, { reliable: true, serialization: 'json' });
    const close = () => { off = true; clearInterval(iv); clearTimeout(to); try { c.close(); } catch (e) { /* ignore */ } peer.destroy(); };
    const lose = (t) => { if (off) return; close(); if (ok) cb.closed(t); else rej(t); };
    const to = setTimeout(() => lose('ODA BULUNAMADI'), 15000);
    const iv = setInterval(() => { if (!ok) return; if (c.open) c.send({ k: 'ping' }); if (Date.now() - seen > dead()) lose('BAĞLANTI KOPTU'); }, 2000);
    c.on('open', () => { ok = true; clearTimeout(to); seen = Date.now(); res({ send: (m) => { if (c.open) c.send(m); }, close }); });
    c.on('data', (m) => { seen = Date.now(); if (m.k !== 'ping') cb.msg(m); });
    c.on('close', () => lose('ODA KAPANDI')); c.on('error', () => lose(GEN));
    peer.on('error', (e) => lose(ERR[e.type] || GEN));
  });
}
