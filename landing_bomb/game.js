// Bob-omb Squad - WeChat Mini Game (Godot-style Scene System)
// Godot-inspired scene composition system

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// Core modules
const { W, H, GROUND_Y, updateScale, sx, sy, ss, SLING_CONFIG, screenWidth, screenHeight, offsetX, offsetY, scale } = require('./js/config.js');
const { loadResources, getResource } = require('./js/resources.js');
const { animationLoader } = require('./js/animationLoader.js');

// Node system
const { Node, Node2D, CollisionSystem } = require('./js/nodes/index.js');

// Scenes (Godot-style entities)
const {
  BombScene,
  ProjectileScene,
  ExplosionScene,
  ScorePopupScene,
  FlowerScene,
  CloudScene,
  SlingshotScene,
  SkyScene,
  SunScene,
  RainbowScene,
  WallScene
} = require('./js/nodes/scenes/index.js');

// Game state modules (for non-entity state)
const { 
  setGameStarted, setGameOver, setLastTime, incrementFrameCount,
  getScore, getFrameCount, getLastTime, isGameOver, isGameStarted,
  addScore
} = require('./js/gameState.js');

const {
  startWave, resetWaves, updateWaves, getCurrentWave, getCurrentWaveConfig
} = require('./js/waveSystem.js');

// UI and Input
const { drawUI, drawGameOver, drawStartScreen } = require('./js/ui.js');
const { setupInput } = require('./js/inputHandler.js');

// Setup canvas size
const systemInfo = wx.getSystemInfoSync();
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;
updateScale();

// Game root node - all game entities are children of this
const gameRoot = new Node('GameRoot');

// Scene layers (Godot-style)
const backgroundLayer = new Node2D('BackgroundLayer');
const gameLayer = new Node2D('GameLayer');
const uiLayer = new Node2D('UILayer');

gameRoot.addChild(backgroundLayer);
gameRoot.addChild(gameLayer);
gameRoot.addChild(uiLayer);

// Background scenes
let skyScene = null;
let sunScene = null;
let rainbowScene = null;
let wallScene = null;

// Entity containers (as Node2D for transform support)
const cloudsContainer = new Node2D('CloudsContainer');
const flowersContainer = new Node2D('FlowersContainer');
const bombsContainer = new Node2D('BombsContainer');
const projectilesContainer = new Node2D('ProjectilesContainer');
const effectsContainer = new Node2D('EffectsContainer');

gameLayer.addChild(cloudsContainer);
gameLayer.addChild(flowersContainer);
gameLayer.addChild(bombsContainer);
gameLayer.addChild(projectilesContainer);
gameLayer.addChild(effectsContainer);

// Collision system
const collisionSystem = new CollisionSystem();
gameRoot.addChild(collisionSystem);

// Game entities
let slingshot = null;
let flowers = [];

// Flower positions
const FLOWER_POSITIONS = [
  { x: 90, y: GROUND_Y - 10 },
  { x: 180, y: GROUND_Y - 10 },
  { x: 270, y: GROUND_Y - 10 },
  { x: 360, y: GROUND_Y - 10 }
];

// Initialize game
function init() {
  // Create sky scene (drawn in screen coordinates)
  skyScene = new SkyScene({
    canvasWidth: screenWidth,
    canvasHeight: screenHeight,
    offsetX: offsetX
  });
  
  // Create background scenes (drawn in game coordinates)
  sunScene = SunScene.create();
  rainbowScene = RainbowScene.create();
  wallScene = WallScene.create();
  
  // Create slingshot
  slingshot = new SlingshotScene({
    x: SLING_CONFIG.x,
    y: SLING_CONFIG.y,
    prongW: SLING_CONFIG.prongW,
    prongH: SLING_CONFIG.prongH,
    maxDrag: SLING_CONFIG.maxDrag
  });
  gameLayer.addChild(slingshot);
  
  // Create flowers
  flowers = [];
  for (let i = 0; i < 4; i++) {
    const flower = FlowerScene.create(i, FLOWER_POSITIONS[i].x, FLOWER_POSITIONS[i].y);
    flowers.push(flower);
    flowersContainer.addChild(flower);
  }
  
  // Create clouds
  for (let i = 0; i < 8; i++) {
    const cloud = CloudScene.createRandom({
      width: W,
      groundY: GROUND_Y
    });
    cloudsContainer.addChild(cloud);
  }
  
  // Sort clouds by scale for depth
  cloudsContainer.children.sort((a, b) => b.baseScale - a.baseScale);
  
  // Load resources
  loadResources().then(() => {
    console.log('Resources loaded, game ready');
  });
  
  // Setup input with scene-based callbacks
  setupInput({
    onTouchStart: (pos) => {
      if (!isGameStarted() || isGameOver()) return;
      if (pos.x > W * 0.4) {
        slingshot.startDrag(pos);
      }
    },
    onTouchMove: (pos) => {
      slingshot.updateDrag(pos);
    },
    onTouchEnd: () => {
      const dragEnd = slingshot.endDrag();
      if (dragEnd) {
        const projectile = ProjectileScene.createFromSlingshot(
          slingshot, dragEnd, SLING_CONFIG.maxDrag
        );
        if (projectile) {
          projectilesContainer.addChild(projectile);
        }
      }
    },
    onGameStart: () => {
      setGameStarted(true);
      resetGame();
      startWave(1);
    },
    onGameReset: () => {
      resetGame();
      startWave(1);
    }
  });
}

// Reset game state
function resetGame() {
  // Clear all dynamic entities
  bombsContainer.children = [];
  projectilesContainer.children = [];
  effectsContainer.children = [];
  
  // Revive flowers
  flowers.forEach(flower => flower.revive());
  
  // Reset slingshot
  slingshot.clearDrag();
  
  // Reset waves
  resetWaves();
  
  // Reset state
  setGameOver(false);
  setLastTime(Date.now());
}

// Get alive flower positions for bomb targeting
function getAliveFlowerPositions() {
  const positions = [];
  flowers.forEach((flower, idx) => {
    if (flower.isAlive()) {
      positions.push({ index: idx, x: flower.x, y: flower.y });
    }
  });
  return positions;
}

// Check if all flowers are dead
function areAllFlowersDead() {
  return flowers.every(f => !f.isAlive());
}

// Update game logic
function update() {
  if (isGameOver() || !isGameStarted()) {
    // Still process clouds for background animation
    cloudsContainer.children.forEach(cloud => cloud.process(16));
    return;
  }
  
  const currentTime = Date.now();
  const deltaTime = Math.min(currentTime - getLastTime(), 50); // Cap at 50ms
  setLastTime(currentTime);
  
  incrementFrameCount();
  const frameCount = getFrameCount();
  
  // Update animations
  const bombRes = getResource('bomb');
  if (bombRes) {
    animationLoader.update(bombRes, deltaTime);
  }
  
  // Update flower animations
  if (frameCount % 15 === 0) {
    flowers.forEach(flower => flower.nextFrame());
  }
  
  // Process all nodes
  gameRoot.process(deltaTime);
  gameRoot.physicsProcess(deltaTime);
  
  // Update wave system
  const waveAction = updateWaves(bombsContainer.children.length);
  if (waveAction.action === 'start_wave') {
    startWave(waveAction.wave);
  } else if (waveAction.action === 'spawn_bomb') {
    const waveConfig = getCurrentWaveConfig();
    const bomb = BombScene.create(waveConfig, getCurrentWave());
    bombsContainer.addChild(bomb);
    collisionSystem.registerCollider(bomb.collider);
  }
  
  // Update bombs - ground collision and flower damage
  const aliveFlowerPositions = getAliveFlowerPositions();
  
  for (let i = bombsContainer.children.length - 1; i >= 0; i--) {
    const bomb = bombsContainer.children[i];
    
    // Check ground collision
    if (bomb.y > GROUND_Y - bomb.radius) {
      // Create ground explosion
      const explosion = ExplosionScene.createGround(bomb.x, GROUND_Y - 5);
      effectsContainer.addChild(explosion);
      
      // Remove bomb
      collisionSystem.unregisterCollider(bomb.collider);
      bomb.queueFree();
      
      // Find nearest flower and damage it
      let closestIdx = -1;
      let closestDist = Infinity;
      
      aliveFlowerPositions.forEach(pos => {
        const dist = Math.abs(bomb.x - pos.x);
        if (dist < 50 && dist < closestDist) {
          closestDist = dist;
          closestIdx = pos.index;
        }
      });
      
      if (closestIdx >= 0) {
        flowers[closestIdx].damage();
      }
    }
  }
  
  // Check projectile-bomb collisions
  for (let i = projectilesContainer.children.length - 1; i >= 0; i--) {
    const proj = projectilesContainer.children[i];
    
    // Remove if out of bounds
    if (proj.isOutOfBounds({ left: -50, right: W + 50, top: -100, bottom: H + 50 })) {
      proj.queueFree();
      continue;
    }
    
    // Check collisions with bombs
    for (let j = bombsContainer.children.length - 1; j >= 0; j--) {
      const bomb = bombsContainer.children[j];
      
      const dx = proj.x - bomb.x;
      const dy = proj.y - bomb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < proj.radius + bomb.radius + 5) {
        // Collision!
        const hits = proj.registerHit();
        
        // Create score popup
        const popup = ScorePopupScene.create(bomb.x, bomb.y, hits);
        effectsContainer.addChild(popup);
        addScore(popup.totalScore);
        
        // Create explosion
        const explosion = ExplosionScene.create(bomb.x, bomb.y, bomb.bombType);
        effectsContainer.addChild(explosion);
        
        // Remove bomb
        collisionSystem.unregisterCollider(bomb.collider);
        bomb.queueFree();
        
        // Remove projectile if max hits reached
        if (proj.hits >= proj.maxHits) {
          proj.queueFree();
          break;
        }
      }
    }
  }
  
  // Check game over
  if (areAllFlowersDead()) {
    setGameOver(true);
  }
}

// Draw everything
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  
  // 1. Draw sky (screen coordinates)
  skyScene.draw(ctx);
  
  // 2. Apply game coordinate transform
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  
  // 3. Draw background elements (game coordinates)
  sunScene.draw(ctx);
  rainbowScene.draw(ctx);
  cloudsContainer.draw(ctx);
  
  // 4. Draw wall
  wallScene.draw(ctx);
  
  // 5. Draw game entities
  flowersContainer.draw(ctx);
  bombsContainer.draw(ctx);
  projectilesContainer.draw(ctx);
  effectsContainer.draw(ctx);
  
  // 6. Draw slingshot
  slingshot.draw(ctx);
  
  ctx.restore();
  
  // 7. Draw UI (screen coordinates)
  drawUI(ctx);
  
  // 8. Draw screens
  if (isGameOver()) {
    drawGameOver(ctx, canvas);
  } else if (!isGameStarted()) {
    drawStartScreen(ctx, canvas);
  }
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start
init();
gameLoop();
