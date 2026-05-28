const { invSx, invSy, W, H } = typeof require !== 'undefined' ? require('./config.js') : window.__modules['js/config.js'];

class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.touches = new Map();
    this.onTouchStart = null;
    this.onTouchMove = null;
    this.onTouchEnd = null;
    this.onPinch = null;
    this.onPan = null;
    this.onTap = null;
    this._setup();
  }

  _setup() {
    const self = this;

    if (typeof wx !== 'undefined' && wx.onTouchStart) {
      wx.onTouchStart(e => self._handleStart(e));
      wx.onTouchMove(e => self._handleMove(e));
      wx.onTouchEnd(e => self._handleEnd(e));
    } else {
      // Mouse support for browser testing
      let mouseDown = false;
      c.addEventListener('mousedown', e => {
        mouseDown = true;
        const rect = c.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (c.width / rect.width);
        const y = (e.clientY - rect.top) * (c.height / rect.height);
        self._handleStart({ changedTouches: [{ identifier: 999, clientX: x, clientY: y }], touches: [{ identifier: 999, clientX: x, clientY: y }] });
      });
      c.addEventListener('mousemove', e => {
        if (!mouseDown) return;
        const rect = c.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (c.width / rect.width);
        const y = (e.clientY - rect.top) * (c.height / rect.height);
        self._handleMove({ touches: [{ identifier: 999, clientX: x, clientY: y }], changedTouches: [{ identifier: 999, clientX: x, clientY: y }] });
      });
      c.addEventListener('mouseup', e => {
        mouseDown = false;
        const rect = c.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (c.width / rect.width);
        const y = (e.clientY - rect.top) * (c.height / rect.height);
        self._handleEnd({ changedTouches: [{ identifier: 999, clientX: x, clientY: y }], touches: [] });
      });
      c.addEventListener('mouseleave', e => {
        if (!mouseDown) return;
        mouseDown = false;
        const rect = c.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (c.width / rect.width);
        const y = (e.clientY - rect.top) * (c.height / rect.height);
        self._handleEnd({ changedTouches: [{ identifier: 999, clientX: x, clientY: y }], touches: [] });
      });
      const c = this.canvas;
      c.addEventListener('touchstart', e => {
        e.preventDefault();
        const rect = c.getBoundingClientRect();
        self._handleStart({ touches: Array.from(e.touches).map(t => ({
          identifier: t.identifier,
          clientX: (t.clientX - rect.left) * (c.width / rect.width) / (window.devicePixelRatio || 1),
          clientY: (t.clientY - rect.top) * (c.height / rect.height) / (window.devicePixelRatio || 1)
        })), changedTouches: Array.from(e.changedTouches).map(t => ({
          identifier: t.identifier,
          clientX: (t.clientX - rect.left) * (c.width / rect.width) / (window.devicePixelRatio || 1),
          clientY: (t.clientY - rect.top) * (c.height / rect.height) / (window.devicePixelRatio || 1)
        })) });
      }, { passive: false });
      c.addEventListener('touchmove', e => {
        e.preventDefault();
        const rect = c.getBoundingClientRect();
        self._handleMove({ touches: Array.from(e.touches).map(t => ({
          identifier: t.identifier,
          clientX: (t.clientX - rect.left) * (c.width / rect.width) / (window.devicePixelRatio || 1),
          clientY: (t.clientY - rect.top) * (c.height / rect.height) / (window.devicePixelRatio || 1)
        })), changedTouches: Array.from(e.changedTouches).map(t => ({
          identifier: t.identifier,
          clientX: (t.clientX - rect.left) * (c.width / rect.width) / (window.devicePixelRatio || 1),
          clientY: (t.clientY - rect.top) * (c.height / rect.height) / (window.devicePixelRatio || 1)
        })) });
      }, { passive: false });
      c.addEventListener('touchend', e => {
        const rect = c.getBoundingClientRect();
        self._handleEnd({ touches: Array.from(e.touches).map(t => ({
          identifier: t.identifier,
          clientX: (t.clientX - rect.left) * (c.width / rect.width) / (window.devicePixelRatio || 1),
          clientY: (t.clientY - rect.top) * (c.height / rect.height) / (window.devicePixelRatio || 1)
        })), changedTouches: Array.from(e.changedTouches).map(t => ({
          identifier: t.identifier,
          clientX: (t.clientX - rect.left) * (c.width / rect.width) / (window.devicePixelRatio || 1),
          clientY: (t.clientY - rect.top) * (c.height / rect.height) / (window.devicePixelRatio || 1)
        })) });
      }, { passive: false });
      c.addEventListener('touchcancel', e => {
        const rect = c.getBoundingClientRect();
        self._handleEnd({ touches: Array.from(e.touches).map(t => ({
          identifier: t.identifier,
          clientX: (t.clientX - rect.left) * (c.width / rect.width) / (window.devicePixelRatio || 1),
          clientY: (t.clientY - rect.top) * (c.height / rect.height) / (window.devicePixelRatio || 1)
        })), changedTouches: Array.from(e.changedTouches).map(t => ({
          identifier: t.identifier,
          clientX: (t.clientX - rect.left) * (c.width / rect.width) / (window.devicePixelRatio || 1),
          clientY: (t.clientY - rect.top) * (c.height / rect.height) / (window.devicePixelRatio || 1)
        })) });
      }, { passive: false });
    }
  }

  _toGameCoords(clientX, clientY) {
    return { x: invSx(clientX), y: invSy(clientY) };
  }

  _handleStart(e) {
    for (const t of e.changedTouches) {
      const g = this._toGameCoords(t.clientX, t.clientY);
      this.touches.set(t.identifier, { x: t.clientX, y: t.clientY, gx: g.x, gy: g.y, time: Date.now() });
    }

    if (e.changedTouches.length === 1 && this.touches.size === 1) {
      const t = e.changedTouches[0];
      const g = this._toGameCoords(t.clientX, t.clientY);
      if (this.onTouchStart) this.onTouchStart(g.x, g.y, t.identifier);
    }
  }

  _handleMove(e) {
    const touchArray = Array.from(this.touches.values());

    if (this.touches.size === 2 && e.touches.length === 2) {
      // Pinch / pan
      const ids = Array.from(this.touches.keys());
      const old0 = this.touches.get(ids[0]);
      const old1 = this.touches.get(ids[1]);
      const new0 = e.touches.find(t => t.identifier === ids[0]);
      const new1 = e.touches.find(t => t.identifier === ids[1]);
      if (new0 && new1 && old0 && old1) {
        const oldDist = Math.hypot(old0.x - old1.x, old0.y - old1.y);
        const newDist = Math.hypot(new0.clientX - new1.clientX, new0.clientY - new1.clientY);
        const scaleDelta = newDist / (oldDist || 1);
        const oldCx = (old0.x + old1.x) / 2;
        const oldCy = (old0.y + old1.y) / 2;
        const newCx = (new0.clientX + new1.clientX) / 2;
        const newCy = (new0.clientY + new1.clientY) / 2;
        const panDeltaX = newCx - oldCx;
        const panDeltaY = newCy - oldCy;
        if (this.onPinch) this.onPinch(scaleDelta, oldCx, oldCy);
        if (this.onPan) this.onPan(panDeltaX, panDeltaY);
        this.touches.set(ids[0], { x: new0.clientX, y: new0.clientY, gx: invSx(new0.clientX), gy: invSy(new0.clientY) });
        this.touches.set(ids[1], { x: new1.clientX, y: new1.clientY, gx: invSx(new1.clientX), gy: invSy(new1.clientY) });
      }
    } else if (this.touches.size === 1 && e.touches.length === 1) {
      const t = e.touches[0];
      const g = this._toGameCoords(t.clientX, t.clientY);
      if (this.onTouchMove) this.onTouchMove(g.x, g.y, t.identifier);
    }
  }

  _handleEnd(e) {
    for (const t of e.changedTouches) {
      const old = this.touches.get(t.identifier);
      if (old) {
        const dt = Date.now() - old.time;
        const dist = Math.hypot(t.clientX - old.x, t.clientY - old.y);
        if (dt < 300 && dist < 10 && this.onTap) {
          const g = this._toGameCoords(t.clientX, t.clientY);
          this.onTap(g.x, g.y);
        }
      }
      this.touches.delete(t.identifier);
    }
    if (this.onTouchEnd) this.onTouchEnd();
  }
}

const moduleExports = { InputHandler };
if (typeof module !== 'undefined' && module.exports) module.exports = moduleExports;
if (typeof window !== 'undefined') {
  window.__modules = window.__modules || {};
  window.__modules['js/input.js'] = moduleExports;
}
