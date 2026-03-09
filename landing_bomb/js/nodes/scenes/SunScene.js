// SunScene - Sun entity in the sky (Godot-style scene)

const { Node2D, Sprite } = require('../index.js');
const { getResource, isResourcesLoaded } = require('../../resources.js');
const { animationLoader } = require('../../animationLoader.js');
const { RESOURCE_COLORS } = require('../../config.js');

class SunScene extends Node2D {
  constructor(options = {}) {
    super('Sun');
    
    // Setup transform
    this.setPosition(options.x || 380, options.y || 70);
    
    // Sprite component
    this.sprite = new Sprite();
    this.addChild(this.sprite);
  }

  _draw(ctx) {
    const sunRes = getResource('sun');
    
    if (isResourcesLoaded() && sunRes?.image && sunRes.image.width > 0) {
      const size = animationLoader.getSize(sunRes);
      const anchor = animationLoader.getAnchor(sunRes);
      
      const drawWidth = size.width;
      const drawHeight = (sunRes.image.height / sunRes.image.width) * drawWidth;
      
      ctx.drawImage(sunRes.image,
        -drawWidth * anchor.x,
        -drawHeight * anchor.y,
        drawWidth,
        drawHeight
      );
      return;
    }
    
    // Fallback placeholder
    ctx.fillStyle = RESOURCE_COLORS.sun !== undefined ? '#F7DC6F' : '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Sun rays
    ctx.strokeStyle = '#F7DC6F';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 50, Math.sin(angle) * 50);
      ctx.lineTo(Math.cos(angle) * 65, Math.sin(angle) * 65);
      ctx.stroke();
    }
  }

  // Factory method
  static create() {
    return new SunScene();
  }
}

module.exports = { SunScene };
