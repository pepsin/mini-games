// Projectile Module

const { W, H, sx, sy, ss } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { animationLoader } = require('../animationLoader.js');

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

  // Generate unique ID for this projectile
  const projectileId = Date.now() + Math.random();

  return {
    x: pullX,
    y: pullY,
    vx: vx,
    vy: vy,
    radius: 18,
    gravity: 0.12,
    hits: 0,
    id: projectileId
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

// Check collision with waste
function checkCollision(proj, waste) {
  if (!waste || typeof waste.x !== 'number' || typeof waste.y !== 'number') {
    return false;
  }
  const dx = proj.x - waste.x;
  const dy = proj.y - waste.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < proj.radius + waste.radius + 5;
}

// Draw projectile
function drawProjectile(ctx, proj, frameCount = 0) {
  const px = sx(proj.x), py = sy(proj.y), r = ss(proj.radius);
  
  // Dragon bullet: draw as animated fireball sprite sheet
  if (proj.isDragonBullet) {
    const fireballRes = getResource('fireball');
    
    if (fireballRes && fireballRes.frames && fireballRes.frames.length > 0) {
      // Calculate animation frame based on global frameCount (6 fps = every 10 frames)
      const animFrame = Math.floor(frameCount / 10) % fireballRes.frames.length;
      
      // Get current frame from sprite sheet
      const frame = fireballRes.frames[animFrame];
      if (frame && frame.image) {
        // Draw the sprite frame - use actual projectile radius (diameter = r * 2)
        // Dragon bullets have larger radius (W/3 = 150) vs normal (18), so visual scales accordingly
        const displaySize = r * 2;
        
        // Save context for rotation
        ctx.save();
        
        // Move to center position and rotate based on velocity direction
        ctx.translate(px, py);
        const angle = Math.atan2(proj.vy, proj.vx);
        ctx.rotate(angle * 3);
        
        // Draw centered (offset by -displaySize/2 to center the image)
        ctx.drawImage(
          frame.image,
          frame.sx, frame.sy, frame.sw, frame.sh,
          -displaySize / 2, -displaySize / 2,
          displaySize, displaySize
        );
        
        ctx.restore();
      }
    } else {
      // Fallback: programmatic fireball if sprite not loaded      
      // Core fireball
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      const fireGrad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
      fireGrad.addColorStop(0, '#FFFF00');
      fireGrad.addColorStop(0.3, '#FF8800');
      fireGrad.addColorStop(0.7, '#FF4400');
      fireGrad.addColorStop(1, '#AA0000');
      ctx.fillStyle = fireGrad;
      ctx.fill();
    }
    
    // Fire trail
    ctx.globalAlpha = 0.5;
    for (let i = 1; i <= 5; i++) {
      const trailR = r * (1 - i * 0.15);
      ctx.beginPath();
      ctx.arc(sx(proj.x - proj.vx * i * 2), sy(proj.y - proj.vy * i * 2), trailR, 0, Math.PI * 2);
      const trailGrad = ctx.createRadialGradient(
        sx(proj.x - proj.vx * i * 2), sy(proj.y - proj.vy * i * 2), 0,
        sx(proj.x - proj.vx * i * 2), sy(proj.y - proj.vy * i * 2), trailR
      );
      trailGrad.addColorStop(0, 'rgba(255, 200, 0, 0.6)');
      trailGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
      ctx.fillStyle = trailGrad;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // Normal projectile
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
}

module.exports = {
  createProjectile,
  updateProjectile,
  isOutOfBounds,
  checkCollision,
  drawProjectile
};
