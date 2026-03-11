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
  resetGame, addScore, setGameStarted, setGameOver, setLastTime, incrementFrameCount,
  getScore, getFrameCount, getLastTime, isGameOver, isGameStarted,
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
  trySpawnPowerup, updatePowerups, checkPowerupCollision,
  activatePowerup, updateActivePowerups, isPowerupActive, getActivePowerup,
  consumePowerupUse, getSpeedMultiplier,
  drawPowerup, createPowerupBurst, drawPowerupBurst,
  drawShieldEffect, randomPowerupType
} = require('./js/powerupSystem.js');

// Challenge system
const {
  updateChallenge, onBombKilled, onFlowerDamaged,
  updateChallengeResult, resetChallenges, getCurrentChallenge
} = require('./js/challengeSystem.js');

// Entities
const { drawSky, drawSun, drawRainbow } = require('./js/entities/sky.js');
const { initClouds, updateClouds, drawCloud } = require('./js/entities/cloud.js');
const { drawWall } = require('./js/entities/wall.js');
const { drawHealthFlowers } = require('./js/entities/flower.js');
const {
  updateSlingshotPosition, drawSlingshot, drawSlingshotBody, drawSlingshotBandsOnly,
  clearDrag, getDragCurrent, isDragging, getSlingshot
} = require('./js/entities/slingshot.js');
const { drawBomb, createBomb, updateBomb } = require('./js/entities/bomb.js');
const { drawProjectile, updateProjectile, isOutOfBounds, checkCollision } = require('./js/entities/projectile.js');
const {
  createExplosion, createGroundExplosion, createScorePopup,
  drawExplosion, drawScorePopup
} = require('./js/entities/explosion.js');

// Wave announce
const { triggerWaveAnnounce, updateWaveAnnounce, drawWaveAnnounce } = require('./js/waveAnnounce.js');

// UI and Input
const { drawUI, drawGameOver, drawStartScreen } = require('./js/ui.js');
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
      startWave(1);
      triggerWaveAnnounce(1);
    },
    onGameReset: () => {
      resetGame();
      resetWaves();
      resetChallenges();
      startWave(1);
      triggerWaveAnnounce(1);
    },
    onFire: (proj) => {
      if (proj) projectiles.push(proj);
    }
  });

  setupInput();
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
    activatePowerup(type, activePowerups, { healFlower });
  }
}

// Update game logic
function update() {
  if (isGameOver() || !isGameStarted()) return;

  const currentTime = Date.now();
  const deltaTime = currentTime - getLastTime();
  lastDeltaTime = deltaTime;
  setLastTime(currentTime);

  incrementFrameCount();
  const frameCount = getFrameCount();

  // Update animations
  const bombRes = getResource('bomb');
  if (bombRes) {
    animationLoader.update(bombRes, deltaTime);
  }

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
  } else if (waveAction.action === 'wave_ended') {
    // Handle challenge result reward
    if (waveAction.challengeResult && waveAction.challengeResult.success) {
      handleChallengeReward(waveAction.challengeResult.reward);
    }
  }

  // Update active powerups
  updateActivePowerups(activePowerups);

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

  // Update projectiles
  const hasExplosive = isPowerupActive(activePowerups, 'explosive');
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
        // Activate the powerup
        activatePowerup(pu.type, activePowerups, { healFlower });
        // Burst effect
        powerupBursts.push(createPowerupBurst(pu.x, pu.y, pu.type));
        powerups.splice(k, 1);
      }
    }

    // Check collisions with bombs
    for (let j = bombs.length - 1; j >= 0; j--) {
      const b = bombs[j];
      if (checkCollision(p, b)) {
        p.hits = (p.hits || 0) + 1;
        const popup = createScorePopup(b.x, b.y, p.hits);
        scorePopups.push(popup);
        addScore(popup.totalScore);
        explosions.push(createExplosion(b.x, b.y, b.bombType));

        const bombX = b.x;
        const bombY = b.y;
        bombs.splice(j, 1);

        // Notify challenge
        const challengeComplete = onBombKilled(frameCount);
        if (challengeComplete) {
          const challenge = getCurrentChallenge();
          // Challenge completed mid-wave - will be settled at wave end
        }

        // Explosive powerup: area damage
        if (hasExplosive) {
          for (let m = bombs.length - 1; m >= 0; m--) {
            const other = bombs[m];
            const dx = other.x - bombX;
            const dy = other.y - bombY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 50) {
              p.hits++;
              const aoePopup = createScorePopup(other.x, other.y, p.hits);
              scorePopups.push(aoePopup);
              addScore(aoePopup.totalScore);
              explosions.push(createExplosion(other.x, other.y, other.bombType));
              bombs.splice(m, 1);
              onBombKilled(frameCount);
            }
          }
          consumePowerupUse(activePowerups, 'explosive');
        }

        // Try to spawn powerup on kill
        trySpawnPowerup(powerups);
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
  if (isPowerupActive(activePowerups, 'shield')) {
    const frameCount = getFrameCount();
    drawShieldEffect(ctx, getFlowerPositions(), flowerAlive, frameCount);
  }

  drawHealthFlowers(ctx);

  const frameCount = getFrameCount();
  bombs.forEach(b => drawBomb(ctx, b, frameCount));
  // Slingshot body (below projectiles)
  drawSlingshotBody(ctx);

  // Projectiles (above slingshot body, below bands)
  projectiles.forEach(p => drawProjectile(ctx, p));

  // Slingshot bands (above projectiles)
  drawSlingshotBandsOnly(ctx);

  // Draw flying powerups
  powerups.forEach(p => drawPowerup(ctx, p));

  explosions.forEach(e => drawExplosion(ctx, e));
  scorePopups.forEach(s => drawScorePopup(ctx, s));

  // Draw powerup burst effects
  powerupBursts.forEach(b => drawPowerupBurst(ctx, b));

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
