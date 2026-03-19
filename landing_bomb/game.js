// Bob-omb Squad - WeChat Mini Game (Refactored Version)

// Get canvas and context
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// Module-level deltaTime for use in render
let lastDeltaTime = 16;

// Core modules
const config = require('./js/config.js');
const { W, H, updateScale } = config;
const { loadResources, getResource } = require('./js/resources.js');
const { animationLoader } = require('./js/animationLoader.js');

// Game state - direct array exports
const {
  resetGame, addScore, setGameStarted, setGameOver, setGamePaused, setLastTime, incrementFrameCount,
  getScore, getFrameCount, getLastTime, isGameOver, isGameStarted, isGamePaused,
  getFlowerPositions, damageFlower, healFlower, hasDeadFlower,
  bombs, projectiles, explosions, scorePopups, clouds,
  powerups, activePowerups, powerupBursts,
  flowerAlive, flowerFrameIndices
} = require('./js/gameState.js');

// Wave system
const {
  startWave, resetWaves, updateWaves, getCurrentWave, getCurrentWaveConfig
} = require('./js/waveSystem.js');

// Powerup system
const {
  trySpawnPowerup, updatePowerups, checkPowerupCollision, pickupPowerup,
  activatePowerup, updateActivePowerups, isPowerupActive,
  getSpeedMultiplier,
  drawPowerup, createPowerupBurst, drawPowerupBurst,
  drawShieldEffect, randomPowerupType,
  updateTimeSlowFlash, updateFlashAnimations, drawBombFlash
} = require('./js/powerupSystem.js');

// Powerup inventory system
const {
  resetInventory, updateFlyingPowerups, drawInventorySlots, drawFlyingPowerups,
  usePowerupFromInventory, hitTestInventory
} = require('./js/powerupInventory.js');

// Challenge system
const {
  updateChallenge, onBombKilled, onFlowerDamaged,
  updateChallengeResult, resetChallenges, getCurrentChallenge
} = require('./js/challengeSystem.js');

// Slingshot skin system
const { tryDropSkin, unlockSkin } = require('./js/slingshotSkinSystem.js');

// Entities
const { drawSky, drawSun, drawRainbow } = require('./js/entities/sky.js');
const { initClouds, updateClouds, drawCloud } = require('./js/entities/cloud.js');
const { drawWall } = require('./js/entities/wall.js');
const { drawHealthFlowers } = require('./js/entities/flower.js');
const {
  updateSlingshotPosition, drawSlingshot, drawSlingshotBody, drawSlingshotBandsOnly,
  clearDrag, getDragCurrent, isDragging, getSlingshot, drawTrajectoryPrediction, SLING_CONFIG
} = require('./js/entities/slingshot.js');
const {
  drawBomb, createBomb, createNormalBombAt, updateBomb, clearBombFrameStorage,
  BOMB_TYPES, isSpecialWave, getSpecialBombCountForWave
} = require('./js/entities/bomb.js');
const { drawProjectile, updateProjectile, isOutOfBounds, checkCollision } = require('./js/entities/projectile.js');
const {
  createExplosion, createGroundExplosion, createScorePopup,
  drawExplosion, drawScorePopup
} = require('./js/entities/explosion.js');

// Wave announce
const { triggerWaveAnnounce, updateWaveAnnounce, drawWaveAnnounce } = require('./js/waveAnnounce.js');

// UI and Input
const { drawUI, drawGameOver, drawStartScreen, drawPauseScreen } = require('./js/ui.js');
const { drawGallery, isGalleryVisible } = require('./js/skinGallery.js');
const { setupInput, registerCallbacks } = require('./js/inputHandler.js');

// Setup canvas size
const systemInfo = wx.getSystemInfoSync();
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;
updateScale();

// Initialize game
function init() {
  // Initialize clouds
  const initialClouds = initClouds();
  clouds.push(...initialClouds);

  // Load resources and start
  loadResources().then(() => {
    console.log('Resources loaded, starting game');
    updateSlingshotPosition();
  });

  // Setup input callbacks
  registerCallbacks({
    onGameStart: () => {
      setGameStarted(true);
      resetGame();
      resetWaves();
      resetChallenges();
      resetInventory();
      startWave(1);
      triggerWaveAnnounce(1);
    },
    onGameReset: () => {
      resetGame();
      resetWaves();
      resetChallenges();
      resetInventory();
      clearBombFrameStorage();
      startWave(1);
      triggerWaveAnnounce(1);
    },
    onFire: (proj) => {
      if (proj) projectiles.push(proj);
    },
    onInventoryClick: (slotIndex) => {
      const gameState = { healFlower, explodeAllBombs };
      usePowerupFromInventory(slotIndex, activePowerups, gameState);
    }
  });

  setupInput();
}

// Explode all bombs on screen (for explosive powerup)
function explodeAllBombs() {
  const frameCount = getFrameCount();
  const bombCount = bombs.length;
  
  // Explode each bomb and give 100 score per bomb
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    explosions.push(createExplosion(b.x, b.y, b.bombType));
    bombs.splice(i, 1);
    onBombKilled(frameCount);
  }
  
  // Add score: 100 points per bomb
  if (bombCount > 0) {
    addScore(bombCount * 100);
    // Create a big score popup
    const popup = createScorePopup(W / 2, H / 2, bombCount);
    popup.totalScore = bombCount * 100;
    popup.text = `+${bombCount * 100}`;
    scorePopups.push(popup);
  }
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
    activatePowerup(type, activePowerups, { healFlower, explodeAllBombs });
  }
}

// Update game logic
function update() {
  if (isGameOver() || !isGameStarted() || isGamePaused()) return;

  const currentTime = Date.now();
  const deltaTime = currentTime - getLastTime();
  lastDeltaTime = deltaTime;
  setLastTime(currentTime);

  incrementFrameCount();
  const frameCount = getFrameCount();

  // Update animations
  const bombResources = ['bomb_normal', 'bomb_shielded', 'bomb_twin'];
  bombResources.forEach(key => {
    const bombRes = getResource(key);
    if (bombRes) {
      animationLoader.update(bombRes, deltaTime);
    }
  });

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

  // Update wave system
  const waveAction = updateWaves(bombs.length);
  if (waveAction.action === 'start_wave') {
    startWave(waveAction.wave);
    triggerWaveAnnounce(waveAction.wave);
  } else if (waveAction.action === 'spawn_bomb') {
    const waveConfig = getCurrentWaveConfig();
    const bomb = createBomb(waveConfig, getCurrentWave());
    bombs.push(bomb);
  } else if (waveAction.action === 'spawn_special_bomb') {
    // Spawn special bomb (armored or dumbbell) for waves 5, 10, 15, etc.
    const waveConfig = getCurrentWaveConfig();
    const bomb = createBomb(waveConfig, getCurrentWave(), waveAction.bombType);
    bombs.push(bomb);
  } else if (waveAction.action === 'wave_ended') {
    // Handle challenge result reward
    if (waveAction.challengeResult && waveAction.challengeResult.success) {
      handleChallengeReward(waveAction.challengeResult.reward);
    }
  }

  // Update active powerups
  updateActivePowerups(activePowerups);

  // Update time_slow flash animations
  updateTimeSlowFlash(activePowerups, bombs);
  updateFlashAnimations();

  // Update wave announce animation
  updateWaveAnnounce();

  // Update challenge
  updateChallenge(frameCount);
  updateChallengeResult();

  // Get speed multiplier for time_slow
  const speedMult = getSpeedMultiplier(activePowerups);

  // Update bombs
  const flowerPositions = getFlowerPositions();
  const hasShield = isPowerupActive(activePowerups, 'shield');
  for (let i = bombs.length - 1; i >= 0; i--) {
    const bomb = bombs[i];
    updateBomb(bomb, frameCount, speedMult);

    // Check ground collision
    if (bomb.y > 820 - bomb.radius) {
      if (hasShield) {
        // Shield active: destroy bomb without damaging flowers
        explosions.push(createExplosion(bomb.x, bomb.y, 'normal'));
        bombs.splice(i, 1);
      } else {
        explosions.push(createGroundExplosion(bomb.x, 815));
        bombs.splice(i, 1);

        // Find nearest flower
        let closestIdx = -1;
        let closestDist = Infinity;
        for (let f = 0; f < 4; f++) {
          if (!flowerAlive[f]) continue;
          const pos = flowerPositions[f];
          const dist = Math.abs(bomb.x - pos.x);
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
    }
  }

  // Update flying powerups
  updatePowerups(powerups, frameCount);

  // Update inventory fly-in animations
  updateFlyingPowerups();

  // Update projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    updateProjectile(p);

    // Remove if out of bounds
    if (isOutOfBounds(p)) {
      projectiles.splice(i, 1);
      continue;
    }

    // Check collisions with powerups
    for (let k = powerups.length - 1; k >= 0; k--) {
      const pu = powerups[k];
      if (checkPowerupCollision(p, pu)) {
        // Pickup powerup (adds to inventory with fly-in animation, or triggers immediately if full)
        const gameState = { healFlower, explodeAllBombs };
        pickupPowerup(pu, powerups, k, activePowerups, gameState);
      }
    }

    // Check collisions with bombs
    for (let j = bombs.length - 1; j >= 0; j--) {
      const b = bombs[j];
      if (checkCollision(p, b)) {
        // Check if this projectile has already hit this bomb
        if (b.hitByProjectiles && b.hitByProjectiles.includes(p.id)) {
          continue; // Skip if already hit by this projectile
        }
        
        // Record that this projectile has hit this bomb
        if (!b.hitByProjectiles) {
          b.hitByProjectiles = [];
        }
        b.hitByProjectiles.push(p.id);
        
        p.hits = (p.hits || 0) + 1;
        const popup = createScorePopup(b.x, b.y, p.hits);
        scorePopups.push(popup);
        addScore(popup.totalScore);

        // Handle special bomb types
        if (b.bombType === BOMB_TYPES.ARMORED) {
          // Armored bomb: reduce health, if still has health, transform to normal
          b.health--;
          if (b.health > 0) {
            // Armor broken, transform to normal bomb
            b.bombType = BOMB_TYPES.NORMAL;
            b.health = 1;
            // Create armor break effect (smaller explosion)
            explosions.push(createExplosion(b.x, b.y, 'normal'));
            // Don't remove the bomb, it continues falling
            continue;
          }
        } else if (b.bombType === BOMB_TYPES.DUMBBELL) {
          // Dumbbell bomb: split into two normal bombs
          const waveConfig = getCurrentWaveConfig();
          const currentWave = getCurrentWave();

          // Calculate split positions with boundary check
          const splitDistance = 50;
          const margin = 40; // Minimum distance from screen edge
          const leftX = Math.max(margin, b.x - splitDistance);
          const rightX = Math.min(W - margin, b.x + splitDistance);

          // Create left split bomb
          const leftBomb = createNormalBombAt(leftX, b.y, waveConfig, currentWave);
          leftBomb.speed = b.speed * 1.1;
          leftBomb.sway = b.sway * 0.8;
          leftBomb.swayOffset = Math.PI; // Start with leftward sway
          bombs.push(leftBomb);

          // Create right split bomb
          const rightBomb = createNormalBombAt(rightX, b.y, waveConfig, currentWave);
          rightBomb.speed = b.speed * 1.1;
          rightBomb.sway = b.sway * 0.8;
          rightBomb.swayOffset = 0; // Start with rightward sway
          bombs.push(rightBomb);
        }

        // Create explosion effect for destroyed bomb
        explosions.push(createExplosion(b.x, b.y, b.bombType));

        bombs.splice(j, 1);

        // Screen shake feedback on hit
        const shakeIntensity = Math.min(p.hits * 2, 10);
        wx.vibrateShort({ type: shakeIntensity > 5 ? 'heavy' : 'medium' });

        // Notify challenge
        const challengeComplete = onBombKilled(frameCount);
        if (challengeComplete && challengeComplete.completed) {
          // Kill streak fulfilled - give reward immediately
          handleChallengeReward(challengeComplete.reward);
        }

        // Try to spawn powerup on kill (pass bomb count for priority adjustment)
        trySpawnPowerup(powerups, frameCount, bombs.length);

        // Try to drop skin (5% chance on bomb kill)
        if (Math.random() < 0.05) {
          const droppedSkin = tryDropSkin();
          if (droppedSkin) {
            unlockSkin(droppedSkin);
            // TODO: Show skin unlock notification
            console.log(`Unlocked skin: ${droppedSkin}`);
          }
        }
      }
    }
  }

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
  projectiles.forEach(p => drawProjectile(ctx, p));

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

  // Bombs at top of z-index (drawn last among game entities)
  const isTimeSlowActive = isPowerupActive(activePowerups, 'time_slow');
  bombs.forEach(b => {
    drawBomb(ctx, b, frameCount, isTimeSlowActive);
    drawBombFlash(ctx, b, frameCount);
  });

  // Wave announce arc
  drawWaveAnnounce(ctx);

  // UI
  drawUI(ctx);

  // Restore context (remove clipping)
  ctx.restore();

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
