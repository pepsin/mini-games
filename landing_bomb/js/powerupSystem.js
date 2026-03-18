// Powerup System Module

const { W, H, sx, sy, ss } = require('./config.js');
const { getResource } = require('./resources.js');
const { ElectricBadge } = require('./components/ElectricBadge.js');
const { addPowerupToInventory, isInventoryFull } = require('./powerupInventory.js');

// Track time_slow state changes and flash animations
let wasTimeSlowActive = false;
const bombFlashAnimations = new Map(); // bomb -> { frame, maxFrames, type }

// Flash animation constants
const FLASH_MAX_FRAMES = 20;
const FLASH_COLOR = 'rgba(135, 206, 250, 0.8)'; // Light blue flash
const FLASH_RADIUS_MULTIPLIER = 1.5;

// Powerup definitions
const POWERUP_TYPES = {
  time_slow: { color: '#719508', glowColor: '#ffffff', label: '减速', weight: 22, duration: 300 },
  multi_shot: { color: '#719508', glowColor: '#ffffff', label: '散射', weight: 22, duration: 3 },
  explosive: { color: '#719508', glowColor: '#ffffff', label: '爆破', weight: 18, duration: 0 },
  heal: { color: '#719508', glowColor: '#ffffff', label: '治愈', weight: 13, duration: 0 },
  shield: { color: '#719508', glowColor: '#ffffff', label: '护盾', weight: 13, duration: 480 },
  dragon_bullet: { color: '#FF4500', glowColor: '#FFD700', label: '火龙', weight: 12, duration: 3 }
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
function randomPowerupType(bombCount = 0) {
  const types = Object.keys(POWERUP_TYPES);
  const isHighBombCount = bombCount > 40;

  // When >40 bombs, prioritize explosive and shield
  let weights = {};
  for (const t of types) {
    weights[t] = POWERUP_TYPES[t].weight;
  }

  if (isHighBombCount) {
    // Double the weight of explosive and shield
    weights['explosive'] *= 2;
    weights['shield'] *= 2;
  }

  const totalWeight = types.reduce((sum, t) => sum + weights[t], 0);
  let roll = Math.random() * totalWeight;
  for (const t of types) {
    roll -= weights[t];
    if (roll <= 0) return t;
  }
  return types[types.length - 1];
}

// Try to spawn a powerup (called on bomb kill)
function trySpawnPowerup(powerups, frameCount, bombCount = 0) {
  // Only one powerup at a time
  if (powerups.length > 0) return null;
  // Minimum 10 second gap between powerups
  if (frameCount - lastSpawnTime < MIN_SPAWN_INTERVAL) return null;
  if (Math.random() > SPAWN_CHANCE) return null;

  const type = randomPowerupType(bombCount);
  const baseX = 50 + Math.random() * (W - 100);
  const powerup = {
    x: baseX,
    y: H + 20,
    type: type,
    radius: POWERUP_RADIUS,
    vx: 0,
    vy: -(1 + Math.random() * 0.5),
    baseX: baseX,
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
    p.y += p.vy;
    p.phase += 0.05;
    p.x = p.baseX + Math.sin(p.phase) * 30;
    p.glowPhase += 0.08;

    // Add trail particle
    p.trail.push({
      x: p.x + (Math.random() - 0.5) * 10,
      y: p.y + 5 + Math.random() * 6,
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

    // Remove if off screen top
    if (p.y < -30) {
      removePowerupBadge(p);
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

// Handle powerup pickup - add to inventory instead of immediate activation
// If inventory is full, trigger immediately
function pickupPowerup(powerup, powerups, index, activePowerups, gameState) {
  // If inventory is full, trigger immediately
  if (isInventoryFull()) {
    activatePowerup(powerup.type, activePowerups, gameState);
    // Remove from flying powerups
    removePowerupBadge(powerup);
    powerups.splice(index, 1);
    return true;
  }
  
  // Add to inventory with fly-in animation
  const success = addPowerupToInventory(powerup.type, powerup.x, powerup.y);
  
  if (success) {
    // Remove from flying powerups
    removePowerupBadge(powerup);
    powerups.splice(index, 1);
  }
  
  return success;
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
    // Shot-based powerups (multi_shot, explosive, dragon_bullet) are decremented on use
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

// Store ElectricBadge instances for each powerup
const powerupBadges = new Map();

// Get or create ElectricBadge for a powerup
function getOrCreateBadge(powerup) {
  if (!powerupBadges.has(powerup)) {
    const def = POWERUP_TYPES[powerup.type];
    const img = getPowerupImage(powerup.type);
    
    // Create badge with demo.html settings
    const badge = new ElectricBadge({
      image: img,
      color: def.color,
      radiusX: 24,
      radiusY: 24,
      x: 0, // Will be updated in draw
      y: 0, // Will be updated in draw
      imageWidth: 40,
      imageHeight: 40,
      coverRadius: 0.2,
      maxLines: 0
    });
    
    powerupBadges.set(powerup, badge);
  }
  return powerupBadges.get(powerup);
}

// Clean up badge when powerup is removed
function removePowerupBadge(powerup) {
  powerupBadges.delete(powerup);
}

// Draw a flying powerup
function drawPowerup(ctx, p, frameCount = 0) {
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

  // Use ElectricBadge to draw the powerup icon
  const img = getPowerupImage(p.type);
  if (img && img.width > 0) {
    const badge = getOrCreateBadge(p);
    // Update badge position and draw
    badge.setPosition(px, py);
    badge.update();
    badge.draw(ctx);
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
  pickupPowerup,
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
