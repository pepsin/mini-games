// Flower Entity Module

const { RESOURCE_COLORS } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional, drawPlaceholder } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');
const { getFlowerPositions, getFlowerAlive, getFlowerFrameIndices } = require('../gameState.js');

// Draw single flower
function drawFlower(ctx, x, y, alive, frameIndex) {
  const flowerRes = getResource('flower');
  
  if (isResourcesLoaded() && flowerRes) {
    const state = alive ? 'alive' : 'dead';
    const frames = flowerRes.states?.[state] || flowerRes.frames;
    
    if (!frames || frames.length === 0) {
      drawPlaceholder(ctx, x, y, 48, 64, alive ? 'FLOWER' : 'DEAD', RESOURCE_COLORS.flower, 0.5, 0.8);
      return;
    }
    
    const frame = frames[frameIndex % frames.length];
    if (!frame || !frame.image) {
      drawPlaceholder(ctx, x, y, 48, 64, alive ? 'FLOWER' : 'DEAD', RESOURCE_COLORS.flower, 0.5, 0.8);
      return;
    }
    
    const size = animationLoader.getSize(flowerRes);
    const anchor = animationLoader.getAnchor(flowerRes);
    
    drawImageProportional(ctx, frame.image, x, y, size.width, anchor.x, anchor.y);
    return;
  }
  
  // Fallback placeholder
  drawPlaceholder(ctx, x, y, 48, 64, alive ? 'FLOWER' : 'DEAD', RESOURCE_COLORS.flower, 0.5, 0.8);
}

// Draw all health flowers
function drawHealthFlowers(ctx) {
  const positions = getFlowerPositions();
  const flowerAlive = getFlowerAlive();
  const flowerFrameIndices = getFlowerFrameIndices();
  
  for (let i = 0; i < 4; i++) {
    const pos = positions[i] || { x: 90 + i * 90, y: 820 - 10 };
    drawFlower(ctx, pos.x, pos.y, flowerAlive[i], flowerFrameIndices[i]);
  }
}

module.exports = {
  drawFlower,
  drawHealthFlowers
};
