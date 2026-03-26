// Bird Entity Module
// Handles individual bird behavior, animation, and rendering

const { W, H } = require('../config.js');

// Bird names from the sprite sheets
const BIRD_NAMES = [
  // common_1.png - 16 birds
  '黑领椋鸟', '八哥', '鹊鸲', '白鹡鸰',
  '发冠卷尾', '噪鹃', '乌鸫', '喜鹊',
  '红嘴蓝鹊', '珠颈斑鸠', '黄腹山鹪莺', '纯色山鹪莺',
  '远东山雀', '暗绿绣眼鸟', '树鹨', '长尾缝叶莺',
  // common_2.png - 16 birds
  '大白鹭', '白鹭', '池鹭', '夜鹭',
  '白胸翡翠', '普通翠鸟', '斑鱼狗', '白胸苦恶鸟',
  '白头鹎', '红耳鹎', '栗背短脚鹎', '北红尾鸲',
  '白喉红臀鹎', '棕背伯劳', '黑脸噪鹛', '黑领噪鹛'
];

// Bird configuration
const BIRD_CONFIG = {
  minSpeed: 1.5,
  maxSpeed: 2.5,
  minY: 80,  // Minimum Y position (below topbar)
  maxY: 300, // Maximum Y position
  width: 48, // Display width
  height: 48, // Display height
  animationSpeed: 100, // ms per frame
};

class Bird {
  constructor(spriteSheet, frameIndex, birdType) {
    this.spriteSheet = spriteSheet;
    this.frameIndex = frameIndex; // 0-15 for each sprite sheet
    this.birdType = birdType; // 0-31 for all birds
    this.name = BIRD_NAMES[birdType] || '未知鸟类';
    
    // Calculate row and col in 4x4 grid
    this.spriteRow = Math.floor(frameIndex / 4);
    this.spriteCol = frameIndex % 4;
    
    // Position and movement
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.direction = 1; // 1 = right, -1 = left (default face left, so moving right = -1 flip)
    
    // Animation
    this.currentFrame = 0;
    this.frameCount = 4; // 4 frames for flying animation (assuming)
    this.lastFrameTime = 0;
    this.frameDuration = BIRD_CONFIG.animationSpeed;
    
    // State
    this.active = true;
    this.spawnTime = Date.now();
  }
  
  // Initialize bird with random direction and position
  init() {
    // Random Y position
    this.y = BIRD_CONFIG.minY + Math.random() * (BIRD_CONFIG.maxY - BIRD_CONFIG.minY);
    
    // Random direction and speed
    const speed = BIRD_CONFIG.minSpeed + Math.random() * (BIRD_CONFIG.maxSpeed - BIRD_CONFIG.minSpeed);
    
    if (Math.random() < 0.5) {
      // Fly from left to right
      this.x = -BIRD_CONFIG.width;
      this.vx = speed;
      this.direction = -1; // Face right (opposite of default left)
    } else {
      // Fly from right to left
      this.x = W + BIRD_CONFIG.width;
      this.vx = -speed;
      this.direction = 1; // Face left (default)
    }
    
    // Slight vertical drift
    this.vy = (Math.random() - 0.5) * 0.5;
  }
  
  // Update bird position and animation
  update(deltaTime) {
    if (!this.active) return;
    
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Vertical bounds
    if (this.y < BIRD_CONFIG.minY) {
      this.y = BIRD_CONFIG.minY;
      this.vy = Math.abs(this.vy);
    } else if (this.y > BIRD_CONFIG.maxY) {
      this.y = BIRD_CONFIG.maxY;
      this.vy = -Math.abs(this.vy);
    }
    
    // Update animation frame
    this.lastFrameTime += deltaTime;
    if (this.lastFrameTime >= this.frameDuration) {
      this.lastFrameTime = 0;
      this.currentFrame = (this.currentFrame + 1) % this.frameCount;
    }
    
    // Check if bird is off-screen
    if ((this.vx > 0 && this.x > W + BIRD_CONFIG.width) ||
        (this.vx < 0 && this.x < -BIRD_CONFIG.width)) {
      this.active = false;
    }
  }
  
  // Draw the bird
  draw(ctx, sx, sy, ss) {
    if (!this.active || !this.spriteSheet) return;
    
    // Calculate source frame position in sprite sheet
    // Each bird has 4 frames horizontally in the 4x4 grid
    const frameOffset = this.currentFrame;
    const srcX = (this.spriteCol * 4 + frameOffset) * (this.spriteSheet.width / 16);
    const srcY = this.spriteRow * (this.spriteSheet.height / 4);
    const srcW = this.spriteSheet.width / 16;
    const srcH = this.spriteSheet.height / 4;
    
    // Draw position
    const drawX = sx(this.x);
    const drawY = sy(this.y);
    const drawW = ss(BIRD_CONFIG.width);
    const drawH = ss(BIRD_CONFIG.height);
    
    ctx.save();
    
    // Flip based on direction
    if (this.direction === 1) {
      // Facing left (default) - no flip
      ctx.translate(drawX, drawY);
    } else {
      // Facing right - flip horizontally
      ctx.translate(drawX + drawW, drawY);
      ctx.scale(-1, 1);
    }
    
    // Draw the bird frame
    ctx.drawImage(
      this.spriteSheet,
      srcX, srcY, srcW, srcH,
      0, 0, drawW, drawH
    );
    
    ctx.restore();
  }
  
  // Get bird bounds for hit testing
  getBounds() {
    return {
      x: this.x - BIRD_CONFIG.width / 2,
      y: this.y - BIRD_CONFIG.height / 2,
      width: BIRD_CONFIG.width,
      height: BIRD_CONFIG.height
    };
  }
  
  // Check if point is inside bird
  contains(x, y) {
    const bounds = this.getBounds();
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
  }
  
  // Capture the bird (remove it)
  capture() {
    this.active = false;
    return this.name;
  }
}

module.exports = {
  Bird,
  BIRD_NAMES,
  BIRD_CONFIG
};
