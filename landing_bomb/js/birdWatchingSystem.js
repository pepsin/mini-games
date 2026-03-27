// Bird Watching System Module
// Manages bird spawning, camera interactions, and recording watched birds

const { W } = require('./config.js');

// Constants
const BIRD_SPAWN_CHANCE = 1; // 10% chance per wave
const FLASH_DURATION_MS = 20; // 20ms flash duration
const STORAGE_KEY = 'bowaste_watched_birds';

// State
let currentWaveBirds = []; // Birds spawned in current wave
let showCameraButton = false;
let flashActive = false;
let flashEndTime = 0;
let cameraButtonBounds = null;

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
      variant: variant,
      scale: scale,
      speed: speed,
      direction: Math.random() > 0.5 ? 1 : -1,
      frameIndex: frameIndex,
      isWaveBird: true // Mark as wave-specific bird
    });
  }
  
  currentWaveBirds = newBirds;
  showCameraButton = newBirds.length > 0;
  
  console.log(`Spawned ${newBirds.length} birds for this wave`);
  return newBirds;
}

// Clear birds when wave ends
function clearWaveBirds() {
  currentWaveBirds = [];
  showCameraButton = false;
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

// Check if camera button should be shown
function shouldShowCameraButton() {
  return showCameraButton && currentWaveBirds.length > 0;
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

// Get watched birds stats
function getWatchedBirdStats() {
  const birdIds = Object.keys(watchedBirds);
  return {
    totalUniqueBirds: birdIds.length,
    totalWatches: birdIds.reduce((sum, id) => sum + watchedBirds[id].count, 0),
    birds: watchedBirds
  };
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
  generateBirdId
};
