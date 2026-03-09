// Wall/Ground Module

const { W, GROUND_Y, sx, sy, ss } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');

// Draw wall/ground
function drawWall(ctx) {
  const bgRes = getResource('background');
  
  if (isResourcesLoaded() && bgRes?.image && bgRes.image.width > 0) {
    const size = animationLoader.getSize(bgRes);
    const anchor = animationLoader.getAnchor(bgRes);
    const pos = bgRes.config?.position || { x: W / 2, y: 900 };
    
    const result = drawImageProportional(
      ctx, bgRes.image,
      pos.x, pos.y,
      size.width,
      anchor.x, anchor.y
    );
    
    if (result) return;
  }
  
  // Fallback: procedural wall
  const wallY = sy(GROUND_Y);
  const wallH = ss(80);
  const gameLeft = sx(0);
  const gameRight = sx(W);
  const gameWidth = gameRight - gameLeft;
  
  // Base wall
  ctx.fillStyle = '#E8DCC8';
  ctx.fillRect(gameLeft, wallY, gameWidth, wallH);
  
  // Brick pattern
  const bw = ss(40), bh = ss(14);
  ctx.strokeStyle = '#D4C4A8';
  ctx.lineWidth = ss(1);
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
  ctx.fillRect(gameLeft, wallY - ss(5), gameWidth, ss(5));
  
  // Grass
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(gameLeft, wallY - ss(14), gameWidth, ss(10));
  ctx.fillStyle = '#388E3C';
  for (let i = 0; i < W; i += 12) {
    ctx.beginPath();
    ctx.arc(sx(i), wallY - ss(14), ss(7), 0, Math.PI * 2);
    ctx.fill();
  }
}

module.exports = {
  drawWall
};
