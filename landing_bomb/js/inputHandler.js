// Input Handling Module

const { W, H, toGame } = require('./config.js');
const { isGameStarted, isGameOver, isGamePaused, setGamePaused, isPowerupSelecting, activePowerups } = require('./gameState.js');
const { createProjectile } = require('./entities/projectile.js');
const { getSlingshot, SLING_CONFIG, isDragging, setDragging, setDragStart, setDragCurrent, clearDrag, getDragStart } = require('./entities/slingshot.js');
const { consumePowerupUse, isPowerupActive } = require('./powerupSystem.js');
const { hitTest } = require('./uiState.js');
const { applySkinToProjectile, isDefaultDualShot, getFireRateMultiplier } = require('./slingshotSkinSystem.js');
const { getCameraButtonBounds, recordAllCurrentBirdsWatched, startFlash, capturePolaroidPhoto, getCurrentWaveBirds, markBirdAsBeingWatched, getUnwatchedBirds } = require('./birdWatchingSystem.js');
const { isGalleryVisible, handleGalleryTouch, openGallery } = require('./skinGallery.js');
const { isBirdAlbumVisible, handleAlbumTouch, openBirdAlbum, handleAlbumScroll, handleAlbumSwipeStart, handleAlbumSwipeMove, handleAlbumSwipeEnd } = require('./birdAlbum.js');
const { hitTestInventory } = require('./powerupInventory.js');
const { shareGame, triggerShareToRevive, showFriendRank } = require('./socialSystem.js');
const { handleSelectorTouch } = require('./powerupSelector.js');

// Game reference for firing
let gameCallbacks = {};

function registerCallbacks(callbacks) {
  gameCallbacks = callbacks;
}

// Handle touch start
let albumSwipeInProgress = false;

function handleTouchStart(e) {
  const gp = toGame(e.touches[0].clientX, e.touches[0].clientY);
  
  // Handle bird album touch first
  if (isBirdAlbumVisible()) {
    // Start swipe tracking
    handleAlbumSwipeStart(gp.x, gp.y);
    albumSwipeInProgress = false;
    
    // Check for button clicks
    const handled = handleAlbumTouch(gp.x, gp.y);
    if (handled) {
      return;
    }
    return;
  }

  // Handle gallery touch
  if (isGalleryVisible()) {
    handleGalleryTouch(gp.x, gp.y);
    return;
  }

  if (!isGameStarted()) {
    // Start button - use bounds from flex layout
    if (hitTest('startButton', gp.x, gp.y)) {
      gameCallbacks.onGameStart && gameCallbacks.onGameStart();
      return;
    }
    // Menu share button
    if (hitTest('menuShareButton', gp.x, gp.y)) {
      shareGame('menu');
      return;
    }
    // Leaderboard button
    if (hitTest('leaderboardButton', gp.x, gp.y)) {
      showFriendRank();
      return;
    }
    // Skin gallery button
    if (hitTest('skinGalleryButton', gp.x, gp.y)) {
      openGallery();
      return;
    }
    // Bird album button
    if (hitTest('birdAlbumButton', gp.x, gp.y)) {
      openBirdAlbum();
      return;
    }
    return;
  }

  if (isGameOver()) {
    // Play again button - use bounds from flex layout
    if (hitTest('restartButton', gp.x, gp.y)) {
      gameCallbacks.onGameReset && gameCallbacks.onGameReset();
      return;
    }
    // Share button
    if (hitTest('shareButton', gp.x, gp.y)) {
      shareGame('gameover');
      return;
    }
    // Revive button
    if (hitTest('reviveButton', gp.x, gp.y)) {
      triggerShareToRevive(
        () => {
          // On success - revive the player
          gameCallbacks.onRevive && gameCallbacks.onRevive();
        },
        (reason) => {
          // On failure - show reason
          console.log('Cannot revive:', reason);
        }
      );
      return;
    }
    return;
  }

  // Check if game is paused - handle resume button click
  if (isGamePaused()) {
    // Resume button
    if (hitTest('startButton', gp.x, gp.y)) {
      setGamePaused(false);
      // Call resume callback if registered
      if (gameCallbacks.onResume) {
        gameCallbacks.onResume();
      }
      return;
    }
    // Restart from pause button
    if (hitTest('restartFromPauseButton', gp.x, gp.y)) {
      gameCallbacks.onGameReset && gameCallbacks.onGameReset();
      return;
    }
    // Bird album button in pause menu
    if (hitTest('birdAlbumButton', gp.x, gp.y)) {
      openBirdAlbum();
      return;
    }
    return;
  }

  // Check if powerup selector is active
  if (isPowerupSelecting()) {
    // First check inventory click (so users can free up space when full)
    const inventorySlot = hitTestInventory(gp.x, gp.y);
    if (inventorySlot >= 0) {
      gameCallbacks.onInventoryClick && gameCallbacks.onInventoryClick(inventorySlot);
      return;
    }
    
    // Then handle selector button clicks
    if (handleSelectorTouch(gp.x, gp.y)) {
      return;
    }
    return;
  }

  // Check pause button click
  if (hitTest('pauseButton', gp.x, gp.y)) {
    setGamePaused(!isGamePaused());
    return;
  }

  // Check powerup inventory click
  const inventorySlot = hitTestInventory(gp.x, gp.y);
  if (inventorySlot >= 0) {
    gameCallbacks.onInventoryClick && gameCallbacks.onInventoryClick(inventorySlot);
    return;
  }

  // Check camera button click (bird watching feature)
  const cameraBounds = getCameraButtonBounds();
  if (cameraBounds && cameraBounds.x !== null) {
    const { x, y, width, height } = cameraBounds;
    if (gp.x >= x && gp.x <= x + width && gp.y >= y && gp.y <= y + height) {
      // Get all current birds and unwatched birds
      const allBirds = getCurrentWaveBirds();
      const unwatchedBirds = getUnwatchedBirds();
      
      if (allBirds.length > 0) {
        // Start screen flash effect
        startFlash();
        
        if (unwatchedBirds.length > 0) {
          // Mark all unwatched birds as being watched (start fade-out)
          unwatchedBirds.forEach(bird => {
            markBirdAsBeingWatched(bird.id);
          });
          
          // Record all unwatched birds in the album
          const recordedCount = recordAllCurrentBirdsWatched();
          console.log(`Camera clicked! Recording ${recordedCount} new birds.`);
          
          // Capture polaroid photo of the first unwatched bird (normal tint)
          const firstBird = unwatchedBirds[0];
          capturePolaroidPhoto(firstBird, x + width / 2, y + height / 2);
        } else {
          // All birds are already watched - show yellow tinted polaroid
          console.log('Camera clicked! All birds already watched - showing yellow tint.');
          
          // Pick a random bird for the polaroid
          const randomBird = allBirds[Math.floor(Math.random() * allBirds.length)];
          capturePolaroidPhoto(randomBird, x + width / 2, y + height / 2, 'yellow');
        }
      }
      
      return;
    }
  }

  // Start dragging
  setDragging(true);
  setDragStart(gp);
  setDragCurrent(gp);
}

// Handle touch move
function handleTouchMove(e) {
  const gp = toGame(e.touches[0].clientX, e.touches[0].clientY);
  
  // Handle bird album swipe detection
  if (isBirdAlbumVisible()) {
    // Check if this is a horizontal swipe
    if (!albumSwipeInProgress) {
      const isHorizontalSwipe = handleAlbumSwipeMove(gp.x, gp.y);
      if (isHorizontalSwipe) {
        albumSwipeInProgress = true;
      }
    }
    
    // If swipe is in progress, don't handle scroll
    if (albumSwipeInProgress) {
      return;
    }
    
    // Otherwise, handle scroll
    const touch = e.touches[0];
    if (touch.lastY !== undefined) {
      const dy = touch.clientY - touch.lastY;
      handleAlbumScroll(dy);
    }
    touch.lastY = touch.clientY;
    return;
  }
  
  if (!isDragging()) return;
  setDragCurrent(gp);
}

// Handle touch end
function handleTouchEnd(e) {
  // Handle album swipe end
  if (isBirdAlbumVisible()) {
    const lastTouch = e.changedTouches[0];
    const gp = toGame(lastTouch.clientX, lastTouch.clientY);
    handleAlbumSwipeEnd(gp.x, gp.y);
    albumSwipeInProgress = false;
    return;
  }
  
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
    // Apply skin attributes
    applySkinToProjectile(proj);

    // Dragon bullet: large radius projectile (1/3 screen width)
    if (isPowerupActive(activePowerups, 'dragon_bullet')) {
      proj.radius = W / 3; // 1/3 screen width hit range
      proj.isDragonBullet = true;
      consumePowerupUse(activePowerups, 'dragon_bullet');
    }

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
          hits: 0,
          isDragonBullet: proj.isDragonBullet || false,
          id: Date.now() + Math.random() + sign // Unique ID for each projectile
        };
        gameCallbacks.onFire(extraProj);
      }
      consumePowerupUse(activePowerups, 'multi_shot');
    }

    // Default dual shot from skin
    if (isDefaultDualShot()) {
      const dualAngle = 5 * Math.PI / 180;
      for (const sign of [-1, 1]) {
        const angle = Math.atan2(proj.vy, proj.vx) + sign * dualAngle;
        const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
        const dualProj = {
          x: proj.x,
          y: proj.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: proj.radius,
          gravity: proj.gravity,
          hits: 0,
          isDragonBullet: proj.isDragonBullet || false,
          id: Date.now() + Math.random() + sign * 2 // Unique ID for each projectile
        };
        gameCallbacks.onFire(dualProj);
      }
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
