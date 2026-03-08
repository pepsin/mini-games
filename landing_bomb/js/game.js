// Bob-omb Squad - 微信小游戏版本

// 获取画布和上下文
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

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
    // 屏幕更宽，以高度为基准
    scaleY = screenHeight / H;
    scaleX = scaleY;
    offsetX = (screenWidth - W * scaleX) / 2;
    offsetY = 0;
  } else {
    // 屏幕更高，以宽度为基准
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

// Game state
let score = 0;
let highScore = 0;
let lives = 4;
let gameOver = false;
let gameStarted = false;
let bombs = [];
let projectiles = [];
let explosions = [];
let clouds = [];
let particles = [];
let spawnTimer = 0;
let spawnInterval = 120;
let difficulty = 0;
let frameCount = 0;

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
const maxDrag = 120;

// Initialize clouds
for (let i = 0; i < 6; i++) {
  clouds.push({
    x: Math.random() * W,
    y: 40 + Math.random() * 120,
    w: 60 + Math.random() * 80,
    speed: 0.15 + Math.random() * 0.3
  });
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

function drawRainbow() {
  const cx = sx(80), cy = sy(140);
  const colors = ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#4B0082','#9400D3'];
  for (let i = colors.length - 1; i >= 0; i--) {
    ctx.beginPath();
    ctx.arc(cx, cy, sx(70 + i * 6), Math.PI, 0, false);
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = sx(6);
    ctx.globalAlpha = 0.4;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawCloud(cloud) {
  const x = sx(cloud.x), y = sy(cloud.y), w = sx(cloud.w);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.5, w * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x - w * 0.25, y + w * 0.05, w * 0.3, w * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w * 0.25, y + w * 0.05, w * 0.35, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w * 0.05, y - w * 0.12, w * 0.3, w * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
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

function drawFlower(x, y, petalColor, alive) {
  const fx = sx(x), fy = sy(y), r = sx(9);
  ctx.strokeStyle = alive ? '#2E7D32' : '#8B7355';
  ctx.lineWidth = sx(3);
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx, fy + sy(25));
  ctx.stroke();
  ctx.fillStyle = alive ? '#388E3C' : '#A0926B';
  ctx.beginPath();
  ctx.ellipse(fx - sx(6), fy + sy(14), sx(7), sx(3), -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(fx + sx(6), fy + sy(18), sx(7), sx(3), 0.4, 0, Math.PI * 2);
  ctx.fill();
  if (alive) {
    ctx.fillStyle = petalColor;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(a) * r, fy + Math.sin(a) * r, r * 0.65, r * 0.45, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.fillStyle = '#996600';
    ctx.beginPath();
    ctx.arc(fx - r * 0.15, fy - r * 0.1, sx(1.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + r * 0.15, fy - r * 0.1, sx(1.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx, fy + r * 0.05, r * 0.2, 0, Math.PI);
    ctx.strokeStyle = '#996600';
    ctx.lineWidth = sx(0.8);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#888';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(a) * r * 0.7, fy + Math.sin(a) * r * 0.7 + sx(2), r * 0.45, r * 0.3, a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#A09060';
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(fx - r * 0.12, fy - r * 0.08, sx(1), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + r * 0.12, fy - r * 0.08, sx(1), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx, fy + r * 0.2, r * 0.15, Math.PI, 0);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = sx(0.8);
    ctx.stroke();
  }
}

const healthFlowerColors = ['#FF5252', '#FF4081', '#FFAB40', '#E040FB'];
const healthFlowerPositions = [90, 180, 270, 360];
let flowerAlive = [true, true, true, true];
const flowerHitRadius = 50;

function drawHealthFlowers() {
  for (let i = 0; i < 4; i++) {
    drawFlower(healthFlowerPositions[i], H - 92, healthFlowerColors[i], flowerAlive[i]);
  }
}

function drawSlingshot() {
  const x = sx(sling.x), y = sy(sling.y);
  const pw = sx(sling.prongW), ph = sy(sling.prongH);
  const baseW = sx(20), baseH = sy(15);
  const gap = sx(18);

  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x - baseW / 2, y, baseW, baseH);
  ctx.fillStyle = '#A0522D';
  ctx.beginPath();
  ctx.moveTo(x - gap - pw / 2, y - ph);
  ctx.lineTo(x - gap + pw / 2, y - ph);
  ctx.lineTo(x - gap / 2 + pw / 2, y);
  ctx.lineTo(x - gap / 2 - pw / 2, y);
  ctx.fill();
  ctx.strokeStyle = '#6B3410';
  ctx.lineWidth = sx(1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + gap - pw / 2, y - ph);
  ctx.lineTo(x + gap + pw / 2, y - ph);
  ctx.lineTo(x + gap / 2 + pw / 2, y);
  ctx.lineTo(x + gap / 2 - pw / 2, y);
  ctx.fillStyle = '#A0522D';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#D2691E';
  ctx.beginPath();
  ctx.arc(x - gap, y - ph, sx(7), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + gap, y - ph, sx(7), 0, Math.PI * 2);
  ctx.fill();

  const leftTip = { x: sling.x - 18, y: sling.y - sling.prongH };
  const rightTip = { x: sling.x + 18, y: sling.y - sling.prongH };

  if (dragging && dragCurrent) {
    const dx = dragCurrent.x - sling.x;
    const dy = dragCurrent.y - sling.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampDist = Math.min(dist, maxDrag);
    const angle = Math.atan2(dy, dx);
    const pullX = sling.x + Math.cos(angle) * clampDist;
    const pullY = sling.y + Math.sin(angle) * clampDist;

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

    const aimX = sling.x - (pullX - sling.x);
    const aimY = sling.y - (pullY - sling.y);
    ctx.setLineDash([sx(4), sx(4)]);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = sx(1);
    ctx.beginPath();
    ctx.moveTo(sx(sling.x), sy(sling.y));
    ctx.lineTo(sx(aimX), sy(aimY));
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = sx(4);
    ctx.beginPath();
    ctx.moveTo(sx(leftTip.x), sy(leftTip.y));
    ctx.quadraticCurveTo(sx(sling.x), sy(sling.y - sling.prongH + 20), sx(rightTip.x), sy(rightTip.y));
    ctx.stroke();
  }
}

function drawParachute(x, y, radius) {
  const px = sx(x), py = sy(y), r = sx(radius);
  const canopyY = py - r * 2.5;
  const canopyR = r * 2.2;

  ctx.beginPath();
  ctx.arc(px, canopyY, canopyR, Math.PI, 0, false);
  ctx.fillStyle = '#FF4444';
  ctx.fill();
  ctx.strokeStyle = '#CC0000';
  ctx.lineWidth = sx(1.5);
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(px, canopyY, canopyR, Math.PI, Math.PI + Math.PI / 4, false);
  ctx.lineTo(px, canopyY);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(px, canopyY, canopyR, Math.PI + Math.PI / 2, Math.PI + Math.PI * 3 / 4, false);
  ctx.lineTo(px, canopyY);
  ctx.fill();

  ctx.strokeStyle = '#888';
  ctx.lineWidth = sx(1);
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI + (i / 3) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(angle) * canopyR, canopyY + Math.sin(angle) * canopyR * 0.3);
    ctx.lineTo(px, py - r * 0.5);
    ctx.stroke();
  }
}

function drawBomb(bomb) {
  if (bomb.exploding) return;
  const bx = sx(bomb.x), by = sy(bomb.y), r = sx(bomb.radius);

  drawParachute(bomb.x, bomb.y, bomb.radius);

  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.3, r * 0.1, bx, by, r);
  grad.addColorStop(0, '#555');
  grad.addColorStop(1, '#111');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = sx(1.5);
  ctx.stroke();

  ctx.fillStyle = '#888';
  ctx.fillRect(bx - sx(3), by - r - sy(3), sx(6), sy(6));

  const fuseX = bomb.x, fuseY = bomb.y - bomb.radius - 5;
  const sparkPhase = (frameCount * 0.2) % 1;
  ctx.beginPath();
  ctx.arc(sx(fuseX), sy(fuseY - 3), sx(3 + sparkPhase * 2), 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, ${150 + Math.random() * 100}, 0, ${0.7 + sparkPhase * 0.3})`;
  ctx.fill();

  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.ellipse(bx - r * 0.3, by - r * 0.15, r * 0.15, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bx + r * 0.3, by - r * 0.15, r * 0.15, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(bx - r * 0.3, by - r * 0.1, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx + r * 0.3, by - r * 0.1, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = sx(1.5);
  ctx.beginPath();
  ctx.arc(bx, by + r * 0.2, r * 0.3, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
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

  if (exp.points) {
    ctx.fillStyle = `rgba(255,255,255,${1 - progress})`;
    ctx.font = `bold ${sx(18)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`+${exp.points}`, cx, cy - sy(20 + progress * 30));
  }
}

function drawUI() {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(sx(10), sy(10), sx(150), sy(30));
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = sx(2);
  ctx.strokeRect(sx(10), sy(10), sx(150), sy(30));
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${sx(15)}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score}`, sx(18), sy(30));

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(sx(W - 170), sy(10), sx(160), sy(30));
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = sx(2);
  ctx.strokeRect(sx(W - 170), sy(10), sx(160), sy(30));
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${sx(13)}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillText(`HI-SCORE: ${highScore}`, sx(W - 160), sy(30));
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bx = sx(W / 2 - 160), by = sy(H / 2 - 120), bw = sx(320), bh = sy(240);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = sx(3);
  ctx.strokeRect(bx, by, bw, bh);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF4444';
  ctx.font = `bold ${sx(32)}px Arial`;
  ctx.fillText('GAME OVER', sx(W / 2), sy(H / 2 - 60));

  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${sx(20)}px Arial`;
  ctx.fillText(`Score: ${score}`, sx(W / 2), sy(H / 2 - 10));

  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${sx(16)}px Arial`;
  ctx.fillText(`High Score: ${highScore}`, sx(W / 2), sy(H / 2 + 25));

  if (score >= highScore && score > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${sx(14)}px Arial`;
    ctx.fillText('NEW HIGH SCORE!', sx(W / 2), sy(H / 2 + 55));
  }

  ctx.fillStyle = '#4CAF50';
  const btnX = sx(W / 2 - 70), btnY = sy(H / 2 + 70), btnW = sx(140), btnH = sy(36);
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = '#388E3C';
  ctx.lineWidth = sx(2);
  ctx.strokeRect(btnX, btnY, btnW, btnH);
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${sx(16)}px Arial`;
  ctx.fillText('PLAY AGAIN', sx(W / 2), sy(H / 2 + 94));
}

function drawStartScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${sx(34)}px Arial`;
  ctx.fillText('BOB-OMB SQUAD', sx(W / 2), sy(H / 2 - 80));

  ctx.fillStyle = '#FFF';
  ctx.font = `${sx(13)}px Arial`;
  ctx.fillText('Drag the slingshot to aim and release to fire!', sx(W / 2), sy(H / 2 - 35));
  ctx.fillText('Hit the bombs before they land!', sx(W / 2), sy(H / 2 - 10));

  ctx.beginPath();
  ctx.arc(sx(W / 2), sy(H / 2 + 40), sx(15), 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(sx(W / 2), sy(H / 2 + 28), sx(4), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FF5722';
  const btnX = sx(W / 2 - 70), btnY = sy(H / 2 + 80), btnW = sx(140), btnH = sy(40);
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = '#E64A19';
  ctx.lineWidth = sx(2);
  ctx.strokeRect(btnX, btnY, btnW, btnH);
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${sx(20)}px Arial`;
  ctx.fillText('START', sx(W / 2), sy(H / 2 + 106));
}

// --- Game Logic ---

function spawnBomb() {
  const radius = 14 + Math.random() * 4;
  bombs.push({
    x: 40 + Math.random() * (W - 80),
    y: -40,
    radius: radius,
    speed: 0.6 + Math.random() * 0.5 + difficulty * 0.05,
    sway: Math.random() * 0.3,
    swayOffset: Math.random() * Math.PI * 2,
    exploding: false
  });
}

function createExplosion(x, y, points) {
  const particles = [];
  const colors = [
    { r: 255, g: 100, b: 0 },
    { r: 255, g: 200, b: 0 },
    { r: 255, g: 50, b: 0 },
    { r: 255, g: 255, b: 100 },
    { r: 200, g: 50, b: 0 },
  ];
  for (let i = 0; i < 20; i++) {
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
  explosions.push({ x, y, frame: 0, maxFrames: 40, particles, points });
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
  const dx = dragCurrent.x - sling.x;
  const dy = dragCurrent.y - sling.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const clampDist = Math.min(dist, maxDrag);
  if (clampDist < 10) return;

  const angle = Math.atan2(dy, dx);
  const pullX = sling.x + Math.cos(angle) * clampDist;
  const pullY = sling.y + Math.sin(angle) * clampDist;

  const vx = -(pullX - sling.x) * 0.18;
  const vy = -(pullY - sling.y) * 0.18;

  projectiles.push({
    x: sling.x,
    y: sling.y - sling.prongH,
    vx: vx,
    vy: vy,
    radius: 12,
    gravity: 0.12
  });
}

function update() {
  if (gameOver || !gameStarted) return;
  frameCount++;

  clouds.forEach(c => {
    c.x += c.speed;
    if (c.x > W + c.w) c.x = -c.w;
  });

  spawnTimer++;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnBomb();
  }

  if (frameCount % 600 === 0) {
    difficulty++;
    spawnInterval = Math.max(40, 120 - difficulty * 10);
  }

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

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;

    if (p.x < -50 || p.x > W + 50 || p.y < -100 || p.y > H + 50) {
      projectiles.splice(i, 1);
      continue;
    }

    for (let j = bombs.length - 1; j >= 0; j--) {
      const b = bombs[j];
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < p.radius + b.radius + 5) {
        const points = 100 + Math.floor((H - 80 - b.y) / H * 100);
        score += points;
        createExplosion(b.x, b.y, points);
        bombs.splice(j, 1);
      }
    }
  }

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
  spawnTimer = 0;
  spawnInterval = 120;
  difficulty = 0;
  frameCount = 0;
  dragging = false;
  dragStart = null;
  dragCurrent = null;
}

// --- Input Handling ---

function handleStart(e) {
  const gp = toGame(e.touches[0].clientX, e.touches[0].clientY);

  if (!gameStarted) {
    if (gp.x > W / 2 - 70 && gp.x < W / 2 + 70 && gp.y > H / 2 + 80 && gp.y < H / 2 + 120) {
      gameStarted = true;
      resetGame();
    }
    return;
  }

  if (gameOver) {
    if (gp.x > W / 2 - 70 && gp.x < W / 2 + 70 && gp.y > H / 2 + 70 && gp.y < H / 2 + 106) {
      resetGame();
    }
    return;
  }

  if (gp.y > H * 0.5) {
    dragging = true;
    dragStart = gp;
    dragCurrent = gp;
  }
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

// 启动游戏循环
gameLoop();
