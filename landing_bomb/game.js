// Bob-omb Squad - 微信小游戏版本 (图片资源版)

// 获取画布和上下文
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 引入动画加载器
const { animationLoader } = require('./js/animationLoader.js');
// 引入降落伞模块
const { Parachute } = require('./js/parachute.js');

// 获取系统信息
const systemInfo = wx.getSystemInfoSync();
const screenWidth = systemInfo.windowWidth;
const screenHeight = systemInfo.windowHeight;

// 设置画布尺寸
canvas.width = screenWidth;
canvas.height = screenHeight;

// 适配逻辑：保持 450:800 的竖屏比例
const W = 450, H = 800;
let scaleX = 1, scaleY = 1;
let offsetX = 0, offsetY = 0;

function updateScale() {
  const ratio = W / H;
  const screenRatio = screenWidth / screenHeight;
  
  if (screenRatio > ratio) {
    scaleY = screenHeight / H;
    scaleX = scaleY;
    offsetX = (screenWidth - W * scaleX) / 2;
    offsetY = 0;
  } else {
    scaleX = screenWidth / W;
    scaleY = scaleX;
    offsetX = 0;
    offsetY = (screenHeight - H * scaleY) / 2;
  }
}
updateScale();

// 坐标转换函数
function sx(x) { return x * scaleX + offsetX; }
function sy(y) { return y * scaleY + offsetY; }
function toGame(cx, cy) {
  return {
    x: (cx - offsetX) / scaleX,
    y: (cy - offsetY) / scaleY
  };
}

// 资源对象
let resources = {
  bomb: null,
  parachute: null,
  flower: null,
  cloud: null,
  rainbow: null,
  slingshot: null
};

// 8色色板 - 用于图片未加载时的示意方块
const COLOR_PALETTE = [
  { name: 'CORAL',    hex: '#FF6B6B', bg: '#FF6B6B', text: '#FFFFFF' },
  { name: 'TEAL',     hex: '#4ECDC4', bg: '#4ECDC4', text: '#000000' },
  { name: 'SKY',      hex: '#45B7D1', bg: '#45B7D1', text: '#FFFFFF' },
  { name: 'MINT',     hex: '#96CEB4', bg: '#96CEB4', text: '#000000' },
  { name: 'CREAM',    hex: '#FFEAA7', bg: '#FFEAA7', text: '#000000' },
  { name: 'PLUM',     hex: '#DDA0DD', bg: '#DDA0DD', text: '#000000' },
  { name: 'SEAFOAM',  hex: '#98D8C8', bg: '#98D8C8', text: '#000000' },
  { name: 'LEMON',    hex: '#F7DC6F', bg: '#F7DC6F', text: '#000000' }
];

// 资源对应的色板索引
const RESOURCE_COLORS = {
  bomb: 0,        // CORAL - 红色系适合炸弹
  parachute: 4,   // CREAM - 浅色系
  flower: 5,      // PLUM - 花朵色
  cloud: 2,       // SKY - 天空色
  rainbow: 6,     // SEAFOAM - 彩虹相关
  slingshot: 1    // TEAL - 木质感
};

// 云朵变体使用不同颜色
const CLOUD_VARIANT_COLORS = {
  small: 2,   // SKY
  medium: 3,  // MINT
  large: 7    // LEMON
};

// 花朵颜色映射（使用色板相近色）
const FLOWER_COLOR_MAP = ['#FF6B6B', '#DDA0DD', '#F7DC6F', '#DDA0DD'];

// 资源加载完成标志
let resourcesLoaded = false;

// 加载所有资源
async function loadResources() {
  console.log('=== 开始加载所有资源 ===');
  
  // 单独加载每个资源，以便更好地调试
  resources.bomb = await animationLoader.load('bomb');
  console.log('炸弹资源:', resources.bomb ? '已加载' : '失败');
  if (resources.bomb) {
    console.log('  - 类型:', resources.bomb.type);
    console.log('  - 帧数:', resources.bomb.frames?.length);
    console.log('  - 当前帧:', resources.bomb.currentFrame);
    if (resources.bomb.frames?.length > 0) {
      console.log('  - 第一帧图片:', resources.bomb.frames[0].image ? '存在' : '缺失');
      console.log('  - 第一帧图片尺寸:', resources.bomb.frames[0].image?.width, 'x', resources.bomb.frames[0].image?.height);
    }
  }
  
  resources.parachute = await animationLoader.load('bomb/parachute');
  console.log('降落伞资源:', resources.parachute ? '已加载' : '失败');
  
  resources.flower = await animationLoader.load('flower');
  console.log('花朵资源:', resources.flower ? '已加载' : '失败');
  
  resources.cloud = await animationLoader.load('cloud');
  console.log('云朵资源:', resources.cloud ? '已加载' : '失败');
  
  resources.rainbow = await animationLoader.load('rainbow');
  console.log('彩虹资源:', resources.rainbow ? '已加载' : '失败');
  
  resources.slingshot = await animationLoader.load('slingshot');
  console.log('弹弓资源:', resources.slingshot ? '已加载' : '失败');

  // 初始化云朵变体
  initClouds();
  
  // 检查是否有任何资源成功加载
  const anyLoaded = resources.bomb || resources.parachute || resources.flower || 
                    resources.cloud || resources.rainbow || resources.slingshot;
  
  if (anyLoaded) {
    resourcesLoaded = true;
    console.log('=== 资源加载完成，使用图片模式 ===');
  } else {
    resourcesLoaded = false;
    console.log('=== 没有资源加载成功，使用方块模式 ===');
  }
}

// Game state
let score = 0;
let highScore = 0;
let lives = 4;
let gameOver = false;
let gameStarted = false;
let bombs = [];
let projectiles = [];
let explosions = [];
let scorePopups = []; // 分数弹出动画
let clouds = [];
let frameCount = 0;
let lastTime = Date.now();

// ========== WAVE SYSTEM ==========
// Wave-based spawn system - tunable parameters for difficulty curve
let currentWave = 1;
let waveTimer = 0;           // Frames since wave started
let waveDuration = 600;      // Default wave duration (10 seconds at 60fps)
let interWaveTimer = 0;      // Break between waves
let interWaveDuration = 120; // 2 seconds break between waves
let isInterWave = false;     // Are we in between waves?
let bombsSpawnedThisWave = 0;
let totalBombsThisWave = 0;
let nextSpawnTime = 0;       // Frame count when next bomb should spawn

// Wave configuration function - returns spawn parameters for given wave
// This is the main tuning function for difficulty
function getWaveConfig(wave) {
  // Clamp wave to max 200 for calculation safety
  const w = Math.min(wave, 200);
  
  // Base difficulty multiplier (1.0 at wave 1, ~5.0 at wave 100)
  // Using a curve that starts slow and accelerates after wave 30
  let difficultyMultiplier;
  if (w <= 30) {
    // Waves 1-30: Gentle linear increase (easy for most players)
    difficultyMultiplier = 1 + (w - 1) * 0.05;
  } else {
    // Waves 31+: Exponential increase (hard for elite players)
    // At wave 100: difficulty ~5.0
    const excess = w - 30;
    difficultyMultiplier = 2.45 + excess * 0.036;
  }
  
  // ========== TUNABLE PARAMETERS ==========
  
  // Total bombs per wave
  // Wave 1: 3 bombs, Wave 30: ~10 bombs, Wave 100: ~20 bombs
  const bombsPerWave = Math.floor(5 + w * 0.18 + Math.pow(w / 50, 2) * 5);
  
  // Wave duration in frames (varies slightly to keep it interesting)
  // Wave 1: 8 seconds, Wave 30: 9s, Wave 100: 10s
  const waveDurationFrames = Math.floor((8 + Math.min(w * 0.03, 2)) * 60);
  
  // Bomb speed range
  // Wave 1: 0.6-1.0, Wave 30: 1.2-1.8, Wave 100: 2.2-3.5
  const minSpeed = 0.7 + w * 0.02 + Math.pow(w / 60, 2) * 0.8;
  const maxSpeed = minSpeed + 0.4 + w * 0.01;
  
  // Sway (horizontal movement) - makes bombs harder to hit
  // Wave 1: minimal sway, Wave 100: significant sway
  const maxSway = 0.2 + w * 0.015;
  
  // Bomb size variation (smaller bombs at higher waves)
  const minRadius = Math.max(10, 16 - w * 0.04);
  const maxRadius = Math.max(14, 20 - w * 0.04);
  
  // Bomb health (for future use - multi-hit bombs)
  const bombHealth = w >= 50 ? 1 + Math.floor((w - 50) / 25) : 1;
  
  // Special bomb chance (fast bombs, zigzag bombs, etc.)
  // Wave 1-10: 0%, Wave 30: 10%, Wave 100: 40%
  const specialBombChance = Math.max(0, (w - 10) * 0.005);
  
  // Cluster bomb chance (bombs that split when hit)
  // Starts at wave 20
  const clusterBombChance = w >= 20 ? Math.min(0.15, (w - 20) * 0.003) : 0;
  
  return {
    bombsPerWave,
    waveDurationFrames,
    minSpeed,
    maxSpeed,
    maxSway,
    minRadius,
    maxRadius,
    bombHealth,
    specialBombChance,
    clusterBombChance,
    difficultyMultiplier
  };
}

// Calculate spawn times for a wave (returns array of frame offsets)
function calculateSpawnTimes(config) {
  const spawnTimes = [];
  const { bombsPerWave, waveDurationFrames } = config;
  
  if (bombsPerWave === 0) return spawnTimes;
  
  // Distribute bombs throughout the wave with some randomness
  // First bomb always comes early, last bomb comes before wave ends
  const safeDuration = waveDurationFrames - 60; // Leave 1 second buffer at end
  
  for (let i = 0; i < bombsPerWave; i++) {
    // Base position in wave (0 to 1)
    const basePosition = (i + 1) / (bombsPerWave + 1);
    
    // Add randomness ±30% to make patterns less predictable
    const randomOffset = (Math.random() - 0.5) * 0.3;
    const position = Math.max(0.05, Math.min(0.95, basePosition + randomOffset));
    
    spawnTimes.push(Math.floor(position * safeDuration));
  }
  
  // Sort spawn times
  return spawnTimes.sort((a, b) => a - b);
}

// Get current wave configuration
let currentWaveConfig = getWaveConfig(1);
let waveSpawnSchedule = [];

// ========== END WAVE SYSTEM ==========

// 从本地存储读取最高分
try {
  const savedHighScore = wx.getStorageSync('bobomb_highscore');
  if (savedHighScore !== '') {
    highScore = parseInt(savedHighScore) || 0;
  }
} catch (e) {
  console.log('读取最高分失败:', e);
}

// Slingshot state
const sling = { x: W / 2, y: H - 130, prongW: 12, prongH: 50 };
let dragging = false;
let dragStart = null;
let dragCurrent = null;
const maxDrag = 300; // 允许拉到更远的距离，接近屏幕边缘

// 花朵配置
const healthFlowerColors = ['#FF5252', '#FF4081', '#FFAB40', '#E040FB'];
const healthFlowerPositions = [90, 180, 270, 360];
let flowerAlive = [true, true, true, true];
const flowerHitRadius = 50;

// 初始化云朵
function initClouds() {
  clouds = [];
  for (let i = 0; i < 6; i++) {
    const variants = resources.cloud?.variants ? Object.keys(resources.cloud.variants) : ['small', 'medium', 'large'];
    clouds.push({
      x: Math.random() * W,
      y: 40 + Math.random() * 120,
      variant: variants[Math.floor(Math.random() * variants.length)],
      speed: 0.15 + Math.random() * 0.3
    });
  }
}

// --- Drawing Functions ---

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, sy(H));
  grad.addColorStop(0, '#4ab8ff');
  grad.addColorStop(0.6, '#87CEEB');
  grad.addColorStop(1, '#b8e8ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSun() {
  const cx = sx(380), cy = sy(70), r = sx(35);
  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.5);
  glow.addColorStop(0, 'rgba(255,255,100,0.6)');
  glow.addColorStop(1, 'rgba(255,255,100,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE44D';
  ctx.fill();
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = sx(2);
  ctx.stroke();
  ctx.strokeStyle = '#FFE44D';
  ctx.lineWidth = sx(3);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + frameCount * 0.005;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r * 1.2, cy + Math.sin(angle) * r * 1.2);
    ctx.lineTo(cx + Math.cos(angle) * r * 1.6, cy + Math.sin(angle) * r * 1.6);
    ctx.stroke();
  }
}

/**
 * 保持宽高比绘制图片
 * @param {Image} img - 图片对象
 * @param {number} x - 游戏坐标X（中心点）
 * @param {number} y - 游戏坐标Y（中心点）
 * @param {number} targetWidth - 目标宽度（游戏坐标），0表示使用原始尺寸
 * @param {number} anchorX - 锚点X (0-1)
 * @param {number} anchorY - 锚点Y (0-1)
 * @returns {Object} 实际绘制的尺寸 {width, height}
 */
function drawImageProportional(img, x, y, targetWidth, anchorX = 0.5, anchorY = 0.5) {
  if (!img || img.width === 0 || img.height === 0) {
    return null;
  }
  
  const originalWidth = img.width;
  const originalHeight = img.height;
  const aspectRatio = originalWidth / originalHeight;
  
  let drawWidth, drawHeight;
  
  if (targetWidth > 0) {
    // 按目标宽度等比缩放
    drawWidth = sx(targetWidth);
    drawHeight = drawWidth / aspectRatio;
  } else {
    // 使用原始像素尺寸（转换为屏幕坐标）
    const scale = (W / canvas.width + H / canvas.height) / 2;
    drawWidth = originalWidth / scale;
    drawHeight = originalHeight / scale;
  }
  
  const drawX = sx(x) - drawWidth * anchorX;
  const drawY = sy(y) - drawHeight * anchorY;
  
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  
  return { width: drawWidth, height: drawHeight };
}

/**
 * 绘制示意方块 - 图片未加载时使用
 * @param {number} x - 游戏坐标X
 * @param {number} y - 游戏坐标Y
 * @param {number} w - 宽度（游戏坐标）
 * @param {number} h - 高度（游戏坐标）
 * @param {string} label - 显示文字
 * @param {number} colorIndex - 色板索引
 * @param {number} anchorX - 锚点X (0-1)
 * @param {number} anchorY - 锚点Y (0-1)
 */
function drawPlaceholder(x, y, w, h, label, colorIndex, anchorX = 0.5, anchorY = 0.5) {
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
  const drawX = sx(x) - sx(w) * anchorX;
  const drawY = sy(y) - sy(h) * anchorY;
  const drawW = sx(w);
  const drawH = sy(h);
  
  // 绘制方块背景
  ctx.fillStyle = color.bg;
  ctx.fillRect(drawX, drawY, drawW, drawH);
  
  // 绘制边框
  ctx.strokeStyle = color.text;
  ctx.lineWidth = Math.max(2, sx(2));
  ctx.strokeRect(drawX, drawY, drawW, drawH);
  
  // 绘制对角线（X形）
  ctx.beginPath();
  ctx.moveTo(drawX, drawY);
  ctx.lineTo(drawX + drawW, drawY + drawH);
  ctx.moveTo(drawX + drawW, drawY);
  ctx.lineTo(drawX, drawY + drawH);
  ctx.strokeStyle = color.text + '40'; // 半透明
  ctx.stroke();
  
  // 绘制文字
  ctx.fillStyle = color.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 自适应字体大小
  const fontSize = Math.min(drawW / 3, drawH / 2, sx(16));
  ctx.font = `bold ${fontSize}px Arial`;
  
  // 文字换行处理（如果太长）
  if (label.length > 4 && drawW < sx(60)) {
    const mid = Math.ceil(label.length / 2);
    ctx.fillText(label.slice(0, mid), drawX + drawW / 2, drawY + drawH / 2 - fontSize * 0.3);
    ctx.fillText(label.slice(mid), drawX + drawW / 2, drawY + drawH / 2 + fontSize * 0.7);
  } else {
    ctx.fillText(label, drawX + drawW / 2, drawY + drawH / 2);
  }
}

function drawRainbow() {
  if (resourcesLoaded && resources.rainbow?.image && resources.rainbow.image.width > 0) {
    const size = animationLoader.getSize(resources.rainbow);
    const anchor = animationLoader.getAnchor(resources.rainbow);
    const pos = resources.rainbow.config.position || { x: 80, y: 140 };
    
    ctx.globalAlpha = 0.4;
    const result = drawImageProportional(
      resources.rainbow.image,
      pos.x,
      pos.y,
      size.width,
      anchor.x,
      anchor.y
    );
    ctx.globalAlpha = 1;
    
    if (!result) {
      drawPlaceholder(80, 140, 120, 60, 'RAIN', RESOURCE_COLORS.rainbow, 0.5, 1.0);
    }
  } else {
    // 使用示意方块 - 使用 config 中的标准尺寸 256x128
    drawPlaceholder(80, 140, 256, 128, 'RAIN', RESOURCE_COLORS.rainbow, 0.5, 1.0);
  }
}

function drawCloud(cloud) {
  if (resourcesLoaded && resources.cloud?.variants) {
    animationLoader.setVariant(resources.cloud, cloud.variant);
    const img = resources.cloud.image;
    
    if (img && img.width > 0) {
      const size = animationLoader.getSize(resources.cloud);
      const anchor = animationLoader.getAnchor(resources.cloud);
      
      ctx.globalAlpha = 0.9;
      const result = drawImageProportional(
        img,
        cloud.x,
        cloud.y,
        size.width * 0.5,  // 云朵按 50% 缩放
        anchor.x,
        anchor.y
      );
      ctx.globalAlpha = 1;
      
      if (result) return;
    }
  }
  
  // 使用示意方块 - 使用 config 中的标准尺寸 128x64，按比例缩放
  const colorIdx = CLOUD_VARIANT_COLORS[cloud.variant] || RESOURCE_COLORS.cloud;
  const scaleMap = { small: 0.4, medium: 0.6, large: 0.8 };
  const scale = scaleMap[cloud.variant] || 0.6;
  drawPlaceholder(cloud.x, cloud.y, 128 * scale, 64 * scale, 'CLOUD', colorIdx, 0.5, 0.5);
}

function drawWall() {
  const wallY = sy(H - 80);
  const wallH = sy(80);
  ctx.fillStyle = '#E8DCC8';
  ctx.fillRect(0, wallY, canvas.width, wallH);
  const bw = sx(40), bh = sy(14);
  ctx.strokeStyle = '#D4C4A8';
  ctx.lineWidth = sx(1);
  for (let row = 0; row < 6; row++) {
    const yy = wallY + row * bh;
    const offset = (row % 2) * bw * 0.5;
    for (let col = -1; col < W / 40 + 1; col++) {
      const xx = offset + col * bw;
      ctx.strokeRect(xx, yy, bw, bh);
    }
  }
  ctx.fillStyle = '#D2B48C';
  ctx.fillRect(0, wallY - sy(5), canvas.width, sy(5));
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, wallY - sy(14), canvas.width, sy(10));
  ctx.fillStyle = '#388E3C';
  for (let i = 0; i < W; i += 12) {
    ctx.beginPath();
    ctx.arc(sx(i), wallY - sy(14), sx(7), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFlower(index, x, y, alive) {
  if (resourcesLoaded && resources.flower) {
    // 设置状态
    const state = alive ? 'alive' : 'dead';
    animationLoader.setState(resources.flower, state);
    
    const img = animationLoader.getCurrentFrame(resources.flower);
    if (img && img.width > 0) {
      const size = animationLoader.getSize(resources.flower);
      const anchor = animationLoader.getAnchor(resources.flower);
      
      // 计算保持比例的绘制尺寸
      const aspectRatio = img.width / img.height;
      const targetWidth = size.width;
      const drawWidth = sx(targetWidth);
      const drawHeight = drawWidth / aspectRatio;
      
      const drawX = sx(x) - drawWidth * anchor.x;
      const drawY = sy(y) - drawHeight * anchor.y;
      
      // 应用颜色染色
      if (alive) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        
        // 叠加颜色
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = healthFlowerColors[index] + '40';
        ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
      } else {
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      }
      return;
    }
  }
  
  // 使用示意方块 - 使用 config 中的标准尺寸
  const label = alive ? `F${index + 1}` : 'DEAD';
  const colorIdx = alive ? (RESOURCE_COLORS.flower + index) % COLOR_PALETTE.length : 0;
  drawPlaceholder(x, y, 48, 64, label, colorIdx, 0.5, 0.8);
}

function drawHealthFlowers() {
  for (let i = 0; i < 4; i++) {
    drawFlower(i, healthFlowerPositions[i], H - 92, flowerAlive[i]);
  }
}

function drawSlingshot() {
  const pivotX = sling.x;
  const pivotY = sling.y - sling.prongH;
  
  if (resourcesLoaded && resources.slingshot?.image && resources.slingshot.image.width > 0) {
    const size = animationLoader.getSize(resources.slingshot);
    const anchor = animationLoader.getAnchor(resources.slingshot);
    
    const result = drawImageProportional(
      resources.slingshot.image,
      sling.x,
      sling.y,
      size.width,
      anchor.x,
      anchor.y
    );
    
    if (result) {
      // 获取叉尖位置（从配置或计算）
      const parts = resources.slingshot.config.parts;
      const leftTip = { 
        x: sling.x + parts.leftTip.x, 
        y: sling.y + parts.leftTip.y 
      };
      const rightTip = { 
        x: sling.x + parts.rightTip.x, 
        y: sling.y + parts.rightTip.y 
      };
      
      drawSlingshotBands(leftTip, rightTip, pivotX, pivotY);
      return;
    }
  }
  
  // 使用示意方块 - 使用 config 中的标准尺寸 64x96
  drawPlaceholder(sling.x, sling.y, 64, 96, 'SLING', RESOURCE_COLORS.slingshot, 0.5, 1.0);
  
  // 仍需绘制橡皮筋
  const leftTip = { x: sling.x - 18, y: sling.y - sling.prongH };
  const rightTip = { x: sling.x + 18, y: sling.y - sling.prongH };
  drawSlingshotBands(leftTip, rightTip, pivotX, pivotY);
}

function drawSlingshotBands(leftTip, rightTip, pivotX, pivotY) {
  if (dragging && dragCurrent) {
    const dx = dragCurrent.x - pivotX;
    const dy = dragCurrent.y - pivotY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampDist = Math.min(dist, maxDrag);
    const angle = Math.atan2(dy, dx);
    const pullX = pivotX + Math.cos(angle) * clampDist;
    const pullY = pivotY + Math.sin(angle) * clampDist;

    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = sx(4);
    ctx.beginPath();
    ctx.moveTo(sx(leftTip.x), sy(leftTip.y));
    ctx.lineTo(sx(pullX), sy(pullY));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx(rightTip.x), sy(rightTip.y));
    ctx.lineTo(sx(pullX), sy(pullY));
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sx(pullX), sy(pullY), sx(8), 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = sx(1);
    ctx.stroke();

    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = sx(4);
    ctx.beginPath();
    ctx.moveTo(sx(leftTip.x), sy(leftTip.y));
    ctx.quadraticCurveTo(sx(pivotX), sy(pivotY + 20), sx(rightTip.x), sy(rightTip.y));
    ctx.stroke();
  }
}

function drawBomb(bomb) {
  if (bomb.exploding) return;
  
  // 使用降落伞模块绘制降落伞（包含连接线、旋转和缩放变化）
  Parachute.draw(ctx, bomb, resources, animationLoader, sx, sy, frameCount);
  
  // 绘制炸弹
  let usePlaceholder = true;
  
  if (resourcesLoaded && resources.bomb) {
    const img = animationLoader.getCurrentFrame(resources.bomb);
    if (img && img.width > 0 && img.height > 0) {
      const size = animationLoader.getSize(resources.bomb);
      const anchor = animationLoader.getAnchor(resources.bomb);
      
      // 使用保持比例的绘制
      const result = drawImageProportional(
        img,
        bomb.x,
        bomb.y,
        size.width * 0.8,  // 目标宽度（游戏坐标）
        anchor.x,
        anchor.y
      );
      
      if (result) {
        usePlaceholder = false;
      }
    }
  }
  
  // 使用示意方块绘制炸弹 - 使用 config 中的标准尺寸 64x64
  if (usePlaceholder) {
    drawPlaceholder(bomb.x, bomb.y, 64, 64, 'BOMB', RESOURCE_COLORS.bomb, 0.5, 0.5);
  }
}

function drawProjectile(proj) {
  const px = sx(proj.x), py = sy(proj.y), r = sx(proj.radius);
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 1, px, py, r);
  grad.addColorStop(0, '#777');
  grad.addColorStop(1, '#222');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = sx(1);
  ctx.stroke();

  ctx.globalAlpha = 0.3;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(sx(proj.x - proj.vx * i * 2), sy(proj.y - proj.vy * i * 2), r * (1 - i * 0.2), 0, Math.PI * 2);
    ctx.fillStyle = '#555';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawExplosion(exp) {
  const progress = exp.frame / exp.maxFrames;
  const cx = sx(exp.x), cy = sy(exp.y);

  if (progress < 0.3) {
    const flashR = sx(40) * (progress / 0.3);
    const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
    flashGrad.addColorStop(0, 'rgba(255,255,200,0.8)');
    flashGrad.addColorStop(1, 'rgba(255,200,50,0)');
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
    ctx.fill();
  }

  exp.particles.forEach(p => {
    const px = cx + sx(p.vx * exp.frame);
    const py = cy + sy(p.vy * exp.frame);
    const alpha = 1 - progress;
    const size = sx(p.size) * (1 - progress * 0.5);
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
    ctx.fill();
  });
}

// 绘制分数弹出动画
function drawScorePopup(popup) {
  const progress = popup.frame / popup.maxFrames;
  const cx = sx(popup.x);
  const cy = sy(popup.y - 20 - progress * 30); // 向上飘动
  
  // 缩放效果：从大到小 (zoom out)
  const scale = 1.5 - progress * 0.8; // 从1.5倍缩小到0.7倍
  
  // 透明度：先保持一段时间，然后淡出
  let alpha = 1;
  if (progress > 0.5) {
    alpha = 1 - (progress - 0.5) * 2; // 后半段淡出
  }
  
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 绘制 "n x 100" 文字
  const fontSize = Math.floor(sx(20) * scale);
  ctx.font = `bold ${fontSize}px Arial`;
  
  // 连击数字使用金色，x和100使用白色
  const comboText = `${popup.combo}`;
  const xText = ' x ';
  const scoreText = '100';
  
  // 计算总宽度以居中
  const comboWidth = ctx.measureText(comboText).width;
  const xWidth = ctx.measureText(xText).width;
  const scoreWidth = ctx.measureText(scoreText).width;
  const totalWidth = comboWidth + xWidth + scoreWidth;
  
  const startX = cx - totalWidth / 2;
  
  // 绘制连击数字（金色带发光效果）
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FF8C00';
  ctx.shadowBlur = sx(4);
  ctx.fillText(comboText, startX + comboWidth / 2, cy);
  
  // 绘制 "x"（白色）
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 0;
  ctx.fillText(xText, startX + comboWidth + xWidth / 2, cy);
  
  // 绘制 "100"（白色）
  ctx.fillText(scoreText, startX + comboWidth + xWidth + scoreWidth / 2, cy);
  
  ctx.restore();
}

function drawUI() {
  // 分数面板 - 统一使用 sx 缩放保持比例
  const panelH = sx(30);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(sx(10), sy(10), sx(150), panelH);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = sx(2);
  ctx.strokeRect(sx(10), sy(10), sx(150), panelH);
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${sx(15)}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score}`, sx(18), sy(10) + panelH * 0.65);

  // 最高分面板
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(sx(W - 170), sy(10), sx(160), panelH);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = sx(2);
  ctx.strokeRect(sx(W - 170), sy(10), sx(160), panelH);
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${sx(13)}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillText(`HI-SCORE: ${highScore}`, sx(W - 160), sy(10) + panelH * 0.65);
  
  // 波次显示
  const wavePanelW = sx(100);
  const waveX = (sx(W) - wavePanelW) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(waveX, sy(10), wavePanelW, panelH);
  ctx.strokeStyle = isInterWave ? '#4CAF50' : '#FF6B6B';
  ctx.lineWidth = sx(2);
  ctx.strokeRect(waveX, sy(10), wavePanelW, panelH);
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${sx(14)}px Arial`;
  ctx.textAlign = 'center';
  
  if (isInterWave) {
    // 波次间休息时显示倒计时
    const remainingBreak = Math.ceil((interWaveDuration - interWaveTimer) / 60);
    ctx.fillText(`BREAK ${remainingBreak}s`, sx(W / 2), sy(10) + panelH * 0.65);
  } else {
    ctx.fillText(`WAVE ${currentWave}`, sx(W / 2), sy(10) + panelH * 0.65);
  }
  
  // 波次进度条（仅在波次中显示）
  if (!isInterWave && currentWaveConfig) {
    const progress = waveTimer / currentWaveConfig.waveDurationFrames;
    const barWidth = wavePanelW - sx(10);
    const barHeight = sx(4);
    const barY = sy(10) + panelH - barHeight - sx(3);
    
    // 背景
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(waveX + sx(5), barY, barWidth, barHeight);
    
    // 进度
    ctx.fillStyle = progress > 0.8 ? '#FF6B6B' : (progress > 0.5 ? '#FFD700' : '#4CAF50');
    ctx.fillRect(waveX + sx(5), barY, barWidth * (1 - progress), barHeight);
  }
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 弹窗框 - 统一使用 sx 缩放保持宽高比
  const boxW = sx(320);
  const boxH = sx(280); // 增加高度以容纳波次信息
  const bx = sx(W / 2) - boxW / 2;
  const by = sy(H / 2) - boxH / 2;
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = sx(3);
  ctx.strokeRect(bx, by, boxW, boxH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF4444';
  ctx.font = `bold ${sx(32)}px Arial`;
  ctx.fillText('GAME OVER', sx(W / 2), by + boxH * 0.22);

  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${sx(24)}px Arial`;
  ctx.fillText(`Wave ${currentWave} Reached!`, sx(W / 2), by + boxH * 0.38);

  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${sx(20)}px Arial`;
  ctx.fillText(`Score: ${score}`, sx(W / 2), by + boxH * 0.52);

  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${sx(16)}px Arial`;
  ctx.fillText(`High Score: ${highScore}`, sx(W / 2), by + boxH * 0.63);

  if (score >= highScore && score > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${sx(14)}px Arial`;
    ctx.fillText('NEW HIGH SCORE!', sx(W / 2), by + boxH * 0.72);
  }
  
  // 波次评价
  let rating = '';
  let ratingColor = '#FFF';
  if (currentWave >= 100) {
    rating = '⭐ LEGEND! TOP 1%! ⭐';
    ratingColor = '#FFD700';
  } else if (currentWave >= 50) {
    rating = '🔥 EXPERT! Top 10%! 🔥';
    ratingColor = '#FF6B6B';
  } else if (currentWave >= 30) {
    rating = '🌻 Good Job! 🌻';
    ratingColor = '#4ECDC4';
  }
  
  if (rating) {
    ctx.fillStyle = ratingColor;
    ctx.font = `bold ${sx(14)}px Arial`;
    ctx.fillText(rating, sx(W / 2), by + boxH * 0.79);
  }

  // 按钮 - 统一使用 sx 缩放保持宽高比
  const btnW = sx(140);
  const btnH = sx(40); // 使用 sx 保持按钮比例
  const btnX = sx(W / 2) - btnW / 2;
  const btnY = by + boxH * 0.86;
  
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = '#388E3C';
  ctx.lineWidth = sx(2);
  ctx.strokeRect(btnX, btnY, btnW, btnH);
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${sx(16)}px Arial`;
  ctx.fillText('PLAY AGAIN', sx(W / 2), btnY + btnH * 0.65);
}

function drawStartScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = sx(W / 2);
  const centerY = sy(H / 2);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${sx(34)}px Arial`;
  ctx.fillText('BOB-OMB SQUAD', centerX, centerY - sx(80));

  ctx.fillStyle = '#FFF';
  ctx.font = `${sx(13)}px Arial`;
  ctx.fillText('Drag the slingshot to aim and release to fire!', centerX, centerY - sx(35));
  ctx.fillText('Hit the bombs before they land!', centerX, centerY - sx(10));

  // 炸弹图标
  ctx.beginPath();
  ctx.arc(centerX, centerY + sx(40), sx(15), 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(centerX, centerY + sx(28), sx(4), 0, Math.PI * 2);
  ctx.fill();

  // 按钮 - 统一使用 sx 缩放保持宽高比
  const btnW = sx(140);
  const btnH = sx(44); // 使用 sx 保持按钮比例
  const btnX = centerX - btnW / 2;
  const btnY = centerY + sx(80);
  
  ctx.fillStyle = '#FF5722';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = '#E64A19';
  ctx.lineWidth = sx(2);
  ctx.strokeRect(btnX, btnY, btnW, btnH);
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${sx(20)}px Arial`;
  ctx.fillText('START', centerX, btnY + btnH * 0.6);
}

// --- Game Logic ---

function spawnBomb() {
  const cfg = currentWaveConfig;
  
  // Determine if this is a special bomb
  const isSpecial = Math.random() < cfg.specialBombChance;
  const isCluster = Math.random() < cfg.clusterBombChance;
  
  // Calculate base properties
  const radius = cfg.minRadius + Math.random() * (cfg.maxRadius - cfg.minRadius);
  let speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
  let sway = Math.random() * cfg.maxSway;
  
  // Special bomb types
  let bombType = 'normal';
  let health = cfg.bombHealth;
  
  if (isCluster) {
    bombType = 'cluster';
    // Cluster bombs are slightly slower but split when hit
    speed *= 0.85;
  } else if (isSpecial) {
    const specialTypes = ['fast', 'zigzag', 'tank'];
    bombType = specialTypes[Math.floor(Math.random() * specialTypes.length)];
    
    switch (bombType) {
      case 'fast':
        speed *= 1.5;  // 50% faster
        sway *= 0.5;   // Less sway
        break;
      case 'zigzag':
        speed *= 0.9;
        sway *= 2.5;   // Much more horizontal movement
        break;
      case 'tank':
        speed *= 0.6;  // Slow but tanky
        health = Math.max(2, health + 1);
        break;
    }
  }
  
  // Spawn position: ensure bombs don't spawn too close to edges
  // Higher waves have slightly wider spawn area
  const margin = 30 + Math.min(currentWave * 0.5, 30);
  const x = margin + Math.random() * (W - margin * 2);
  
  bombs.push({
    x: x,
    y: -50,
    radius: radius,
    speed: speed,
    sway: sway,
    swayOffset: Math.random() * Math.PI * 2,
    exploding: false,
    bombType: bombType,
    health: health,
    maxHealth: health,
    // 初始化降落伞属性（随机缩放和旋转偏移）
    parachute: Parachute.createBombParachute()
  });
}

// Start a new wave
function startWave(waveNum) {
  currentWave = waveNum;
  currentWaveConfig = getWaveConfig(waveNum);
  
  waveTimer = 0;
  bombsSpawnedThisWave = 0;
  totalBombsThisWave = currentWaveConfig.bombsPerWave;
  
  // Calculate spawn schedule for this wave
  waveSpawnSchedule = calculateSpawnTimes(currentWaveConfig);
  
  // Set first spawn time
  nextSpawnTime = waveSpawnSchedule.length > 0 ? waveSpawnSchedule[0] : 0;
  
  console.log(`Wave ${waveNum} started: ${totalBombsThisWave} bombs, ${currentWaveConfig.waveDurationFrames / 60}s duration`);
}

// End current wave, start inter-wave break
function endWave() {
  isInterWave = true;
  interWaveTimer = 0;
  
  // Inter-wave duration decreases slightly at higher waves (less rest for elites)
  interWaveDuration = Math.max(60, 120 - currentWave * 0.5);
  
  console.log(`Wave ${currentWave} completed! Break time: ${interWaveDuration / 60}s`);
}

function createExplosion(x, y, points, bombType = 'normal') {
  const particles = [];
  
  // Different explosion colors based on bomb type
  let colors;
  switch (bombType) {
    case 'fast':
      colors = [
        { r: 100, g: 200, b: 255 },
        { r: 50, g: 150, b: 255 },
        { r: 200, g: 230, b: 255 },
      ];
      break;
    case 'tank':
      colors = [
        { r: 150, g: 50, b: 50 },
        { r: 100, g: 30, b: 30 },
        { r: 200, g: 100, b: 100 },
      ];
      break;
    case 'cluster':
      colors = [
        { r: 255, g: 100, b: 255 },
        { r: 200, g: 50, b: 200 },
        { r: 255, g: 200, b: 255 },
      ];
      break;
    default:
      colors = [
        { r: 255, g: 100, b: 0 },
        { r: 255, g: 200, b: 0 },
        { r: 255, g: 50, b: 0 },
        { r: 255, g: 255, b: 100 },
        { r: 200, g: 50, b: 0 },
      ];
  }
  
  const particleCount = bombType === 'normal' ? 20 : 28;
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    const c = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      r: c.r, g: c.g, b: c.b
    });
  }
  explosions.push({ x, y, frame: 0, maxFrames: 40, particles, points: null });
}

// 创建分数弹出动画
function createScorePopup(x, y, combo) {
  const baseScore = 100;
  const totalScore = baseScore * combo;
  scorePopups.push({
    x, y,
    combo,           // 连击数
    baseScore,       // 基础分数
    totalScore,      // 总分
    frame: 0,
    maxFrames: 50    // 动画持续帧数
  });
  return totalScore;
}

function createGroundExplosion(x, y) {
  const particles = [];
  for (let i = 0; i < 15; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const speed = 1 + Math.random() * 2;
    particles.push({
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      r: 100, g: 100, b: 100
    });
  }
  explosions.push({ x, y, frame: 0, maxFrames: 30, particles, points: null });
}

function fireProjectile() {
  if (!dragCurrent) return;
  const pivotX = sling.x;
  const pivotY = sling.y - sling.prongH;
  
  const dx = dragCurrent.x - pivotX;
  const dy = dragCurrent.y - pivotY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const clampDist = Math.min(dist, maxDrag);
  if (clampDist < 10) return;

  const angle = Math.atan2(dy, dx);
  const pullX = pivotX + Math.cos(angle) * clampDist;
  const pullY = pivotY + Math.sin(angle) * clampDist;

  const vx = -(pullX - pivotX) * 0.18;
  const vy = -(pullY - pivotY) * 0.18;

  projectiles.push({
    x: pivotX,
    y: pivotY,
    vx: vx,
    vy: vy,
    radius: 12,
    gravity: 0.12
  });
}

function update() {
  if (gameOver || !gameStarted) return;
  
  const currentTime = Date.now();
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  frameCount++;

  // 更新动画
  if (resourcesLoaded) {
    animationLoader.update(resources.bomb, deltaTime);
    animationLoader.update(resources.flower, deltaTime);
  }

  // 更新云朵
  clouds.forEach(c => {
    c.x += c.speed;
    if (c.x > W + 100) c.x = -100;
  });

  // ========== WAVE SYSTEM UPDATE ==========
  if (isInterWave) {
    // Inter-wave break
    interWaveTimer++;
    if (interWaveTimer >= interWaveDuration) {
      isInterWave = false;
      startWave(currentWave + 1);
    }
  } else {
    // Active wave
    waveTimer++;
    
    // Check if it's time to spawn a bomb
    if (bombsSpawnedThisWave < waveSpawnSchedule.length && 
        waveTimer >= waveSpawnSchedule[bombsSpawnedThisWave]) {
      spawnBomb();
      bombsSpawnedThisWave++;
    }
    
    // Check if wave should end
    if (waveTimer >= currentWaveConfig.waveDurationFrames && bombs.length === 0) {
      endWave();
    }
  }
  // ========== END WAVE SYSTEM UPDATE ==========

  // 更新炸弹
  for (let i = bombs.length - 1; i >= 0; i--) {
    const bomb = bombs[i];
    bomb.y += bomb.speed;
    bomb.x += Math.sin(frameCount * 0.02 + bomb.swayOffset) * bomb.sway;

    if (bomb.y > H - 80 - bomb.radius) {
      createGroundExplosion(bomb.x, H - 85);
      bombs.splice(i, 1);
      let closestIdx = -1;
      let closestDist = Infinity;
      for (let f = 0; f < 4; f++) {
        if (!flowerAlive[f]) continue;
        const dist = Math.abs(bomb.x - healthFlowerPositions[f]);
        if (dist < flowerHitRadius && dist < closestDist) {
          closestDist = dist;
          closestIdx = f;
        }
      }
      if (closestIdx >= 0) {
        flowerAlive[closestIdx] = false;
        lives--;
        if (lives <= 0) {
          lives = 0;
          gameOver = true;
          if (score > highScore) {
            highScore = score;
            try {
              wx.setStorageSync('bobomb_highscore', highScore.toString());
            } catch (e) {
              console.log('保存最高分失败:', e);
            }
          }
        }
      }
    }
  }

  // 更新投射物
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;

    if (p.x < -50 || p.x > W + 50 || p.y < -100 || p.y > H + 50) {
      projectiles.splice(i, 1);
      continue;
    }

    // 初始化连击计数（如果是新投射物）
    if (typeof p.hits === 'undefined') {
      p.hits = 0;
    }

    for (let j = bombs.length - 1; j >= 0; j--) {
      const b = bombs[j];
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < p.radius + b.radius + 5) {
        // 增加连击数
        p.hits++;
        // 计算分数：第n次击中 = n x 100
        const points = createScorePopup(b.x, b.y, p.hits);
        score += points;
        createExplosion(b.x, b.y, points, b.bombType);
        bombs.splice(j, 1);
        // 不删除投射物，让它可以继续飞行击中其他炸弹
      }
    }
  }

  // 更新分数弹出动画
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    scorePopups[i].frame++;
    if (scorePopups[i].frame >= scorePopups[i].maxFrames) {
      scorePopups.splice(i, 1);
    }
  }

  // 更新爆炸
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].frame++;
    if (explosions[i].frame >= explosions[i].maxFrames) {
      explosions.splice(i, 1);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawSun();
  drawRainbow();
  clouds.forEach(drawCloud);
  drawWall();
  drawHealthFlowers();
  bombs.forEach(drawBomb);
  projectiles.forEach(drawProjectile);
  explosions.forEach(drawExplosion);
  scorePopups.forEach(drawScorePopup);
  drawSlingshot();
  drawUI();

  if (gameOver) {
    drawGameOver();
  } else if (!gameStarted) {
    drawStartScreen();
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function resetGame() {
  score = 0;
  lives = 4;
  flowerAlive = [true, true, true, true];
  gameOver = false;
  bombs = [];
  projectiles = [];
  explosions = [];
  scorePopups = [];
  frameCount = 0;
  dragging = false;
  dragStart = null;
  dragCurrent = null;
  
  // Reset wave system
  currentWave = 0;
  waveTimer = 0;
  interWaveTimer = 0;
  isInterWave = true; // Start with a break to let player prepare
  interWaveDuration = 180; // 3 seconds to start
  bombsSpawnedThisWave = 0;
  totalBombsThisWave = 0;
  waveSpawnSchedule = [];
}

// --- Input Handling ---

function handleStart(e) {
  const gp = toGame(e.touches[0].clientX, e.touches[0].clientY);

  if (!gameStarted) {
    // START 按钮检测 - 使用 sx 缩放后的尺寸 (140x44)
    const btnW = 140;
    const btnH = 44;
    if (gp.x > W / 2 - btnW / 2 && gp.x < W / 2 + btnW / 2 && 
        gp.y > H / 2 + 80 && gp.y < H / 2 + 80 + btnH) {
      gameStarted = true;
      resetGame();
    }
    return;
  }

  if (gameOver) {
    // PLAY AGAIN 按钮检测 - 使用 sx 缩放后的尺寸 (140x40)
    const btnW = 140;
    const btnH = 40;
    const boxH = 240; // 与 drawGameOver 中一致
    const btnTop = H / 2 - boxH / 2 + boxH * 0.78;
    if (gp.x > W / 2 - btnW / 2 && gp.x < W / 2 + btnW / 2 && 
        gp.y > btnTop && gp.y < btnTop + btnH) {
      resetGame();
    }
    return;
  }

  // 允许在屏幕任何位置开始拖拽（除了UI按钮区域）
  dragging = true;
  dragStart = gp;
  dragCurrent = gp;
}

function handleMove(e) {
  if (!dragging) return;
  dragCurrent = toGame(e.touches[0].clientX, e.touches[0].clientY);
}

function handleEnd(e) {
  if (!dragging) return;
  fireProjectile();
  dragging = false;
  dragStart = null;
  dragCurrent = null;
}

// 监听触摸事件
wx.onTouchStart(handleStart);
wx.onTouchMove(handleMove);
wx.onTouchEnd(handleEnd);

// 启动：先加载资源，再开始游戏
loadResources().then(() => {
  console.log('资源加载完成，启动游戏');
});

gameLoop();
