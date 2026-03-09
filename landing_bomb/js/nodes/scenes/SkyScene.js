// SkyScene - Background sky rendering (Godot-style scene)

const { Node2D } = require('../Node2D.js');

class SkyScene extends Node2D {
  constructor(options = {}) {
    super('Sky');
    
    this.canvasWidth = options.canvasWidth || 750;
    this.canvasHeight = options.canvasHeight || 1334;
    this.offsetX = options.offsetX || 0;
  }

  setCanvasSize(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    return this;
  }

  setOffsetX(offsetX) {
    this.offsetX = offsetX;
    return this;
  }

  _draw(ctx) {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    grad.addColorStop(0, '#4ab8ff');
    grad.addColorStop(0.6, '#87CEEB');
    grad.addColorStop(1, '#b8e8ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Side black bars for wide screens
    if (this.offsetX > 0) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.offsetX, this.canvasHeight);
      ctx.fillRect(this.canvasWidth - this.offsetX, 0, this.offsetX, this.canvasHeight);
    }
  }
}

module.exports = { SkyScene };
