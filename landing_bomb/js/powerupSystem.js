// Powerup System Module

const { W, H, sx, sy, ss } = require('./config.js');
const { getResource } = require('./resources.js');

// Track time_slow state changes and flash animations
let wasTimeSlowActive = false;
const bombFlashAnimations = new Map(); // bomb -> { frame, maxFrames, type }

// Flash animation constants
const FLASH_MAX_FRAMES = 20;
const FLASH_COLOR = 'rgba(135, 206, 250, 0.8)'; // Light blue flash
const FLASH_RADIUS_MULTIPLIER = 1.5;

// Powerup definitions
const POWERUP_TYPES = {
  time_slow: { color: '#4488FF', glowColor: 'rgba(68,136,255,0.4)', label: '减速', weight: 25, duration: 300 },
  multi_shot: { color: '#FF8800', glowColor: 'rgba(255,136,0,0.4)', label: '散射', weight: 25, duration: 3 },
  explosive: { color: '#FF3333', glowColor: 'rgba(255,51,51,0.4)', label: '爆破', weight: 20, duration: 0 },
  heal: { color: '#FF66AA', glowColor: 'rgba(255,102,170,0.4)', label: '治愈', weight: 15, duration: 0 },
  shield: { color: '#44DDDD', glowColor: 'rgba(68,221,221,0.4)', label: '护盾', weight: 15, duration: 480 }
};

const SPAWN_CHANCE = 0.15;
const POWERUP_RADIUS = 28;

// Track spawn timing: only one powerup at a time, minimum 10 second gap
let lastSpawnTime = -Infinity;
const MIN_SPAWN_INTERVAL = 600; // 10 seconds at 60fps

// Reset spawn timer (call on game restart)
function resetSpawnTimer() {
  lastSpawnTime = -Infinity;
}

// Get time_slow flash animations for bombs
function getBombFlashAnimations() {
  return bombFlashAnimations;
}

// Check if time_slow state changed and trigger flash animations
function updateTimeSlowFlash(activePowerups, bombs) {
  const isTimeSlowActive = isPowerupActive(activePowerups, 'time_slow');
  
  // Time_slow just activated - add flash to all existing bombs
  if (isTimeSlowActive && !wasTimeSlowActive) {
    bombs.forEach(bomb => {
      if (!bomb.exploding) {
        bombFlashAnimations.set(bomb, {
          frame: 0,
          maxFrames: FLASH_MAX_FRAMES,
          type: 'freeze'
        });
      }
    });
  }
  
  // Time_slow just ended - add flash to all existing bombs
  if (!isTimeSlowActive && wasTimeSlowActive) {
    bombs.forEach(bomb => {
      if (!bomb.exploding) {
        bombFlashAnimations.set(bomb, {
          frame: 0,
          maxFrames: FLASH_MAX_FRAMES,
          type: 'unfreeze'
        });
      }
    });
  }
  
  wasTimeSlowActive = isTimeSlowActive;
}

// Update flash animations
function updateFlashAnimations() {
  for (const [bomb, anim] of bombFlashAnimations.entries()) {
    anim.frame++;
    if (anim.frame >= anim.maxFrames) {
      bombFlashAnimations.delete(bomb);
    }
  }
}

// Draw flash effect on a bomb
function drawBombFlash(ctx, bomb, frameCount) {
  const anim = bombFlashAnimations.get(bomb);
  if (!anim) return;
  
  const progress = anim.frame / anim.maxFrames;
  const alpha = Math.sin(progress * Math.PI) * 0.8; // Fade in then out
  const radius = bomb.radius * FLASH_RADIUS_MULTIPLIER * (1 + progress * 0.3);
  
  const px = sx(bomb.x);
  const py = sy(bomb.y);
  
  // Draw expanding light blue circle
  const gradient = ctx.createRadialGradient(px, py, 0, px, py, ss(radius));
  gradient.addColorStop(0, `rgba(135, 206, 250, ${alpha})`);
  gradient.addColorStop(0.5, `rgba(135, 206, 250, ${alpha * 0.5})`);
  gradient.addColorStop(1, 'rgba(135, 206, 250, 0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px, py, ss(radius), 0, Math.PI * 2);
  ctx.fill();
  
  // Draw sparkles
  const sparkleCount = 8;
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (i / sparkleCount) * Math.PI * 2 + frameCount * 0.1;
    const dist = radius * (0.6 + Math.sin(progress * Math.PI * 2 + i) * 0.2);
    const sx_pos = px + Math.cos(angle) * ss(dist);
    const sy_pos = py + Math.sin(angle) * ss(dist);
    const size = ss(3 + Math.sin(progress * Math.PI * 3 + i) * 2);
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx_pos, sy_pos, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Get loaded image for a powerup type (or null if not loaded)
function getPowerupImage(type) {
  const res = getResource('powerup');
  if (res && res.variants && res.variants[type]) {
    return res.variants[type];
  }
  return null;
}

// Weighted random selection
function randomPowerupType() {
  const types = Object.keys(POWERUP_TYPES);
  const totalWeight = types.reduce((sum, t) => sum + POWERUP_TYPES[t].weight, 0);
  let roll = Math.random() * totalWeight;
  for (const t of types) {
    roll -= POWERUP_TYPES[t].weight;
    if (roll <= 0) return t;
  }
  return types[types.length - 1];
}

// Try to spawn a powerup (called on bomb kill)
function trySpawnPowerup(powerups, frameCount) {
  // Only one powerup at a time
  if (powerups.length > 0) return null;
  // Minimum 10 second gap between powerups
  if (frameCount - lastSpawnTime < MIN_SPAWN_INTERVAL) return null;
  if (Math.random() > SPAWN_CHANCE) return null;
  
  const type = randomPowerupType();
  const baseY = 150 + Math.random() * 500;
  const powerup = {
    x: W + 20,
    y: baseY,
    type: type,
    radius: POWERUP_RADIUS,
    vx: -(2 + Math.random() * 1.5),
    baseY: baseY,
    phase: Math.random() * Math.PI * 2,
    glowPhase: 0,
    trail: []
  };
  powerups.push(powerup);
  lastSpawnTime = frameCount;
  return powerup;
}

// Update all flying powerups
function updatePowerups(powerups, frameCount) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.x += p.vx;
    p.phase += 0.05;
    p.y = p.baseY + Math.sin(p.phase) * 30;
    p.glowPhase += 0.08;

    // Add trail particle
    p.trail.push({
      x: p.x + 5 + Math.random() * 6,
      y: p.y + (Math.random() - 0.5) * 10,
      alpha: 0.7,
      size: 2 + Math.random() * 3
    });

    // Update trail particles
    for (let j = p.trail.length - 1; j >= 0; j--) {
      const t = p.trail[j];
      t.alpha -= 0.03;
      t.size *= 0.96;
      t.x += 0.5;
      if (t.alpha <= 0) p.trail.splice(j, 1);
    }

    // Remove if off screen left
    if (p.x < -30) {
      powerups.splice(i, 1);
    }
  }
}

// Check projectile-powerup collision
function checkPowerupCollision(proj, powerup) {
  const dx = proj.x - powerup.x;
  const dy = proj.y - powerup.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < proj.radius + powerup.radius + 5;
}

// Activate a powerup effect
function activatePowerup(type, activePowerups, gameState) {
  const def = POWERUP_TYPES[type];

  if (type === 'heal') {
    // Instant: heal first dead flower
    if (gameState.healFlower) {
      gameState.healFlower();
    }
    return;
  }

  if (type === 'explosive') {
    // Explosive is now instant: explode all bombs on screen
    if (gameState.explodeAllBombs) {
      gameState.explodeAllBombs();
    }
    return;
  }

  // Check if same type already active - refresh it
  for (let i = 0; i < activePowerups.length; i++) {
    if (activePowerups[i].type === type) {
      activePowerups[i].remaining = def.duration;
      return;
    }
  }

  activePowerups.push({ type: type, remaining: def.duration });
}

// Tick active powerups (call once per frame)
function updateActivePowerups(activePowerups) {
  for (let i = activePowerups.length - 1; i >= 0; i--) {
    const ap = activePowerups[i];
    const def = POWERUP_TYPES[ap.type];
    // Frame-based powerups tick down each frame
    if (ap.type === 'time_slow' || ap.type === 'shield') {
      ap.remaining--;
    }
    // Shot-based powerups (multi_shot, explosive) are decremented on use
    if (ap.remaining <= 0) {
      activePowerups.splice(i, 1);
    }
  }
}

// Check if a specific powerup is active
function isPowerupActive(activePowerups, type) {
  return activePowerups.some(ap => ap.type === type);
}

// Get active powerup entry
function getActivePowerup(activePowerups, type) {
  return activePowerups.find(ap => ap.type === type) || null;
}

// Consume one use of a shot-based powerup
function consumePowerupUse(activePowerups, type) {
  const ap = activePowerups.find(a => a.type === type);
  if (ap) {
    ap.remaining--;
    if (ap.remaining <= 0) {
      const idx = activePowerups.indexOf(ap);
      if (idx >= 0) activePowerups.splice(idx, 1);
    }
    return true;
  }
  return false;
}

// Get speed multiplier for bombs
function getSpeedMultiplier(activePowerups) {
  return isPowerupActive(activePowerups, 'time_slow') ? 0.5 : 1.0;
}

// Draw a flying powerup
function drawPowerup(ctx, p) {
  const def = POWERUP_TYPES[p.type];
  const px = sx(p.x), py = sy(p.y), r = ss(p.radius);

  // Draw trail particles
  p.trail.forEach(t => {
    ctx.globalAlpha = t.alpha * 0.5;
    ctx.beginPath();
    ctx.arc(sx(t.x), sy(t.y), ss(t.size), 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Pulsing glow aura
  const glowSize = r * (1.8 + Math.sin(p.glowPhase) * 0.4);
  const glowGrad = ctx.createRadialGradient(px, py, r * 0.5, px, py, glowSize);
  glowGrad.addColorStop(0, def.glowColor);
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(px, py, glowSize, 0, Math.PI * 2);
  ctx.fill();

  // Main circle
  // const mainGrad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 1, px, py, r);
  // mainGrad.addColorStop(0, '#FFFFFF');
  // mainGrad.addColorStop(0.4, def.color);
  // mainGrad.addColorStop(1, def.color);
  // ctx.beginPath();
  // ctx.arc(px, py, r, 0, Math.PI * 2);
  // ctx.fillStyle = mainGrad;
  // ctx.fill();
  // ctx.strokeStyle = '#FFFFFF';
  // ctx.lineWidth = ss(1.5);
  // ctx.stroke();

  // Icon - use image asset if available, otherwise fall back to canvas drawing
  const img = getPowerupImage(p.type);
  if (img && img.width > 0) {
    // Draw the image centered on the powerup
    const imgSize = r;
    ctx.drawImage(img, px - imgSize, py - imgSize, imgSize * 2, imgSize * 2);
  } else {
    // Fallback: programmatic canvas icon
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${ss(14)}px Arial`;
    ctx.fillStyle = '#FFFFFF';

    switch (p.type) {
      case 'time_slow':
        drawIce(ctx, px, py, r);
        break;
      case 'multi_shot':
        drawTripleArrow(ctx, px, py, r);
        break;
      case 'explosive':
        drawFlame(ctx, px, py, r);
        break;
      case 'heal':
        drawHeart(ctx, px, py, r);
        break;
      case 'shield':
        drawShield(ctx, px, py, r);
        break;
    }
    ctx.restore();
  }
}

// Icon drawing helpers
function drawIce(ctx, px, py, r) {
  const s = r * 0.55;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = ss(1.5);
  // Vertical line
  ctx.beginPath();
  ctx.moveTo(px, py - s);
  ctx.lineTo(px, py + s);
  ctx.stroke();
  // Diagonal lines (6-pointed snowflake)
  ctx.beginPath();
  ctx.moveTo(px - s * 0.87, py - s * 0.5);
  ctx.lineTo(px + s * 0.87, py + s * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px - s * 0.87, py + s * 0.5);
  ctx.lineTo(px + s * 0.87, py - s * 0.5);
  ctx.stroke();
  // Small branches on each arm
  const br = s * 0.3;
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const ax = px + Math.cos(angle) * s * 0.55;
    const ay = py - Math.sin(angle) * s * 0.55;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + Math.cos(angle + Math.PI / 3) * br, ay - Math.sin(angle + Math.PI / 3) * br);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + Math.cos(angle - Math.PI / 3) * br, ay - Math.sin(angle - Math.PI / 3) * br);
    ctx.stroke();
  }
}

function drawTripleArrow(ctx, px, py, r) {
  const s = r * 0.5;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = ss(1.5);
  // Center arrow
  ctx.beginPath();
  ctx.moveTo(px - s, py);
  ctx.lineTo(px + s, py);
  ctx.moveTo(px + s * 0.3, py - s * 0.5);
  ctx.lineTo(px + s, py);
  ctx.lineTo(px + s * 0.3, py + s * 0.5);
  ctx.stroke();
  // Top arrow
  ctx.beginPath();
  ctx.moveTo(px - s * 0.5, py - s * 0.9);
  ctx.lineTo(px + s * 0.5, py - s * 0.9);
  ctx.stroke();
  // Bottom arrow
  ctx.beginPath();
  ctx.moveTo(px - s * 0.5, py + s * 0.9);
  ctx.lineTo(px + s * 0.5, py + s * 0.9);
  ctx.stroke();
}

function drawFlame(ctx, px, py, r) {
  const s = r * 0.6;
  ctx.fillStyle = '#FFDD44';
  ctx.beginPath();
  ctx.moveTo(px, py - s);
  ctx.quadraticCurveTo(px + s * 0.8, py - s * 0.3, px + s * 0.5, py + s * 0.5);
  ctx.quadraticCurveTo(px + s * 0.2, py + s * 0.2, px, py + s);
  ctx.quadraticCurveTo(px - s * 0.2, py + s * 0.2, px - s * 0.5, py + s * 0.5);
  ctx.quadraticCurveTo(px - s * 0.8, py - s * 0.3, px, py - s);
  ctx.fill();
}

function drawHeart(ctx, px, py, r) {
  const s = r * 0.5;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(px, py + s * 0.8);
  ctx.bezierCurveTo(px - s * 1.2, py - s * 0.2, px - s * 0.6, py - s * 1.2, px, py - s * 0.4);
  ctx.bezierCurveTo(px + s * 0.6, py - s * 1.2, px + s * 1.2, py - s * 0.2, px, py + s * 0.8);
  ctx.fill();
}

function drawShield(ctx, px, py, r) {
  const s = r * 0.6;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = ss(1.5);
  ctx.beginPath();
  ctx.moveTo(px, py - s);
  ctx.lineTo(px + s * 0.8, py - s * 0.5);
  ctx.lineTo(px + s * 0.7, py + s * 0.3);
  ctx.quadraticCurveTo(px, py + s, px, py + s);
  ctx.quadraticCurveTo(px, py + s, px - s * 0.7, py + s * 0.3);
  ctx.lineTo(px - s * 0.8, py - s * 0.5);
  ctx.closePath();
  ctx.stroke();
}

// Draw powerup pickup burst effect
function createPowerupBurst(x, y, type) {
  const def = POWERUP_TYPES[type];
  const particles = [];
  for (let i = 0; i < 16; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x: 0, y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      alpha: 1,
      color: def.color
    });
  }
  return { x, y, particles, frame: 0, maxFrames: 30 };
}

function drawPowerupBurst(ctx, burst) {
  const progress = burst.frame / burst.maxFrames;
  burst.particles.forEach(p => {
    const px = sx(burst.x + p.vx * burst.frame);
    const py = sy(burst.y + p.vy * burst.frame);
    const alpha = 1 - progress;
    const size = ss(p.size) * (1 - progress * 0.5);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// Draw shield visual effect on flowers when active
function drawShieldEffect(ctx, flowerPositions, flowerAlive, frameCount) {
  const pulse = Math.sin(frameCount * 0.1) * 0.15 + 0.85;
  for (let i = 0; i < 4; i++) {
    if (!flowerAlive[i]) continue;
    const pos = flowerPositions[i];
    const px = sx(pos.x), py = sy(pos.y);
    const r = ss(25 * pulse);

    const grad = ctx.createRadialGradient(px, py, r * 0.3, px, py, r);
    grad.addColorStop(0, 'rgba(68,221,221,0.05)');
    grad.addColorStop(0.7, 'rgba(68,221,221,0.15)');
    grad.addColorStop(1, 'rgba(68,221,221,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(68,221,221,${0.3 + Math.sin(frameCount * 0.1) * 0.15})`;
    ctx.lineWidth = ss(1.5);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

module.exports = {
  POWERUP_TYPES,
  trySpawnPowerup,
  updatePowerups,
  checkPowerupCollision,
  activatePowerup,
  updateActivePowerups,
  isPowerupActive,
  getActivePowerup,
  consumePowerupUse,
  getSpeedMultiplier,
  drawPowerup,
  createPowerupBurst,
  drawPowerupBurst,

  drawShieldEffect,
  randomPowerupType,
  resetSpawnTimer,
  updateTimeSlowFlash,
  updateFlashAnimations,
  drawBombFlash,
  getBombFlashAnimations,
  getPowerupImage
};
