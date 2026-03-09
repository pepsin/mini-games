// Bob-omb Squad - WeChat Mini Game (Refactored Version)

// Get canvas and context
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// Core modules
const config = require('./js/config.js');
const { W, H, updateScale } = config;
const { loadResources, getResource } = require('./js/resources.js');
const { animationLoader } = require('./js/animationLoader.js');

// Game state - direct array exports
const {
  resetGame, addScore, setGameStarted, setGameOver, setLastTime, incrementFrameCount,
  getScore, getFrameCount, getLastTime, isGameOver, isGameStarted,
  getFlowerPositions, damageFlower,
  bombs, projectiles, explosions, scorePopups, clouds,
  flowerAlive, flowerFrameIndices
} = require('./js/gameState.js');

// Wave system
const {
  startWave, resetWaves, updateWaves, getCurrentWave, getCurrentWaveConfig
} = require('./js/waveSystem.js');

// Entities
const { drawSky, drawSun, drawRainbow } = require('./js/entities/sky.js');
const { initClouds, updateClouds, drawCloud } = require('./js/entities/cloud.js');
const { drawWall } = require('./js/entities/wall.js');
const { drawHealthFlowers } = require('./js/entities/flower.js');
const {
  updateSlingshotPosition, drawSlingshot, clearDrag, getDragCurrent, isDragging, getSlingshot
} = require('./js/entities/slingshot.js');
const { drawBomb, createBomb, updateBomb } = require('./js/entities/bomb.js');
const { drawProjectile, updateProjectile, isOutOfBounds, checkCollision } = require('./js/entities/projectile.js');
const {
  createExplosion, createGroundExplosion, createScorePopup,
  drawExplosion, drawScorePopup
} = require('./js/entities/explosion.js');

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
      startWave(1);
    },
    onGameReset: () => {
      resetGame();
      resetWaves();
      startWave(1);
    },
    onFire: (proj) => {
      if (proj) projectiles.push(proj);
    }
  });
  
  setupInput();
}

// Update game logic
function update() {
  if (isGameOver() || !isGameStarted()) return;
  
  const currentTime = Date.now();
  const deltaTime = currentTime - getLastTime();
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
  } else if (waveAction.action === 'spawn_bomb') {
    const waveConfig = getCurrentWaveConfig();
    const bomb = createBomb(waveConfig, getCurrentWave());
    bombs.push(bomb);
  }
  
  // Update bombs
  const flowerPositions = getFlowerPositions();
  for (let i = bombs.length - 1; i >= 0; i--) {
    const bomb = bombs[i];
    updateBomb(bomb, frameCount);
    
    // Check ground collision
    if (bomb.y > 820 - bomb.radius) {
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
      }
    }
  }
  
  // Update projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    updateProjectile(p);
    
    // Remove if out of bounds
    if (isOutOfBounds(p)) {
      projectiles.splice(i, 1);
      continue;
    }
    
    // Check collisions with bombs
    for (let j = bombs.length - 1; j >= 0; j--) {
      const b = bombs[j];
      if (checkCollision(p, b)) {
        p.hits = (p.hits || 0) + 1;
        const popup = createScorePopup(b.x, b.y, p.hits);
        addScore(popup.totalScore);
        explosions.push(createExplosion(b.x, b.y, b.bombType));
        bombs.splice(j, 1);
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
  drawSun(ctx);
  drawRainbow(ctx);
  
  // Game entities (clipped to game area)
  clouds.forEach(c => drawCloud(ctx, c));
  drawWall(ctx);
  drawHealthFlowers(ctx);
  
  const frameCount = getFrameCount();
  bombs.forEach(b => drawBomb(ctx, b, frameCount));
  projectiles.forEach(p => drawProjectile(ctx, p));
  explosions.forEach(e => drawExplosion(ctx, e));
  scorePopups.forEach(s => drawScorePopup(ctx, s));
  
  // Slingshot and UI
  drawSlingshot(ctx);
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
