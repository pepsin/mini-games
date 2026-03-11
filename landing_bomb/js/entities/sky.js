// Sky, Sun and Rainbow Module

const { W, H, screenHeight, offsetX, offsetY, scale, sx, sy, ss, RESOURCE_COLORS } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional, drawPlaceholder } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');

// Sun rotation state
let sunOuterRotation = 0;

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

// Draw sun (inner + outer with rotation)
function drawSun(ctx, deltaTime) {
  const sunInnerRes = getResource('sunInner');
  const sunOuterRes = getResource('sunOuter');
  
  if (isResourcesLoaded() && sunInnerRes?.image && sunOuterRes?.image) {
    // Get position from config
    const pos = sunInnerRes.config?.position || { x: 380, y: 70 };
    
    // Get size and anchor for inner sun
    const innerSize = animationLoader.getSize(sunInnerRes);
    const innerAnchor = animationLoader.getAnchor(sunInnerRes);
    
    // Get size and anchor for outer sun
    const outerSize = animationLoader.getSize(sunOuterRes);
    const outerAnchor = animationLoader.getAnchor(sunOuterRes);
    const rotationSpeed = animationLoader.getRotationSpeed(sunOuterRes);
    
    // Update rotation
    if (deltaTime) {
      sunOuterRotation += rotationSpeed * deltaTime / 1000;
    }
    
    // Draw outer sun with rotation
    ctx.save();
    const outerX = sx(pos.x);
    const outerY = sy(pos.y);
    ctx.translate(outerX, outerY);
    ctx.rotate(sunOuterRotation);
    ctx.translate(-outerX, -outerY);
    
    const outerResult = drawImageProportional(
      ctx, sunOuterRes.image,
      pos.x, pos.y,
      outerSize.width,
      outerAnchor.x, outerAnchor.y
    );
    ctx.restore();
    
    // Draw inner sun (no rotation)
    const innerResult = drawImageProportional(
      ctx, sunInnerRes.image,
      pos.x, pos.y,
      innerSize.width,
      innerAnchor.x, innerAnchor.y
    );
    
    if (outerResult && innerResult) return;
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
