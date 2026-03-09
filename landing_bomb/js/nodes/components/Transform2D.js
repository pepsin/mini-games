// Transform2D - Position, rotation, and scale in 2D space

const { Node } = require('../Node.js');

class Transform2D extends Node {
  constructor(x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1) {
    super('Transform2D');
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  // Get global position (accounting for parent transforms)
  getGlobalPosition() {
    let gx = this.x;
    let gy = this.y;
    let node = this.parent;
    
    while (node) {
      if (node instanceof Transform2D) {
        // Apply parent's rotation and scale to this position
        const cos = Math.cos(node.rotation);
        const sin = Math.sin(node.rotation);
        const rx = gx * cos - gy * sin;
        const ry = gx * sin + gy * cos;
        
        gx = rx * node.scaleX + node.x;
        gy = ry * node.scaleY + node.y;
      }
      node = node.parent;
    }
    
    return { x: gx, y: gy };
  }

  // Get global rotation
  getGlobalRotation() {
    let rot = this.rotation;
    let node = this.parent;
    
    while (node) {
      if (node instanceof Transform2D) {
        rot += node.rotation;
      }
      node = node.parent;
    }
    
    return rot;
  }

  // Get global scale
  getGlobalScale() {
    let sx = this.scaleX;
    let sy = this.scaleY;
    let node = this.parent;
    
    while (node) {
      if (node instanceof Transform2D) {
        sx *= node.scaleX;
        sy *= node.scaleY;
      }
      node = node.parent;
    }
    
    return { x: sx, y: sy };
  }

  // Set position
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  // Translate by offset
  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
    return this;
  }

  // Rotate by angle
  rotate(angle) {
    this.rotation += angle;
    return this;
  }

  // Scale by factors
  scale(factorX, factorY = factorX) {
    this.scaleX *= factorX;
    this.scaleY *= factorY;
    return this;
  }

  // Apply transform to canvas context
  applyToContext(ctx) {
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
  }

  onDraw(ctx) {
    this.applyToContext(ctx);
  }

  // Create a copy
  clone() {
    return new Transform2D(this.x, this.y, this.rotation, this.scaleX, this.scaleY);
  }

  // Distance to another transform or position
  distanceTo(other) {
    const pos = other instanceof Transform2D ? { x: other.x, y: other.y } : other;
    const dx = this.x - pos.x;
    const dy = this.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Direction to another position
  directionTo(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { x: 0, y: 0 };
    return { x: dx / dist, y: dy / dist };
  }

  // Look at a position
  lookAt(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    this.rotation = Math.atan2(dy, dx);
  }
}

module.exports = { Transform2D };
