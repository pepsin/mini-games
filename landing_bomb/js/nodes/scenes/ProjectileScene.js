// ProjectileScene - A projectile fired from the slingshot (Godot-style scene)

const { Node2D, Velocity, Collider, LifeTime } = require('../index.js');
const { ss } = require('../../config.js');

class ProjectileScene extends Node2D {
  constructor(options = {}) {
    super('Projectile');
    
    this.radius = options.radius || 12;
    this.hits = 0;
    this.maxHits = options.maxHits || 3;
    this.trail = [];
    this.maxTrailLength = 3;
    
    // Setup transform
    this.setPosition(options.x || 0, options.y || 0);
    
    // Add velocity component (vx, vy in pixels/second)
    this.velocity = new Velocity(options.vx || 0, options.vy || 0);
    this.velocity.setGravity(720); // 0.12 * 60fps * 100 = 720 px/s^2
    this.addChild(this.velocity);
    
    // Add collider
    this.collider = new Collider(this.radius);
    this.collider.layer = 1; // Projectile layer
    this.collider.mask = 2;  // Collide with bombs
    this.addChild(this.collider);
  }

  _physicsProcess(delta) {
    // Store trail positions
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  _draw(ctx) {
    const r = ss(this.radius);
    
    // Draw trail
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const trailR = r * (0.6 + i * 0.15);
      ctx.beginPath();
      ctx.arc(t.x - this.x, t.y - this.y, trailR, 0, Math.PI * 2);
      ctx.fillStyle = '#555';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Draw projectile body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    grad.addColorStop(0, '#777');
    grad.addColorStop(1, '#222');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = ss(1);
    ctx.stroke();
  }

  // Factory method
  static createFromSlingshot(sling, dragCurrent, maxDrag) {
    const pivotX = sling.x;
    const pivotY = sling.y - sling.prongH;
    
    const dx = dragCurrent.x - pivotX;
    const dy = dragCurrent.y - pivotY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampDist = Math.min(dist, maxDrag);
    
    if (clampDist < 10) return null;

    const angle = Math.atan2(dy, dx);
    const pullX = pivotX + Math.cos(angle) * clampDist;
    const pullY = pivotY + Math.sin(angle) * clampDist;

    const vx = -(pullX - pivotX) * 0.18 * 60; // Scale for delta time
    const vy = -(pullY - pivotY) * 0.18 * 60;

    return new ProjectileScene({
      x: pivotX,
      y: pivotY,
      vx: vx,
      vy: vy
    });
  }

  // Check if out of bounds
  isOutOfBounds(bounds) {
    return this.x < bounds.left || this.x > bounds.right || 
           this.y < bounds.top || this.y > bounds.bottom;
  }

  // Register a hit
  registerHit() {
    this.hits++;
    return this.hits;
  }
}

module.exports = { ProjectileScene };
