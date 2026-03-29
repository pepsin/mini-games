// Bird Watching System Module
// Manages bird spawning, camera interactions, and recording watched birds

const { W } = require('./config.js');
const { getBirdName, recordBirdCapture } = require('./birdAlbum.js');

// Constants
const BIRD_SPAWN_CHANCE = 0.04; // 10% chance per wave
const FLASH_DURATION_MS = 20; // 20ms flash duration
const STORAGE_KEY = 'bowaste_watched_birds';

// State
let currentWaveBirds = []; // Birds spawned in current wave
let showCameraButton = false;
let flashActive = false;
let flashEndTime = 0;
let cameraButtonBounds = null;

// Polaroid photo state
let polaroidPhoto = null; // Current displayed polaroid
let birdsDimmed = false; // Whether birds are dimmed
const POLAROID_DURATION_MS = 3000; // How long to show polaroid
const DIM_OPACITY = 0.3; // Opacity for dimmed birds

// Load watched birds from storage
function loadWatchedBirds() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('Failed to load watched birds:', e);
  }
  return {};
}

// Save watched birds to storage
function saveWatchedBirds(watchedBirds) {
  try {
    wx.setStorageSync(STORAGE_KEY, JSON.stringify(watchedBirds));
  } catch (e) {
    console.log('Failed to save watched birds:', e);
  }
}

// Get all watched birds
const watchedBirds = loadWatchedBirds();

// Check if a bird has been watched
function isBirdWatched(birdId) {
  return !!watchedBirds[birdId];
}

// Record that a bird has been watched
function recordWatchedBird(birdId) {
  if (!watchedBirds[birdId]) {
    watchedBirds[birdId] = {
      watchedAt: Date.now(),
      count: 1
    };
    saveWatchedBirds(watchedBirds);
    console.log(`Bird ${birdId} recorded as watched!`);
    return true;
  } else {
    watchedBirds[birdId].count++;
    watchedBirds[birdId].watchedAt = Date.now();
    saveWatchedBirds(watchedBirds);
    return false;
  }
}

// Generate a unique bird ID
function generateBirdId(variant, frameIndex, timestamp) {
  return `${variant}_${frameIndex}_${timestamp}`;
}

// Check if birds should spawn this wave (10% chance)
function shouldSpawnBirds() {
  return Math.random() < BIRD_SPAWN_CHANCE;
}

// Get number of birds to spawn (1-2)
function getBirdSpawnCount() {
  return 1 + Math.floor(Math.random() * 2);
}

// Spawn birds for the wave
function spawnWaveBirds(birdRes) {
  const variants = birdRes?.variants ? Object.keys(birdRes.variants) : ['common_1', 'common_2'];
  const spawnCount = getBirdSpawnCount();
  const newBirds = [];
  
  for (let i = 0; i < spawnCount; i++) {
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const scale = 0.5 + Math.random() * 0.3;
    const speed = 2 + Math.random() * 2;
    
    // Pick random sprite frame
    let frameIndex = 0;
    if (birdRes?.variants?.[variant]?.frames) {
      const frameCount = birdRes.variants[variant].frames.length;
      frameIndex = Math.floor(Math.random() * frameCount);
    }
    
    const birdId = generateBirdId(variant, frameIndex, Date.now() + i);
    
    newBirds.push({
      id: birdId,
      x: Math.random() * W,
      y: 50 + Math.random() * 200,
      baseY: 50 + Math.random() * 200,
      variant: variant,
      scale: scale,
      speed: speed,
      direction: Math.random() > 0.5 ? 1 : -1,
      frameIndex: frameIndex,
      isWaveBird: true, // Mark as wave-specific bird
      // Dynamic flight path properties
      time: Math.random() * 100, // Random starting time for variety
      amplitude: 20 + Math.random() * 40, // Random vertical amplitude
      frequency: 0.5 + Math.random() * 1.5, // Random wave frequency
      phase: Math.random() * Math.PI * 2 // Random phase offset
    });
  }
  
  currentWaveBirds = newBirds;
  // Show camera button if there are any birds visible on screen
  showCameraButton = hasVisibleBirds();
  
  console.log(`Spawned ${newBirds.length} birds for this wave`);
  return newBirds;
}

// Clear birds when wave ends
function clearWaveBirds() {
  currentWaveBirds = [];
  showCameraButton = false;
  resetPolaroidState();
}

// Start screen flash effect
function startFlash() {
  flashActive = true;
  flashEndTime = Date.now() + FLASH_DURATION_MS;
}

// Update flash state
function updateFlash() {
  if (flashActive && Date.now() >= flashEndTime) {
    flashActive = false;
  }
  return flashActive;
}

// Check if screen should flash
function isFlashActive() {
  return flashActive;
}

// Set camera button bounds for hit testing
function setCameraButtonBounds(x, y, width, height) {
  cameraButtonBounds = { x, y, width, height };
}

// Get camera button bounds
function getCameraButtonBounds() {
  return cameraButtonBounds;
}

// Get current wave birds
function getCurrentWaveBirds() {
  return currentWaveBirds;
}

// Record all current birds as watched
function recordAllCurrentBirdsWatched() {
  let recordedCount = 0;
  currentWaveBirds.forEach(bird => {
    if (recordWatchedBird(bird.id)) {
      recordedCount++;
    }
  });
  return recordedCount;
}

// Get unwatched birds (birds that haven't been watched before)
function getUnwatchedBirds() {
  return currentWaveBirds.filter(bird => !isBirdWatched(bird.id));
}

// Check if any birds are currently visible on screen (watched or unwatched)
function hasVisibleBirds() {
  if (currentWaveBirds.length === 0) return false;
  
  // Margin for partially visible birds (birds are visible when within -100 to W+100)
  const margin = 100;
  
  return currentWaveBirds.some(bird => {
    // Bird is visible if it's within the screen bounds (with margin)
    return bird.x > -margin && bird.x < W + margin;
  });
}

// Check if any unwatched birds are currently visible on screen
function hasVisibleUnwatchedBirds() {
  const unwatchedBirds = getUnwatchedBirds();
  if (unwatchedBirds.length === 0) return false;
  
  // Margin for partially visible birds (birds are visible when within -100 to W+100)
  const margin = 100;
  
  return unwatchedBirds.some(bird => {
    // Bird is visible if it's within the screen bounds (with margin)
    return bird.x > -margin && bird.x < W + margin;
  });
}

// Mark a bird as currently being watched (for fade-out animation)
function markBirdAsBeingWatched(birdId) {
  const bird = currentWaveBirds.find(b => b.id === birdId);
  if (bird) {
    bird.isBeingWatched = true;
    bird.fadeStartTime = Date.now();
    bird.fadeDuration = 500; // 500ms fade out
  }
}

// Update birds (handle fade-out and removal)
function updateWaveBirds() {
  const now = Date.now();
  
  // Update fade-out for birds being watched
  currentWaveBirds.forEach(bird => {
    if (bird.isBeingWatched && bird.fadeStartTime) {
      const elapsed = now - bird.fadeStartTime;
      bird.fadeProgress = Math.min(elapsed / bird.fadeDuration, 1);
      
      // Calculate alpha (1 -> 0)
      bird.currentAlpha = 1 - bird.fadeProgress;
    } else {
      bird.currentAlpha = 1;
    }
  });
  
  // Remove birds that have fully faded out
  const birdsToRemove = currentWaveBirds.filter(bird => 
    bird.isBeingWatched && bird.fadeProgress >= 1
  );
  
  if (birdsToRemove.length > 0) {
    // Remove faded birds
    currentWaveBirds = currentWaveBirds.filter(bird => 
      !(bird.isBeingWatched && bird.fadeProgress >= 1)
    );
    
    // Update camera button visibility
    showCameraButton = hasVisibleBirds();
  }
}

// Get watched birds stats
function getWatchedBirdStats() {
  const birdIds = Object.keys(watchedBirds);
  return {
    totalUniqueBirds: birdIds.length,
    totalWatches: birdIds.reduce((sum, id) => sum + watchedBirds[id].count, 0),
    birds: watchedBirds
  };
}

// Polaroid photo functions

// Capture a polaroid photo of a bird at the given position
// tintColor: optional tint color (e.g., 'yellow' for already watched birds)
function capturePolaroidPhoto(bird, x, y, tintColor = null) {
  // Record this bird as captured in the album
  recordBirdCapture(bird.variant, bird.frameIndex);
  
  // Get the bird's name
  const birdName = getBirdName(bird.variant, bird.frameIndex);
  
  polaroidPhoto = {
    bird: { ...bird }, // Copy bird data
    birdName: birdName,
    x: x,
    y: y,
    createdAt: Date.now(),
    scale: 0,
    tintColor: tintColor // Store tint color for drawing
  };
  birdsDimmed = true;
  
  // Hide camera button
  showCameraButton = false;
  
  // Animate scale from 0 to 1
  animatePolaroidScale();
}

// Animate polaroid scale for pop-in effect
function animatePolaroidScale() {
  if (!polaroidPhoto) return;
  
  const animate = () => {
    if (!polaroidPhoto) return;
    
    const elapsed = Date.now() - polaroidPhoto.createdAt;
    const duration = 300; // 300ms pop-in animation
    
    if (elapsed < duration) {
      // Elastic ease-out for pop effect
      const t = elapsed / duration;
      const easeOutElastic = (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      };
      polaroidPhoto.scale = easeOutElastic(t);
      requestAnimationFrame(animate);
    } else {
      polaroidPhoto.scale = 1;
    }
  };
  
  animate();
}

// Update polaroid state (check if it should expire)
function updatePolaroid() {
  if (polaroidPhoto && Date.now() - polaroidPhoto.createdAt > POLAROID_DURATION_MS) {
    // Photo expired, fade it out
    const fadeElapsed = Date.now() - (polaroidPhoto.createdAt + POLAROID_DURATION_MS);
    const fadeDuration = 500; // 500ms fade out
    
    if (fadeElapsed < fadeDuration) {
      polaroidPhoto.opacity = 1 - (fadeElapsed / fadeDuration);
    } else {
      // Fully faded out
      polaroidPhoto = null;
      birdsDimmed = false;
      // Clear birds after photo is gone
      currentWaveBirds = [];
    }
  }
}

// Get current polaroid photo
function getPolaroidPhoto() {
  return polaroidPhoto;
}

// Check if birds should be dimmed
function shouldDimBirds() {
  return birdsDimmed;
}

// Check if camera button should be shown (if there are any birds visible on screen)
function shouldShowCameraButton() {
  return showCameraButton && hasVisibleBirds() && !polaroidPhoto;
}

// Reset polaroid and dim state (call when wave ends)
function resetPolaroidState() {
  polaroidPhoto = null;
  birdsDimmed = false;
}

module.exports = {
  shouldSpawnBirds,
  spawnWaveBirds,
  clearWaveBirds,
  getCurrentWaveBirds,
  shouldShowCameraButton,
  startFlash,
  updateFlash,
  isFlashActive,
  setCameraButtonBounds,
  getCameraButtonBounds,
  recordAllCurrentBirdsWatched,
  isBirdWatched,
  getWatchedBirdStats,
  generateBirdId,
  capturePolaroidPhoto,
  getPolaroidPhoto,
  updatePolaroid,
  shouldDimBirds,
  getUnwatchedBirds,
  hasVisibleUnwatchedBirds,
  hasVisibleBirds,
  markBirdAsBeingWatched,
  updateWaveBirds
};
