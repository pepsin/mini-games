// RainbowScene - Rainbow decoration in the sky (Godot-style scene)

const { Node2D, Sprite } = require('../index.js');
const { getResource, isResourcesLoaded } = require('../../resources.js');
const { animationLoader } = require('../../animationLoader.js');
const { RESOURCE_COLORS } = require('../../config.js');

class RainbowScene extends Node2D {
  constructor(options = {}) {
    super('Rainbow');
    
    // Setup transform
    this.setPosition(options.x || 80, options.y || 140);
    
    // Sprite component
    this.sprite = new Sprite();
    this.addChild(this.sprite);
  }

  _draw(ctx) {
    const rainbowRes = getResource('rainbow');
    
    if (isResourcesLoaded() && rainbowRes?.image && rainbowRes.image.width > 0) {
      const size = animationLoader.getSize(rainbowRes);
      const anchor = animationLoader.getAnchor(rainbowRes);
      
      const drawWidth = size.width;
      const drawHeight = (rainbowRes.image.height / rainbowRes.image.width) * drawWidth;
      
      ctx.globalAlpha = 0.4;
      ctx.drawImage(rainbowRes.image,
        -drawWidth * anchor.x,
        -drawHeight * anchor.y,
        drawWidth,
        drawHeight
      );
      ctx.globalAlpha = 1;
      return;
    }
    
    // Fallback: draw procedural rainbow
    ctx.globalAlpha = 0.4;
    const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
    const baseRadius = 100;
    
    for (let i = 0; i < colors.length; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius - i * 8, Math.PI, 0);
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 8;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Factory method
  static create() {
    return new RainbowScene();
  }
}

module.exports = { RainbowScene };
