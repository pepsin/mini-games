// Game Configuration - Constants and screen setup

// Get system info
const systemInfo = wx.getSystemInfoSync();
const screenWidth = systemInfo.windowWidth;
const screenHeight = systemInfo.windowHeight;

// Game dimensions - maintain 450:900 aspect ratio
const W = 450;
const H = 900;
const GROUND_Y = 820;

// Calculate scale and offsets
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function updateScale() {
  const ratio = W / H;
  const screenRatio = screenWidth / screenHeight;
  
  if (screenRatio > ratio) {
    // Screen is wider (iPad): fit to height
    scale = screenHeight / H;
    offsetX = (screenWidth - W * scale) / 2;
    offsetY = 0;
  } else {
    // Screen is taller (full screen phone): fit to width
    scale = screenWidth / W;
    offsetX = 0;
    offsetY = (screenHeight - H * scale) / 2;
  }
}
updateScale();

// Coordinate transform functions
function sx(x) { return x * scale + offsetX; }
function sy(y) { return y * scale + offsetY; }
function ss(size) { return size * scale; }
function toGame(cx, cy) {
  return {
    x: (cx - offsetX) / scale,
    y: (cy - offsetY) / scale
  };
}

// 8-color palette for placeholders
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

// Resource color mapping
const RESOURCE_COLORS = {
  bomb: 0,        // CORAL
  parachute: 4,   // CREAM
  flower: 5,      // PLUM
  cloud: 2,       // SKY
  rainbow: 6,     // SEAFOAM
  slingshot: 1,   // TEAL
  background: 3,  // MINT
  sun: 7          // LEMON
};

// Cloud variant colors
const CLOUD_VARIANT_COLORS = {
  small: 2,   // SKY
  medium: 3,  // MINT
  large: 7    // LEMON
};

// Flower colors
const FLOWER_COLOR_MAP = ['#FF6B6B', '#DDA0DD', '#F7DC6F', '#DDA0DD'];

// Slingshot config
const SLING_CONFIG = {
  x: W / 2,
  y: GROUND_Y,
  prongW: 0,
  prongH: 100,
  maxDrag: 300
};

// Flower config
const FLOWER_CONFIG = {
  hitRadius: 50,
  defaultPositions: [
    { x: 90, y: GROUND_Y - 10 },
    { x: 180, y: GROUND_Y - 10 },
    { x: 270, y: GROUND_Y - 10 },
    { x: 360, y: GROUND_Y - 10 }
  ]
};

module.exports = {
  W, H, GROUND_Y,
  screenWidth, screenHeight,
  scale, offsetX, offsetY,
  sx, sy, ss, toGame,
  updateScale,
  COLOR_PALETTE,
  RESOURCE_COLORS,
  CLOUD_VARIANT_COLORS,
  FLOWER_COLOR_MAP,
  SLING_CONFIG,
  FLOWER_CONFIG
};
