// Wave System Module

const { isChallengeWave, generateChallenge, completeChallenge } = require('./challengeSystem.js');
const { WAVE_DISPLAY_OFFSET } = require('./config.js');
const { getFrameCount } = require('./gameState.js');
const analytics = require('./analytics.js');

// Wave state
let currentWave = 1;
let waveTimer = 0;
let waveDuration = 600;
let interWaveTimer = 0;
let interWaveDuration = 120;
let isInterWave = false;
let wastesSpawnedThisWave = 0;
let totalWastesThisWave = 0;
let nextSpawnTime = 0;
let waveSpawnSchedule = [];

// Special waste tracking for waves 5, 10, 15, etc.
let specialWastesSpawned = 0;
let totalSpecialWastes = 0;

// Challenge announce state
let challengeAnnounce = false;
let challengeAnnounceTimer = 0;
const CHALLENGE_ANNOUNCE_DURATION = 120; // 2 seconds
let pendingChallenge = null;

// Wave change animation state
let waveChangeAnimationStartFrame = 0;
const WAVE_CHANGE_ANIMATION_DURATION = 30; // 30 frames ≈ 500ms at 60fps

// Get wave configuration
function getWaveConfig(wave) {
  const w = Math.min(wave, 200);
  
  let difficultyMultiplier;
  if (w <= 30) {
    difficultyMultiplier = 1 + (w - 1) * 0.05;
  } else {
    const excess = w - 30;
    difficultyMultiplier = 2.45 + excess * 0.036;
  }
  
  const wastesPerWave = Math.floor(5 + w * 0.18 + Math.pow(w / 50, 2) * 5);
  const waveDurationFrames = Math.floor((8 + Math.min(w * 0.03, 2)) * 60);
  
  const minSpeed = 0.7 + w * 0.02 + Math.pow(w / 60, 2) * 0.8;
  const maxSpeed = minSpeed + 0.4 + w * 0.01;
  const maxSway = 0.2 + w * 0.015;
  
  const minRadius = Math.max(10, 16 - w * 0.04);
  const maxRadius = Math.max(14, 20 - w * 0.04);
  const wasteHealth = w >= 50 ? 1 + Math.floor((w - 50) / 25) : 1;
  
  const specialWasteChance = Math.max(0, (w - 10) * 0.005);
  const clusterWasteChance = w >= 20 ? Math.min(0.15, (w - 20) * 0.003) : 0;
  
  return {
    wastesPerWave,
    waveDurationFrames,
    minSpeed,
    maxSpeed,
    maxSway,
    minRadius,
    maxRadius,
    wasteHealth,
    specialWasteChance,
    clusterWasteChance,
    difficultyMultiplier
  };
}

// Calculate spawn times for wave
function calculateSpawnTimes(config) {
  const spawnTimes = [];
  const { wastesPerWave, waveDurationFrames } = config;
  
  if (wastesPerWave === 0) return spawnTimes;
  
  const safeDuration = waveDurationFrames - 60;
  
  for (let i = 0; i < wastesPerWave; i++) {
    const basePosition = (i + 1) / (wastesPerWave + 1);
    const randomOffset = (Math.random() - 0.5) * 0.3;
    const position = Math.max(0.05, Math.min(0.95, basePosition + randomOffset));
    spawnTimes.push(Math.floor(position * safeDuration));
  }
  
  return spawnTimes.sort((a, b) => a - b);
}

// Convert internal wave to display wave (what player sees)
function getDisplayWave(internalWave) {
  return internalWave <= 1 ? 1 : (internalWave - WAVE_DISPLAY_OFFSET);
}

// Check if wave is a special wave (multiple of 5 based on display wave)
function isSpecialWave(wave) {
  const displayWave = getDisplayWave(wave);
  return displayWave > 0 && displayWave % 5 === 0;
}

// Get special waste spawn count for wave 5, 10, 15, etc. (based on display wave)
function getSpecialWasteCountForWave(wave) {
  if (!isSpecialWave(wave)) return 0;
  const displayWave = getDisplayWave(wave);
  // Base 2 wastes, increases by 1 every 5 waves, capped at 8
  // Reduced to 1/3 of original volume
  const originalCount = Math.min(2 + Math.floor((displayWave - 5) / 5), 8);
  return Math.max(1, Math.floor(originalCount / 3));
}

// Start new wave
function startWave(waveNum) {
  currentWave = waveNum;
  isInterWave = false;
  waveChangeAnimationStartFrame = getFrameCount(); // Trigger wave change animation
  const config = getWaveConfig(waveNum);

  waveTimer = 0;
  wastesSpawnedThisWave = 0;
  totalWastesThisWave = config.wastesPerWave;
  waveSpawnSchedule = calculateSpawnTimes(config);
  nextSpawnTime = waveSpawnSchedule.length > 0 ? waveSpawnSchedule[0] : 0;

  // Initialize special waste tracking for waves 5, 10, 15, etc.
  specialWastesSpawned = 0;
  totalSpecialWastes = getSpecialWasteCountForWave(waveNum);

  // Track wave start (use display wave for analytics consistency with player experience)
  const waveType = isSpecialWave(waveNum) ? 'special' : 'normal';
  const displayWave = getDisplayWave(waveNum);
  analytics.trackWaveStart(displayWave, waveType);

  console.log(`Wave ${waveNum} started: ${totalWastesThisWave} wastes, ${config.waveDurationFrames / 60}s duration${totalSpecialWastes > 0 ? `, ${totalSpecialWastes} special wastes` : ''}`);

  return config;
}

// End current wave
function endWave() {
  // Complete any active challenge
  const challengeResult = completeChallenge();

  isInterWave = true;
  interWaveTimer = 0;
  interWaveDuration = Math.max(60, 120 - currentWave * 0.5);

  // Check if next wave is a challenge wave (use display wave for player consistency)
  const nextWave = currentWave + 1;
  const displayWave = getDisplayWave(nextWave);
  if (isChallengeWave(displayWave)) {
    pendingChallenge = generateChallenge(displayWave);
    challengeAnnounce = true;
    challengeAnnounceTimer = 0;
    // Extend inter-wave to include announce time
    interWaveDuration = Math.max(interWaveDuration, CHALLENGE_ANNOUNCE_DURATION + 60);
  }

  // Track wave complete (use display wave for analytics consistency)
  const challengeSuccess = challengeResult && challengeResult.success;
  const challengeType = challengeResult ? challengeResult.type : null;
  const completedDisplayWave = getDisplayWave(currentWave);
  analytics.trackWaveComplete(completedDisplayWave, challengeSuccess, challengeType);

  console.log(`Wave ${currentWave} completed! Break time: ${interWaveDuration / 60}s`);
  return challengeResult;
}

// Reset wave system
function resetWaves() {
  currentWave = 0;
  waveTimer = 0;
  interWaveTimer = 0;
  isInterWave = true;
  interWaveDuration = 180;
  wastesSpawnedThisWave = 0;
  totalWastesThisWave = 0;
  waveSpawnSchedule = [];
  specialWastesSpawned = 0;
  totalSpecialWastes = 0;
  challengeAnnounce = false;
  challengeAnnounceTimer = 0;
  pendingChallenge = null;
}

// Update wave system
function updateWaves(wasteCount) {
  if (isInterWave) {
    interWaveTimer++;

    // Handle challenge announce phase
    if (challengeAnnounce) {
      challengeAnnounceTimer++;
      if (challengeAnnounceTimer >= CHALLENGE_ANNOUNCE_DURATION) {
        challengeAnnounce = false;
      }
    }

    if (interWaveTimer >= interWaveDuration) {
      isInterWave = false;
      // Jump from wave 1 to wave 30
      const nextWave = currentWave === 1 ? 30 : currentWave + 1;
      return { action: 'start_wave', wave: nextWave };
    }
  } else {
    waveTimer++;
    const config = getWaveConfig(currentWave);

    if (wastesSpawnedThisWave < waveSpawnSchedule.length &&
        waveTimer >= waveSpawnSchedule[wastesSpawnedThisWave]) {
      wastesSpawnedThisWave++;

      // Check if we should spawn a special waste (for waves 5, 10, 15, etc.)
      if (isSpecialWave(currentWave) && specialWastesSpawned < totalSpecialWastes) {
        specialWastesSpawned++;
        // Alternate between armored and dumbbell wastes
        const wasteType = specialWastesSpawned % 2 === 1 ? 'armored' : 'dumbbell';
        return { action: 'spawn_special_waste', wasteType: wasteType };
      }

      return { action: 'spawn_waste' };
    }

    if (waveTimer >= config.waveDurationFrames && wasteCount === 0) {
      const challengeResult = endWave();
      return { action: 'wave_ended', challengeResult: challengeResult };
    }
  }

  return { action: 'none' };
}

// Getters
function getCurrentWave() { return currentWave; }
function isInInterWave() { return isInterWave; }
function getWaveTimer() { return waveTimer; }
function getInterWaveTimer() { return interWaveTimer; }
function getInterWaveDuration() { return interWaveDuration; }
function getCurrentWaveConfig() { return getWaveConfig(currentWave); }
function getWaveProgress() {
  const config = getWaveConfig(currentWave);
  return waveTimer / config.waveDurationFrames;
}
function isChallengeAnnouncing() { return challengeAnnounce; }
function getPendingChallenge() { return pendingChallenge; }

// Get wave change animation progress (0 to 1, where 1 means animation is complete)
function getWaveChangeAnimationProgress() {
  const elapsed = getFrameCount() - waveChangeAnimationStartFrame;
  if (elapsed < 0) return 1; // Animation hasn't started yet
  if (elapsed >= WAVE_CHANGE_ANIMATION_DURATION) return 1; // Animation complete
  return elapsed / WAVE_CHANGE_ANIMATION_DURATION;
}

module.exports = {
  getWaveConfig,
  calculateSpawnTimes,
  startWave,
  endWave,
  resetWaves,
  updateWaves,
  getCurrentWave,
  isInInterWave,
  getWaveTimer,
  getInterWaveTimer,
  getInterWaveDuration,
  getCurrentWaveConfig,
  getWaveProgress,
  isChallengeAnnouncing,
  getPendingChallenge,
  isSpecialWave,
  getSpecialWasteCountForWave,
  getDisplayWave,
  getWaveChangeAnimationProgress
};
