// Bob-omb Squad - WeChat Mini Game (Refactored Version)

// Get canvas and context
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// Module-level deltaTime for use in render
let lastDeltaTime = 16;

// Core modules
const config = require('./js/config.js');
const { W, H, updateScale, isDevTools } = config;
const { loadResources, getResource } = require('./js/resources.js');
const { animationLoader } = require('./js/animationLoader.js');

// Game state - direct array exports
const {
  resetGame, addScore, setGameStarted, setGameOver, setGamePaused, setLastTime, incrementFrameCount, setLives,
  getScore, getFrameCount, getLastTime, isGameOver, isGameStarted, isGamePaused,
  getFlowerPositions, damageFlower, healFlower, hasDeadFlower,
  bombs, projectiles, explosions, scorePopups, clouds,
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

// Falling shield effect
const {
  createFallingShield, updateFallingShields, drawFallingShields, clearFallingShields
} = require('./js/entities/fallingShield.js');

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
const { drawProjectile, updateProjectile, isOutOfBounds } = require('./js/entities/projectile.js');
// Collision System
const { collisionDetector } = require('./js/systems/collisionSystem.js');
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

// Social System
const {
  initSocialSystem,
  setGetCurrentWaveFn,
  updateLeaderboardScore,
  shareGame
} = require('./js/socialSystem.js');

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

  // Initialize social system
  initSocialSystem();
  setGetCurrentWaveFn(getCurrentWave);

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
      clearFallingShields();
      startWave(1);
      triggerWaveAnnounce(1);
    },
    onFire: (proj) => {
      if (proj) projectiles.push(proj);
    },
    onInventoryClick: (slotIndex) => {
      const gameState = { healFlower, explodeAllBombs };
      usePowerupFromInventory(slotIndex, activePowerups, gameState);
    },
    onRevive: () => {
      // Revive player: revive only one flower, clear bombs, and prepare for next wave
      let revived = false;
      for (let i = 0; i < 4; i++) {
        if (!flowerAlive[i] && !revived) {
          flowerAlive[i] = true;
          revived = true;
        } else if (flowerAlive[i]) {
          // Kill all other flowers, keep only one alive
          flowerAlive[i] = false;
        }
      }
      // Clear all bombs for a clean start
      bombs.length = 0;
      // Mark that we need to advance to next wave when player continues
      pendingWaveAdvance = true;
      setLives(1);
      setGameOver(false);
      setGamePaused(true);
      console.log('Player revived with one flower! Bombs cleared. Next wave ready when player continues.');
    },
    onResume: () => {
      // Check if we need to advance to next wave after revive
      if (pendingWaveAdvance) {
        pendingWaveAdvance = false;
        // Advance to next wave
        const nextWave = getCurrentWave() + 1;
        startWave(nextWave);
        console.log(`Advanced to wave ${nextWave} after revive!`);
      }
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

  // Update bombs and register with collision system
  const flowerPositions = getFlowerPositions();
  const hasShield = isPowerupActive(activePowerups, 'shield');
  
  // Clear and rebuild collision system grids
  collisionDetector.clear();
  
  // Update bombs and register for collision detection
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
      continue; // Skip registering destroyed bombs
    }
    
    // Register bomb with collision system
    collisionDetector.registerBomb(bomb, `bomb_${i}`);
  }

  // Update flying powerups and register with collision system
  updatePowerups(powerups, frameCount);
  for (let i = 0; i < powerups.length; i++) {
    collisionDetector.registerPowerup(powerups[i], `powerup_${i}`);
  }

  // Update inventory fly-in animations
  updateFlyingPowerups();

  // Update falling shields
  updateFallingShields();

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
  const processedCollisions = new Set(); // Track processed projectile-bomb pairs
  
  // Check projectile-powerup collisions
  collisionDetector.checkProjectilePowerupCollisions((projectile, projId, powerup, powerupId) => {
    const powerupIndex = powerups.indexOf(powerup);
    if (powerupIndex >= 0) {
      const gameState = { healFlower, explodeAllBombs };
      pickupPowerup(powerup, powerups, powerupIndex, activePowerups, gameState);
    }
  });
  
  // Check projectile-bomb collisions
  collisionDetector.checkProjectileBombCollisions((projectile, projId, bomb, bombId) => {
    // Check if this projectile has already hit this bomb
    const collisionKey = `${projectile.id}_${bombId}`;
    if (processedCollisions.has(collisionKey)) {
      return;
    }
    
    if (bomb.hitByProjectiles && bomb.hitByProjectiles.includes(projectile.id)) {
      return; // Skip if already hit by this projectile
    }
    
    // Mark collision as processed
    processedCollisions.add(collisionKey);
    
    // Record that this projectile has hit this bomb
    if (!bomb.hitByProjectiles) {
      bomb.hitByProjectiles = [];
    }
    bomb.hitByProjectiles.push(projectile.id);
    
    projectile.hits = (projectile.hits || 0) + 1;
    const popup = createScorePopup(bomb.x, bomb.y, projectile.hits);
    scorePopups.push(popup);
    addScore(popup.totalScore);

    // Handle special bomb types
    if (bomb.bombType === BOMB_TYPES.ARMORED) {
      // Armored bomb: reduce health, if still has health, transform to normal
      bomb.health--;
      if (bomb.health > 0) {
        // Armor broken, transform to normal bomb
        bomb.bombType = BOMB_TYPES.NORMAL;
        bomb.health = 1;
        // Create falling shield effect
        createFallingShield(bomb.x, bomb.y);
        // Create armor break effect (smaller explosion)
        explosions.push(createExplosion(bomb.x, bomb.y, 'normal'));
        // Don't remove the bomb, it continues falling
        return;
      }
    } else if (bomb.bombType === BOMB_TYPES.DUMBBELL) {
      // Dumbbell bomb: split into two normal bombs
      const waveConfig = getCurrentWaveConfig();
      const currentWave = getCurrentWave();

      // Calculate split positions with boundary check
      const splitDistance = 50;
      const margin = 40; // Minimum distance from screen edge
      const leftX = Math.max(margin, bomb.x - splitDistance);
      const rightX = Math.min(W - margin, bomb.x + splitDistance);

      // Create left split bomb (keeps twin parachute)
      const leftBomb = createNormalBombAt(leftX, bomb.y, waveConfig, currentWave, 'twin');
      leftBomb.speed = bomb.speed * 1.1;
      leftBomb.sway = bomb.sway * 0.8;
      leftBomb.swayOffset = Math.PI; // Start with leftward sway
      bombs.push(leftBomb);

      // Create right split bomb (keeps twin parachute)
      const rightBomb = createNormalBombAt(rightX, bomb.y, waveConfig, currentWave, 'twin');
      rightBomb.speed = bomb.speed * 1.1;
      rightBomb.sway = bomb.sway * 0.8;
      rightBomb.swayOffset = 0; // Start with rightward sway
      bombs.push(rightBomb);
    }

    // Create explosion effect for destroyed bomb
    explosions.push(createExplosion(bomb.x, bomb.y, bomb.bombType));

    // Remove bomb from array
    const bombIndex = bombs.indexOf(bomb);
    if (bombIndex >= 0) {
      bombs.splice(bombIndex, 1);
    }

    // Screen shake feedback on hit (skip vibration in developer tools)
    const shakeIntensity = Math.min(projectile.hits * 2, 10);
    if (!isDevTools) {
      wx.vibrateShort({ type: shakeIntensity > 5 ? 'heavy' : 'medium' });
    }

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

  // Draw falling shields (behind bombs)
  drawFallingShields(ctx, config.sx, config.sy, config.ss);

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
