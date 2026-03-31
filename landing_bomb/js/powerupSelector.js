// Powerup Selector Module - Slot Machine Style Selection

const { W, H, sx, sy, ss } = require('./config.js');
const { getResource } = require('./resources.js');
const { ElectricBadge } = require('./components/ElectricBadge.js');
const { POWERUP_TYPES } = require('./powerupSystem.js');
const { flexContainer, flexItem } = require('./flexLayout.js');
const { setButtonBounds, clearButtonBounds } = require('./uiState.js');
const { isInventoryFull } = require('./powerupInventory.js');

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
  time_slow: '垃圾下落速度减半，持续5秒',
  multi_shot: '下次发射散射3发子弹',
  explosive: '立即清除屏幕所有垃圾',
  heal: '复活一朵枯萎的花',
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
  // Support both regular images and sprite frames
  const isSpriteFrame = img && img.isSpriteFrame;
  const actualImg = isSpriteFrame ? img.image : img;
  const badgeImage = actualImg && actualImg.width > 0 ? img : null;
  
  selectorState.badge = new ElectricBadge({
    image: badgeImage,
    color: def.color,
    radiusX: 72, // 24 * 3
    radiusY: 72,
    x: W / 2,
    y: H / 3, // Position at 1/3 of screen height
    imageWidth: 120, // 40 * 3
    imageHeight: 120,
    coverRadius: 0.2,
    maxLines: 0
  });
  
  return true;
}

// Frame mapping for sprite sheet (6x1 layout)
const POWERUP_FRAME_MAP = {
  explosive: 0,
  heal: 1,
  multi_shot: 2,
  shield: 3,
  time_slow: 4,
  dragon_bullet: 5
};

// Get powerup image
// Returns: frame data { image, sx, sy, sw, sh, isSpriteFrame } for sprite frames
function getPowerupImage(type) {
  const res = getResource('powerup');
  if (!res || !res.frames || res.frames.length === 0) {
    return null;
  }
  
  const frameIndex = POWERUP_FRAME_MAP[type];
  if (frameIndex === undefined || frameIndex >= res.frames.length) {
    return null;
  }
  
  const frame = res.frames[frameIndex];
  return {
    image: frame.image,
    sx: frame.sx,
    sy: frame.sy,
    sw: frame.sw,
    sh: frame.sh,
    isSpriteFrame: true
  };
}

// Update selection animation
function updatePowerupSelector() {
  if (!isSelecting) return;
  
  // If result is shown, ensure icon matches final type and stop
  if (selectorState.isFinished && selectorState.resultShown) {
    // Ensure the badge always shows the final type
    if (selectorState.badge && selectorState.finalType) {
      const def = POWERUP_TYPES[selectorState.finalType];
      const img = getPowerupImage(selectorState.finalType);
      // Force update the badge to match finalType
      // Support both regular images and sprite frames
      const isSpriteFrame1 = img && img.isSpriteFrame;
      const actualImg1 = isSpriteFrame1 ? img.image : img;
      if (actualImg1 && actualImg1.width > 0) {
        selectorState.badge.image = img;
      }
      selectorState.badge.color = def.color;
      selectorState.badge.update();
    }
    return;
  }
  
  const now = Date.now();
  const elapsed = now - selectorState.animationStartTime;
  
  // Check if animation should finish (after 1000ms total) - do this BEFORE switching
  if (elapsed >= 1000 && !selectorState.isFinished) {
    selectorState.isFinished = true;
    selectorState.finalType = selectorState.currentType;
    selectorState.resultShown = true;
    // Ensure badge shows final image
    const def = POWERUP_TYPES[selectorState.finalType];
    const img = getPowerupImage(selectorState.finalType);
    // Support both regular images and sprite frames
    const isSpriteFrame2 = img && img.isSpriteFrame;
    const actualImg2 = isSpriteFrame2 ? img.image : img;
    if (actualImg2 && actualImg2.width > 0) {
      selectorState.badge.image = img;
    }
    selectorState.badge.color = def.color;
    
    // Update badge animation
    if (selectorState.badge) {
      selectorState.badge.update();
    }
    return;
  }
  
  // Only do switching if not finished yet
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
  
  // Switch powerup type (only when not finished)
  if (now - selectorState.lastSwitchTime >= selectorState.switchInterval) {
    selectorState.currentIndex = (selectorState.currentIndex + 1) % selectorState.types.length;
    selectorState.currentType = selectorState.types[selectorState.currentIndex];
    selectorState.lastSwitchTime = now;
    
    // Update badge with new image
    const def = POWERUP_TYPES[selectorState.currentType];
    const img = getPowerupImage(selectorState.currentType);
    // Support both regular images and sprite frames
    const isSpriteFrame3 = img && img.isSpriteFrame;
    const actualImg3 = isSpriteFrame3 ? img.image : img;
    if (actualImg3 && actualImg3.width > 0) {
      selectorState.badge.image = img;
    }
    selectorState.badge.color = def.color;
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
  
  // Draw the large powerup badge (highest z-index) - at 1/3 of screen height
  const badgeY = H / 3;
  if (selectorState.badge) {
    selectorState.badge.setPosition(sx(W / 2), sy(badgeY));
    selectorState.badge.draw(ctx);
  }
  
  // Draw result UI if finished
  if (selectorState.isFinished && selectorState.resultShown) {
    drawSelectorResult(ctx, badgeY);
  }
}

// Draw the result with buttons
function drawSelectorResult(ctx, badgeY) {
  const def = POWERUP_TYPES[selectorState.finalType];
  const description = POWERUP_DESCRIPTIONS[selectorState.finalType];
  
  // Position panel 18px below the badge icon
  // Badge has radiusY of 72, so bottom of badge is at badgeY + 72
  const panelY = badgeY + 72 + 18;
  
  // Create result panel (transparent, no border)
  const panel = flexContainer()
    .position((W - 280) / 2, panelY)
    .size(280, null)
    .direction('column')
    .justify('center')
    .align('center')
    .setGap(12)
    .setPadding(20);
  
  // Powerup name
  panel.addChild(
    flexItem()
      .text(def.label, 24)
      .textStyle('#FFFFFF', 24, 'Arial', 'bold')
  );
  
  // Description
  panel.addChild(
    flexItem()
      .text(description, 14)
      .textStyle('#FFFFFF', 14, 'Arial', 'normal')
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
      .size(110, 40)
      .cornerRadius(10)
  );
  
  // Check if inventory is full
  const inventoryFull = isInventoryFull();
  
  // Store button - disabled if inventory is full
  buttonRow.addChild(
    flexItem()
      .tag('storeButton')
      .text(inventoryFull ? '暂存已满' : '暂存', 16)
      .textStyle('#FFFFFF', 16, 'Arial', 'bold')
      .background(inventoryFull ? '#9E9E9E' : '#FF9800')
      .size(110, 40)
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
    // Don't allow storing if inventory is full
    if (isInventoryFull()) {
      return false;
    }
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