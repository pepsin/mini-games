// ParticleEmitter Component - emits particles

const { Component } = require('./Component.js');
const { Node2D } = require('../Node2D.js');

class Particle extends Node2D {
  constructor(options = {}) {
    super('Particle');
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.life = options.life || 1000;
    this.maxLife = this.life;
    this.size = options.size || 4;
    this.color = options.color || { r: 255, g: 255, b: 255 };
    this.gravity = options.gravity || 0;
    this.damping = options.damping || 1;
    this.growth = options.growth || 0; // Size change per second
  }

  _process(delta) {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.vy += this.gravity * delta;
    this.vx *= Math.pow(this.damping, delta);
    this.vy *= Math.pow(this.damping, delta);
    this.size += this.growth * delta;
    this.life -= delta;

    if (this.life <= 0) {
      this.queueFree();
    }
  }

  _draw(ctx) {
    const alpha = this.life / this.maxLife;
    const size = Math.max(0, this.size);
    
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;
    ctx.fill();
  }
}

class ParticleEmitter extends Component {
  constructor(options = {}) {
    super('ParticleEmitter');
    this.emitting = false;
    this.emissionRate = options.emissionRate || 10; // particles per second
    this.emissionTimer = 0;
    this.particlePool = [];
    this.poolSize = options.poolSize || 100;
    
    // Particle properties
    this.particleLife = options.particleLife || 1000;
    this.particleSize = options.particleSize || 4;
    this.particleSpeed = options.particleSpeed || 50;
    this.particleColor = options.particleColor || { r: 255, g: 255, b: 255 };
    this.particleGravity = options.particleGravity || 0;
    this.particleDamping = options.particleDamping || 1;
    this.particleGrowth = options.particleGrowth || 0;
    this.emissionAngle = options.emissionAngle || { min: 0, max: Math.PI * 2 };
    this.emissionShape = options.emissionShape || 'point'; // 'point', 'circle', 'ring'
    this.emissionRadius = options.emissionRadius || 0;
  }

  setEmitting(emitting) {
    this.emitting = emitting;
    return this;
  }

  emit(count = 1) {
    const node = this.getNode();
    if (!node) return;

    const root = node.getRoot();

    for (let i = 0; i < count; i++) {
      const angle = this.emissionAngle.min + Math.random() * (this.emissionAngle.max - this.emissionAngle.min);
      const speed = this.particleSpeed * (0.5 + Math.random() * 0.5);
      
      const particle = new Particle({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: this.particleLife * (0.8 + Math.random() * 0.4),
        size: this.particleSize * (0.8 + Math.random() * 0.4),
        color: this.particleColor,
        gravity: this.particleGravity,
        damping: this.particleDamping,
        growth: this.particleGrowth
      });

      // Position based on emission shape
      let px = node.x;
      let py = node.y;
      
      if (this.emissionShape === 'circle') {
        const r = Math.random() * this.emissionRadius;
        const a = Math.random() * Math.PI * 2;
        px += Math.cos(a) * r;
        py += Math.sin(a) * r;
      } else if (this.emissionShape === 'ring') {
        const a = Math.random() * Math.PI * 2;
        px += Math.cos(a) * this.emissionRadius;
        py += Math.sin(a) * this.emissionRadius;
      }

      particle.setPosition(px, py);
      root.addChild(particle);
    }
  }

  burst(count = 20) {
    this.emit(count);
    return this;
  }

  _process(delta) {
    if (!this.emitting) return;

    // delta is in ms, convert emission timing accordingly
    this.emissionTimer += delta;
    const interval = 1000 / this.emissionRate;

    while (this.emissionTimer >= interval) {
      this.emit(1);
      this.emissionTimer -= interval;
    }
  }
}

module.exports = { ParticleEmitter, Particle };
