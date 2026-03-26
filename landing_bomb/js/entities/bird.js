// Bird Entity Module

const { W, H, RESOURCE_COLORS } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional, drawPlaceholder } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');

// Initialize birds array
function initBirds() {
  const birds = [];
  const birdRes = getResource('birds');
  const variants = birdRes?.variants ? Object.keys(birdRes.variants) : ['common_1', 'common_2'];
  
  // Create 3-5 birds at random positions
  const birdCount = 3 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < birdCount; i++) {
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const scale = 0.4 + Math.random() * 0.4; // Smaller scale than clouds
    const speed = 1.5 + Math.random() * 1.5; // Birds fly faster than clouds
    
    // Pick a random sprite frame for this bird
    let frameIndex = 0;
    if (birdRes?.variants?.[variant]?.frames) {
      const frameCount = birdRes.variants[variant].frames.length;
      frameIndex = Math.floor(Math.random() * frameCount);
    }
    
    birds.push({
      x: Math.random() * W,
      y: 30 + Math.random() * 150, // Fly in upper portion of sky
      variant: variant,
      scale: scale,
      speed: speed,
      direction: Math.random() > 0.5 ? 1 : -1, // Random direction: 1 = right, -1 = left
      frameIndex: frameIndex // Static sprite frame
    });
  }
  
  // Sort by scale (larger birds behind)
  birds.sort((a, b) => b.scale - a.scale);
  return birds;
}

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
  initBirds,
  updateBirds,
  drawBird
};
