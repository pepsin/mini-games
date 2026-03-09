// SlingshotScene - Player slingshot entity (Godot-style scene)

const { Node2D, Sprite } = require('../index.js');
const { getResource, isResourcesLoaded } = require('../../resources.js');
const { animationLoader } = require('../../animationLoader.js');
const { SLING_CONFIG, sx, sy, ss } = require('../../config.js');

class SlingshotScene extends Node2D {
  constructor(options = {}) {
    super('Slingshot');
    
    this.prongW = options.prongW || 24;
    this.prongH = options.prongH || 40;
    this.maxDrag = options.maxDrag || 80;
    
    // Drag state
    this.dragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
    
    // Setup transform
    this.setPosition(options.x || SLING_CONFIG.x, options.y || SLING_CONFIG.y);
    
    // Sprite placeholder
    this.sprite = new Sprite();
    this.addChild(this.sprite);
  }

  getPivot() {
    return {
      x: this.x,
      y: this.y - this.prongH
    };
  }

  startDrag(pos) {
    this.dragging = true;
    this.dragStart = { ...pos };
    this.dragCurrent = { ...pos };
  }

  updateDrag(pos) {
    if (this.dragging) {
      this.dragCurrent = { ...pos };
    }
  }

  endDrag() {
    const wasDragging = this.dragging;
    this.dragging = false;
    this.dragStart = null;
    const finalDrag = this.dragCurrent;
    this.dragCurrent = null;
    return wasDragging ? finalDrag : null;
  }

  clearDrag() {
    this.dragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
  }

  isDragging() {
    return this.dragging;
  }

  getDragCurrent() {
    return this.dragCurrent;
  }

  _draw(ctx) {
    const slingshotRes = getResource('slingshot');
    let leftTip, rightTip;
    
    if (isResourcesLoaded() && slingshotRes?.image && slingshotRes.image.width > 0) {
      const size = animationLoader.getSize(slingshotRes);
      const anchor = animationLoader.getAnchor(slingshotRes);
      
      const drawWidth = size.width;
      const drawHeight = (slingshotRes.image.height / slingshotRes.image.width) * drawWidth;
      
      ctx.drawImage(slingshotRes.image,
        -drawWidth * anchor.x,
        -drawHeight * anchor.y,
        drawWidth,
        drawHeight
      );
      
      if (slingshotRes.config?.parts) {
        const parts = slingshotRes.config.parts;
        leftTip = { x: parts.leftTip.x, y: parts.leftTip.y };
        rightTip = { x: parts.rightTip.x, y: parts.rightTip.y };
      }
    } else {
      // Fallback placeholder
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(-32, -this.prongH, 64, this.prongH);
      
      leftTip = { x: -this.prongW, y: -this.prongH };
      rightTip = { x: this.prongW, y: -this.prongH };
    }
    
    // Draw bands
    this.drawBands(ctx, leftTip, rightTip);
  }

  drawBands(ctx, leftTip, rightTip) {
    const pivotX = 0;
    const pivotY = -this.prongH;
    
    if (!leftTip) leftTip = { x: -this.prongW, y: -this.prongH };
    if (!rightTip) rightTip = { x: this.prongW, y: -this.prongH };
    
    if (this.dragging && this.dragCurrent) {
      const dx = this.dragCurrent.x - (this.x + pivotX);
      const dy = this.dragCurrent.y - (this.y + pivotY);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampDist = Math.min(dist, this.maxDrag);
      const angle = Math.atan2(dy, dx);
      const pullX = pivotX + Math.cos(angle) * clampDist;
      const pullY = pivotY + Math.sin(angle) * clampDist;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = ss(4);
      ctx.beginPath();
      ctx.moveTo(leftTip.x, leftTip.y);
      ctx.lineTo(pullX, pullY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rightTip.x, rightTip.y);
      ctx.lineTo(pullX, pullY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pullX, pullY, ss(8), 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = ss(1);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = ss(4);
      ctx.beginPath();
      ctx.moveTo(leftTip.x, leftTip.y);
      ctx.quadraticCurveTo(pivotX, pivotY + 20, rightTip.x, rightTip.y);
      ctx.stroke();
    }
  }
}

module.exports = { SlingshotScene };
