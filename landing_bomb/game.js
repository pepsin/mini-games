// Bob-omb Squad - WeChat Mini Game (Refactored Version)

// Get canvas and context
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// Module-level deltaTime for use in render
let lastDeltaTime = 16;

// i18n
const { t } = require('./js/i18n.js');

// Camera button animation state
const CAMERA_BUTTON_SLIDE_DURATION = 500; // 500ms to slide in/out
let cameraButtonSlideStartTime = null;
let cameraButtonSlideDirection = 'in'; // 'in' or 'out'
let cameraButtonLastBirdCount = 0; // Track last known bird count
let cameraButtonIsVisible = false; // Whether button should be visible

// Core modules
const config = require('./js/config.js');
const { W, H, updateScale, isDevTools } = config;
const { loadResources, getResource } = require('./js/resources.js');
const { animationLoader } = require('./js/animationLoader.js');

// Analytics
const analytics = require('./js/analytics.js');

// Game state - direct array exports
const {
  resetGame, addScore, setGameStarted, setGameOver, setGamePaused, setLastTime, incrementFrameCount, setLives, setPowerupSelecting,
  getScore, getFrameCount, getLastTime, isGameOver, isGameStarted, isGamePaused, isPowerupSelecting,
  getFlowerPositions, damageFlower, healFlower, hasDeadFlower,
  wastes, projectiles, explosions, scorePopups, clouds,
  powerups, activePowerups, powerupBursts,
  flowerAlive, flowerFrameIndices
} = require('./js/gameState.js');

// Wave system
const {
  startWave, endWave, resetWaves, updateWaves, getCurrentWave, getCurrentWaveConfig, isInInterWave
} = require('./js/waveSystem.js');

// Track if player just revived and needs to advance to next wave
let pendingWaveAdvance = false;

// Powerup system
const {
  trySpawnPowerup, updatePowerups, pickupPowerup,
  activatePowerup, updateActivePowerups, isPowerupActive,
  getSpeedMultiplier,
  drawPowerup, createPowerupBurst, drawPowerupBurst,
  drawShieldEffect, randomPowerupType,
  updateTimeSlowFlash, updateFlashAnimations, drawWasteFlash
} = require('./js/powerupSystem.js');

// Powerup inventory system
const {
  resetInventory, updateFlyingPowerups, drawInventorySlots, drawFlyingPowerups,
  usePowerupFromInventory, hitTestInventory, isInventoryFull, addPowerupToInventory
} = require('./js/powerupInventory.js');

// Powerup selector system (slot machine style)
const {
  initPowerupSelector, startPowerupSelection, updatePowerupSelector,
  drawPowerupSelector, closePowerupSelector
} = require('./js/powerupSelector.js');

// Challenge system
const {
  updateChallenge, onWasteKilled, onFlowerDamaged,
  updateChallengeResult, resetChallenges, getCurrentChallenge
} = require('./js/challengeSystem.js');

// Slingshot skin system
const { tryDropSkin, unlockSkin } = require('./js/slingshotSkinSystem.js');

// Falling shield effect


// Bird watching system
const {
  updateFlash, isFlashActive, shouldShowCameraButton,
  getCameraButtonBounds, setCameraButtonBounds,
  recordAllCurrentBirdsWatched, getCurrentWaveBirds,
  getPolaroidPhoto, updatePolaroid, shouldDimBirds,
  isBirdWatched, updateWaveBirds, getUnwatchedBirds, hasVisibleBirds
} = require('./js/birdWatchingSystem.js');

// Bird album
const {
  isBirdAlbumVisible, handleAlbumTouch, drawBirdAlbum
} = require('./js/birdAlbum.js');

// Entities
const { drawSky, drawSun, drawRainbow } = require('./js/entities/sky.js');
const { initClouds, updateClouds, drawCloud } = require('./js/entities/cloud.js');
const { updateBirds, drawBird } = require('./js/entities/bird.js');
const { drawWall } = require('./js/entities/wall.js');
const { drawHealthFlowers } = require('./js/entities/flower.js');
const {
  updateSlingshotPosition, drawSlingshot, drawSlingshotBody, drawSlingshotBandsOnly,
  clearDrag, getDragCurrent, isDragging, getSlingshot, drawTrajectoryPrediction, SLING_CONFIG
} = require('./js/entities/slingshot.js');
const {
  drawWaste, createWaste, updateWaste, clearWasteFrozenImages
} = require('./js/entities/waste.js');
const { drawProjectile, updateProjectile, isOutOfBounds } = require('./js/entities/projectile.js');
// Collision System
const { collisionDetector } = require('./js/systems/collisionSystem.js');
const {
  createExplosion, createGroundExplosion, createScorePopup,
  drawExplosion, drawScorePopup
} = require('./js/entities/explosion.js');

// UI and Input
const { drawUI, drawGameOver, drawStartScreen, drawPauseScreen } = require('./js/ui.js');
const { drawGallery, isGalleryVisible } = require('./js/skinGallery.js');
const { setupInput, registerCallbacks } = require('./js/inputHandler.js');

// Social System
const {
  initSocialSystem,
  setGetCurrentWaveFn,
  updateLeaderboardScore,
  shareGame,
  resetReviveStatus,
  isLeaderboardVisible
} = require('./js/socialSystem.js');

// Setup canvas size
const systemInfo = wx.getSystemInfoSync();
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;
updateScale();

// Initialize game
function init() {
  // Track game load start time
  const loadStartTime = Date.now();

  // Initialize clouds
  const initialClouds = initClouds();
  clouds.push(...initialClouds);

  // Initialize powerup selector
  initPowerupSelector();

  // Initialize social system
  initSocialSystem();
  setGetCurrentWaveFn(getCurrentWave);

  // Load resources and start
  loadResources().then(() => {
    console.log('Resources loaded, starting game');
    updateSlingshotPosition();

    // Track game load performance
    const loadTime = Date.now() - loadStartTime;
    analytics.trackGameLoaded(loadTime);
  });

  // Setup input callbacks
  registerCallbacks({
    onGameStart: () => {
      setGameStarted(true);
      resetGame();
      resetWaves();
      resetChallenges();
      resetInventory();
      resetReviveStatus();
      startWave(1);

      analytics.trackGameStart(1);
    },
    onGameReset: () => {
      // Track end of current game session before starting new one
      const currentWave = getCurrentWave();
      const { getLives } = require('./js/gameState.js');
      analytics.trackGameEnd({
        score: getScore(),
        wave: currentWave,
        livesRemaining: getLives(),
        reason: 'reset'
      });
      
      resetGame();
      resetWaves();
      resetChallenges();
      resetInventory();
      clearWasteFrozenImages();
      resetReviveStatus();
      startWave(1);

      analytics.trackGameStart(1);
    },
    onFire: (proj) => {
      if (proj) projectiles.push(proj);
    },
    onInventoryClick: (slotIndex) => {
      const gameState = { healFlower, explodeAllWastes };
      usePowerupFromInventory(slotIndex, activePowerups, gameState);
    },
    onRevive: () => {
      // Revive player: revive only one flower, clear wastes, and prepare for next wave
      let revived = false;
      let revivedIndex = -1;
      for (let i = 0; i < 4; i++) {
        if (!flowerAlive[i] && !revived) {
          flowerAlive[i] = true;
          revived = true;
          revivedIndex = i;
        } else if (flowerAlive[i]) {
          // Kill all other flowers, keep only one alive
          flowerAlive[i] = false;
        }
      }
      // Clear all wastes for a clean start
      wastes.length = 0;
      // Mark that we need to advance to next wave when player continues
      pendingWaveAdvance = true;
      setLives(1);
      setGameOver(false);
      setGamePaused(true);
      // Track flower revival
      analytics.trackFlowerRevived(1);
      console.log(t('messages.playerRevived'));
    },
    onResume: () => {
      // Check if we need to advance to next wave after revive
      if (pendingWaveAdvance) {
        pendingWaveAdvance = false;
        // Advance to next wave
        const nextWave = getCurrentWave() + 1;
        startWave(nextWave);
        // Note: startWave() already calls analytics.trackWaveStart() with correct display wave
        console.log(t('messages.waveAdvanced', { wave: nextWave }));
      }
    }
  });

  setupInput();
}

// Explode all wastes on screen (for explosive powerup)
function explodeAllWastes() {
  const frameCount = getFrameCount();
  const wasteCount = wastes.length;
  
  // Explode each waste and give 100 score per waste
  for (let i = wastes.length - 1; i >= 0; i--) {
    const b = wastes[i];
    explosions.push(createExplosion(b.x, b.y, b.wasteType));
    wastes.splice(i, 1);
    onWasteKilled(frameCount);
  }
  
  // Add score: 100 points per waste
  if (wasteCount > 0) {
    addScore(wasteCount * 100);
    // Create a big score popup
    const popup = createScorePopup(W / 2, H / 2, wasteCount);
    popup.totalScore = wasteCount * 100;
    popup.text = `+${wasteCount * 100}`;
    scorePopups.push(popup);
  }
}

// Draw camera button for bird watching with slide-in/slide-out animation
function drawCameraButton(ctx, currentTime) {
  const { sx, sy, ss } = config;

  // Button dimensions - bigger button
  const buttonWidth = 72;
  const buttonHeight = 72;
  const cornerRadius = 12;
  const buttonY = H / 2 - buttonHeight / 2;
  
  // Check if there are any birds visible on screen (watched or unwatched)
  const birdsAreVisible = hasVisibleBirds();
  
  // Determine if state changed
  const stateChanged = birdsAreVisible !== cameraButtonIsVisible;
  if (stateChanged) {
    cameraButtonSlideStartTime = currentTime || Date.now();
    cameraButtonSlideDirection = birdsAreVisible ? 'in' : 'out';
    cameraButtonIsVisible = birdsAreVisible;
  }
  
  // Initialize animation start time on first call
  if (cameraButtonSlideStartTime === null) {
    cameraButtonSlideStartTime = currentTime || Date.now();
    cameraButtonSlideDirection = birdsAreVisible ? 'in' : 'out';
  }
  
  const elapsed = (currentTime || Date.now()) - cameraButtonSlideStartTime;
  let slideProgress = Math.min(elapsed / CAMERA_BUTTON_SLIDE_DURATION, 1);
  
  // Ease out cubic for smooth animation
  const easeOut = 1 - Math.pow(1 - slideProgress, 3);
  
  // Calculate positions
  const offScreenX = W + buttonWidth;
  const onScreenX = W - buttonWidth;
  
  let currentX;
  if (cameraButtonSlideDirection === 'in') {
    // Slide in from outside to visible position
    currentX = offScreenX - (offScreenX - onScreenX) * easeOut;
  } else {
    // Slide out from visible position to outside
    currentX = onScreenX + (offScreenX - onScreenX) * easeOut;
  }
  
  // Convert to screen coordinates
  const drawX = sx(currentX);
  const drawY = sy(buttonY);
  const drawWidth = ss(buttonWidth);
  const drawHeight = ss(buttonHeight);
  const drawRadius = ss(cornerRadius);

  // Draw button with rounded left corners, straight right corners
  ctx.beginPath();
  // Top-left corner (rounded)
  ctx.moveTo(drawX + drawRadius, drawY);
  // Top edge to top-right corner (straight)
  ctx.lineTo(drawX + drawWidth, drawY);
  // Right edge down to bottom-right corner (straight)
  ctx.lineTo(drawX + drawWidth, drawY + drawHeight);
  // Bottom edge to bottom-left corner
  ctx.lineTo(drawX + drawRadius, drawY + drawHeight);
  // Bottom-left corner (rounded)
  ctx.arcTo(drawX, drawY + drawHeight, drawX, drawY + drawHeight - drawRadius, drawRadius);
  // Left edge up
  ctx.lineTo(drawX, drawY + drawRadius);
  // Top-left corner (rounded)
  ctx.arcTo(drawX, drawY, drawX + drawRadius, drawY, drawRadius);
  ctx.closePath();

  // Button background (yellow)
  ctx.fillStyle = '#FFD700';
  ctx.fill();

  // Button border
  ctx.strokeStyle = '#FFA500';
  ctx.lineWidth = ss(3);
  ctx.stroke();

  // Camera icon (simplified)
  const centerX = drawX + drawWidth / 2;
  const centerY = drawY + drawHeight / 2;
  
  ctx.fillStyle = '#333';
  // Camera body
  const camWidth = ss(30);
  const camHeight = ss(22);
  ctx.fillRect(centerX - camWidth / 2, centerY - camHeight / 2, camWidth, camHeight);
  
  // Camera lens
  ctx.beginPath();
  ctx.arc(centerX, centerY, ss(8), 0, Math.PI * 2);
  ctx.fillStyle = '#666';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX, centerY, ss(5), 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();
  
  // Flash dot
  ctx.beginPath();
  ctx.arc(centerX - camWidth / 3, centerY - camHeight / 2 - ss(4), ss(3), 0, Math.PI * 2);
  ctx.fillStyle = '#FFF';
  ctx.fill();

  // Store button bounds for hit testing (use final position for hit testing)
  // Only allow clicking when button is visible (sliding in or fully visible)
  if (cameraButtonSlideDirection === 'in' || (birdsAreVisible && slideProgress >= 1)) {
    setCameraButtonBounds(onScreenX, buttonY, buttonWidth, buttonHeight);
  } else {
    // Set bounds to null when sliding out so it can't be clicked
    setCameraButtonBounds(null, null, 0, 0);
  }
}

// Draw polaroid photo of a bird
function drawPolaroidPhoto(ctx) {
  const polaroid = getPolaroidPhoto();
  if (!polaroid) return;

  const { sx, sy, ss } = config;
  const { bird, x, y, scale, opacity = 1 } = polaroid;

  ctx.save();

  // Apply opacity for fade out effect
  ctx.globalAlpha = opacity;

  // Polaroid dimensions
  const photoWidth = 100 * scale;
  const photoHeight = 120 * scale;
  const borderWidth = 10 * scale;

  // Position at camera button location (centered)
  const posX = sx(x) - photoWidth / 2;
  const posY = sy(y) - photoHeight / 2;

  // Draw polaroid background (white)
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 15 * scale;
  ctx.shadowOffsetX = 5 * scale;
  ctx.shadowOffsetY = 5 * scale;
  ctx.fillRect(posX, posY, photoWidth, photoHeight);

  // Reset shadow for photo content
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw bird sprite inside polaroid
  const innerX = posX + borderWidth;
  const innerY = posY + borderWidth;
  const innerWidth = photoWidth - borderWidth * 2;
  const innerHeight = photoHeight - borderWidth * 2 - 15 * scale; // Extra space at bottom for text

  // Clip to inner area
  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerWidth, innerHeight);
  ctx.clip();

  // Draw bird
  const birdRes = getResource('birds');
  if (birdRes?.variants && bird.variant) {
    const variant = birdRes.variants[bird.variant];
    if (variant?.spriteSheet && variant.frames?.length > 0) {
      const frame = variant.frames[bird.frameIndex || 0];
      if (frame?.image) {
        // Calculate scaling to fit bird in polaroid
        const birdScale = Math.min(
          innerWidth / (variant.frameWidth * 0.5),
          innerHeight / (variant.frameHeight * 0.5)
        ) * 0.8;

        const drawWidth = variant.frameWidth * birdScale * 0.5;
        const drawHeight = variant.frameHeight * birdScale * 0.5;

        // Center the bird
        const drawX = innerX + innerWidth / 2;
        const drawY = innerY + innerHeight / 2;

        // Handle direction flip
        if (bird.direction > 0) {
          ctx.translate(drawX, drawY);
          ctx.scale(-1, 1);
          ctx.translate(-drawX, -drawY);
        }

        ctx.drawImage(
          frame.image,
          frame.sx, frame.sy, frame.sw, frame.sh,
          drawX - drawWidth / 2, drawY - drawHeight / 2,
          drawWidth, drawHeight
        );
      }
    }
  }

  ctx.restore(); // End clip

  // Apply yellow tint overlay if the bird was already watched
  if (polaroid.tintColor === 'yellow') {
    ctx.fillStyle = 'rgba(255, 220, 0, 0.25)'; // Semi-transparent yellow
    ctx.fillRect(innerX, innerY, innerWidth, innerHeight);
  }

  // Draw polaroid caption text (bird name)
  ctx.fillStyle = '#333';
  ctx.font = `bold ${ss(11)}px Arial`;
  ctx.textAlign = 'center';
  const textY = posY + photoHeight - 10 * scale;
  const displayName = polaroid.birdName || t('bird.unknownBird');
  ctx.fillText(displayName, sx(x), textY);

  ctx.restore();
}

// Draw screen flash effect (white flash)
function drawScreenFlash(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// Handle challenge reward
function handleChallengeReward(reward) {
  if (!reward) return;
  if (reward.type === 'heal') {
    if (hasDeadFlower()) {
      healFlower();
    } else {
      addScore(10000 * getCurrentWave());
    }
  } else if (reward.type === 'score') {
    addScore(reward.value);
  } else if (reward.type === 'powerup') {
    // Grant a random powerup directly
    const type = randomPowerupType();
    activatePowerup(type, activePowerups, { healFlower, explodeAllWastes });
  }
}

// Update game logic
function update() {
  // Always update powerup selector (even when game is paused for selection)
  updatePowerupSelector();
  
  if (isGameOver() || !isGameStarted() || isGamePaused() || isPowerupSelecting()) return;

  const currentTime = Date.now();
  const deltaTime = currentTime - getLastTime();
  lastDeltaTime = deltaTime;
  setLastTime(currentTime);

  incrementFrameCount();
  const frameCount = getFrameCount();

  // Update animations
  // Note: waste animations removed - now using waste sprites instead

  // Update flowers
  if (frameCount % 15 === 0) {
    for (let i = 0; i < 4; i++) {
      if (flowerAlive[i]) {
        flowerFrameIndices[i]++;
      }
    }
  }

  // Update clouds
  updateClouds(clouds);
  
  // Update wave birds (bird watching feature)
  const waveBirds = getCurrentWaveBirds();
  updateBirds(waveBirds);
  
  // Update bird fade-out animations and remove fully faded birds
  updateWaveBirds();
  
  // Update flash effect
  updateFlash();
  
  // Update polaroid photo state
  updatePolaroid();

  // Update wave system
  const waveAction = updateWaves(wastes.length);
  if (waveAction.action === 'start_wave') {
    startWave(waveAction.wave);

  } else if (waveAction.action === 'spawn_waste') {
    const waveConfig = getCurrentWaveConfig();
    const waste = createWaste(waveConfig, getCurrentWave());
    wastes.push(waste);
  } else if (waveAction.action === 'spawn_special_waste') {
    // Spawn special waste (armored or dumbbell) for waves 5, 10, 15, etc.
    const waveConfig = getCurrentWaveConfig();
    const waste = createWaste(waveConfig, getCurrentWave(), waveAction.wasteType);
    wastes.push(waste);
  } else if (waveAction.action === 'wave_ended') {
    // Handle challenge result reward
    if (waveAction.challengeResult && waveAction.challengeResult.success) {
      handleChallengeReward(waveAction.challengeResult.reward);
    }
  }

  // Update active powerups
  updateActivePowerups(activePowerups);

  // Update time_slow flash animations
  updateTimeSlowFlash(activePowerups, wastes);
  updateFlashAnimations();

  // Update wave announce animation


  // Update challenge
  updateChallenge(frameCount);
  updateChallengeResult();

  // Get speed multiplier for time_slow
  const speedMult = getSpeedMultiplier(activePowerups);

  // Update wastes and register with collision system
  const flowerPositions = getFlowerPositions();
  const hasShield = isPowerupActive(activePowerups, 'shield');
  
  // Clear and rebuild collision system grids
  collisionDetector.clear();
  
  // Update wastes and register for collision detection
  for (let i = wastes.length - 1; i >= 0; i--) {
    const waste = wastes[i];
    updateWaste(waste, frameCount, speedMult);

    // Check ground collision
    if (waste.y > 820 - waste.radius) {
      if (hasShield) {
        // Shield active: destroy waste without damaging flowers
        explosions.push(createExplosion(waste.x, waste.y, 'normal'));
        wastes.splice(i, 1);
      } else {
        explosions.push(createGroundExplosion(waste.x, 815));
        wastes.splice(i, 1);

        // Find nearest flower
        let closestIdx = -1;
        let closestDist = Infinity;
        for (let f = 0; f < 4; f++) {
          if (!flowerAlive[f]) continue;
          const pos = flowerPositions[f];
          const dist = Math.abs(waste.x - pos.x);
          if (dist < 50 && dist < closestDist) {
            closestDist = dist;
            closestIdx = f;
          }
        }

        if (closestIdx >= 0) {
          damageFlower(closestIdx);
          onFlowerDamaged();
        }
      }
      continue; // Skip registering destroyed wastes
    }
    
    // Register waste with collision system
    collisionDetector.registerWaste(waste, `waste_${i}`);
  }

  // Update flying powerups and register with collision system
  updatePowerups(powerups, frameCount);
  for (let i = 0; i < powerups.length; i++) {
    collisionDetector.registerPowerup(powerups[i], `powerup_${i}`);
  }

  // Update inventory fly-in animations
  updateFlyingPowerups();

  // Update projectiles and register with collision system
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    updateProjectile(p);

    // Remove if out of bounds
    if (isOutOfBounds(p)) {
      projectiles.splice(i, 1);
      continue;
    }
    
    // Register projectile with collision system
    collisionDetector.registerProjectile(p, `proj_${p.id || i}`);
  }
  
  // Perform collision detection using spatial partitioning
  const processedCollisions = new Set(); // Track processed projectile-waste pairs
  const processedPowerupCollisions = new Set(); // Track processed projectile-powerup pairs
  
  // Check projectile-powerup collisions
  collisionDetector.checkProjectilePowerupCollisions((projectile, projId, powerup, powerupId) => {
    // Check if this projectile has already hit this powerup
    const collisionKey = `${projectile.id}_${powerupId}`;
    if (processedPowerupCollisions.has(collisionKey)) {
      return;
    }
    processedPowerupCollisions.add(collisionKey);
    
    const powerupIndex = powerups.indexOf(powerup);
    if (powerupIndex >= 0) {
      // Start powerup selection (slot machine style)
      const started = startPowerupSelection((result) => {
        // Callback when selection is complete
        if (result.action === 'use') {
          // Use immediately
          const gameState = { healFlower, explodeAllWastes };
          activatePowerup(result.type, activePowerups, gameState);
          // Track analytics
          const analytics = require('./js/analytics.js');
          analytics.trackPowerupCollected(result.type, 'use_now');
        } else {
          // Store in inventory
          const { addPowerupToInventory } = require('./js/powerupInventory.js');
          const success = addPowerupToInventory(result.type, W / 2, H / 2);
          if (success) {
            const analytics = require('./js/analytics.js');
            analytics.trackPowerupCollected(result.type, 'inventory');
          }
        }
        // Resume game
        setPowerupSelecting(false);
      });

      if (started) {
        // Remove the powerup from the game
        const { removePowerupBadge } = require('./js/powerupSystem.js');
        removePowerupBadge(powerup);
        powerups.splice(powerupIndex, 1);
        // Pause game for selection
        setPowerupSelecting(true);
      }
    }
  });
  
  // Check projectile-waste collisions
  collisionDetector.checkProjectileWasteCollisions((projectile, projId, waste, wasteId) => {
    // Check if this projectile has already hit this waste
    const collisionKey = `${projectile.id}_${wasteId}`;
    if (processedCollisions.has(collisionKey)) {
      return;
    }
    
    if (waste.hitByProjectiles && waste.hitByProjectiles.includes(projectile.id)) {
      return; // Skip if already hit by this projectile
    }
    
    // Mark collision as processed
    processedCollisions.add(collisionKey);
    
    // Record that this projectile has hit this waste
    if (!waste.hitByProjectiles) {
      waste.hitByProjectiles = [];
    }
    waste.hitByProjectiles.push(projectile.id);
    
    projectile.hits = (projectile.hits || 0) + 1;
    const popup = createScorePopup(waste.x, waste.y, projectile.hits);
    scorePopups.push(popup);
    addScore(popup.totalScore);

    // Track waste defeat
    analytics.trackWasteDefeated(waste.wasteType || 'normal', projectile.hits, popup.totalScore);

    // Create explosion effect for destroyed waste
    explosions.push(createExplosion(waste.x, waste.y, waste.wasteType));

    // Remove waste from array
    const wasteIndex = wastes.indexOf(waste);
    if (wasteIndex >= 0) {
      wastes.splice(wasteIndex, 1);
    }

    // Screen shake feedback on hit (skip vibration in developer tools)
    const shakeIntensity = Math.min(projectile.hits * 2, 10);
    if (!isDevTools) {
      wx.vibrateShort({ type: shakeIntensity > 5 ? 'heavy' : 'medium' });
    }

    // Notify challenge
    const challengeComplete = onWasteKilled(frameCount);
    if (challengeComplete && challengeComplete.completed) {
      // Kill streak fulfilled - give reward immediately
      // Challenge completion is tracked in completeChallenge() for consistency
      handleChallengeReward(challengeComplete.reward);
    }

    // Try to spawn powerup on kill (pass waste count for priority adjustment)
    trySpawnPowerup(powerups, frameCount, wastes.length);

    // Try to drop skin (5% chance on waste kill)
    if (Math.random() < 0.05) {
      const droppedSkin = tryDropSkin();
      if (droppedSkin) {
        unlockSkin(droppedSkin);
        // Track skin unlock
        analytics.trackSkinUnlocked(droppedSkin, 'drop');
        console.log(t('messages.skinUnlocked', { skin: droppedSkin }));
      }
    }
  });

  // Update score popups
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    scorePopups[i].frame++;
    if (scorePopups[i].frame >= scorePopups[i].maxFrames) {
      scorePopups.splice(i, 1);
    }
  }

  // Update explosions
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].frame++;
    if (explosions[i].frame >= explosions[i].maxFrames) {
      explosions.splice(i, 1);
    }
  }

  // Update powerup bursts
  for (let i = powerupBursts.length - 1; i >= 0; i--) {
    powerupBursts[i].frame++;
    if (powerupBursts[i].frame >= powerupBursts[i].maxFrames) {
      powerupBursts.splice(i, 1);
    }
  }
}

// Draw everything
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  // Get frame count once for the entire draw function
  const frameCount = getFrameCount();

  // Background (drawn without clipping)
  drawSky(ctx, canvas);

  // Set up clipping region for game area only (exclude black bars)
  ctx.save();
  ctx.beginPath();
  ctx.rect(config.offsetX, 0, W * config.scale, canvas.height);
  ctx.clip();
  drawSun(ctx, lastDeltaTime);
  drawRainbow(ctx);

  // Game entities (clipped to game area)
  clouds.forEach(c => drawCloud(ctx, c));
  
  // Draw wave birds (bird watching feature) - use bird's currentAlpha (fades to 0 when being watched)
  const waveBirds = getCurrentWaveBirds();
  const polaroidDimOpacity = shouldDimBirds() ? 0.3 : 1;
  waveBirds.forEach(b => {
    // Bird fades out when being watched, otherwise uses polaroid dim opacity
    const birdOpacity = (b.currentAlpha !== undefined ? b.currentAlpha : 1) * polaroidDimOpacity;
    drawBird(ctx, b, birdOpacity);
  });
  
  drawWall(ctx);

  // Shield effect on flowers
  const hasShield = isPowerupActive(activePowerups, 'shield');
  if (hasShield) {
    drawShieldEffect(ctx, getFlowerPositions(), flowerAlive, frameCount);
  }

  drawHealthFlowers(ctx, hasShield, lastDeltaTime);

  // Slingshot body (below projectiles)
  drawSlingshotBody(ctx);

  // Draw trajectory prediction when dragging
  if (isDragging()) {
    const sling = getSlingshot();
    const dragCurrent = getDragCurrent();
    if (dragCurrent) {
      drawTrajectoryPrediction(ctx, sling, dragCurrent, SLING_CONFIG.maxDrag);
    }
  }

  // Projectiles (above slingshot body, below bands)
  projectiles.forEach(p => drawProjectile(ctx, p, frameCount));

  // Slingshot bands (above projectiles)
  drawSlingshotBandsOnly(ctx);

  // Draw flying powerups
  powerups.forEach(p => drawPowerup(ctx, p, frameCount));

  // Draw inventory slots (bottom right)
  drawInventorySlots(ctx, frameCount);

  // Draw flying powerups (animating to inventory)
  drawFlyingPowerups(ctx, frameCount);

  explosions.forEach(e => drawExplosion(ctx, e));
  scorePopups.forEach(s => drawScorePopup(ctx, s));

  // Draw powerup burst effects
  powerupBursts.forEach(b => drawPowerupBurst(ctx, b));

  // Wastes at top of z-index (drawn last among game entities)
  const isTimeSlowActive = isPowerupActive(activePowerups, 'time_slow');
  wastes.forEach(b => {
    drawWaste(ctx, b, frameCount, isTimeSlowActive);
    drawWasteFlash(ctx, b, frameCount);
  });

  // Wave announce arc


  // UI
  drawUI(ctx);

  // Draw camera button for bird watching (always shown with slide-in animation)
  drawCameraButton(ctx, Date.now());

  // Draw polaroid photo if active (on top of everything)
  drawPolaroidPhoto(ctx);

  // Restore context (remove clipping)
  ctx.restore();
  
  // Draw screen flash effect (outside clipping)
  if (isFlashActive()) {
    drawScreenFlash(ctx);
  }

  // Screens (drawn without clipping)
  if (isGameOver()) {
    drawGameOver(ctx, canvas);
  } else if (!isGameStarted()) {
    drawStartScreen(ctx, canvas);
  } else if (isGamePaused()) {
    drawPauseScreen(ctx, canvas);
  }

  // Skin gallery (drawn on top of everything)
  if (isGalleryVisible()) {
    drawGallery(ctx);
  }

  // Leaderboard (drawn on top of screens)
  if (isLeaderboardVisible()) {
    const sharedCanvas = wx.getOpenDataContext().canvas;
    if (sharedCanvas && sharedCanvas.width > 0) {
      ctx.drawImage(sharedCanvas, 0, 0);
    }
  }

  // Bird album (drawn on top of everything)
  if (isBirdAlbumVisible()) {
    drawBirdAlbum(ctx, canvas);
  }

  // Powerup selector overlay (drawn on top of everything when active)
  if (isPowerupSelecting()) {
    drawPowerupSelector(ctx, canvas);
    
    // Draw inventory on top of selector so users can click to free up space
    const frameCount = 0; // Frame count not needed for static rendering
    drawInventorySlots(ctx, frameCount);
  }
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start
init();
gameLoop();
