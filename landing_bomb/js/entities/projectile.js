// Projectile Module

const { W, H, sx, sy, ss } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');

// Get slingshot tips (same logic as in slingshot.js)
function getSlingshotTips(sling) {
  const slingshotRes = getResource('slingshot');
  
  if (isResourcesLoaded() && slingshotRes?.config?.parts) {
    const parts = slingshotRes.config.parts;
    return {
      leftTip: {
        x: sling.x + parts.leftTip.x,
        y: sling.y + parts.leftTip.y
      },
      rightTip: {
        x: sling.x + parts.rightTip.x,
        y: sling.y + parts.rightTip.y
      }
    };
  }
  
  // Fallback
  return {
    leftTip: { x: sling.x - 24, y: sling.y },
    rightTip: { x: sling.x + 24, y: sling.y }
  };
}

// Create projectile from slingshot drag
function createProjectile(sling, dragCurrent, maxDrag) {
  const pivotX = sling.x;
  const pivotY = sling.y - sling.prongH;
  
  const dx = dragCurrent.x - pivotX;
  const dy = dragCurrent.y - pivotY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const clampDist = Math.min(dist, maxDrag);
  
  if (clampDist < 10) return null;

  const angle = Math.atan2(dy, dx);
  const pullX = pivotX + Math.cos(angle) * clampDist;
  const pullY = pivotY + Math.sin(angle) * clampDist;

  // Get slingshot tips
  const { leftTip, rightTip } = getSlingshotTips(sling);
  
  // Calculate base midpoint (middle of the line between left and right tips)
  const baseMidX = (leftTip.x + rightTip.x) / 2;
  const baseMidY = (leftTip.y + rightTip.y) / 2;
  
  // Direction is from pull point (where bands cross) toward base midpoint
  const dirX = baseMidX - pullX;
  const dirY = baseMidY - pullY;
  
  // Normalize and apply velocity
  const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
  const speed = clampDist * 0.18;
  
  const vx = (dirX / dirLength) * speed;
  const vy = (dirY / dirLength) * speed;

  return {
    x: pullX,
    y: pullY,
    vx: vx,
    vy: vy,
    radius: 12,
    gravity: 0.12,
    hits: 0
  };
}

// Update projectile position
function updateProjectile(proj) {
  proj.x += proj.vx;
  proj.y += proj.vy;
  proj.vy += proj.gravity;
}

// Check if projectile is out of bounds
function isOutOfBounds(proj) {
  return proj.x < -50 || proj.x > W + 50 || proj.y < -100 || proj.y > H + 50;
}

// Check collision with bomb
function checkCollision(proj, bomb) {
  const dx = proj.x - bomb.x;
  const dy = proj.y - bomb.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < proj.radius + bomb.radius + 5;
}

// Draw projectile
function drawProjectile(ctx, proj) {
  const px = sx(proj.x), py = sy(proj.y), r = ss(proj.radius);
  
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 1, px, py, r);
  grad.addColorStop(0, '#777');
  grad.addColorStop(1, '#222');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = ss(1);
  ctx.stroke();

  // Trail effect
  ctx.globalAlpha = 0.3;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(sx(proj.x - proj.vx * i * 2), sy(proj.y - proj.vy * i * 2), r * (1 - i * 0.2), 0, Math.PI * 2);
    ctx.fillStyle = '#555';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

module.exports = {
  createProjectile,
  updateProjectile,
  isOutOfBounds,
  checkCollision,
  drawProjectile
};
