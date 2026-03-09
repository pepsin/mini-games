// CloudScene - Background cloud entity (Godot-style scene)

const { Node2D, Sprite } = require('../index.js');
const { getResource, isResourcesLoaded } = require('../../resources.js');
const { animationLoader } = require('../../animationLoader.js');
const { CLOUD_VARIANT_COLORS, RESOURCE_COLORS } = require('../../config.js');

class CloudScene extends Node2D {
  constructor(options = {}) {
    super('Cloud');
    
    this.variant = options.variant || 'medium';
    this.baseScale = options.scale || 1;
    this.speed = options.speed || 0.1;
    this.depthFactor = options.depthFactor || 1;
    
    // Setup transform
    this.setPosition(options.x || 0, options.y || 0);
    this.setScale(this.baseScale * 1.2);
    
    // Sprite placeholder
    this.sprite = new Sprite();
    this.addChild(this.sprite);
  }

  _process(delta) {
    // Move left - convert delta from ms to seconds
    const dt = delta / 1000;
    this.x -= this.speed * dt * 60; // Scale to match original speed
    
    // Wrap around
    const W = 750;
    if (this.x < -150) {
      this.x = W + 150;
    }
  }

  _draw(ctx) {
    const cloudRes = getResource('cloud');
    
    if (isResourcesLoaded() && cloudRes?.variants) {
      animationLoader.setVariant(cloudRes, this.variant);
      const img = cloudRes.image;
      
      if (img && img.width > 0) {
        const size = animationLoader.getSize(cloudRes);
        const anchor = animationLoader.getAnchor(cloudRes);
        
        const drawWidth = size.width * this.baseScale;
        const drawHeight = (img.height / img.width) * drawWidth;
        
        ctx.drawImage(img,
          -drawWidth * anchor.x,
          -drawHeight * anchor.y,
          drawWidth,
          drawHeight
        );
        return;
      }
    }
    
    // Fallback placeholder
    const colorIdx = CLOUD_VARIANT_COLORS[this.variant] || RESOURCE_COLORS.cloud;
    ctx.fillStyle = colorIdx;
    ctx.beginPath();
    ctx.ellipse(0, 0, 64 * this.baseScale, 32 * this.baseScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Factory method
  static createRandom(bounds) {
    const variants = ['small', 'medium', 'large'];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const scale = 0.7 + Math.random() * 0.6;
    const depthFactor = 1 - (scale - 0.7) / 0.6 * 0.4;
    const yPos = -50 + Math.random() * (bounds.groundY * 0.5 + 50);
    const speed = (0.1 + Math.random() * 0.2) * depthFactor;
    
    return new CloudScene({
      x: Math.random() * (bounds.width + 200),
      y: yPos,
      variant,
      scale,
      speed,
      depthFactor
    });
  }
}

module.exports = { CloudScene };
