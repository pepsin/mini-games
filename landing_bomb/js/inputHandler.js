// Input Handling Module

const { W, H, toGame } = require('./config.js');
const { isGameStarted, isGameOver, isGamePaused, setGamePaused, activePowerups } = require('./gameState.js');
const { createProjectile } = require('./entities/projectile.js');
const { getSlingshot, SLING_CONFIG, isDragging, setDragging, setDragStart, setDragCurrent, clearDrag, getDragStart } = require('./entities/slingshot.js');
const { consumePowerupUse, isPowerupActive } = require('./powerupSystem.js');
const { hitTest } = require('./uiState.js');

// Game reference for firing
let gameCallbacks = {};

function registerCallbacks(callbacks) {
  gameCallbacks = callbacks;
}

// Handle touch start
function handleTouchStart(e) {
  const gp = toGame(e.touches[0].clientX, e.touches[0].clientY);
  
  if (!isGameStarted()) {
    // Start button - use bounds from flex layout
    if (hitTest('startButton', gp.x, gp.y)) {
      gameCallbacks.onGameStart && gameCallbacks.onGameStart();
    }
    return;
  }

  if (isGameOver()) {
    // Play again button - use bounds from flex layout
    if (hitTest('restartButton', gp.x, gp.y)) {
      gameCallbacks.onGameReset && gameCallbacks.onGameReset();
    }
    return;
  }

  // Check if game is paused - handle resume button click
  if (isGamePaused()) {
    if (hitTest('startButton', gp.x, gp.y)) {
      setGamePaused(false);
    }
    return;
  }

  // Check pause button click
  if (hitTest('pauseButton', gp.x, gp.y)) {
    setGamePaused(!isGamePaused());
    return;
  }
  
  // Start dragging
  setDragging(true);
  setDragStart(gp);
  setDragCurrent(gp);
}

// Handle touch move
function handleTouchMove(e) {
  if (!isDragging()) return;
  setDragCurrent(toGame(e.touches[0].clientX, e.touches[0].clientY));
}

// Handle touch end
function handleTouchEnd(e) {
  if (!isDragging()) return;

  const sling = getSlingshot();
  const dragStart = getDragStart();
  const dragCurrent = setDragCurrent();
  
  // Calculate actual drag distance (from touch start to release)
  const dx = dragCurrent.x - dragStart.x;
  const dy = dragCurrent.y - dragStart.y;
  const dragDistance = Math.sqrt(dx * dx + dy * dy);
  
  // Minimum drag distance required to shoot (prevents simple taps/clicks)
  const minDragDistance = 30;
  if (dragDistance < minDragDistance) {
    clearDrag();
    return;
  }

  const proj = createProjectile(sling, dragCurrent, SLING_CONFIG.maxDrag);
  if (proj && gameCallbacks.onFire) {
    gameCallbacks.onFire(proj);

    // Multi-shot: create two extra projectiles at ±8°
    if (isPowerupActive(activePowerups, 'multi_shot')) {
      const spreadAngle = 8 * Math.PI / 180;
      for (const sign of [-1, 1]) {
        const angle = Math.atan2(proj.vy, proj.vx) + sign * spreadAngle;
        const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
        const extraProj = {
          x: proj.x,
          y: proj.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: proj.radius,
          gravity: proj.gravity,
          hits: 0
        };
        gameCallbacks.onFire(extraProj);
      }
      consumePowerupUse(activePowerups, 'multi_shot');
    }
  }

  clearDrag();
}

// Setup input listeners
function setupInput() {
  wx.onTouchStart(handleTouchStart);
  wx.onTouchMove(handleTouchMove);
  wx.onTouchEnd(handleTouchEnd);
}

module.exports = {
  setupInput,
  registerCallbacks,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd
};
