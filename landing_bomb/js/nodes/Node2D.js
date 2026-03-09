// Node2D - Base class for 2D entities with transform

const { Node } = require('./Node.js');

class Node2D extends Node {
  constructor(name = 'Node2D') {
    super(name);
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.zIndex = 0;
    this.visible = true;
  }

  // Set position
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  // Set rotation (in radians)
  setRotation(rotation) {
    this.rotation = rotation;
    return this;
  }

  // Set scale
  setScale(scaleX, scaleY = scaleX) {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
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

  // Get global position (considering parent transforms)
  getGlobalPosition() {
    if (!this.parent || !(this.parent instanceof Node2D)) {
      return { x: this.x, y: this.y };
    }
    
    const parentPos = this.parent.getGlobalPosition();
    const cos = Math.cos(this.parent.rotation);
    const sin = Math.sin(this.parent.rotation);
    
    return {
      x: parentPos.x + (this.x * cos - this.y * sin) * this.parent.scaleX,
      y: parentPos.y + (this.x * sin + this.y * cos) * this.parent.scaleY
    };
  }

  // Get global rotation
  getGlobalRotation() {
    if (!this.parent || !(this.parent instanceof Node2D)) {
      return this.rotation;
    }
    return this.parent.getGlobalRotation() + this.rotation;
  }

  // Distance to another Node2D
  distanceTo(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Distance to a point
  distanceToPoint(x, y) {
    const dx = this.x - x;
    const dy = this.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _draw(ctx) {
    if (!this.visible) {
      ctx.globalAlpha = 0;
    }
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
  }
}

module.exports = { Node2D };
