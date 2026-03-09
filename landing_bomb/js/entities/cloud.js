// Cloud Entity Module

const { W, GROUND_Y, CLOUD_VARIANT_COLORS, RESOURCE_COLORS } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional, drawPlaceholder } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');

// Initialize clouds
function initClouds() {
  const clouds = [];
  const cloudRes = getResource('cloud');
  const variants = cloudRes?.variants ? Object.keys(cloudRes.variants) : ['small', 'medium', 'large'];
  
  for (let i = 0; i < 8; i++) {
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const finalScale = 0.7 + Math.random() * 0.6;
    const depthFactor = 1 - (finalScale - 0.7) / 0.6 * 0.4;
    const yPos = -50 + Math.random() * (GROUND_Y * 0.5 + 50);
    
    clouds.push({
      x: Math.random() * (W + 200),
      y: yPos,
      variant: variant,
      scale: finalScale,
      speed: (0.1 + Math.random() * 0.2) * depthFactor
    });
  }
  
  // Sort by scale (larger clouds behind)
  clouds.sort((a, b) => b.scale - a.scale);
  return clouds;
}

// Update clouds
function updateClouds(clouds) {
  clouds.forEach(c => {
    c.x -= c.speed;
    if (c.x < -100) c.x = W + 100;
  });
}

// Draw a single cloud
function drawCloud(ctx, cloud) {
  const scale = (cloud.scale || 0.5) * 1.2;
  const cloudRes = getResource('cloud');
  
  if (isResourcesLoaded() && cloudRes?.variants) {
    animationLoader.setVariant(cloudRes, cloud.variant);
    const img = cloudRes.image;
    
    if (img && img.width > 0) {
      const size = animationLoader.getSize(cloudRes);
      const anchor = animationLoader.getAnchor(cloudRes);
      
      const result = drawImageProportional(
        ctx, img,
        cloud.x,
        cloud.y,
        size.width * scale,
        anchor.x,
        anchor.y
      );
      
      if (result) return;
    }
  }
  
  // Fallback placeholder
  const colorIdx = CLOUD_VARIANT_COLORS[cloud.variant] || RESOURCE_COLORS.cloud;
  drawPlaceholder(ctx, cloud.x, cloud.y, 128 * scale, 64 * scale, 'CLOUD', colorIdx, 0.5, 0.5);
}

module.exports = {
  initClouds,
  updateClouds,
  drawCloud
};
