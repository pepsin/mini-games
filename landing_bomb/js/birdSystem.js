// Bird System Module
// Manages bird spawning, updates, and camera interaction

const { Bird, BIRD_CONFIG } = require('./entities/bird.js');
const { W, H } = require('./config.js');

// Bird spawn configuration
const SPAWN_CONFIG = {
  minSpawnInterval: 10000, // Minimum 10 seconds between spawns
  maxSpawnInterval: 30000, // Maximum 30 seconds between spawns
  spawnChance: 0.005, // 0.5% chance per frame when conditions are met
};

// Camera button configuration
const CAMERA_CONFIG = {
  width: 60,
  height: 60,
  marginRight: 20,
  get x() { return W - this.width - this.marginRight; },
  get y() { return H / 2 - this.height / 2; },
};

class BirdSystem {
  constructor() {
    this.birds = [];
    this.activeBird = null; // Currently visible bird that can be captured
    this.nextSpawnTime = 0;
    this.flashStartTime = 0;
    this.isFlashing = false;
    this.flashDuration = 50; // 50ms flash
    this.capturedBirds = []; // Track captured bird names
    this.spriteSheets = {
      common1: null,
      common2: null
    };
  }
  
  // Initialize with loaded sprite sheets
  init(spriteSheet1, spriteSheet2) {
    this.spriteSheets.common1 = spriteSheet1;
    this.spriteSheets.common2 = spriteSheet2;
    this.scheduleNextSpawn();
  }
  
  // Schedule next bird spawn
  scheduleNextSpawn() {
    const interval = SPAWN_CONFIG.minSpawnInterval + 
      Math.random() * (SPAWN_CONFIG.maxSpawnInterval - SPAWN_CONFIG.minSpawnInterval);
    this.nextSpawnTime = Date.now() + interval;
  }
  
  // Spawn a new bird
  spawnBird() {
    if (!this.spriteSheets.common1 || !this.spriteSheets.common2) return null;
    
    // Randomly choose sprite sheet and frame
    const useSheet1 = Math.random() < 0.5;
    const spriteSheet = useSheet1 ? this.spriteSheets.common1 : this.spriteSheets.common2;
    const frameIndex = Math.floor(Math.random() * 16); // 0-15
    const birdType = useSheet1 ? frameIndex : frameIndex + 16; // 0-31
    
    const bird = new Bird(spriteSheet, frameIndex, birdType);
    bird.init();
    
    this.birds.push(bird);
    this.activeBird = bird;
    
    return bird;
  }
  
  // Update all birds
  update(deltaTime, isGameActive) {
    // Update flash effect
    if (this.isFlashing) {
      const elapsed = Date.now() - this.flashStartTime;
      if (elapsed >= this.flashDuration) {
        this.isFlashing = false;
      }
    }
    
    // Spawn logic (only when game is active)
    if (isGameActive && !this.activeBird && Date.now() >= this.nextSpawnTime) {
      if (Math.random() < SPAWN_CONFIG.spawnChance) {
        this.spawnBird();
      }
    }
    
    // Update birds
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i];
      bird.update(deltaTime);
      
      // Remove inactive birds
      if (!bird.active) {
        if (this.activeBird === bird) {
          this.activeBird = null;
          this.scheduleNextSpawn();
        }
        this.birds.splice(i, 1);
      }
    }
  }
  
  // Draw all birds
  drawBirds(ctx, sx, sy, ss) {
    this.birds.forEach(bird => {
      bird.draw(ctx, sx, sy, ss);
    });
  }
  
  // Draw camera button (only when there's an active bird)
  drawCameraButton(ctx, sx, sy, ss) {
    if (!this.activeBird) return;
    
    const x = sx(CAMERA_CONFIG.x);
    const y = sy(CAMERA_CONFIG.y);
    const w = ss(CAMERA_CONFIG.width);
    const h = ss(CAMERA_CONFIG.height);
    
    // Button background
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    
    // Button border
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = ss(3);
    ctx.stroke();
    
    // Camera icon (simple representation)
    ctx.fillStyle = '#333';
    
    // Camera body
    const bodyWidth = w * 0.6;
    const bodyHeight = h * 0.4;
    const bodyX = x + (w - bodyWidth) / 2;
    const bodyY = y + (h - bodyHeight) / 2;
    ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);
    
    // Camera lens (circle)
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
    
    // Flash indicator
    ctx.beginPath();
    ctx.arc(x + w * 0.7, y + h * 0.3, w * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
  }
  
  // Draw flash effect
  drawFlash(ctx, canvas) {
    if (!this.isFlashing) return;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Handle camera button click
  handleCameraClick() {
    if (!this.activeBird) return null;
    
    // Start flash
    this.isFlashing = true;
    this.flashStartTime = Date.now();
    
    // Capture the bird
    const birdName = this.activeBird.capture();
    this.capturedBirds.push(birdName);
    
    // Clear active bird and schedule next spawn
    this.activeBird = null;
    this.scheduleNextSpawn();
    
    return birdName;
  }
  
  // Check if camera button was clicked
  isCameraButtonClicked(x, y) {
    if (!this.activeBird) return false;
    
    return x >= CAMERA_CONFIG.x && 
           x <= CAMERA_CONFIG.x + CAMERA_CONFIG.width &&
           y >= CAMERA_CONFIG.y && 
           y <= CAMERA_CONFIG.y + CAMERA_CONFIG.height;
  }
  
  // Get camera button bounds for hit testing
  getCameraButtonBounds() {
    return {
      x: CAMERA_CONFIG.x,
      y: CAMERA_CONFIG.y,
      width: CAMERA_CONFIG.width,
      height: CAMERA_CONFIG.height
    };
  }
  
  // Reset the system
  reset() {
    this.birds = [];
    this.activeBird = null;
    this.capturedBirds = [];
    this.isFlashing = false;
    this.scheduleNextSpawn();
  }
  
  // Check if currently flashing
  isFlashActive() {
    return this.isFlashing;
  }
  
  // Get captured birds list
  getCapturedBirds() {
    return [...this.capturedBirds];
  }
  
  // Check if there's an active bird
  hasActiveBird() {
    return this.activeBird !== null;
  }
}

// Export singleton instance
const birdSystem = new BirdSystem();

module.exports = {
  birdSystem,
  BirdSystem,
  CAMERA_CONFIG
};
