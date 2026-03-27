// Bird Entity Module

const { W, RESOURCE_COLORS } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawPlaceholder } = require('../renderer.js');

// Update birds position with dynamic sine wave movement
function updateBirds(birds) {
  birds.forEach(bird => {
    // Update time for sine wave calculation
    bird.time = (bird.time || 0) + 0.05;
    
    // Move bird horizontally
    bird.x += bird.speed * bird.direction;
    
    // Dynamic vertical movement using sine waves
    // Combine multiple sine waves for more organic movement
    const baseAmplitude = bird.amplitude || 30;
    const frequency = bird.frequency || 1;
    const phase = bird.phase || 0;
    
    // Primary sine wave for main vertical oscillation
    const primarySine = Math.sin(bird.time * frequency + phase) * baseAmplitude;
    
    // Secondary sine wave for additional randomness (smaller amplitude, different frequency)
    const secondarySine = Math.sin(bird.time * frequency * 1.5 + phase * 2) * (baseAmplitude * 0.3);
    
    // Apply vertical movement relative to base Y position
    bird.y = bird.baseY + primarySine + secondarySine;
    
    // Wrap around screen
    const margin = 100;
    if (bird.direction > 0 && bird.x > W + margin) {
      bird.x = -margin;
      resetBirdFlightPath(bird);
    } else if (bird.direction < 0 && bird.x < -margin) {
      bird.x = W + margin;
      resetBirdFlightPath(bird);
    }
  });
}

// Reset bird flight path when it wraps around
function resetBirdFlightPath(bird) {
  bird.baseY = 50 + Math.random() * 150;
  bird.speed = 1.5 + Math.random() * 1.5;
  bird.amplitude = 20 + Math.random() * 40; // Random amplitude for vertical variation
  bird.frequency = 0.5 + Math.random() * 1.5; // Random frequency for wave speed
  bird.phase = Math.random() * Math.PI * 2; // Random phase offset
  bird.time = 0;
}

// Draw a single bird
function drawBird(ctx, bird, dimOpacity = 1) {
  const scale = bird.scale || 0.5;
  const birdRes = getResource('birds');
  
  if (isResourcesLoaded() && birdRes?.variants) {
    const variant = birdRes.variants[bird.variant];
    
    if (variant?.spriteSheet && variant.frames && variant.frames.length > 0) {
      const frame = variant.frames[bird.frameIndex || 0];
      
      if (frame && frame.image) {
        ctx.save();
        
        // Apply dim opacity
        ctx.globalAlpha = dimOpacity;
        
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
  ctx.save();
  ctx.globalAlpha = dimOpacity;
  drawPlaceholder(ctx, bird.x, bird.y, 64 * scale, 64 * scale, 'BIRD', RESOURCE_COLORS.cloud, 0.5, 0.5);
  ctx.restore();
}

module.exports = {
  updateBirds,
  drawBird
};
