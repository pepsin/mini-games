// WallScene - Ground/wall rendering (Godot-style scene)

const { Node2D } = require('../Node2D.js');
const { getResource, isResourcesLoaded } = require('../../resources.js');
const { animationLoader } = require('../../animationLoader.js');
const { W, GROUND_Y } = require('../../config.js');

class WallScene extends Node2D {
  constructor(options = {}) {
    super('Wall');
    
    this.groundY = options.groundY || GROUND_Y;
    this.wallHeight = options.wallHeight || 80;
  }

  _draw(ctx) {
    const bgRes = getResource('background');
    
    if (isResourcesLoaded() && bgRes?.image && bgRes.image.width > 0) {
      const size = animationLoader.getSize(bgRes);
      const anchor = animationLoader.getAnchor(bgRes);
      
      const drawWidth = size.width;
      const drawHeight = (bgRes.image.height / bgRes.image.width) * drawWidth;
      
      ctx.drawImage(bgRes.image,
        -drawWidth * anchor.x,
        -drawHeight * anchor.y,
        drawWidth,
        drawHeight
      );
      return;
    }
    
    // Fallback: procedural wall
    this.drawProceduralWall(ctx);
  }

  drawProceduralWall(ctx) {
    const wallY = this.groundY;
    const wallH = this.wallHeight;
    const gameLeft = 0;
    const gameRight = W;
    const gameWidth = gameRight - gameLeft;
    
    // Base wall
    ctx.fillStyle = '#E8DCC8';
    ctx.fillRect(gameLeft, wallY, gameWidth, wallH);
    
    // Brick pattern
    const bw = 40, bh = 14;
    ctx.strokeStyle = '#D4C4A8';
    ctx.lineWidth = 1;
    for (let row = 0; row < 6; row++) {
      const yy = wallY + row * bh;
      const offset = (row % 2) * bw * 0.5;
      for (let col = -1; col < W / 40 + 1; col++) {
        const xx = gameLeft + offset + col * bw;
        ctx.strokeRect(xx, yy, bw, bh);
      }
    }
    
    // Wall top
    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(gameLeft, wallY - 5, gameWidth, 5);
    
    // Grass
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(gameLeft, wallY - 14, gameWidth, 10);
    ctx.fillStyle = '#388E3C';
    for (let i = gameLeft; i < gameRight; i += 12) {
      ctx.beginPath();
      ctx.arc(i, wallY - 14, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Factory method
  static create() {
    return new WallScene({
      groundY: GROUND_Y,
      wallHeight: 80
    });
  }
}

module.exports = { WallScene };
