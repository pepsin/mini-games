// Game State Management Module

const { GROUND_Y, FLOWER_CONFIG } = require('./config.js');
const { getResource } = require('./resources.js');
const { resetSpawnTimer } = require('./powerupSystem.js');
const analytics = require('./analytics.js');

// Game state variables
let score = 0;
let highScore = 0;
let lives = 4;
let gameOver = false;
let gameStarted = false;
let gamePaused = false;
let powerupSelecting = false; // New: powerup selection mode
let frameCount = 0;
let lastTime = Date.now();

// Entity arrays - exported directly for mutation
const wastes = [];
const projectiles = [];
const explosions = [];
const scorePopups = [];
const clouds = [];
const birds = [];

// Powerup arrays
const powerups = [];
const activePowerups = [];
const powerupBursts = [];

// Flower state
const flowerAlive = [true, true, true, true];
const flowerFrameIndices = [0, 1, 2, 3];

// Load high score from storage
try {
  const savedHighScore = wx.getStorageSync('bowaste_highscore');
  if (savedHighScore !== '') {
    highScore = parseInt(savedHighScore) || 0;
  }
} catch (e) {
  console.log('Failed to load high score:', e);
}

// Get flower positions from config or use defaults
function getFlowerPositions() {
  const flowerRes = getResource('flower');
  if (flowerRes?.config?.positions) {
    return flowerRes.config.positions;
  }
  return FLOWER_CONFIG.defaultPositions;
}

// Reset game state
function resetGame() {
  score = 0;
  lives = 4;
  
  // Reset arrays
  flowerAlive[0] = true;
  flowerAlive[1] = true;
  flowerAlive[2] = true;
  flowerAlive[3] = true;
  flowerFrameIndices[0] = 0;
  flowerFrameIndices[1] = 1;
  flowerFrameIndices[2] = 2;
  flowerFrameIndices[3] = 3;
  
  // Clear entity arrays
  wastes.length = 0;
  projectiles.length = 0;
  explosions.length = 0;
  scorePopups.length = 0;
  birds.length = 0;
  powerups.length = 0;
  activePowerups.length = 0;
  powerupBursts.length = 0;
  
  // Reset powerup spawn timer so first powerup can spawn immediately
  resetSpawnTimer();
  
  gameOver = false;
  gamePaused = false;
  frameCount = 0;
}

// Save high score
function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    try {
      wx.setStorageSync('bowaste_highscore', highScore.toString());
    } catch (e) {
      console.log('Failed to save high score:', e);
    }
    return true;
  }
  return false;
}

// Flower damage
function damageFlower(index) {
  if (index >= 0 && index < 4 && flowerAlive[index]) {
    flowerAlive[index] = false;
    lives--;
    
    // Track flower damage
    analytics.trackFlowerDamaged(lives, index);
    
    if (lives <= 0) {
      lives = 0;
      gameOver = true;
      saveHighScore();
      
      // Track game over
      const currentWave = require('./waveSystem.js').getCurrentWave();
      analytics.trackGameEnd({
        score: score,
        wave: currentWave,
        livesRemaining: 0,
        reason: 'game_over'
      });
    }
    return true;
  }
  return false;
}

// Heal first dead flower
function healFlower() {
  for (let i = 0; i < 4; i++) {
    if (!flowerAlive[i]) {
      flowerAlive[i] = true;
      lives++;
      return true;
    }
  }
  return false;
}

// Check if any flower is dead
function hasDeadFlower() {
  return flowerAlive.some(a => !a);
}

// Getters
function getScore() { return score; }
function getHighScore() { return highScore; }
function getLives() { return lives; }
function isGameOver() { return gameOver; }
function isGameStarted() { return gameStarted; }
function isGamePaused() { return gamePaused; }
function isPowerupSelecting() { return powerupSelecting; }
function getFrameCount() { return frameCount; }
function getLastTime() { return lastTime; }
function getWastes() { return wastes; }
function getProjectiles() { return projectiles; }
function getExplosions() { return explosions; }
function getScorePopups() { return scorePopups; }
function getClouds() { return clouds; }
function getFlowerAlive() { return flowerAlive; }
function getFlowerFrameIndices() { return flowerFrameIndices; }

// Setters
function setScore(val) { score = val; }
function addScore(val) { score += val; }
function setGameOver(val) { gameOver = val; }
function setGameStarted(val) { gameStarted = val; }
function setGamePaused(val) { gamePaused = val; }
function setPowerupSelecting(val) { powerupSelecting = val; }
function setLastTime(val) { lastTime = val; }
function incrementFrameCount() { frameCount++; }
function setLives(val) { lives = val; }

module.exports = {
  // Arrays (direct export for mutation)
  wastes, projectiles, explosions, scorePopups, clouds, birds,
  powerups, activePowerups, powerupBursts,
  flowerAlive, flowerFrameIndices,

  // Getters
  getScore, getHighScore, getLives,
  isGameOver, isGameStarted, isGamePaused, isPowerupSelecting,
  getFrameCount, getLastTime,
  getWastes, getProjectiles, getExplosions, getScorePopups, getClouds,
  getFlowerAlive, getFlowerFrameIndices, getFlowerPositions,

  // Setters
  setScore, addScore, setGameOver, setGameStarted, setGamePaused, setPowerupSelecting,
  setLastTime, incrementFrameCount, setLives,

  // Actions
  resetGame, saveHighScore, damageFlower, healFlower, hasDeadFlower
};
