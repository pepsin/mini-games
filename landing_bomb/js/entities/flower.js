// Flower Entity Module

const { RESOURCE_COLORS } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional, drawPlaceholder } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');
const { getFlowerPositions, getFlowerAlive, getFlowerFrameIndices } = require('../gameState.js');

// Track shield animation state for each flower
// { [flowerIndex]: { isPlaying: boolean, currentFrame: number, lastFrameTime: number, completed: boolean, isReversing: boolean } }
const shieldAnimationStates = new Map();

// Track previous shield state to detect when it expires
let wasShieldActive = false;

// Initialize or reset shield animation state
function initShieldAnimation(flowerIndex) {
  shieldAnimationStates.set(flowerIndex, {
    isPlaying: true,
    currentFrame: 0,
    lastFrameTime: 0,
    completed: false,
    isReversing: false
  });
}

// Start reverse animation when shield expires
function startReverseAnimation(flowerIndex) {
  const state = shieldAnimationStates.get(flowerIndex);
  if (!state) return;
  
  const flowerCoveredRes = getResource('flower_covered');
  if (!flowerCoveredRes || !flowerCoveredRes.frames) return;
  
  state.isReversing = true;
  state.isPlaying = true;
  state.completed = false;
  state.currentFrame = flowerCoveredRes.frames.length - 1;
  state.lastFrameTime = 0;
}

// Reset all shield animations (call when shield ends and reverse completes)
function resetShieldAnimations() {
  shieldAnimationStates.clear();
}

// Update shield animation for a flower
function updateShieldAnimation(flowerIndex, deltaTime) {
  const state = shieldAnimationStates.get(flowerIndex);
  if (!state || !state.isPlaying || state.completed) return;

  const flowerCoveredRes = getResource('flower_covered');
  if (!flowerCoveredRes || !flowerCoveredRes.frames) return;

  state.lastFrameTime += deltaTime;
  const currentFrameData = flowerCoveredRes.frames[state.currentFrame];

  if (currentFrameData && state.lastFrameTime >= currentFrameData.duration) {
    state.lastFrameTime = 0;
    
    if (state.isReversing) {
      // Reverse animation: go backwards
      state.currentFrame--;
      if (state.currentFrame < 0) {
        state.completed = true;
        state.isPlaying = false;
      }
    } else {
      // Forward animation: go forwards
      state.currentFrame++;
      if (state.currentFrame >= flowerCoveredRes.frames.length) {
        state.completed = true;
        state.isPlaying = false;
      }
    }
  }
}

// Draw single flower
function drawFlower(ctx, x, y, alive, frameIndex, hasShield = false, flowerIndex = 0, deltaTime = 16) {
  const flowerRes = getResource('flower');
  const flowerCoveredRes = getResource('flower_covered');

  if (isResourcesLoaded() && flowerRes) {
    // Handle shield animation states
    if (alive && flowerCoveredRes) {
      const animState = shieldAnimationStates.get(flowerIndex);
      
      // Shield just activated - initialize forward animation
      if (hasShield && !animState) {
        initShieldAnimation(flowerIndex);
      }
      
      // Shield just expired - start reverse animation
      if (!hasShield && animState && animState.completed && !animState.isReversing) {
        startReverseAnimation(flowerIndex);
      }
      
      // Update and draw animation if there's an active state
      if (animState && (animState.isPlaying || animState.completed)) {
        updateShieldAnimation(flowerIndex, deltaTime);

        const size = animationLoader.getSize(flowerCoveredRes);
        const anchor = animationLoader.getAnchor(flowerCoveredRes);

        if (animState.isReversing && animState.completed) {
          // Reverse animation completed - show normal flower
          // (fall through to normal flower drawing)
        } else if (animState.completed && !animState.isReversing) {
          // Forward animation completed, show static covered image
          if (flowerCoveredRes.staticImage) {
            drawImageProportional(ctx, flowerCoveredRes.staticImage, x, y, size.width, anchor.x, anchor.y);
            return;
          }
        } else {
          // Playing animation (forward or reverse)
          const frames = flowerCoveredRes.frames;
          if (frames && frames.length > 0 && animState.currentFrame >= 0 && animState.currentFrame < frames.length) {
            const frame = frames[animState.currentFrame];
            if (frame && frame.image) {
              drawImageProportional(ctx, frame.image, x, y, size.width, anchor.x, anchor.y);
              return;
            }
          }
        }
      }
    }

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
function drawHealthFlowers(ctx, hasShield = false, deltaTime = 16) {
  const positions = getFlowerPositions();
  const flowerAlive = getFlowerAlive();
  const flowerFrameIndices = getFlowerFrameIndices();

  // Detect when shield expires (was active, now inactive)
  const shieldJustExpired = wasShieldActive && !hasShield;
  
  // If shield just expired, start reverse animation for all flowers
  if (shieldJustExpired) {
    for (let i = 0; i < 4; i++) {
      if (flowerAlive[i]) {
        startReverseAnimation(i);
      }
    }
  }
  
  // Clean up completed reverse animations when shield is not active
  if (!hasShield) {
    for (const [flowerIndex, state] of shieldAnimationStates.entries()) {
      if (state.isReversing && state.completed) {
        shieldAnimationStates.delete(flowerIndex);
      }
    }
  }
  
  // Update previous shield state
  wasShieldActive = hasShield;

  for (let i = 0; i < 4; i++) {
    const pos = positions[i] || { x: 90 + i * 90, y: 820 - 10 };
    drawFlower(ctx, pos.x, pos.y, flowerAlive[i], flowerFrameIndices[i], hasShield, i, deltaTime);
  }
}

module.exports = {
  drawFlower,
  drawHealthFlowers,
  resetShieldAnimations
};
