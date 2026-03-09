// Sprite Component - renders an image

const { Component } = require('./Component.js');
const { sx, sy } = require('../../config.js');

class Sprite extends Component {
  constructor(image = null, options = {}) {
    super('Sprite');
    this.image = image;
    this.width = options.width || 64;
    this.height = options.height || 64;
    this.anchorX = options.anchorX || 0.5;
    this.anchorY = options.anchorY || 0.5;
    this.flipX = options.flipX || false;
    this.flipY = options.flipY || false;
    this.modulate = options.modulate || null; // {r, g, b, a} color modulation
  }

  setImage(image) {
    this.image = image;
    return this;
  }

  setSize(width, height = width) {
    this.width = width;
    this.height = height;
    return this;
  }

  setAnchor(anchorX, anchorY) {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    return this;
  }

  _draw(ctx) {
    if (!this.image) return;

    const w = sx(this.width);
    const h = sy(this.height);
    const offsetX = -w * this.anchorX;
    const offsetY = -h * this.anchorY;

    ctx.save();
    
    if (this.flipX || this.flipY) {
      ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
    }

    if (this.modulate) {
      ctx.globalCompositeOperation = 'multiply';
    }

    ctx.drawImage(this.image, offsetX, offsetY, w, h);

    if (this.modulate) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(${this.modulate.r}, ${this.modulate.g}, ${this.modulate.b}, ${this.modulate.a || 0.3})`;
      ctx.fillRect(offsetX, offsetY, w, h);
    }

    ctx.restore();
  }
}

module.exports = { Sprite };
