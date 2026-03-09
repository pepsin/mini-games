// ExplosionScene - Particle explosion effect (Godot-style scene)

const { Node2D, ParticleEmitter, LifeTime } = require('../index.js');

// Explosion color palettes
const EXPLOSION_COLORS = {
  fast: [
    { r: 100, g: 200, b: 255 },
    { r: 50, g: 150, b: 255 },
    { r: 200, g: 230, b: 255 }
  ],
  tank: [
    { r: 150, g: 50, b: 50 },
    { r: 100, g: 30, b: 30 },
    { r: 200, g: 100, b: 100 }
  ],
  cluster: [
    { r: 255, g: 100, b: 255 },
    { r: 200, g: 50, b: 200 },
    { r: 255, g: 200, b: 255 }
  ],
  normal: [
    { r: 255, g: 100, b: 0 },
    { r: 255, g: 200, b: 0 },
    { r: 255, g: 50, b: 0 },
    { r: 255, g: 255, b: 100 },
    { r: 200, g: 50, b: 0 }
  ],
  ground: [
    { r: 100, g: 100, b: 100 },
    { r: 80, g: 80, b: 80 },
    { r: 120, g: 120, b: 120 }
  ]
};

class ExplosionScene extends Node2D {
  constructor(options = {}) {
    super('Explosion');
    
    this.explosionType = options.type || 'normal';
    this.frame = 0;
    this.maxFrames = options.maxFrames || 40;
    
    // Setup transform
    this.setPosition(options.x || 0, options.y || 0);
    
    // Get colors
    const colors = EXPLOSION_COLORS[this.explosionType] || EXPLOSION_COLORS.normal;
    const avgColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Add particle emitter for explosion burst
    this.emitter = new ParticleEmitter({
      particleLife: this.maxFrames * 16,
      particleSize: 2 + Math.random() * 4,
      particleSpeed: 60 + Math.random() * 120,
      particleColor: avgColor,
      particleGravity: 0,
      particleDamping: 0.95,
      emissionAngle: { min: 0, max: Math.PI * 2 }
    });
    this.addChild(this.emitter);
    
    // Burst particles
    const particleCount = this.explosionType === 'normal' ? 20 : 28;
    this.emitter.burst(particleCount);
    
    // Auto-destroy after animation
    this.lifeTime = new LifeTime(this.maxFrames * 16);
    this.addChild(this.lifeTime);
  }

  _process(delta) {
    this.frame++;
  }

  _draw(ctx) {
    const progress = this.frame / this.maxFrames;
    
    // Flash effect
    if (progress < 0.3) {
      const flashR = 40 * (progress / 0.3);
      const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
      flashGrad.addColorStop(0, 'rgba(255,255,200,0.8)');
      flashGrad.addColorStop(1, 'rgba(255,200,50,0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(0, 0, flashR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Factory methods
  static create(x, y, bombType = 'normal') {
    return new ExplosionScene({
      x, y,
      type: bombType,
      maxFrames: 40
    });
  }

  static createGround(x, y) {
    return new ExplosionScene({
      x, y,
      type: 'ground',
      maxFrames: 30
    });
  }
}

module.exports = { ExplosionScene, EXPLOSION_COLORS };
