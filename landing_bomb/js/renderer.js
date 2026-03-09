// Rendering Utilities Module

const { COLOR_PALETTE, sx, sy, ss } = require('./config.js');

/**
 * Draw image maintaining aspect ratio
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Image} img - Image object
 * @param {number} x - Game X coordinate (center point)
 * @param {number} y - Game Y coordinate (center point)
 * @param {number} targetWidth - Target width in game coordinates (0 for original size)
 * @param {number} anchorX - Anchor X (0-1)
 * @param {number} anchorY - Anchor Y (0-1)
 * @returns {Object|null} Drawn dimensions {width, height} or null if failed
 */
function drawImageProportional(ctx, img, x, y, targetWidth, anchorX = 0.5, anchorY = 0.5) {
  if (!img || img.width === 0 || img.height === 0) {
    return null;
  }
  
  const originalWidth = img.width;
  const originalHeight = img.height;
  const aspectRatio = originalWidth / originalHeight;
  
  let drawWidth, drawHeight;
  
  if (targetWidth > 0) {
    drawWidth = ss(targetWidth);
    drawHeight = drawWidth / aspectRatio;
  } else {
    drawWidth = originalWidth * ss(1);
    drawHeight = originalHeight * ss(1);
  }
  
  const drawX = sx(x) - drawWidth * anchorX;
  const drawY = sy(y) - drawHeight * anchorY;
  
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  
  return { width: drawWidth, height: drawHeight };
}

/**
 * Draw placeholder rectangle when image is not available
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Game X coordinate
 * @param {number} y - Game Y coordinate
 * @param {number} w - Width in game coordinates
 * @param {number} h - Height in game coordinates
 * @param {string} label - Label text
 * @param {number} colorIndex - Color palette index
 * @param {number} anchorX - Anchor X (0-1)
 * @param {number} anchorY - Anchor Y (0-1)
 */
function drawPlaceholder(ctx, x, y, w, h, label, colorIndex, anchorX = 0.5, anchorY = 0.5) {
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
  const drawW = ss(w);
  const drawH = ss(h);
  const drawX = sx(x) - drawW * anchorX;
  const drawY = sy(y) - drawH * anchorY;
  
  // Background
  ctx.fillStyle = color.bg;
  ctx.fillRect(drawX, drawY, drawW, drawH);
  
  // Border
  ctx.strokeStyle = color.text;
  ctx.lineWidth = Math.max(2, ss(2));
  ctx.strokeRect(drawX, drawY, drawW, drawH);
  
  // X pattern
  ctx.beginPath();
  ctx.moveTo(drawX, drawY);
  ctx.lineTo(drawX + drawW, drawY + drawH);
  ctx.moveTo(drawX + drawW, drawY);
  ctx.lineTo(drawX, drawY + drawH);
  ctx.strokeStyle = color.text + '40';
  ctx.stroke();
  
  // Text
  ctx.fillStyle = color.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const fontSize = Math.min(drawW / 3, drawH / 2, ss(16));
  ctx.font = `bold ${fontSize}px Arial`;
  
  if (label.length > 4 && drawW < ss(60)) {
    const mid = Math.ceil(label.length / 2);
    ctx.fillText(label.slice(0, mid), drawX + drawW / 2, drawY + drawH / 2 - fontSize * 0.3);
    ctx.fillText(label.slice(mid), drawX + drawW / 2, drawY + drawH / 2 + fontSize * 0.7);
  } else {
    ctx.fillText(label, drawX + drawW / 2, drawY + drawH / 2);
  }
}

module.exports = {
  drawImageProportional,
  drawPlaceholder
};
