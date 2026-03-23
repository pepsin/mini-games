// Powerup Selector Module - Slot Machine Style Selection

const { W, H, sx, sy, ss } = require('./config.js');
const { getResource } = require('./resources.js');
const { ElectricBadge } = require('./components/ElectricBadge.js');
const { POWERUP_TYPES } = require('./powerupSystem.js');
const { flexContainer, flexItem } = require('./flexLayout.js');
const { setButtonBounds, clearButtonBounds } = require('./uiState.js');

// Selection state
let isSelecting = false;
let selectorState = {
  currentType: null,
  types: [],
  currentIndex: 0,
  switchInterval: 50, // Start fast (50ms)
  lastSwitchTime: 0,
  animationStartTime: 0,
  finalType: null,
  isSlowingDown: false,
  isFinished: false,
  selectedCallback: null,
  badge: null,
  scale: 3, // 3x size
  originalRadius: 28,
  resultShown: false
};

// Powerup descriptions
const POWERUP_DESCRIPTIONS = {
  time_slow: '炸弹下落速度减半，持续5秒',
  multi_shot: '下次发射散射3发子弹',
  explosive: '立即清除屏幕所有炸弹',
  heal: '复活一朵死亡的花',
  shield: '无敌护盾，持续8秒',
  dragon_bullet: '火龙弹，超大范围攻击'
};

// Initialize powerup selector
function initPowerupSelector() {
  selectorState.types = Object.keys(POWERUP_TYPES);
  selectorState.currentType = selectorState.types[0];
}

// Start powerup selection animation
function startPowerupSelection(callback) {
  if (isSelecting) return false;
  
  isSelecting = true;
  selectorState.currentIndex = Math.floor(Math.random() * selectorState.types.length);
  selectorState.currentType = selectorState.types[selectorState.currentIndex];
  selectorState.switchInterval = 50; // Start fast
  selectorState.lastSwitchTime = Date.now();
  selectorState.animationStartTime = Date.now();
  selectorState.finalType = null;
  selectorState.isSlowingDown = false;
  selectorState.isFinished = false;
  selectorState.selectedCallback = callback;
  selectorState.resultShown = false;
  
  // Create large badge for display
  const def = POWERUP_TYPES[selectorState.currentType];
  const img = getPowerupImage(selectorState.currentType);
  
  // Create placeholder if image not loaded yet
  const badgeImage = img && img.width > 0 ? img : null;
  
  selectorState.badge = new ElectricBadge({
    image: badgeImage,
    color: def.color,
    radiusX: 72, // 24 * 3
    radiusY: 72,
    x: W / 2,
    y: H / 2 - 40,
    imageWidth: 120, // 40 * 3
    imageHeight: 120,
    coverRadius: 0.2,
    maxLines: 0
  });
  
  return true;
}

// Get powerup image
function getPowerupImage(type) {
  const res = getResource('powerup');
  if (res && res.variants && res.variants[type]) {
    return res.variants[type];
  }
  return null;
}

// Update selection animation
function updatePowerupSelector() {
  if (!isSelecting) return;
  
  const now = Date.now();
  const elapsed = now - selectorState.animationStartTime;
  
  // Check if we should start slowing down (after 600ms)
  if (!selectorState.isSlowingDown && elapsed > 600) {
    selectorState.isSlowingDown = true;
  }
  
  // Update switch interval (slow down gradually)
  if (selectorState.isSlowingDown) {
    const slowDownProgress = (elapsed - 600) / 400; // 400ms to fully slow down
    if (slowDownProgress >= 1) {
      selectorState.switchInterval = 300; // Final slow speed
    } else {
      selectorState.switchInterval = 50 + (250 * slowDownProgress);
    }
  }
  
  // Switch powerup type
  if (now - selectorState.lastSwitchTime >= selectorState.switchInterval) {
    selectorState.currentIndex = (selectorState.currentIndex + 1) % selectorState.types.length;
    selectorState.currentType = selectorState.types[selectorState.currentIndex];
    selectorState.lastSwitchTime = now;
    
    // Update badge with new image
    const def = POWERUP_TYPES[selectorState.currentType];
    const img = getPowerupImage(selectorState.currentType);
    if (img && img.width > 0) {
      selectorState.badge.image = img;
    }
    selectorState.badge.color = def.color;
  }
  
  // Check if animation should finish (after 1000ms total)
  if (elapsed >= 1000 && !selectorState.isFinished) {
    selectorState.isFinished = true;
    selectorState.finalType = selectorState.currentType;
    selectorState.resultShown = true;
  }
  
  // Update badge animation
  if (selectorState.badge) {
    selectorState.badge.update();
  }
}

// Draw powerup selector overlay
function drawPowerupSelector(ctx, canvas) {
  if (!isSelecting) return;
  
  // Draw semi-transparent black overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw the large powerup badge (highest z-index)
  if (selectorState.badge) {
    selectorState.badge.setPosition(sx(W / 2), sy(H / 2 - 40));
    selectorState.badge.draw(ctx);
  }
  
  // Draw result UI if finished
  if (selectorState.isFinished && selectorState.resultShown) {
    drawSelectorResult(ctx);
  }
}

// Draw the result with buttons
function drawSelectorResult(ctx) {
  const def = POWERUP_TYPES[selectorState.finalType];
  const description = POWERUP_DESCRIPTIONS[selectorState.finalType];
  
  // Create result panel
  const panel = flexContainer()
    .position((W - 280) / 2, H / 2 + 60)
    .size(280, null)
    .direction('column')
    .justify('center')
    .align('center')
    .setGap(12)
    .setPadding(20)
    .background('rgba(255, 255, 255, 0.95)')
    .border(4, def.color)
    .cornerRadius(16);
  
  // Powerup name
  panel.addChild(
    flexItem()
      .text(def.label, 24)
      .textStyle(def.color, 24, 'Arial', 'bold')
  );
  
  // Description
  panel.addChild(
    flexItem()
      .text(description, 14)
      .textStyle('#333', 14, 'Arial', 'normal')
  );
  
  // Button row
  const buttonRow = flexContainer()
    .direction('row')
    .justify('center')
    .align('center')
    .setGap(15);
  
  // Use now button
  buttonRow.addChild(
    flexItem()
      .tag('useNowButton')
      .text('立刻使用', 16)
      .textStyle('#FFFFFF', 16, 'Arial', 'bold')
      .background('#4CAF50')
      .padding({ left: 25, right: 25, top: 10, bottom: 10 })
      .cornerRadius(10)
  );
  
  // Store button
  buttonRow.addChild(
    flexItem()
      .tag('storeButton')
      .text('暂存', 16)
      .textStyle('#FFFFFF', 16, 'Arial', 'bold')
      .background('#FF9800')
      .padding({ left: 25, right: 25, top: 10, bottom: 10 })
      .cornerRadius(10)
  );
  
  panel.addChild(buttonRow);
  panel.draw(ctx);
  
  // Store button bounds for hit testing
  const useNowBounds = panel.getTaggedBounds('useNowButton');
  if (useNowBounds) {
    setButtonBounds('useNowButton', useNowBounds.x, useNowBounds.y, useNowBounds.width, useNowBounds.height);
  }
  
  const storeBounds = panel.getTaggedBounds('storeButton');
  if (storeBounds) {
    setButtonBounds('storeButton', storeBounds.x, storeBounds.y, storeBounds.width, storeBounds.height);
  }
}

// Handle touch in selector
function handleSelectorTouch(x, y) {
  if (!isSelecting || !selectorState.isFinished) return false;
  
  const { hitTest } = require('./uiState.js');
  
  if (hitTest('useNowButton', x, y)) {
    const result = {
      type: selectorState.finalType,
      action: 'use'
    };
    // Call the callback before closing
    if (selectorState.selectedCallback) {
      selectorState.selectedCallback(result);
    }
    closePowerupSelector();
    return true;
  }
  
  if (hitTest('storeButton', x, y)) {
    const result = {
      type: selectorState.finalType,
      action: 'store'
    };
    // Call the callback before closing
    if (selectorState.selectedCallback) {
      selectorState.selectedCallback(result);
    }
    closePowerupSelector();
    return true;
  }
  
  return false;
}

// Close powerup selector
function closePowerupSelector() {
  isSelecting = false;
  selectorState.resultShown = false;
  selectorState.badge = null;
  clearButtonBounds('useNowButton');
  clearButtonBounds('storeButton');
}

// Check if selector is active
function isPowerupSelecting() {
  return isSelecting;
}

// Get final selected type
function getSelectedPowerupType() {
  return selectorState.finalType;
}

module.exports = {
  initPowerupSelector,
  startPowerupSelection,
  updatePowerupSelector,
  drawPowerupSelector,
  handleSelectorTouch,
  closePowerupSelector,
  isPowerupSelecting,
  getSelectedPowerupType,
  POWERUP_DESCRIPTIONS
};