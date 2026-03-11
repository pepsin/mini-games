// Input Handling Module

const { W, H, toGame } = require('./config.js');
const { isGameStarted, isGameOver, resetGame, activePowerups } = require('./gameState.js');
const { createProjectile } = require('./entities/projectile.js');
const { getSlingshot, SLING_CONFIG, isDragging, setDragging, setDragStart, setDragCurrent, clearDrag } = require('./entities/slingshot.js');
const { consumePowerupUse, isPowerupActive } = require('./powerupSystem.js');

// Game reference for firing
let gameCallbacks = {};

function registerCallbacks(callbacks) {
  gameCallbacks = callbacks;
}

// Handle touch start
function handleTouchStart(e) {
  const gp = toGame(e.touches[0].clientX, e.touches[0].clientY);
  
  if (!isGameStarted()) {
    // Start button check - matches roundedRect button in ui.js
    const btnW = 160;
    const btnH = 50;
    const btnTop = H / 2 + 70;
    if (gp.x > W / 2 - btnW / 2 && gp.x < W / 2 + btnW / 2 && 
        gp.y > btnTop && gp.y < btnTop + btnH) {
      gameCallbacks.onGameStart && gameCallbacks.onGameStart();
    }
    return;
  }
  
  if (isGameOver()) {
    // Play again button check - matches roundedRect button in ui.js
    const btnW = 140;
    const btnH = 44;
    const btnTop = H / 2 + 90;
    if (gp.x > W / 2 - btnW / 2 && gp.x < W / 2 + btnW / 2 && 
        gp.y > btnTop && gp.y < btnTop + btnH) {
      gameCallbacks.onGameReset && gameCallbacks.onGameReset();
    }
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
  const dragCurrent = setDragCurrent();

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
