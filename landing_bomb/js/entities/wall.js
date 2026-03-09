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
  
  // Wall top
  ctx.fillStyle = '#D2B48C';
  ctx.fillRect(gameLeft, wallY - ss(5), gameWidth, ss(5));
  
  // Grass
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(gameLeft, wallY - ss(14), gameWidth, ss(10));
}

module.exports = {
  drawWall
};
