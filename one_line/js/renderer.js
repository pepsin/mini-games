const { sx, sy, ss, W, H, COLORS, FONTS } = typeof require !== 'undefined' ? require('./config.js') : window.__modules['js/config.js'];

const MAZE_AREA_TOP = 100;
const MAZE_AREA_BOTTOM = H - 160;
const MAZE_AREA_LEFT = 20;
const MAZE_AREA_RIGHT = W - 20;

class GameRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.maze = null;
    this.cameraScale = 1;
    this.cameraX = 0;
    this.cameraY = 0;
    this.cellSize = 40;
    this.gap = 2;
    this.playerPath = [];
    this.currentCell = null;
    this.hintPath = null;
    this.levelCompleteAnim = 0;
    this.particles = [];
  }

  setMaze(maze) {
    this.maze = maze;
    this.playerPath = [];
    this.currentCell = null;
    this.levelCompleteAnim = 0;
    this.particles = [];
    this._fitCamera();
  }

  _fitCamera() {
    if (!this.maze) return;
    const mw = this.maze.w * (this.cellSize + this.gap) - this.gap;
    const mh = this.maze.h * (this.cellSize + this.gap) - this.gap;
    const aw = MAZE_AREA_RIGHT - MAZE_AREA_LEFT;
    const ah = MAZE_AREA_BOTTOM - MAZE_AREA_TOP;
    this.cameraScale = Math.min(aw / mw, ah / mh, 1.5);
    this.cameraX = (W - mw * this.cameraScale) / 2;
    this.cameraY = MAZE_AREA_TOP + (ah - mh * this.cameraScale) / 2;
  }

  screenToMaze(gx, gy) {
    const cs = this.cellSize * this.cameraScale;
    const g = this.gap * this.cameraScale;
    const mx = (gx - this.cameraX) / (cs + g);
    const my = (gy - this.cameraY) / (cs + g);
    const x = Math.floor(mx);
    const y = Math.floor(my);
    if (this.maze && this.maze.inBounds(x, y)) return { x, y, fx: mx - x, fy: my - y };
    return null;
  }

  update(dt) {
    if (this.levelCompleteAnim > 0) {
      this.levelCompleteAnim = Math.min(1, this.levelCompleteAnim + dt * 1.5);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vy += 200 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  spawnParticles(cell) {
    const cs = this.cellSize * this.cameraScale;
    const g = this.gap * this.cameraScale;
    const px = this.cameraX + cell.x * (cs + g) + cs / 2;
    const py = this.cameraY + cell.y * (cs + g) + cs / 2;
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.5 + Math.random() * 0.5,
        color: Math.random() > 0.5 ? COLORS.gold : COLORS.success,
        size: 3 + Math.random() * 4
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    if (!this.maze) return;

    const cs = this.cellSize * this.cameraScale;
    const g = this.gap * this.cameraScale;

    // Draw maze cells
    for (let y = 0; y < this.maze.h; y++) {
      for (let x = 0; x < this.maze.w; x++) {
        const px = sx(this.cameraX + x * (cs + g));
        const py = sy(this.cameraY + y * (cs + g));
        const size = ss(cs);
        const isPath = this.maze.isPath(x, y);

        if (isPath) {
          // Check if visited
          const visitedIndex = this.playerPath.findIndex(p => p.x === x && p.y === y);
          const isCurrent = this.currentCell && this.currentCell.x === x && this.currentCell.y === y;

          if (visitedIndex >= 0) {
            const t = visitedIndex / Math.max(1, this.playerPath.length - 1);
            const r = Math.floor(78 + (255 - 78) * t);
            const gr = Math.floor(205 + (215 - 205) * t);
            const b = Math.floor(196 + (0 - 196) * t);
            ctx.fillStyle = `rgb(${r},${gr},${b})`;
          } else {
            ctx.fillStyle = COLORS.path;
          }
          if (isCurrent) {
            ctx.fillStyle = COLORS.pathHover;
          }
        } else {
          ctx.fillStyle = COLORS.wall;
        }

        const r = ss(4 * this.cameraScale);
        this._roundRect(px, py, size, size, r);
        ctx.fill();

        if (!isPath) {
          ctx.strokeStyle = COLORS.wallBorder;
          ctx.lineWidth = ss(1);
          this._roundRect(px, py, size, size, r);
          ctx.stroke();
        }
      }
    }

    // Draw path line
    if (this.playerPath.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < this.playerPath.length; i++) {
        const p = this.playerPath[i];
        const px = sx(this.cameraX + p.x * (cs + g) + cs / 2);
        const py = sy(this.cameraY + p.y * (cs + g) + cs / 2);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = COLORS.pathLine;
      ctx.lineWidth = ss(cs * 0.3);
      ctx.stroke();
    }

    // Draw hint path
    if (this.hintPath && this.hintPath.length > 1) {
      ctx.save();
      ctx.setLineDash([ss(4), ss(4)]);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < this.hintPath.length; i++) {
        const p = this.hintPath[i];
        const px = sx(this.cameraX + p.x * (cs + g) + cs / 2);
        const py = sy(this.cameraY + p.y * (cs + g) + cs / 2);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = ss(cs * 0.25);
      ctx.stroke();
      ctx.restore();
    }

    // Draw start/end indicators
    if (this.playerPath.length > 0) {
      const start = this.playerPath[0];
      const end = this.playerPath[this.playerPath.length - 1];
      ctx.fillStyle = COLORS.endpoint;
      ctx.beginPath();
      ctx.arc(
        sx(this.cameraX + start.x * (cs + g) + cs / 2),
        sy(this.cameraY + start.y * (cs + g) + cs / 2),
        ss(cs * 0.15), 0, Math.PI * 2
      );
      ctx.fill();
      if (this.playerPath.length > 1) {
        ctx.beginPath();
        ctx.arc(
          sx(this.cameraX + end.x * (cs + g) + cs / 2),
          sy(this.cameraY + end.y * (cs + g) + cs / 2),
          ss(cs * 0.15), 0, Math.PI * 2
        );
        ctx.fill();
      }
    }

    // Level complete animation
    if (this.levelCompleteAnim > 0) {
      const alpha = this.levelCompleteAnim;
      ctx.save();
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = COLORS.success;
      for (let y = 0; y < this.maze.h; y++) {
        for (let x = 0; x < this.maze.w; x++) {
          if (this.maze.isPath(x, y)) {
            const px = sx(this.cameraX + x * (cs + g));
            const py = sy(this.cameraY + y * (cs + g));
            const size = ss(cs);
            const r = ss(4 * this.cameraScale);
            this._roundRect(px, py, size, size, r);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.y), ss(p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

const moduleExports = { GameRenderer, MAZE_AREA_TOP, MAZE_AREA_BOTTOM, MAZE_AREA_LEFT, MAZE_AREA_RIGHT };
if (typeof module !== 'undefined' && module.exports) module.exports = moduleExports;
if (typeof window !== 'undefined') {
  window.__modules = window.__modules || {};
  window.__modules['js/renderer.js'] = moduleExports;
}
