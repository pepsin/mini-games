// Collider Component - simple collision detection

const { Component } = require('./Component.js');
const { Node2D } = require('../Node2D.js');
const { Node } = require('../Node.js');

class Collider extends Component {
  constructor(radius = 10) {
    super('Collider');
    this.radius = radius;
    this.layer = 1; // Collision layer
    this.mask = 1;  // Layers to check collisions against
    this.onCollision = null; // Callback(otherCollider, otherNode)
    this._colliding = false;
  }

  setRadius(radius) {
    this.radius = radius;
    return this;
  }

  setLayer(layer) {
    this.layer = layer;
    return this;
  }

  setMask(mask) {
    this.mask = mask;
    return this;
  }

  // Check if colliding with another collider
  checkCollision(other) {
    if (!(other instanceof Collider)) return false;
    if (!(this.mask & other.layer) && !(other.mask & this.layer)) return false;

    const node1 = this.getNode();
    const node2 = other.getNode();
    if (!node1 || !node2) return false;

    const dx = node1.x - node2.x;
    const dy = node1.y - node2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist < (this.radius + other.radius);
  }

  // Get collision info
  getCollisionInfo(other) {
    const node1 = this.getNode();
    const node2 = other.getNode();
    if (!node1 || !node2) return null;

    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= (this.radius + other.radius)) return null;

    const nx = dx / dist;
    const ny = dy / dist;
    const penetration = (this.radius + other.radius) - dist;

    return {
      normal: { x: nx, y: ny },
      penetration: penetration,
      point: {
        x: node1.x + nx * this.radius,
        y: node1.y + ny * this.radius
      }
    };
  }

  _draw(ctx) {
    // Debug visualization - draw collision circle
    // Uncomment for debugging:
    /*
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this._colliding ? 'red' : 'lime';
    ctx.lineWidth = 2;
    ctx.stroke();
    this._colliding = false;
    */
  }
}

// Collision system - manages all colliders
class CollisionSystem extends Node {
  constructor() {
    super('CollisionSystem');
    this.colliders = [];
  }

  registerCollider(collider) {
    if (!this.colliders.includes(collider)) {
      this.colliders.push(collider);
    }
  }

  unregisterCollider(collider) {
    const idx = this.colliders.indexOf(collider);
    if (idx >= 0) {
      this.colliders.splice(idx, 1);
    }
  }

  // Check all collisions
  checkAllCollisions() {
    for (let i = 0; i < this.colliders.length; i++) {
      for (let j = i + 1; j < this.colliders.length; j++) {
        const c1 = this.colliders[i];
        const c2 = this.colliders[j];

        if (c1.checkCollision(c2)) {
          if (c1.onCollision) c1.onCollision(c2, c2.getNode());
          if (c2.onCollision) c2.onCollision(c1, c1.getNode());
        }
      }
    }
  }
}

module.exports = { Collider, CollisionSystem };
