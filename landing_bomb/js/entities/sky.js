// Sky, Sun and Rainbow Module

const { W, H, screenHeight, offsetX, offsetY, scale, sx, sy, ss, RESOURCE_COLORS } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional, drawPlaceholder } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');

// Draw sky background
function drawSky(ctx, canvas) {
  // Fill top area (above game) with top sky color
  if (offsetY > 0) {
    ctx.fillStyle = '#4ab8ff';
    ctx.fillRect(0, 0, canvas.width, offsetY);
  }
  
  // Fill game area with sky gradient
  const gameHeight = H * scale;
  const grad = ctx.createLinearGradient(0, offsetY, 0, offsetY + gameHeight);
  grad.addColorStop(0, '#4ab8ff');
  grad.addColorStop(0.6, '#87CEEB');
  grad.addColorStop(1, '#b8e8ff');
  ctx.fillStyle = grad;
  ctx.fillRect(offsetX, offsetY, W * scale, gameHeight);
  
  // Side black bars (only for wide screens)
  ctx.fillStyle = '#000000';
  if (offsetX > 0) {
    ctx.fillRect(0, 0, offsetX, canvas.height);
    ctx.fillRect(canvas.width - offsetX, 0, offsetX, canvas.height);
  }
}

// Draw sun
function drawSun(ctx) {
  const sunRes = getResource('sun');
  
  if (isResourcesLoaded() && sunRes?.image && sunRes.image.width > 0) {
    const size = animationLoader.getSize(sunRes);
    const anchor = animationLoader.getAnchor(sunRes);
    const pos = sunRes.config?.position || { x: 380, y: 70 };
    
    const result = drawImageProportional(
      ctx, sunRes.image,
      pos.x, pos.y,
      size.width,
      anchor.x, anchor.y
    );
    
    if (result) return;
  }
  
  // Fallback placeholder
  drawPlaceholder(ctx, 380, 70, 80, 80, 'SUN', RESOURCE_COLORS.sun, 0.5, 0.5);
}

// Draw rainbow
function drawRainbow(ctx) {
  const rainbowRes = getResource('rainbow');
  
  if (isResourcesLoaded() && rainbowRes?.image && rainbowRes.image.width > 0) {
    const size = animationLoader.getSize(rainbowRes);
    const anchor = animationLoader.getAnchor(rainbowRes);
    const pos = rainbowRes.config?.position || { x: 80, y: 140 };
    
    ctx.globalAlpha = 0.4;
    const result = drawImageProportional(
      ctx, rainbowRes.image,
      pos.x, pos.y,
      size.width,
      anchor.x, anchor.y
    );
    ctx.globalAlpha = 1;
    
    if (result) return;
  }
  
  // Fallback placeholder
  drawPlaceholder(ctx, 80, 140, 256, 128, 'RAIN', RESOURCE_COLORS.rainbow, 0.5, 1.0);
}

module.exports = {
  drawSky,
  drawSun,
  drawRainbow
};
