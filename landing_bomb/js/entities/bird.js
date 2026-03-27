// Bird Entity Module

const { W, RESOURCE_COLORS } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawPlaceholder } = require('../renderer.js');

// Update birds position
function updateBirds(birds) {
  birds.forEach(bird => {
    // Move bird
    bird.x += bird.speed * bird.direction;
    
    // Wrap around screen
    const margin = 100;
    if (bird.direction > 0 && bird.x > W + margin) {
      bird.x = -margin;
      bird.y = 30 + Math.random() * 150;
      bird.speed = 1.5 + Math.random() * 1.5;
    } else if (bird.direction < 0 && bird.x < -margin) {
      bird.x = W + margin;
      bird.y = 30 + Math.random() * 150;
      bird.speed = 1.5 + Math.random() * 1.5;
    }
  });
}

// Draw a single bird
function drawBird(ctx, bird) {
  const scale = bird.scale || 0.5;
  const birdRes = getResource('birds');
  
  if (isResourcesLoaded() && birdRes?.variants) {
    const variant = birdRes.variants[bird.variant];
    
    if (variant?.spriteSheet && variant.frames && variant.frames.length > 0) {
      const frame = variant.frames[bird.frameIndex || 0];
      
      if (frame && frame.image) {
        ctx.save();
        
        const x = bird.x;
        const y = bird.y;
        const drawWidth = variant.frameWidth * scale;
        const drawHeight = variant.frameHeight * scale;
        
        // Default image faces left
        // When flying right (direction = 1), flip horizontally
        if (bird.direction > 0) {
          ctx.translate(x, y);
          ctx.scale(-1, 1);
          ctx.translate(-x, -y);
        }
        
        // Draw sprite frame
        ctx.drawImage(
          frame.image,
          frame.sx, frame.sy, frame.sw, frame.sh,
          x - drawWidth / 2, y - drawHeight / 2,
          drawWidth, drawHeight
        );
        
        ctx.restore();
        return;
      }
    }
  }
  
  // Fallback placeholder
  drawPlaceholder(ctx, bird.x, bird.y, 64 * scale, 64 * scale, 'BIRD', RESOURCE_COLORS.cloud, 0.5, 0.5);
}

module.exports = {
  updateBirds,
  drawBird
};
