const systemInfo = (typeof wx !== 'undefined') ? wx.getSystemInfoSync() : {
  windowWidth: 375, windowHeight: 812, pixelRatio: 2,
  safeArea: { top: 44, bottom: 812, left: 0, right: 375 }
};

const dpr = systemInfo.pixelRatio || 1;
const screenWidth = systemInfo.windowWidth;
const screenHeight = systemInfo.windowHeight;

// Logical resolution
const W = 450;
const H = 900;

let scale = Math.min(screenWidth / W, screenHeight / H);
let offsetX = (screenWidth - W * scale) / 2;
let offsetY = (screenHeight - H * scale) / 2;

function updateScale() {
  scale = Math.min(screenWidth / W, screenHeight / H);
  offsetX = (screenWidth - W * scale) / 2;
  offsetY = (screenHeight - H * scale) / 2;
}

function sx(x) { return offsetX + x * scale; }
function sy(y) { return offsetY + y * scale; }
function ss(s) { return s * scale; }
function invSx(sx) { return (sx - offsetX) / scale; }
function invSy(sy) { return (sy - offsetY) / scale; }

const COLORS = {
  bg: '#1a1a2e',
  panel: '#16213e',
  accent: '#e94560',
  accentLight: '#ff6b81',
  success: '#4ecdc4',
  gold: '#ffd700',
  text: '#eeeeee',
  textDim: '#aaaaaa',
  wall: '#0f0f23',
  wallBorder: '#2a2a4e',
  path: '#4ecdc4',
  pathHover: '#6ee7df',
  pathVisited: '#ffd700',
  pathLine: 'rgba(255, 215, 0, 0.7)',
  pathLineDone: 'rgba(78, 205, 196, 0.9)',
  endpoint: '#e94560',
  button: '#0f3460',
  buttonHover: '#1a4a7a',
  overlay: 'rgba(0,0,0,0.75)'
};

const FONTS = {
  title: 'bold 36px Arial',
  subtitle: 'bold 24px Arial',
  body: '18px Arial',
  small: '14px Arial',
  tiny: '12px Arial'
};

const moduleExports = {
  W, H, screenWidth, screenHeight, dpr,
  get scale() { return scale; },
  get offsetX() { return offsetX; },
  get offsetY() { return offsetY; },
  updateScale,
  sx, sy, ss, invSx, invSy,
  COLORS, FONTS, systemInfo
};

if (typeof module !== 'undefined' && module.exports) module.exports = moduleExports;
if (typeof window !== 'undefined') {
  window.__modules = window.__modules || {};
  window.__modules['js/config.js'] = moduleExports;
}
