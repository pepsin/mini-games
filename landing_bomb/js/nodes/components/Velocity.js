// Velocity Component - adds movement physics

const { Component } = require('./Component.js');
const { Node2D } = require('../Node2D.js');

class Velocity extends Component {
  constructor(vx = 0, vy = 0) {
    super('Velocity');
    this.vx = vx;
    this.vy = vy;
    this.gravity = 0;
    this.friction = 0;
    this.maxSpeed = null;
    this.damping = 1; // 1 = no damping, 0.9 = 10% damping per second
  }

  setVelocity(vx, vy) {
    this.vx = vx;
    this.vy = vy;
    return this;
  }

  setGravity(gravity) {
    this.gravity = gravity;
    return this;
  }

  setFriction(friction) {
    this.friction = friction;
    return this;
  }

  setMaxSpeed(maxSpeed) {
    this.maxSpeed = maxSpeed;
    return this;
  }

  setDamping(damping) {
    this.damping = damping;
    return this;
  }

  // Apply impulse (instant force)
  impulse(vx, vy) {
    this.vx += vx;
    this.vy += vy;
    return this;
  }

  // Apply force (acceleration)
  force(fx, fy, delta) {
    this.vx += fx * delta;
    this.vy += fy * delta;
    return this;
  }

  _physicsProcess(delta) {
    const node = this.getNode();
    if (!node || !(node instanceof Node2D)) return;

    // Convert delta from ms to seconds for physics
    const dt = delta / 1000;

    // Apply gravity
    if (this.gravity !== 0) {
      this.vy += this.gravity * dt;
    }

    // Apply friction
    if (this.friction !== 0) {
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > 0) {
        const newSpeed = Math.max(0, speed - this.friction * dt);
        this.vx = (this.vx / speed) * newSpeed;
        this.vy = (this.vy / speed) * newSpeed;
      }
    }

    // Apply damping
    if (this.damping !== 1) {
      const dampingFactor = Math.pow(this.damping, dt);
      this.vx *= dampingFactor;
      this.vy *= dampingFactor;
    }

    // Apply max speed limit
    if (this.maxSpeed !== null) {
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > this.maxSpeed) {
        const scale = this.maxSpeed / speed;
        this.vx *= scale;
        this.vy *= scale;
      }
    }

    // Update position (velocity is in pixels/second)
    node.x += this.vx * dt;
    node.y += this.vy * dt;
  }
}

module.exports = { Velocity };
