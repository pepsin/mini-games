// Game State Management Module

const { GROUND_Y, FLOWER_CONFIG } = require('./config.js');
const { getResource } = require('./resources.js');

// Game state variables
let score = 0;
let highScore = 0;
let lives = 4;
let gameOver = false;
let gameStarted = false;
let frameCount = 0;
let lastTime = Date.now();

// Entity arrays - exported directly for mutation
const bombs = [];
const projectiles = [];
const explosions = [];
const scorePopups = [];
const clouds = [];

// Flower state
const flowerAlive = [true, true, true, true];
const flowerFrameIndices = [0, 1, 2, 3];

// Load high score from storage
try {
  const savedHighScore = wx.getStorageSync('bobomb_highscore');
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
  bombs.length = 0;
  projectiles.length = 0;
  explosions.length = 0;
  scorePopups.length = 0;
  
  gameOver = false;
  frameCount = 0;
}

// Save high score
function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    try {
      wx.setStorageSync('bobomb_highscore', highScore.toString());
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
    if (lives <= 0) {
      lives = 0;
      gameOver = true;
      saveHighScore();
    }
    return true;
  }
  return false;
}

// Getters
function getScore() { return score; }
function getHighScore() { return highScore; }
function getLives() { return lives; }
function isGameOver() { return gameOver; }
function isGameStarted() { return gameStarted; }
function getFrameCount() { return frameCount; }
function getLastTime() { return lastTime; }
function getBombs() { return bombs; }
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
function setLastTime(val) { lastTime = val; }
function incrementFrameCount() { frameCount++; }

module.exports = {
  // Arrays (direct export for mutation)
  bombs, projectiles, explosions, scorePopups, clouds,
  flowerAlive, flowerFrameIndices,
  
  // Getters
  getScore, getHighScore, getLives,
  isGameOver, isGameStarted,
  getFrameCount, getLastTime,
  getBombs, getProjectiles, getExplosions, getScorePopups, getClouds,
  getFlowerAlive, getFlowerFrameIndices, getFlowerPositions,
  
  // Setters
  setScore, addScore, setGameOver, setGameStarted,
  setLastTime, incrementFrameCount,
  
  // Actions
  resetGame, saveHighScore, damageFlower
};
