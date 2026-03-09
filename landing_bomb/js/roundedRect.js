// Rounded Rectangle Builder Module
// Supports: border, inner shadow, background color/gradient, padding, text, text alignment, click events

const { sx, sy, ss } = require('./config.js');

// Store clickable elements for hit testing
let clickableElements = [];

/**
 * RoundedRectangle class - Builder pattern for creating styled rounded rectangles
 */
class RoundedRectangle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 100;
    this.height = 50;
    this.radius = 10;
    this.padding = { top: 10, right: 10, bottom: 10, left: 10 };
    
    // Background
    this.backgroundColor = null;
    this.backgroundGradient = null;
    this.opacity = 1;
    
    // Border
    this.borderWidth = 0;
    this.borderColor = '#000000';
    
    // Inner shadow
    this.innerShadow = {
      enabled: false,
      color: 'rgba(0,0,0,0.3)',
      blur: 10,
      offsetX: 0,
      offsetY: 3
    };
    
    // Text
    this.text = '';
    this.textColor = '#000000';
    this.fontSize = 14;
    this.fontFamily = 'Arial';
    this.fontWeight = 'normal';
    this.textAlign = 'center'; // 'left', 'center', 'right'
    this.textValign = 'middle'; // 'top', 'middle', 'bottom'
    
    // Link/Click
    this.isLink = false;
    this.linkUrl = null;
    this.onClick = null;
    this.clickId = null;
    
    // Game coordinates flag
    this.useGameCoords = true;
  }
  
  // Position
  position(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
  
  // Size
  size(width, height) {
    this.width = width;
    this.height = height;
    return this;
  }
  
  // Corner radius
  cornerRadius(radius) {
    this.radius = radius;
    return this;
  }
  
  // Padding (can be single value or object)
  setPadding(paddingValue) {
    if (typeof paddingValue === 'number') {
      this.padding = { top: paddingValue, right: paddingValue, bottom: paddingValue, left: paddingValue };
    } else {
      this.padding = { 
        top: paddingValue.top || 0, 
        right: paddingValue.right || 0, 
        bottom: paddingValue.bottom || 0, 
        left: paddingValue.left || 0 
      };
    }
    return this;
  }
  
  // Background color
  background(color) {
    this.backgroundColor = color;
    this.backgroundGradient = null;
    return this;
  }
  
  // Background gradient
  gradient(type, colors, angle = 0) {
    this.backgroundGradient = { type, colors, angle };
    this.backgroundColor = null;
    return this;
  }
  
  // Linear gradient shortcut
  linearGradient(colors, angle = 0) {
    return this.gradient('linear', colors, angle);
  }
  
  // Radial gradient shortcut
  radialGradient(colors) {
    return this.gradient('radial', colors, 0);
  }
  
  // Opacity
  alpha(opacity) {
    this.opacity = opacity;
    return this;
  }
  
  // Border
  border(width, color) {
    this.borderWidth = width;
    this.borderColor = color;
    return this;
  }
  
  // Inner shadow
  shadow(color, blur, offsetX = 0, offsetY = 0) {
    this.innerShadow = {
      enabled: true,
      color,
      blur,
      offsetX,
      offsetY
    };
    return this;
  }
  
  // Text content
  setText(content) {
    this.textContent = content;
    return this;
  }
  
  // Text style
  textStyle(color, size, family = 'Arial', weight = 'normal') {
    this.textColor = color;
    this.fontSize = size;
    this.fontFamily = family;
    this.fontWeight = weight;
    return this;
  }
  
  // Text alignment
  align(horizontal, vertical = 'middle') {
    this.textAlign = horizontal;
    this.textValign = vertical;
    return this;
  }
  
  // Make it a link
  link(url, onClick) {
    this.isLink = true;
    this.linkUrl = url;
    this.onClick = onClick;
    this.clickId = `btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return this;
  }
  
  // Set click handler
  click(handler) {
    this.onClick = handler;
    this.clickId = `btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return this;
  }
  
  // Use screen coordinates instead of game coordinates
  screenCoords() {
    this.useGameCoords = false;
    return this;
  }
  
  // Get actual pixel values
  getPixelValues() {
    if (this.useGameCoords) {
      return {
        x: sx(this.x),
        y: sy(this.y),
        width: ss(this.width),
        height: ss(this.height),
        radius: ss(this.radius),
        padding: {
          top: ss(this.padding.top),
          right: ss(this.padding.right),
          bottom: ss(this.padding.bottom),
          left: ss(this.padding.left)
        },
        borderWidth: ss(this.borderWidth),
        fontSize: ss(this.fontSize)
      };
    }
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      radius: this.radius,
      padding: { ...this.padding },
      borderWidth: this.borderWidth,
      fontSize: this.fontSize
    };
  }
  
  // Draw the rounded rectangle
  draw(ctx) {
    const p = this.getPixelValues();
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    // Create clipping path for inner content
    this._createPath(ctx, p.x, p.y, p.width, p.height, p.radius);
    ctx.save();
    ctx.clip();
    
    // Fill background
    this._fillBackground(ctx, p);
    
    // Draw inner shadow
    if (this.innerShadow.enabled) {
      this._drawInnerShadow(ctx, p);
    }
    
    ctx.restore(); // Remove clip
    
    // Draw border
    if (this.borderWidth > 0) {
      this._drawBorder(ctx, p);
    }
    
    // Draw text
    if (this.textContent) {
      this._drawText(ctx, p);
    }
    
    ctx.restore();
    
    // Register for click handling
    if (this.onClick || this.isLink) {
      this._registerClickable(p);
    }
    
    return this;
  }
  
  // Create rounded rectangle path
  _createPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  // Fill background (color or gradient)
  _fillBackground(ctx, p) {
    if (this.backgroundGradient) {
      let grad;
      if (this.backgroundGradient.type === 'linear') {
        const angle = this.backgroundGradient.angle * Math.PI / 180;
        const x1 = p.x + p.width / 2 - (p.width / 2) * Math.cos(angle);
        const y1 = p.y + p.height / 2 - (p.height / 2) * Math.sin(angle);
        const x2 = p.x + p.width / 2 + (p.width / 2) * Math.cos(angle);
        const y2 = p.y + p.height / 2 + (p.height / 2) * Math.sin(angle);
        grad = ctx.createLinearGradient(x1, y1, x2, y2);
      } else {
        grad = ctx.createRadialGradient(
          p.x + p.width / 2, p.y + p.height / 2, 0,
          p.x + p.width / 2, p.y + p.height / 2, Math.max(p.width, p.height) / 2
        );
      }
      
      this.backgroundGradient.colors.forEach((stop, i) => {
        grad.addColorStop(i / (this.backgroundGradient.colors.length - 1), stop);
      });
      ctx.fillStyle = grad;
    } else if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
    } else {
      ctx.fillStyle = 'transparent';
    }
    
    ctx.fill();
  }
  
  // Draw inner shadow effect
  _drawInnerShadow(ctx, p) {
    const s = this.innerShadow;
    
    // Draw shadow on top edge
    const shadowGrad = ctx.createLinearGradient(
      p.x, p.y, 
      p.x, p.y + s.blur
    );
    shadowGrad.addColorStop(0, s.color);
    shadowGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(p.x, p.y, p.width, s.blur);
    
    // Draw shadow on left edge
    const shadowGradLeft = ctx.createLinearGradient(
      p.x, p.y, 
      p.x + s.blur, p.y
    );
    shadowGradLeft.addColorStop(0, s.color);
    shadowGradLeft.addColorStop(1, 'transparent');
    
    ctx.fillStyle = shadowGradLeft;
    ctx.fillRect(p.x, p.y, s.blur, p.height);
  }
  
  // Draw border
  _drawBorder(ctx, p) {
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = p.borderWidth;
    this._createPath(ctx, p.x, p.y, p.width, p.height, p.radius);
    ctx.stroke();
  }
  
  // Draw text with alignment
  _drawText(ctx, p) {
    ctx.fillStyle = this.textColor;
    ctx.font = `${this.fontWeight} ${p.fontSize}px ${this.fontFamily}`;
    ctx.textBaseline = 'middle';
    
    // Calculate text position based on padding and alignment
    const contentX = p.x + p.padding.left;
    const contentY = p.y + p.padding.top;
    const contentW = p.width - p.padding.left - p.padding.right;
    const contentH = p.height - p.padding.top - p.padding.bottom;
    
    let textX;
    switch (this.textAlign) {
      case 'left':
        textX = contentX;
        ctx.textAlign = 'left';
        break;
      case 'right':
        textX = contentX + contentW;
        ctx.textAlign = 'right';
        break;
      case 'center':
      default:
        textX = contentX + contentW / 2;
        ctx.textAlign = 'center';
        break;
    }
    
    let textY;
    switch (this.textValign) {
      case 'top':
        textY = contentY + p.fontSize / 2;
        break;
      case 'bottom':
        textY = contentY + contentH - p.fontSize / 2;
        break;
      case 'middle':
      default:
        textY = contentY + contentH / 2;
        break;
    }
    
    ctx.fillText(this.textContent, textX, textY);
  }
  
  // Register for click handling
  _registerClickable(p) {
    // Remove old registration if exists
    clickableElements = clickableElements.filter(el => el.id !== this.clickId);
    
    clickableElements.push({
      id: this.clickId,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      onClick: this.onClick,
      linkUrl: this.linkUrl,
      isLink: this.isLink
    });
  }
  
  // Check if point is inside this rectangle
  contains(x, y) {
    const p = this.getPixelValues();
    return x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height;
  }
}

// Factory function for creating new rounded rectangles
function roundedRect() {
  return new RoundedRectangle();
}

// Clear all clickable elements (call at start of frame)
function clearClickables() {
  clickableElements = [];
}

// Handle click/tap event - returns true if handled
function handleClick(x, y) {
  // Check from last drawn (top) to first drawn (bottom)
  for (let i = clickableElements.length - 1; i >= 0; i--) {
    const el = clickableElements[i];
    if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
      if (el.onClick) {
        el.onClick();
        return true;
      }
      if (el.isLink && el.linkUrl) {
        // In WeChat mini game, you might use wx.navigateTo or similar
        console.log('Link clicked:', el.linkUrl);
        return true;
      }
    }
  }
  return false;
}

// Get clickable elements count (for debugging)
function getClickableCount() {
  return clickableElements.length;
}

module.exports = {
  RoundedRectangle,
  roundedRect,
  clearClickables,
  handleClick,
  getClickableCount
};