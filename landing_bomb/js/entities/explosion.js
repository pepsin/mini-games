// Explosion and Score Popup Module

const { sx, sy, ss } = require('../config.js');

// Explosion color palettes
const EXPLOSION_COLORS = {
  fast: [
    { r: 100, g: 200, b: 255 },
    { r: 50, g: 150, b: 255 },
    { r: 200, g: 230, b: 255 }
  ],
  tank: [
    { r: 150, g: 50, b: 50 },
    { r: 100, g: 30, b: 30 },
    { r: 200, g: 100, b: 100 }
  ],
  cluster: [
    { r: 255, g: 100, b: 255 },
    { r: 200, g: 50, b: 200 },
    { r: 255, g: 200, b: 255 }
  ],
  normal: [
    { r: 255, g: 100, b: 0 },
    { r: 255, g: 200, b: 0 },
    { r: 255, g: 50, b: 0 },
    { r: 255, g: 255, b: 100 },
    { r: 200, g: 50, b: 0 }
  ]
};

// Create explosion
function createExplosion(x, y, bombType = 'normal') {
  const particles = [];
  const colors = EXPLOSION_COLORS[bombType] || EXPLOSION_COLORS.normal;
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
  
  return {
    x, y,
    frame: 0,
    maxFrames: 40,
    particles
  };
}

// Create ground explosion
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
  
  return {
    x, y,
    frame: 0,
    maxFrames: 30,
    particles
  };
}

// Create score popup
function createScorePopup(x, y, combo) {
  return {
    x, y,
    combo,
    baseScore: 100,
    totalScore: 100 * combo,
    frame: 0,
    maxFrames: 50
  };
}

// Draw explosion
function drawExplosion(ctx, exp) {
  const progress = exp.frame / exp.maxFrames;
  const cx = sx(exp.x), cy = sy(exp.y);

  if (progress < 0.3) {
    const flashR = ss(40) * (progress / 0.3);
    const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
    flashGrad.addColorStop(0, 'rgba(255,255,200,0.8)');
    flashGrad.addColorStop(1, 'rgba(255,200,50,0)');
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
    ctx.fill();
  }

  exp.particles.forEach(p => {
    const px = cx + ss(p.vx * exp.frame);
    const py = cy + ss(p.vy * exp.frame);
    const alpha = 1 - progress;
    const size = ss(p.size) * (1 - progress * 0.5);
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
    ctx.fill();
  });
}

// Draw score popup
function drawScorePopup(ctx, popup) {
  const progress = popup.frame / popup.maxFrames;
  const cx = sx(popup.x);
  const cy = sy(popup.y - 20 - progress * 30);
  
  const scale = 1.5 - progress * 0.8;
  let alpha = 1;
  if (progress > 0.5) {
    alpha = 1 - (progress - 0.5) * 2;
  }
  
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  
  const comboScale = scale * (1 + (popup.combo - 1) * 0.2);
  const fontSize = Math.floor(sx(24) * comboScale);
  ctx.font = `bold ${fontSize}px Arial`;
  
  const totalScore = popup.combo * 100;
  ctx.fillText(`+${totalScore}`, cx, cy);
  
  ctx.restore();
}

module.exports = {
  createExplosion,
  createGroundExplosion,
  createScorePopup,
  drawExplosion,
  drawScorePopup
};
