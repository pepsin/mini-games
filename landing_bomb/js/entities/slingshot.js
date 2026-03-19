// Slingshot Module

const { W, GROUND_Y, SLING_CONFIG, sx, sy, ss, isDevTools } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional, drawPlaceholder } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');

// Slingshot state
const sling = {
  x: SLING_CONFIG.x,
  y: SLING_CONFIG.y,
  prongW: SLING_CONFIG.prongW,
  prongH: SLING_CONFIG.prongH
};

// Drag state
let dragging = false;
let dragStart = null;
let dragCurrent = null;

// Charge feedback state
let chargeLevel = 0; // 0-1, represents charge intensity
let lastVibrationTime = 0;
const VIBRATION_INTERVAL = 50; // ms between vibrations

// Get charge level (0-1)
function getChargeLevel() { return chargeLevel; }

// Calculate charge level based on drag distance
function updateChargeLevel() {
  if (!dragging || !dragCurrent || !dragStart) {
    chargeLevel = 0;
    return;
  }
  
  const pivotX = sling.x;
  const pivotY = sling.y - sling.prongH;
  const dx = dragCurrent.x - pivotX;
  const dy = dragCurrent.y - pivotY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const clampDist = Math.min(dist, SLING_CONFIG.maxDrag);
  
  // Calculate charge level (0-1)
  chargeLevel = Math.min(clampDist / SLING_CONFIG.maxDrag, 1);
  
  // Trigger vibration feedback (skip in developer tools)
  const now = Date.now();
  if (!isDevTools && now - lastVibrationTime > VIBRATION_INTERVAL) {
    // Vibration intensity increases with charge level
    if (chargeLevel > 0.3) {
      const intensity = Math.floor(chargeLevel * 100);
      wx.vibrateShort({ type: 'light' });
    }
    lastVibrationTime = now;
  }
}

// Update slingshot position from resources
function updateSlingshotPosition() {
  const slingshotRes = getResource('slingshot');
  if (slingshotRes?.config?.position) {
    const pos = slingshotRes.config.position;
    sling.x = pos.x !== undefined ? pos.x : W / 2;
    sling.y = pos.y !== undefined ? pos.y : GROUND_Y;
  }
}

// Get drag state
function isDragging() { return dragging; }
function getDragStart() { return dragStart; }
function getDragCurrent() { return dragCurrent; }
function getSlingshot() { return sling; }

// Set drag state
function setDragging(value) { 
  dragging = value; 
  if (!value) chargeLevel = 0;
}
function setDragStart(pos) { dragStart = pos; }
function setDragCurrent(pos) { 
  if (pos) {
    dragCurrent = pos;
    updateChargeLevel();
  }
  return dragCurrent;
}
function clearDrag() {
  dragging = false;
  dragStart = null;
  dragCurrent = null;
  chargeLevel = 0;
}

// Draw slingshot body only (no bands)
function drawSlingshotBody(ctx) {
  const slingshotRes = getResource('slingshot');

  if (isResourcesLoaded() && slingshotRes?.image && slingshotRes.image.width > 0) {
    const size = animationLoader.getSize(slingshotRes);
    const anchor = animationLoader.getAnchor(slingshotRes);

    const result = drawImageProportional(
      ctx, slingshotRes.image,
      sling.x, sling.y,
      size.width,
      anchor.x, anchor.y
    );

    if (result) return;
  }

  // Fallback placeholder
  drawPlaceholder(ctx, sling.x, sling.y, 64, 96, 'SLING', 1, 0.5, 1.0);
}

// Draw slingshot bands only
function drawSlingshotBandsOnly(ctx) {
  const pivotX = sling.x;
  const pivotY = sling.y - sling.prongH;
  const slingshotRes = getResource('slingshot');

  let leftTip, rightTip;
  if (isResourcesLoaded() && slingshotRes?.config?.parts) {
    const parts = slingshotRes.config.parts;
    leftTip = { x: sling.x + parts.leftTip.x, y: sling.y + parts.leftTip.y };
    rightTip = { x: sling.x + parts.rightTip.x, y: sling.y + parts.rightTip.y };
  } else {
    leftTip = { x: sling.x - 24, y: sling.y };
    rightTip = { x: sling.x + 24, y: sling.y };
  }

  drawSlingshotBands(ctx, leftTip, rightTip, pivotX, pivotY);
}

// Draw slingshot (body + bands together, for backward compat)
function drawSlingshot(ctx) {
  drawSlingshotBody(ctx);
  drawSlingshotBandsOnly(ctx);
}

// Get band color based on charge level
function getBandColor(charge) {
  // Interpolate from white to red as charge increases
  if (charge < 0.3) {
    return '#ffffff';
  } else if (charge < 0.6) {
    // White to yellow
    const t = (charge - 0.3) / 0.3;
    const r = 255;
    const g = Math.floor(255 * (1 - t) + 255 * t);
    const b = Math.floor(255 * (1 - t));
    return `rgb(${r},${g},${b})`;
  } else if (charge < 0.9) {
    // Yellow to orange
    const t = (charge - 0.6) / 0.3;
    const r = 255;
    const g = Math.floor(255 * (1 - t) + 100 * t);
    const b = 0;
    return `rgb(${r},${g},${b})`;
  } else {
    // Orange to red
    const t = (charge - 0.9) / 0.1;
    const r = 255;
    const g = Math.floor(100 * (1 - t));
    const b = 0;
    return `rgb(${r},${g},${b})`;
  }
}

// Draw slingshot bands
function drawSlingshotBands(ctx, leftTip, rightTip, pivotX, pivotY) {
  if (dragging && dragCurrent) {
    const dx = dragCurrent.x - pivotX;
    const dy = dragCurrent.y - pivotY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Minimum drag distance to show band stretching (prevents flicker on clicks)
    const minShowDistance = 10;
    if (dist < minShowDistance) {
      // Draw relaxed bands (same as not dragging)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = ss(4);
      ctx.beginPath();
      ctx.moveTo(sx(leftTip.x), sy(leftTip.y));
      ctx.quadraticCurveTo(sx(pivotX), sy(pivotY + 20), sx(rightTip.x), sy(rightTip.y));
      ctx.stroke();
      return;
    }
    
    const clampDist = Math.min(dist, SLING_CONFIG.maxDrag);
    const angle = Math.atan2(dy, dx);
    const pullX = pivotX + Math.cos(angle) * clampDist;
    const pullY = pivotY + Math.sin(angle) * clampDist;

    // Get color based on charge level
    const bandColor = getBandColor(chargeLevel);
    
    // Draw bands with glow effect when charged
    if (chargeLevel > 0.5) {
      ctx.save();
      ctx.shadowBlur = ss(10 * chargeLevel);
      ctx.shadowColor = bandColor;
    }
    
    ctx.strokeStyle = bandColor;
    ctx.lineWidth = ss(4 + chargeLevel * 2); // Thicker when charged
    ctx.beginPath();
    ctx.moveTo(sx(leftTip.x), sy(leftTip.y));
    ctx.lineTo(sx(pullX), sy(pullY));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx(rightTip.x), sy(rightTip.y));
    ctx.lineTo(sx(pullX), sy(pullY));
    ctx.stroke();
    
    if (chargeLevel > 0.5) {
      ctx.restore();
    }

    // Draw projectile placeholder with charge glow
    ctx.beginPath();
    ctx.arc(sx(pullX), sy(pullY), ss(8), 0, Math.PI * 2);
    
    // Change projectile color based on charge
    if (chargeLevel > 0.6) {
      const projGrad = ctx.createRadialGradient(
        sx(pullX - 4), sy(pullY - 4), 1,
        sx(pullX), sy(pullY), ss(8)
      );
      projGrad.addColorStop(0, '#ffff00');
      projGrad.addColorStop(0.5, chargeLevel > 0.8 ? '#ff0000' : '#ff8800');
      projGrad.addColorStop(1, '#333');
      ctx.fillStyle = projGrad;
    } else {
      ctx.fillStyle = '#333';
    }
    ctx.fill();
    ctx.strokeStyle = chargeLevel > 0.5 ? bandColor : '#111';
    ctx.lineWidth = ss(1 + chargeLevel);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = ss(4);
    ctx.beginPath();
    ctx.moveTo(sx(leftTip.x), sy(leftTip.y));
    ctx.quadraticCurveTo(sx(pivotX), sy(pivotY + 20), sx(rightTip.x), sy(rightTip.y));
    ctx.stroke();
  }
}

// Draw trajectory prediction line
function drawTrajectoryPrediction(ctx, sling, dragCurrent, maxDrag) {
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
  
  // Get slingshot tips
  const slingshotRes = getResource('slingshot');
  let leftTip, rightTip;
  if (isResourcesLoaded() && slingshotRes?.config?.parts) {
    const parts = slingshotRes.config.parts;
    leftTip = { x: sling.x + parts.leftTip.x, y: sling.y + parts.leftTip.y };
    rightTip = { x: sling.x + parts.rightTip.x, y: sling.y + parts.rightTip.y };
  } else {
    leftTip = { x: sling.x - 24, y: sling.y };
    rightTip = { x: sling.x + 24, y: sling.y };
  }
  
  // Calculate base midpoint
  const baseMidX = (leftTip.x + rightTip.x) / 2;
  const baseMidY = (leftTip.y + rightTip.y) / 2;
  
  // Direction from pull point toward base midpoint
  const dirX = baseMidX - pullX;
  const dirY = baseMidY - pullY;
  const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
  const speed = clampDist * 0.18;
  
  const vx = (dirX / dirLength) * speed;
  const vy = (dirY / dirLength) * speed;
  
  // Simulate trajectory
  const gravity = 0.12;
  const points = [];
  let simX = pullX;
  let simY = pullY;
  let simVx = vx;
  let simVy = vy;
  
  // Simulate 30 frames ahead
  for (let i = 0; i < 30; i++) {
    simX += simVx;
    simY += simVy;
    simVy += gravity;
    
    if (i % 3 === 0) { // Sample every 3rd frame for dotted effect
      points.push({ x: simX, y: simY });
    }
    
    // Stop if below ground
    if (simY > 820) break;
  }
  
  // Draw dotted trajectory line
  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + chargeLevel * 0.4})`;
  ctx.lineWidth = ss(2);
  ctx.setLineDash([ss(8), ss(8)]);
  ctx.lineDashOffset = -Date.now() / 20; // Animate dash
  
  ctx.beginPath();
  ctx.moveTo(sx(pullX), sy(pullY));
  for (const point of points) {
    ctx.lineTo(sx(point.x), sy(point.y));
  }
  ctx.stroke();
  
  // Draw trajectory dots
  ctx.setLineDash([]);
  for (let i = 0; i < points.length; i++) {
    const alpha = 1 - (i / points.length);
    ctx.beginPath();
    ctx.arc(sx(points[i].x), sy(points[i].y), ss(3), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * (0.4 + chargeLevel * 0.4)})`;
    ctx.fill();
  }
  
  ctx.restore();
}

module.exports = {
  sling,
  SLING_CONFIG,
  isDragging,
  getDragStart,
  getDragCurrent,
  getSlingshot,
  getChargeLevel,
  setDragging,
  setDragStart,
  setDragCurrent,
  clearDrag,
  updateSlingshotPosition,
  drawSlingshot,
  drawSlingshotBody,
  drawSlingshotBandsOnly,
  drawSlingshotBands,
  drawTrajectoryPrediction
};
