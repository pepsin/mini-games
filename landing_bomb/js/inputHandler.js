// Input Handling Module - Node-based version

const { W, H, toGame } = require('./config.js');
const { isGameStarted, isGameOver } = require('./gameState.js');

// Input callbacks - set by the game
let inputCallbacks = {
  onTouchStart: null,
  onTouchMove: null,
  onTouchEnd: null,
  onGameStart: null,
  onGameReset: null
};

// Setup input callbacks
function setupInput(callbacks) {
  inputCallbacks = { ...inputCallbacks, ...callbacks };
  
  wx.onTouchStart(handleTouchStart);
  wx.onTouchMove(handleTouchMove);
  wx.onTouchEnd(handleTouchEnd);
}

// Convert touch to game coordinates
function getGamePos(touch) {
  return toGame(touch.clientX, touch.clientY);
}

// Handle touch start
function handleTouchStart(e) {
  const gp = getGamePos(e.touches[0]);
  
  if (!isGameStarted()) {
    // Start button check
    const btnW = 140;
    const btnH = 44;
    if (gp.x > W / 2 - btnW / 2 && gp.x < W / 2 + btnW / 2 && 
        gp.y > H / 2 + 80 && gp.y < H / 2 + 80 + btnH) {
      inputCallbacks.onGameStart && inputCallbacks.onGameStart();
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
      inputCallbacks.onGameReset && inputCallbacks.onGameReset();
    }
    return;
  }
  
  // Forward to game callback
  if (inputCallbacks.onTouchStart) {
    inputCallbacks.onTouchStart(gp);
  }
}

// Handle touch move
function handleTouchMove(e) {
  if (!isGameStarted() || isGameOver()) return;
  
  const gp = getGamePos(e.touches[0]);
  if (inputCallbacks.onTouchMove) {
    inputCallbacks.onTouchMove(gp);
  }
}

// Handle touch end
function handleTouchEnd(e) {
  if (!isGameStarted() || isGameOver()) return;
  
  if (inputCallbacks.onTouchEnd) {
    inputCallbacks.onTouchEnd();
  }
}

module.exports = {
  setupInput,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd
};
