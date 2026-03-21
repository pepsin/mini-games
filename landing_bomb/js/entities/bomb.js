// Bomb Entity Module

const { W, GROUND_Y, RESOURCE_COLORS, WAVE_DISPLAY_OFFSET } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional, drawPlaceholder } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');
const { Parachute } = require('../parachute.js');
const { sx, sy, ss } = require('../config.js');

// Bomb type definitions
const BOMB_TYPES = {
  NORMAL: 'normal',
  CLUSTER: 'cluster',
  FAST: 'fast',
  ZIGZAG: 'zigzag',
  ARMORED: 'armored',    // 带护甲炸弹：需打2次，第一次打掉护甲变普通
  DUMBBELL: 'dumbbell'   // 哑铃炸弹：打中后分裂成2个普通炸弹
};

// Store frozen bomb images for each bomb when time_slow starts
const bombFrozenImages = new Map();

// Helper function to get parachute type based on bomb type
function getParachuteType(bombType) {
  switch (bombType) {
    case BOMB_TYPES.ARMORED:
      return 'shield';
    case BOMB_TYPES.DUMBBELL:
      return 'twin';
    case BOMB_TYPES.NORMAL:
    default:
      return 'normal';
  }
}

// Draw bomb
function drawBomb(ctx, bomb, frameCount, isTimeSlowActive) {
  if (bomb.exploding) return;

  // Draw parachute with all available parachute resources
  // Note: resources are named after their folder names: normal, shield, twin
  const resources = {
    bomb_normal: getResource('bomb_normal'),
    normal: getResource('normal'),
    shield: getResource('shield'),
    twin: getResource('twin')
  };
  
  // Determine which parachute type to use (bomb.parachuteType overrides)
  const parachuteType = bomb.parachuteType || getParachuteType(bomb.bombType);
  Parachute.draw(ctx, bomb, resources, animationLoader, sx, sy, frameCount, ss, parachuteType);

  // Determine which bomb resource to use based on type
  let bombResKey = 'bomb_normal';
  if (bomb.bombType === BOMB_TYPES.ARMORED) {
    bombResKey = 'bomb_shielded';
  } else if (bomb.bombType === BOMB_TYPES.DUMBBELL) {
    bombResKey = 'bomb_twin';
  }

  // Draw bomb body based on type
  let usePlaceholder = true;
  const bombRes = getResource(bombResKey);

  if (isResourcesLoaded() && bombRes) {
    let img = null;

    if (isTimeSlowActive) {
      // During time_slow, freeze the current frame and overlay iced_box
      if (!bombFrozenImages.has(bomb)) {
        // Capture the current frame when freezing starts
        bombFrozenImages.set(bomb, animationLoader.getCurrentFrame(bombRes));
      }
      // Use the frozen frame
      img = bombFrozenImages.get(bomb);
    } else {
      // Time_slow ended - clear frozen frame and resume normal animation
      bombFrozenImages.delete(bomb);
      // Use normal animation
      img = animationLoader.getCurrentFrame(bombRes);
    }

    if (img) {
      // Check if it's a sprite frame or regular image
      const isSpriteFrame = img.isSpriteFrame;
      const imgWidth = isSpriteFrame ? img.sw : img.width;
      const imgHeight = isSpriteFrame ? img.sh : img.height;
      
      if (imgWidth > 0 && imgHeight > 0) {
        const size = animationLoader.getSize(bombRes);
        const anchor = animationLoader.getAnchor(bombRes);

        let result;
        if (isSpriteFrame) {
          // Sprite sheet frame - pass image and frame data separately
          result = drawImageProportional(
            ctx, img.image,
            bomb.x, bomb.y,
            size.width * 0.8,
            anchor.x, anchor.y,
            { sx: img.sx, sy: img.sy, sw: img.sw, sh: img.sh }
          );
        } else {
          // Regular image
          result = drawImageProportional(
            ctx, img,
            bomb.x, bomb.y,
            size.width * 0.8,
            anchor.x, anchor.y
          );
        }

        if (result) {
          usePlaceholder = false;
        }
      }
    }

    // Draw iced_box overlay on top when time_slow is active
    if (isTimeSlowActive && !usePlaceholder) {
      const icedBoxRes = getResource('iced_box');
      if (icedBoxRes && icedBoxRes.image && icedBoxRes.image.width > 0) {
        const icedSize = animationLoader.getSize(icedBoxRes);
        const icedAnchor = animationLoader.getAnchor(icedBoxRes);
        // Scale up iced_box for twin bombs by 1.4x
        const icedBoxScale = (bomb.bombType === BOMB_TYPES.DUMBBELL) ? 1.4 : 1.0;
        drawImageProportional(
          ctx, icedBoxRes.image,
          bomb.x, bomb.y,
          icedSize.width * icedBoxScale,
          icedAnchor.x, icedAnchor.y
        );
      }
    }
  }

  if (usePlaceholder) {
    drawPlaceholder(ctx, bomb.x, bomb.y, 64, 64, 'BOMB', RESOURCE_COLORS.bomb, 0.5, 0.5);
  }
}

// Clear stored frozen images (call on game reset)
function clearBombFrozenImages() {
  bombFrozenImages.clear();
}

// Create bomb properties based on wave config
function createBomb(waveConfig, currentWave, bombTypeOverride = null) {
  const cfg = waveConfig;

  const isSpecial = Math.random() < cfg.specialBombChance;
  const isCluster = Math.random() < cfg.clusterBombChance;

  const radius = cfg.minRadius + Math.random() * (cfg.maxRadius - cfg.minRadius);
  let speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
  let sway = Math.random() * cfg.maxSway;

  let bombType = 'normal';
  let health = cfg.bombHealth;

  // If bomb type is overridden (for special wave spawning), use it
  if (bombTypeOverride) {
    bombType = bombTypeOverride;
    switch (bombType) {
      case BOMB_TYPES.ARMORED:
        speed *= 0.85;
        health = 2; // Armor provides 1 extra health
        break;
      case BOMB_TYPES.DUMBBELL:
        speed *= 0.9;
        sway *= 0.8;
        break;
    }
  } else if (isCluster) {
    bombType = 'cluster';
    speed *= 0.85;
  } else if (isSpecial) {
    const specialTypes = ['fast', 'zigzag'];
    bombType = specialTypes[Math.floor(Math.random() * specialTypes.length)];

    switch (bombType) {
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

  return {
    x: x,
    y: -50,
    radius: radius,
    speed: speed,
    sway: sway,
    swayOffset: Math.random() * Math.PI * 2,
    exploding: false,
    bombType: bombType,
    health: health,
    maxHealth: health,
    parachute: Parachute.createBombParachute(),
    parachuteType: getParachuteType(bombType),
    hitByProjectiles: [] // Track which projectiles have hit this bomb
  };
}

// Create a normal bomb at specific position (for dumbbell split)
function createNormalBombAt(x, y, waveConfig, currentWave, parachuteTypeOverride = null) {
  const cfg = waveConfig;
  const radius = cfg.minRadius + Math.random() * (cfg.maxRadius - cfg.minRadius);
  const speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed) * 0.9;
  const sway = Math.random() * cfg.maxSway;

  return {
    x: x,
    y: y,
    radius: radius,
    speed: speed,
    sway: sway,
    swayOffset: Math.random() * Math.PI * 2,
    exploding: false,
    bombType: BOMB_TYPES.NORMAL,
    health: 1,
    maxHealth: 1,
    parachute: Parachute.createBombParachute(),
    parachuteType: parachuteTypeOverride || 'normal',
    hitByProjectiles: [] // Track which projectiles have hit this bomb
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

// Get special bomb spawn count for wave 5, 10, 15, etc. (based on display wave)
function getSpecialBombCountForWave(wave) {
  if (!isSpecialWave(wave)) return 0;
  const displayWave = getDisplayWave(wave);
  // Base 2 bombs, increases by 1 every 5 waves, capped at 8
  // Reduced to 1/3 of original volume
  const originalCount = Math.min(2 + Math.floor((displayWave - 5) / 5), 8);
  return Math.max(1, Math.floor(originalCount / 3));
}

// Update bomb position
function updateBomb(bomb, frameCount, speedMultiplier) {
  const sm = speedMultiplier || 1;
  bomb.y += bomb.speed * sm;
  bomb.x += Math.sin(frameCount * 0.02 + bomb.swayOffset) * bomb.sway * sm;
}

module.exports = {
  drawBomb,
  createBomb,
  createNormalBombAt,
  updateBomb,
  clearBombFrozenImages,
  BOMB_TYPES,
  isSpecialWave,
  getSpecialBombCountForWave
};
