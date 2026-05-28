// One Line - Main Game Entry
const canvas = (typeof wx !== 'undefined') ? wx.createCanvas() : document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Imports
const config = require('./js/config.js');
const { Maze } = require('./js/maze.js');
const { getLevels, getProgress, saveProgress, resetProgress } = require('./js/levels.js');
const { GameRenderer } = require('./js/renderer.js');
const { InputHandler } = require('./js/input.js');
const UI = require('./js/ui.js');
const Social = require('./js/social.js');

const { W, H, screenWidth, screenHeight, dpr, updateScale, sx, sy, ss, invSx, invSy, COLORS, FONTS } = config;

// Setup canvas
if (typeof wx !== 'undefined') {
  const info = wx.getSystemInfoSync();
  canvas.width = info.windowWidth * dpr;
  canvas.height = info.windowHeight * dpr;
  ctx.scale(dpr, dpr);
} else {
  const info = config.systemInfo;
  canvas.width = info.windowWidth * dpr;
  canvas.height = info.windowHeight * dpr;
  ctx.scale(dpr, dpr);
}
updateScale();

// Game state
let state = 'start'; // start, playing, paused, levelComplete, allComplete
let levels = [];
let progress = { currentLevel: 0, highestLevel: 0, scores: [] };
let currentMaze = null;
let currentSolution = null;
let renderer = new GameRenderer(ctx);
let input = new InputHandler(canvas);
let mouseX = 0, mouseY = 0;
let isDrawing = false;
let activeButtons = [];
let toast = null;
let toastTimer = 0;
let lastTime = 0;
let hintTimer = 0;

// Zoom / pan limits
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

function init() {
  Social.initSocial();
  levels = getLevels();
  progress = getProgress();
  if (!levels || levels.length === 0) {
    levels = require('./js/levels.js').generateAllLevels();
  }
  state = 'start';
  requestAnimationFrame(gameLoop);
}

function loadLevel(index) {
  if (index >= levels.length) {
    state = 'allComplete';
    return;
  }
  const data = levels[index];
  currentMaze = Maze.fromJSON(data);
  currentSolution = data.solution || null;
  renderer.setMaze(currentMaze);
  state = 'playing';
  isDrawing = false;
}

function checkLevelComplete() {
  const path = renderer.playerPath;
  const pathCells = currentMaze.pathCells();
  if (path.length === pathCells.length) {
    // Verify all path cells are visited
    const visited = new Set(path.map(p => p.x + ',' + p.y));
    const allVisited = pathCells.every(c => visited.has(c.x + ',' + c.y));
    if (allVisited) {
      completeLevel();
    }
  }
}

function completeLevel() {
  state = 'levelComplete';
  renderer.levelCompleteAnim = 0.01;
  for (const c of renderer.playerPath) {
    renderer.spawnParticles(c);
  }

  const score = currentMaze.pathCells().length * 10;
  progress.scores[progress.currentLevel] = Math.max(progress.scores[progress.currentLevel] || 0, score);
  progress.highestLevel = Math.max(progress.highestLevel, progress.currentLevel);
  progress.currentLevel++;
  saveProgress(progress);
  Social.updateScore(progress.highestLevel + 1);
}

function showToast(text) {
  toast = text;
  toastTimer = 0;
}

// ===================== Input =====================

input.onTouchStart = (gx, gy, id) => {
  mouseX = gx;
  mouseY = gy;

  if (state === 'playing') {
    const cell = renderer.screenToMaze(gx, gy);
    if (cell && currentMaze.isPath(cell.x, cell.y)) {
      // Start new path from this cell, or continue if touching endpoint
      if (renderer.playerPath.length === 0) {
        renderer.playerPath = [{ x: cell.x, y: cell.y }];
        renderer.currentCell = { x: cell.x, y: cell.y };
        isDrawing = true;
      } else {
        const last = renderer.playerPath[renderer.playerPath.length - 1];
        const first = renderer.playerPath[0];
        if (cell.x === last.x && cell.y === last.y) {
          isDrawing = true;
          renderer.currentCell = { x: cell.x, y: cell.y };
        } else if (cell.x === first.x && cell.y === first.y && renderer.playerPath.length === 1) {
          isDrawing = true;
          renderer.currentCell = { x: cell.x, y: cell.y };
        } else {
          // Start over from new cell
          renderer.playerPath = [{ x: cell.x, y: cell.y }];
          renderer.currentCell = { x: cell.x, y: cell.y };
          isDrawing = true;
        }
      }
    }
  }
};

input.onTouchMove = (gx, gy, id) => {
  mouseX = gx;
  mouseY = gy;

  if (state === 'playing' && isDrawing) {
    const cell = renderer.screenToMaze(gx, gy);
    if (!cell || !currentMaze.isPath(cell.x, cell.y)) return;

    const path = renderer.playerPath;
    if (path.length === 0) return;

    const last = path[path.length - 1];

    // Same cell, ignore
    if (cell.x === last.x && cell.y === last.y) return;

    // Check adjacency
    const dx = Math.abs(cell.x - last.x);
    const dy = Math.abs(cell.y - last.y);
    if (dx + dy !== 1) return; // not adjacent

    // Check if going back
    if (path.length >= 2) {
      const prev = path[path.length - 2];
      if (cell.x === prev.x && cell.y === prev.y) {
        // Backtrack
        path.pop();
        renderer.currentCell = path[path.length - 1] || null;
        return;
      }
    }

    // Check if already visited
    const alreadyVisited = path.some(p => p.x === cell.x && p.y === cell.y);
    if (alreadyVisited) return;

    // Add to path
    path.push({ x: cell.x, y: cell.y });
    renderer.currentCell = { x: cell.x, y: cell.y };
    checkLevelComplete();
  }
};

input.onTouchEnd = () => {
  isDrawing = false;
  renderer.currentCell = null;
};

input.onTap = (gx, gy) => {
  mouseX = gx;
  mouseY = gy;

  // Handle button clicks based on state
  if (state === 'start') {
    for (const btn of activeButtons) {
      if (UI.hitTestButton(gx, gy, btn)) {
        if (btn.id === 'start') {
          loadLevel(progress.currentLevel);
        } else if (btn.id === 'leaderboard') {
          Social.showLeaderboard(progress.highestLevel + 1);
        } else if (btn.id === 'reset') {
          resetProgress();
          progress = getProgress();
          showToast('进度已重置');
        }
        return;
      }
    }
  } else if (state === 'paused') {
    for (const btn of activeButtons) {
      if (UI.hitTestButton(gx, gy, btn)) {
        if (btn.id === 'resume') state = 'playing';
        else if (btn.id === 'restart') { renderer.playerPath = []; state = 'playing'; }
        else if (btn.id === 'leaderboard') { Social.showLeaderboard(progress.highestLevel + 1); }
        return;
      }
    }
  } else if (state === 'levelComplete') {
    for (const btn of activeButtons) {
      if (UI.hitTestButton(gx, gy, btn)) {
        if (btn.id === 'next') loadLevel(progress.currentLevel);
        else if (btn.id === 'home') state = 'start';
        return;
      }
    }
  } else if (state === 'allComplete') {
    for (const btn of activeButtons) {
      if (UI.hitTestButton(gx, gy, btn)) {
        if (btn.id === 'share') Social.shareGame(progress.highestLevel + 1);
        else if (btn.id === 'home') state = 'start';
        return;
      }
    }
  }

  if (Social.isLeaderboardVisible()) {
    Social.hideLeaderboard();
    return;
  }

  if (state === 'playing') {
    // Check pause button
    if (gx >= W - 55 && gx <= W - 15 && gy >= 10 && gy <= 50) {
      state = 'paused';
      return;
    }
  }
};

input.onPinch = (scaleDelta, cx, cy) => {
  if (state !== 'playing') return;
  const oldScale = renderer.cameraScale;
  let newScale = oldScale * scaleDelta;
  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

  // Zoom around center point in game coords
  const gcx = invSx(cx);
  const gcy = invSy(cy);
  const mazeX = (gcx - renderer.cameraX) / oldScale;
  const mazeY = (gcy - renderer.cameraY) / oldScale;
  renderer.cameraScale = newScale;
  renderer.cameraX = gcx - mazeX * newScale;
  renderer.cameraY = gcy - mazeY * newScale;
};

input.onPan = (dx, dy) => {
  if (state !== 'playing') return;
  renderer.cameraX += dx / config.scale;
  renderer.cameraY += dy / config.scale;
};

// ===================== Game Loop =====================

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (state === 'playing' || state === 'levelComplete') {
    renderer.update(dt);
  }
  if (toast) {
    toastTimer += dt;
    if (toastTimer > 2) { toast = null; toastTimer = 0; }
  }
  if (hintTimer > 0) {
    hintTimer -= dt;
    if (hintTimer <= 0) { renderer.hintPath = null; hintTimer = 0; }
  }
}

function draw() {
  // Clear
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, screenWidth, screenHeight);

  if (state === 'start') {
    activeButtons = UI.drawStartScreen(ctx, { mx: mouseX, my: mouseY });
  } else if (state === 'playing' || state === 'paused' || state === 'levelComplete') {
    // Draw maze
    renderer.draw();

    // Draw HUD
    const pathCells = currentMaze ? currentMaze.pathCells().length : 0;
    UI.drawGameHUD(ctx, progress.currentLevel, levels.length, renderer.playerPath.length, pathCells);

    // Hint button
    ctx.fillStyle = currentSolution ? COLORS.button : '#333';
    UI.roundRect(ctx, sx(W - 105), sy(10), ss(40), ss(40), ss(8));
    ctx.fill();
    UI.drawText(ctx, '?', W - 85, 30, { font: 'bold 18px Arial', color: currentSolution ? COLORS.text : '#666' });

    if (state === 'paused') {
      activeButtons = UI.drawPauseScreen(ctx, { mx: mouseX, my: mouseY });
    } else if (state === 'levelComplete') {
      const score = currentMaze ? currentMaze.pathCells().length * 10 : 0;
      activeButtons = UI.drawLevelComplete(ctx, progress.currentLevel - 1, score, { mx: mouseX, my: mouseY });
    }
  } else if (state === 'allComplete') {
    activeButtons = UI.drawAllComplete(ctx, progress.highestLevel, { mx: mouseX, my: mouseY });
  }

  // Leaderboard overlay
  if (Social.isLeaderboardVisible()) {
    Social.drawLeaderboardOverlay(ctx);
  }

  // Toast
  if (toast && toastTimer > 0) {
    const t = toastTimer / 2;
    UI.drawToast(ctx, toast, t);
  }
}

// ===================== Init =====================
init();
