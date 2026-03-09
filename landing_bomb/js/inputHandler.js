// Input Handling Module

const { W, H, toGame } = require('./config.js');
const { isGameStarted, isGameOver, resetGame } = require('./gameState.js');
const { createProjectile } = require('./entities/projectile.js');
const { getSlingshot, SLING_CONFIG, isDragging, setDragging, setDragStart, setDragCurrent, clearDrag } = require('./entities/slingshot.js');
const { startWave, resetWaves } = require('./waveSystem.js');

// Game reference for firing
let gameCallbacks = {};

function registerCallbacks(callbacks) {
  gameCallbacks = callbacks;
}

// Handle touch start
function handleTouchStart(e) {
  const gp = toGame(e.touches[0].clientX, e.touches[0].clientY);
  
  if (!isGameStarted()) {
    // Start button check
    const btnW = 140;
    const btnH = 44;
    if (gp.x > W / 2 - btnW / 2 && gp.x < W / 2 + btnW / 2 && 
        gp.y > H / 2 + 80 && gp.y < H / 2 + 80 + btnH) {
      gameCallbacks.onGameStart && gameCallbacks.onGameStart();
    }
    return;
  }
  
  if (isGameOver()) {
    // Play again button check
    const btnW = 140;
    const btnH = 40;
    const boxH = 280;
    const btnTop = H / 2 - boxH / 2 + boxH * 0.78;
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
