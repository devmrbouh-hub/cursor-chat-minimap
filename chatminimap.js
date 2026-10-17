// Chat minimap for Cursor Agents window: markers for each user prompt, hover preview, click to jump.
(() => {
  if (window.__cmmStop) { try { window.__cmmStop(); } catch (e) {} }

  const ROW = '.virtualized-composer-messages-row';
  const SC = '.virtualized-composer-messages-scroll-container';
  const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  const css = `
.cmm-bar{position:fixed;width:26px;z-index:2147483000;cursor:pointer;user-select:none}
.cmm-bar.cmm-hidden{display:none}
.cmm-mk{position:absolute;right:4px;height:2px;width:8px;border-radius:1px;background:rgba(200,200,200,.35);transition:width .08s,background .08s;pointer-events:none}
.cmm-mk.cmm-act{background:rgba(230,230,230,.75);width:12px}
.cmm-mk.cmm-hov{background:#fff}
.cmm-tip{position:fixed;z-index:2147483001;max-width:340px;min-width:200px;padding:10px 12px;border-radius:8px;background:#252526;border:1px solid rgba(255,255,255,.12);box-shadow:0 6px 24px rgba(0,0,0,.45);pointer-events:none;font-family:inherit;display:none}
.cmm-q{font-weight:600;font-size:13px;line-height:1.35;color:#e6e6e6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:5px}
.cmm-a{font-size:12px;line-height:1.4;color:#9a9a9a;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.cmm-ov{position:fixed;z-index:2147483002;display:flex;align-items:center;justify-content:center;background:rgba(24,24,24,.92);color:#bbb;font-size:13px}
`;
  const st = el('style'); st.textContent = css; document.head.appendChild(st);

  const tip = el('div', 'cmm-tip'); const tq = el('div', 'cmm-q'); const ta = el('div', 'cmm-a');
  tip.append(tq, ta); document.body.appendChild(tip);

  const ctrls = new Map(); // scroll container -> controller

  function agentIdOf(sc) { const a = sc.closest('[data-glass-agent-id]'); return a ? a.getAttribute('data-glass-agent-id') : 'default'; }
  function rowText(r) {
    const ed = r.querySelector('.aislash-editor-input-readonly');
    let t = (ed ? ed.innerText : r.innerText) || '';
    return t.replace('Sent by voice call', '').replace(/\s+/g, ' ').trim().slice(0, 240);
  }

  class Ctrl {
    constructor(sc) {
      this.sc = sc; this.agent = agentIdOf(sc); this.map = new Map(); this.scanning = false;
      this.bar = el('div', 'cmm-bar'); document.body.appendChild(this.bar);
      this.mks = []; this.hov = -1; this.dirty = true;
      this.load();
      this.onScroll = () => { if (!this.scanning) { this.harvest(); this.markActive(); } };
      sc.addEventListener('scroll', this.onScroll, { passive: true });
      this.bar.addEventListener('mousemove', e => this.hover(e));
      this.bar.addEventListener('mouseleave', () => { this.hov = -1; tip.style.display = 'none'; this.paint(); });
      this.bar.addEventListener('click', e => { if (e.altKey) { this.map.clear(); this.save(); this.scan(); return; } const k = this.keys[this.hov]; if (k != null) this.go(k); });
      this.harvest();
      setTimeout(() => this.maybeScan(), 1200);
    }
    key() { return 'cmm:' + this.agent; }
    load() { try { const d = JSON.parse(localStorage.getItem(this.key()) || 'null'); if (d) for (const [k, v] of d) this.map.set(+k, v); } catch (e) {} this.dirty = true; }
    save() { clearTimeout(this.svT); this.svT = setTimeout(() => { try { localStorage.setItem(this.key(), JSON.stringify([...this.map])); } catch (e) {} }, 500); }
    maxPair() { let m = -1; for (const r of this.sc.querySelectorAll(ROW)) { const p = +r.dataset.pairIndex; if (!isNaN(p) && p > m) m = p; } return m; }
    harvest() {
      let ch = false;
      for (const r of this.sc.querySelectorAll(ROW)) {
        const k = r.dataset.findRowKey || ''; const p = +r.dataset.pairIndex; if (isNaN(p)) continue;
        if (k.startsWith('human:')) {
          const id = k.slice(6, 42); let e = this.map.get(p);
          if (e && e.id && e.id !== id) { this.map.clear(); e = null; ch = true; } // different chat in the same container
          if (!e) { e = {}; this.map.set(p, e); ch = true; }
          const top = parseFloat(r.style.top); if (!isNaN(top) && e.top !== top) { e.top = top; ch = true; }
          if (e.id !== id) { e.id = id; ch = true; }
          const q = rowText(r); if (q && e.q !== q) { e.q = q; ch = true; }
        } else if (k.startsWith('assistant-markdown:')) {
          const e = this.map.get(p); if (e && !e.a) { const a = (r.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300); if (a) { e.a = a; ch = true; } }
        }
      }
      if (ch) { this.dirty = true; this.save(); }
    }
    async maybeScan() { const m = this.maxPair(); if (m >= 0 && this.map.size < m + 1) this.scan(); }
    async scan() {
      if (this.scanning) return; this.scanning = true;
      const sc = this.sc, orig = sc.scrollTop, agent = this.agent;
      const ov = el('div', 'cmm-ov', 'Индексирую вопросы чата…'); const r = sc.getBoundingClientRect();
      Object.assign(ov.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      document.body.appendChild(ov);
      try {
        for (let y = 0; y < sc.scrollHeight; y += sc.clientHeight * 1.5) {
          if (!sc.isConnected || agentIdOf(sc) !== agent) break;
          sc.scrollTop = y; await raf(); this.harvest();
        }
        sc.scrollTop = sc.scrollHeight; await raf(); this.harvest();
      } finally { sc.scrollTop = orig; await raf(); ov.remove(); this.scanning = false; this.dirty = true; }
    }
    async go(p) {
      const sc = this.sc; const e = this.map.get(p); if (!e) return;
      tip.style.display = 'none';
      sc.scrollTop = Math.max(0, (e.top || 0) - 12);
      for (let i = 0; i < 8; i++) {
        await raf();
        const r = sc.querySelector(`${ROW}[data-pair-index="${p}"][data-find-row-key^="human:"]`);
        const t = r ? parseFloat(r.style.top) : NaN;
        if (!isNaN(t)) { e.top = t; const want = Math.max(0, t - 12); if (Math.abs(sc.scrollTop - want) < 3) break; sc.scrollTop = want; }
      }
      this.markActive();
    }
    layout() {
      const sc = this.sc; const r = sc.getBoundingClientRect();
      let vis = sc.isConnected && r.width > 200 && r.height > 120 && this.map.size > 1;
      if (vis && sc.checkVisibility && !sc.checkVisibility({ opacityProperty: true, visibilityProperty: true })) vis = false;
      if (vis && !this.scanning) { // hidden chats stay in the DOM behind the active one
        const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + r.width / 3, r.top + r.height / 3]];
        vis = pts.some(([x, y]) => { const t = document.elementFromPoint(x, y); return t && (sc.contains(t) || t.closest('.cmm-bar,.cmm-tip,.cmm-ov')); });
      }
      this.bar.classList.toggle('cmm-hidden', !vis); if (!vis) return;
      const pad = 12;
      const shell = sc.querySelector('.virtualized-composer-messages-content-shell');
      let x = r.right - 34;
      if (shell) { const s = shell.getBoundingClientRect(); if (s.width > 100) x = Math.min(x, s.right + 10); }
      const side = sc.querySelector('.composer-messages-standalone-sidecar-host');
      if (side) { const s = side.getBoundingClientRect(); if (s.width > 20 && s.left > r.left) x = Math.min(x, s.left - 30); }
      Object.assign(this.bar.style, { left: x + 'px', top: (r.top + pad) + 'px', height: (r.height - pad * 2) + 'px' });
      const h = r.height - pad * 2, total = Math.max(1, sc.scrollHeight);
      if (this.dirty || this.lastH !== h || this.lastTotal !== total) {
        this.dirty = false; this.lastH = h; this.lastTotal = total;
        this.keys = [...this.map.keys()].sort((a, b) => a - b);
        while (this.mks.length < this.keys.length) { const m = el('div', 'cmm-mk'); this.bar.appendChild(m); this.mks.push(m); }
        while (this.mks.length > this.keys.length) this.mks.pop().remove();
        this.ys = this.keys.map(k => Math.min(h - 2, Math.max(0, ((this.map.get(k).top || 0) / total) * h)));
        this.mks.forEach((m, i) => { m.style.top = this.ys[i] + 'px'; });
        this.markActive();
      }
    }
    markActive() {
      if (!this.keys) return; const t = this.sc.scrollTop + 40; let a = -1;
      this.keys.forEach((k, i) => { if ((this.map.get(k).top || 0) <= t) a = i; });
      this.act = a; this.paint();
    }
    paint(my) {
      if (!this.mks) return;
      this.mks.forEach((m, i) => {
        let w = i === this.act ? 12 : 8;
        if (my != null) { const d = Math.abs(this.ys[i] - my); w = Math.max(w, 8 + 12 * Math.max(0, 1 - d / 36)); }
        m.style.width = w + 'px';
        m.classList.toggle('cmm-act', i === this.act); m.classList.toggle('cmm-hov', i === this.hov);
      });
    }
    hover(ev) {
      if (!this.ys || !this.ys.length) return;
      const br = this.bar.getBoundingClientRect(); const my = ev.clientY - br.top;
      let best = 0, bd = 1e9; this.ys.forEach((y, i) => { const d = Math.abs(y - my); if (d < bd) { bd = d; best = i; } });
      this.hov = best; this.paint(my);
      const e = this.map.get(this.keys[best]);
      if (!tip.isConnected) document.body.appendChild(tip);
      tq.textContent = e.q || '(без текста)'; ta.textContent = e.a || '…';
      tip.style.display = 'block';
      const th = tip.offsetHeight, tw = tip.offsetWidth;
      let top = br.top + this.ys[best] - th / 2; top = Math.max(8, Math.min(window.innerHeight - th - 8, top));
      tip.style.top = top + 'px'; tip.style.left = (br.left - tw - 8) + 'px';
    }
    destroy() { this.sc.removeEventListener('scroll', this.onScroll); this.bar.remove(); }
  }

  function tick() {
    try {
      if (!st.isConnected) document.head.appendChild(st);
      if (!tip.isConnected) document.body.appendChild(tip);
      const live = new Set(document.querySelectorAll(SC));
      for (const [sc, c] of ctrls) if (!live.has(sc) || !sc.isConnected) { c.destroy(); ctrls.delete(sc); }
      for (const sc of live) {
        let c = ctrls.get(sc);
        if (c && c.agent !== agentIdOf(sc)) { c.destroy(); ctrls.delete(sc); c = null; }
        if (!c) { c = new Ctrl(sc); ctrls.set(sc, c); }
        if (!c.scanning) c.harvest();
        c.layout();
      }
    } catch (e) { console.warn('[chat-minimap]', e); }
  }
  const iv = setInterval(tick, 700);
  window.addEventListener('resize', tick);
  window.__cmmStop = () => { clearInterval(iv); window.removeEventListener('resize', tick); for (const c of ctrls.values()) c.destroy(); ctrls.clear(); st.remove(); tip.remove(); };
})();
