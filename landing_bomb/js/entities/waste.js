// Waste Entity Module

const { W, GROUND_Y, RESOURCE_COLORS, WAVE_DISPLAY_OFFSET } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional, drawPlaceholder } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');
const { Parachute } = require('../parachute.js');
const { sx, sy, ss } = require('../config.js');

// Store frozen waste images for each waste when time_slow starts
const wasteFrozenImages = new Map();

// Helper function to get parachute type based on waste type
// All wastes now use normal parachute (shield and twin removed)
function getParachuteType(wasteType) {
  return 'normal';
}

// Draw waste with waste sprites
function drawWaste(ctx, waste, frameCount, isTimeSlowActive) {
  if (waste.exploding) return;

  // Draw parachute - only normal parachute now (shield and twin removed)
  const resources = {
    normal: getResource('normal')
  };
  
  Parachute.draw(ctx, waste, resources, animationLoader, sx, sy, frameCount, ss, 'normal');

  // Draw waste sprite
  let usePlaceholder = true;
  const wasteRes = getResource('wastes');

  if (isResourcesLoaded() && wasteRes) {
    // Get the current waste variant for this waste
    const variantId = waste.wasteVariant || 'cans_1';
    
    // Get the fixed sprite frame for this waste variant
    const frame = getWasteFrame(wasteRes, variantId, waste.wasteFrame);
    
    if (frame) {
      const size = getWasteSize(wasteRes, variantId);
      const anchor = { x: 0.5, y: 0.5 }; // Center anchor
      
      // Check if it's a sprite frame or regular image
      const isSpriteFrame = frame.isSpriteFrame;
      const imgWidth = isSpriteFrame ? frame.sw : frame.width;
      const imgHeight = isSpriteFrame ? frame.sh : frame.height;
      
      if (imgWidth > 0 && imgHeight > 0) {
        let result;
        
        // Save context for rotation
        ctx.save();
        
        // Translate to waste position and rotate
        ctx.translate(sx(waste.x), sy(waste.y));
        ctx.rotate(waste.wasteRotation || 0);
        
        // Calculate draw dimensions
        const aspectRatio = imgWidth / imgHeight;
        const drawWidth = ss(size.width);
        const drawHeight = drawWidth / aspectRatio;
        
        // Draw at rotated position (origin is now at waste center due to translate)
        const drawX = -drawWidth * anchor.x;
        const drawY = -drawHeight * anchor.y;
        
        if (isSpriteFrame) {
          // Sprite sheet frame
          ctx.drawImage(
            frame.image,
            frame.sx, frame.sy, frame.sw, frame.sh,
            drawX, drawY, drawWidth, drawHeight
          );
        } else {
          // Regular image
          ctx.drawImage(frame, drawX, drawY, drawWidth, drawHeight);
        }
        
        ctx.restore();
        usePlaceholder = false;
      }
    }

    // Draw iced_box overlay on top when time_slow is active
    if (isTimeSlowActive && !usePlaceholder) {
      const icedBoxRes = getResource('iced_box');
      if (icedBoxRes && icedBoxRes.image && icedBoxRes.image.width > 0) {
        const icedSize = animationLoader.getSize(icedBoxRes);
        
        // Save context for rotation
        ctx.save();
        
        // Translate to waste position and rotate
        ctx.translate(sx(waste.x), sy(waste.y));
        ctx.rotate(waste.wasteRotation || 0);
        
        // Calculate draw dimensions
        const drawWidth = ss(icedSize.width);
        const drawHeight = drawWidth * (icedBoxRes.image.height / icedBoxRes.image.width);
        
        // Draw at rotated position
        ctx.drawImage(
          icedBoxRes.image,
          -drawWidth * 0.5, -drawHeight * 0.5,
          drawWidth, drawHeight
        );
        
        ctx.restore();
      }
    }
  }

  if (usePlaceholder) {
    drawPlaceholder(ctx, waste.x, waste.y, 64, 64, 'WASTE', RESOURCE_COLORS.waste, 0.5, 0.5);
  }
}

// Get fixed frame for a waste variant (no animation)
function getWasteFrame(wasteRes, variantId, fixedFrameIndex) {
  if (!wasteRes || !wasteRes.variants) return null;
  
  const variant = wasteRes.variants[variantId];
  if (!variant) return null;
  
  // If it's a sprite sheet, return the fixed frame
  if (variant.spriteSheet && variant.frames) {
    const frameIndex = Math.max(0, Math.min(fixedFrameIndex, variant.frames.length - 1));
    return variant.frames[frameIndex];
  }
  
  // Regular image
  return variant.image;
}

// Get size for a waste variant
function getWasteSize(wasteRes, variantId) {
  if (!wasteRes || !wasteRes.variants) return { width: 64, height: 64 };
  
  const variant = wasteRes.variants[variantId];
  if (!variant) return { width: 64, height: 64 };
  
  if (!variant.size) return { width: 64, height: 64 };
  
  return variant.size;
}

// Clear stored frozen images (call on game reset)
function clearWasteFrozenImages() {
  wasteFrozenImages.clear();
}

// Create waste properties based on wave config
function createWaste(waveConfig, currentWave, wasteTypeOverride = null) {
  const cfg = waveConfig;

  const isSpecial = Math.random() < cfg.specialWasteChance;
  const isCluster = Math.random() < cfg.clusterWasteChance;

  const radius = cfg.minRadius + Math.random() * (cfg.maxRadius - cfg.minRadius);
  let speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
  let sway = Math.random() * cfg.maxSway;

  let wasteType = 'normal';
  let health = cfg.wasteHealth;

  // If waste type is overridden (for special wave spawning), use it
  // Note: ARMORED and DUMBBELL types removed - now using waste sprites only
  if (wasteTypeOverride) {
    wasteType = wasteTypeOverride;
    // All wastes now use normal behavior with waste sprites
  } else if (isCluster) {
    wasteType = 'cluster';
    speed *= 0.85;
  } else if (isSpecial) {
    const specialTypes = ['fast', 'zigzag'];
    wasteType = specialTypes[Math.floor(Math.random() * specialTypes.length)];

    switch (wasteType) {
      case 'fast':
        speed *= 1.4;
        sway *= 0.5;
        break;
      case 'zigzag':
        speed *= 0.9;
        sway *= 2.5;
        break;
    }
  }

  const margin = 30 + Math.min(currentWave * 0.5, 30);
  const x = margin + Math.random() * (W - margin * 2);

  // Randomly select waste variant and a fixed frame
  const wasteVariants = ['cans_1', 'cans_2', 'wrapper_1'];
  const wasteVariant = wasteVariants[Math.floor(Math.random() * wasteVariants.length)];
  
  // Get frame counts for each variant
  const frameCounts = {
    'cans_1': 50,    // 10x5
    'cans_2': 24,    // 6x4
    'wrapper_1': 45  // 9x5
  };
  const frameCount = frameCounts[wasteVariant];
  const fixedFrame = Math.floor(Math.random() * frameCount); // Fixed frame for this waste
  
  // Random fixed rotation for this waste (in radians, range: -30 to +30 degrees)
  const fixedRotation = (Math.random() - 0.5) * Math.PI / 3;

  return {
    x: x,
    y: -50,
    radius: radius,
    speed: speed,
    sway: sway,
    swayOffset: Math.random() * Math.PI * 2,
    exploding: false,
    wasteType: wasteType,
    health: health,
    maxHealth: health,
    parachute: Parachute.createWasteParachute(),
    parachuteType: 'normal', // All use normal parachute now
    wasteVariant: wasteVariant, // Random waste sprite variant
    wasteFrame: fixedFrame, // Fixed frame index - doesn't animate
    wasteRotation: fixedRotation, // Fixed rotation angle
    hitByProjectiles: [] // Track which projectiles have hit this waste
  };
}



// Convert internal wave to display wave (what player sees)
function getDisplayWave(internalWave) {
  return internalWave <= 1 ? 1 : (internalWave - WAVE_DISPLAY_OFFSET);
}

// Check if wave is a special wave (multiple of 5 based on display wave)
function isSpecialWave(wave) {
  const displayWave = getDisplayWave(wave);
  return displayWave > 0 && displayWave % 5 === 0;
}

// Get special waste spawn count for wave 5, 10, 15, etc. (based on display wave)
function getSpecialWasteCountForWave(wave) {
  if (!isSpecialWave(wave)) return 0;
  const displayWave = getDisplayWave(wave);
  // Base 2 wastes, increases by 1 every 5 waves, capped at 8
  // Reduced to 1/3 of original volume
  const originalCount = Math.min(2 + Math.floor((displayWave - 5) / 5), 8);
  return Math.max(1, Math.floor(originalCount / 3));
}

// Update waste position
function updateWaste(waste, frameCount, speedMultiplier) {
  const sm = speedMultiplier || 1;
  waste.y += waste.speed * sm;
  waste.x += Math.sin(frameCount * 0.02 + waste.swayOffset) * waste.sway * sm;
}

module.exports = {
  drawWaste,
  createWaste,
  updateWaste,
  clearWasteFrozenImages,
  isSpecialWave,
  getSpecialWasteCountForWave
};
