// Slingshot Module

const { W, GROUND_Y, SLING_CONFIG, sx, sy, ss } = require('../config.js');
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
function setDragging(value) { dragging = value; }
function setDragStart(pos) { dragStart = pos; }
function setDragCurrent(pos) { 
  if (pos) dragCurrent = pos;
  return dragCurrent;
}
function clearDrag() {
  dragging = false;
  dragStart = null;
  dragCurrent = null;
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

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = ss(4);
    ctx.beginPath();
    ctx.moveTo(sx(leftTip.x), sy(leftTip.y));
    ctx.lineTo(sx(pullX), sy(pullY));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx(rightTip.x), sy(rightTip.y));
    ctx.lineTo(sx(pullX), sy(pullY));
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sx(pullX), sy(pullY), ss(8), 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = ss(1);
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

module.exports = {
  sling,
  SLING_CONFIG,
  isDragging,
  getDragStart,
  getDragCurrent,
  getSlingshot,
  setDragging,
  setDragStart,
  setDragCurrent,
  clearDrag,
  updateSlingshotPosition,
  drawSlingshot,
  drawSlingshotBody,
  drawSlingshotBandsOnly,
  drawSlingshotBands
};
