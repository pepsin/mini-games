// FlowerScene - Health flower entity (Godot-style scene)

const { Node2D, Sprite, Health } = require('../index.js');
const { getResource, isResourcesLoaded } = require('../../resources.js');
const { animationLoader } = require('../../animationLoader.js');
const { RESOURCE_COLORS } = require('../../config.js');

class FlowerScene extends Node2D {
  constructor(options = {}) {
    super('Flower');
    
    this.index = options.index || 0;
    this.frameIndex = 0;
    
    // Setup transform
    this.setPosition(options.x || 0, options.y || 0);
    
    // Add health component
    this.health = new Health(1);
    this.health.onDied = () => {
      this.visible = false;
    };
    this.addChild(this.health);
    
    // Sprite placeholder
    this.sprite = new Sprite();
    this.addChild(this.sprite);
  }

  isAlive() {
    return !this.health.isDead();
  }

  damage() {
    return this.health.takeDamage(1);
  }

  revive() {
    this.health.fullHeal();
    this.visible = true;
    this.frameIndex = 0;
  }

  nextFrame() {
    if (this.isAlive()) {
      this.frameIndex++;
    }
  }

  _draw(ctx) {
    const flowerRes = getResource('flower');
    
    if (isResourcesLoaded() && flowerRes) {
      const state = this.isAlive() ? 'alive' : 'dead';
      const frames = flowerRes.states?.[state] || flowerRes.frames;
      
      if (frames && frames.length > 0) {
        const frame = frames[this.frameIndex % frames.length];
        if (frame && frame.image) {
          const size = animationLoader.getSize(flowerRes);
          const anchor = animationLoader.getAnchor(flowerRes);
          
          const drawWidth = size.width;
          const drawHeight = (frame.image.height / frame.image.width) * drawWidth;
          
          ctx.drawImage(frame.image,
            -drawWidth * anchor.x,
            -drawHeight * anchor.y,
            drawWidth,
            drawHeight
          );
          return;
        }
      }
    }
    
    // Fallback placeholder
    ctx.fillStyle = this.isAlive() ? RESOURCE_COLORS.flower : '#555';
    ctx.fillRect(-24, -64, 48, 64);
    
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.isAlive() ? '🌸' : '💀', 0, -32);
  }

  // Factory method
  static create(index, x, y) {
    return new FlowerScene({
      index,
      x,
      y
    });
  }
}

module.exports = { FlowerScene };
