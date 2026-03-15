// Flex Layout System Module
// Provides CSS-like flexbox layout for auto-sizing containers

const { sx, sy, ss } = require('./config.js');
const { RoundedRectangle } = require('./roundedRect.js');

/**
 * FlexContainer - A container that manages children with flex layout
 * Supports: flexDirection, justifyContent, alignItems, gap, padding, wrap
 */
class FlexContainer {
  constructor() {
    // Layout properties
    this.x = 0;
    this.y = 0;
    this.width = null; // null = auto sizing
    this.height = null; // null = auto sizing
    this.minWidth = 0;
    this.minHeight = 0;
    this.maxWidth = Infinity;
    this.maxHeight = Infinity;
    
    // Flex properties
    this.flexDirection = 'row'; // 'row', 'column', 'row-reverse', 'column-reverse'
    this.justifyContent = 'flex-start'; // 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'
    this.alignItems = 'stretch'; // 'stretch', 'flex-start', 'center', 'flex-end'
    this.alignContent = 'stretch'; // For multi-line
    this.flexWrap = 'nowrap'; // 'nowrap', 'wrap', 'wrap-reverse'
    this.gap = 0;
    this.rowGap = null; // null = use gap
    this.columnGap = null; // null = use gap
    
    // Padding
    this.padding = { top: 0, right: 0, bottom: 0, left: 0 };
    
    // Children
    this.children = [];
    
    // Style
    this.style = {
      backgroundColor: null,
      backgroundGradient: null,
      borderWidth: 0,
      borderColor: '#000',
      borderRadius: 0,
      opacity: 1
    };
    
    // Coordinate system
    this.useGameCoords = true;
    
    // Computed layout
    this.computedWidth = 0;
    this.computedHeight = 0;
  }
  
  // Position
  position(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
  
  // Fixed size
  size(width, height) {
    this.width = width;
    this.height = height;
    return this;
  }
  
  // Auto sizing with constraints
  autoSize(minWidth = 0, minHeight = 0, maxWidth = Infinity, maxHeight = Infinity) {
    this.width = null;
    this.height = null;
    this.minWidth = minWidth;
    this.minHeight = minHeight;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    return this;
  }
  
  // Flex direction
  direction(dir) {
    this.flexDirection = dir;
    return this;
  }
  
  // Justify content (main axis alignment)
  justify(alignment) {
    this.justifyContent = alignment;
    return this;
  }
  
  // Align items (cross axis alignment)
  align(alignment) {
    this.alignItems = alignment;
    return this;
  }
  
  // Flex wrap
  wrap(mode) {
    this.flexWrap = mode;
    return this;
  }
  
  // Gap between items
  setGap(gap, rowGap = null, columnGap = null) {
    this.gap = gap;
    this.rowGap = rowGap !== null ? rowGap : gap;
    this.columnGap = columnGap !== null ? columnGap : gap;
    return this;
  }
  
  // Padding
  setPadding(value) {
    if (typeof value === 'number') {
      this.padding = { top: value, right: value, bottom: value, left: value };
    } else {
      this.padding = {
        top: value.top || 0,
        right: value.right || 0,
        bottom: value.bottom || 0,
        left: value.left || 0
      };
    }
    return this;
  }
  
  // Background
  background(color) {
    this.style.backgroundColor = color;
    this.style.backgroundGradient = null;
    return this;
  }
  
  // Linear gradient
  linearGradient(colors, angle = 0) {
    this.style.backgroundGradient = { type: 'linear', colors, angle };
    this.style.backgroundColor = null;
    return this;
  }
  
  // Border
  border(width, color) {
    this.style.borderWidth = width;
    this.style.borderColor = color;
    return this;
  }
  
  // Border radius
  cornerRadius(radius) {
    this.style.borderRadius = radius;
    return this;
  }
  
  // Opacity
  alpha(opacity) {
    this.style.opacity = opacity;
    return this;
  }
  
  // Use screen coordinates
  screenCoords() {
    this.useGameCoords = false;
    return this;
  }
  
  // Add child
  addChild(child) {
    if (child instanceof FlexItem || child instanceof FlexContainer || child instanceof RoundedRectangle) {
      this.children.push(child);
    } else if (typeof child === 'object') {
      // Convert plain object to FlexItem
      const item = new FlexItem();
      Object.assign(item, child);
      this.children.push(item);
    }
    return this;
  }
  
  // Add multiple children
  addChildren(...children) {
    children.forEach(child => this.addChild(child));
    return this;
  }
  
  // Calculate layout
  calculateLayout(ctx) {
    const isRow = this.flexDirection === 'row' || this.flexDirection === 'row-reverse';
    const isReverse = this.flexDirection === 'row-reverse' || this.flexDirection === 'column-reverse';
    
    // Get pixel values
    const p = this._getPixelValues();
    
    // Calculate content size
    let contentWidth = 0;
    let contentHeight = 0;
    let totalFlexGrow = 0;
    let totalFlexShrink = 0;
    let nonFlexSize = 0;
    
    // First pass: measure all children
    const childMetrics = this.children.map(child => {
      let width, height, flexGrow, flexShrink, flexBasis;
      
      if (child instanceof FlexItem) {
        const metrics = child.getMetrics(ctx, p.scale);
        width = metrics.width;
        height = metrics.height;
        flexGrow = child.flexGrow;
        flexShrink = child.flexShrink;
        flexBasis = child.flexBasis !== null ? child.flexBasis * p.scale : (isRow ? width : height);
      } else if (child instanceof FlexContainer) {
        // Recursively calculate child container
        child.useGameCoords = this.useGameCoords;
        child.calculateLayout(ctx);
        const childP = child._getPixelValues();
        width = child.computedWidth || childP.padding.left + childP.padding.right;
        height = child.computedHeight || childP.padding.top + childP.padding.bottom;
        flexGrow = 0;
        flexShrink = 1;
        flexBasis = isRow ? width : height;
      } else if (child instanceof RoundedRectangle) {
        const rectP = child.getPixelValues();
        width = rectP.width;
        height = rectP.height;
        flexGrow = 0;
        flexShrink = 1;
        flexBasis = isRow ? width : height;
      } else {
        width = 0;
        height = 0;
        flexGrow = 0;
        flexShrink = 1;
        flexBasis = 0;
      }
      
      return { child, width, height, flexGrow, flexShrink, flexBasis };
    });
    
    // Calculate available space
    const gapX = this.columnGap !== null ? this.columnGap * p.scale : this.gap * p.scale;
    const gapY = this.rowGap !== null ? this.rowGap * p.scale : this.gap * p.scale;
    const totalGap = isRow ? gapX * Math.max(0, this.children.length - 1) : gapY * Math.max(0, this.children.length - 1);
    
    // Calculate content size based on children
    if (isRow) {
      let rowWidth = 0;
      let maxHeight = 0;
      childMetrics.forEach((m, i) => {
        rowWidth += m.flexBasis;
        if (i > 0) rowWidth += gapX;
        maxHeight = Math.max(maxHeight, m.height);
      });
      contentWidth = rowWidth;
      contentHeight = maxHeight;
    } else {
      let colHeight = 0;
      let maxWidth = 0;
      childMetrics.forEach((m, i) => {
        colHeight += m.flexBasis;
        if (i > 0) colHeight += gapY;
        maxWidth = Math.max(maxWidth, m.width);
      });
      contentWidth = maxWidth;
      contentHeight = colHeight;
    }
    
    // Determine container size
    let containerWidth, containerHeight;
    
    if (this.width !== null) {
      containerWidth = this.width * p.scale;
    } else {
      containerWidth = Math.max(p.padding.left + p.padding.right + contentWidth, p.minWidth * p.scale);
      if (p.maxWidth !== Infinity) {
        containerWidth = Math.min(containerWidth, p.maxWidth * p.scale);
      }
    }
    
    if (this.height !== null) {
      containerHeight = this.height * p.scale;
    } else {
      containerHeight = Math.max(p.padding.top + p.padding.bottom + contentHeight, p.minHeight * p.scale);
      if (p.maxHeight !== Infinity) {
        containerHeight = Math.min(containerHeight, p.maxHeight * p.scale);
      }
    }
    
    this.computedWidth = containerWidth;
    this.computedHeight = containerHeight;
    
    // Calculate available space for flex items
    const availableMain = isRow 
      ? containerWidth - p.padding.left - p.padding.right - totalGap
      : containerHeight - p.padding.top - p.padding.bottom - totalGap;
    
    const totalFlexBasis = childMetrics.reduce((sum, m) => sum + m.flexBasis, 0);
    const remainingSpace = availableMain - totalFlexBasis;
    
    // Distribute remaining space to flex items
    const totalFlex = childMetrics.reduce((sum, m) => sum + m.flexGrow, 0);
    if (totalFlex > 0 && remainingSpace > 0) {
      const spacePerFlex = remainingSpace / totalFlex;
      childMetrics.forEach(m => {
        if (m.flexGrow > 0) {
          const extra = spacePerFlex * m.flexGrow;
          m.flexBasis += extra;
          if (isRow) {
            m.width += extra;
          } else {
            m.height += extra;
          }
        }
      });
    }
    
    // Calculate positions
    let mainPos = isRow ? p.padding.left : p.padding.top;
    const crossPos = isRow ? p.padding.top : p.padding.left;
    const crossSize = isRow ? containerHeight - p.padding.top - p.padding.bottom : containerWidth - p.padding.left - p.padding.right;
    
    // Apply justifyContent
    if (this.justifyContent === 'center') {
      mainPos += remainingSpace / 2;
    } else if (this.justifyContent === 'flex-end') {
      mainPos += remainingSpace;
    } else if (this.justifyContent === 'space-between' && this.children.length > 1) {
      // Space will be added between items
    } else if (this.justifyContent === 'space-around' && this.children.length > 0) {
      const spaceAround = remainingSpace / this.children.length;
      mainPos += spaceAround / 2;
    } else if (this.justifyContent === 'space-evenly' && this.children.length > 0) {
      const spaceEvenly = remainingSpace / (this.children.length + 1);
      mainPos += spaceEvenly;
    }
    
    // Position children
    childMetrics.forEach((m, i) => {
      let x, y, w, h;
      
      // Main axis position
      if (isRow) {
        x = isReverse ? containerWidth - p.padding.right - mainPos - m.width : mainPos;
        w = m.width;
        
        // Cross axis alignment
        if (this.alignItems === 'stretch') {
          h = crossSize;
          y = crossPos;
        } else if (this.alignItems === 'center') {
          h = m.height;
          y = crossPos + (crossSize - h) / 2;
        } else if (this.alignItems === 'flex-end') {
          h = m.height;
          y = crossPos + crossSize - h;
        } else {
          h = m.height;
          y = crossPos;
        }
        
        mainPos += m.flexBasis + gapX;
      } else {
        y = isReverse ? containerHeight - p.padding.bottom - mainPos - m.height : mainPos;
        h = m.height;
        
        // Cross axis alignment
        if (this.alignItems === 'stretch') {
          w = crossSize;
          x = crossPos;
        } else if (this.alignItems === 'center') {
          w = m.width;
          x = crossPos + (crossSize - w) / 2;
        } else if (this.alignItems === 'flex-end') {
          w = m.width;
          x = crossPos + crossSize - w;
        } else {
          w = m.width;
          x = crossPos;
        }
        
        mainPos += m.flexBasis + gapY;
      }
      
      // Store computed position and size
      m.computedX = x;
      m.computedY = y;
      m.computedWidth = w;
      m.computedHeight = h;
    });
    
    return childMetrics;
  }
  
  // Draw the container and all children
  draw(ctx) {
    const p = this._getPixelValues();
    
    // Calculate layout
    const childMetrics = this.calculateLayout(ctx);
    
    // Draw container background
    this._drawBackground(ctx, p);
    
    // Draw children
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, this.computedWidth, this.computedHeight);
    ctx.clip();
    
    childMetrics.forEach(m => {
      this._drawChild(ctx, m, p);
    });
    
    ctx.restore();
    
    // Draw container border
    if (this.style.borderWidth > 0) {
      this._drawBorder(ctx, p);
    }
    
    return this;
  }
  
  // Get pixel values based on coordinate system
  _getPixelValues() {
    const scale = this.useGameCoords ? ss(1) : 1;
    return {
      x: this.useGameCoords ? sx(this.x) : this.x,
      y: this.useGameCoords ? sy(this.y) : this.y,
      scale,
      padding: {
        top: this.padding.top * scale,
        right: this.padding.right * scale,
        bottom: this.padding.bottom * scale,
        left: this.padding.left * scale
      }
    };
  }
  
  // Draw background
  _drawBackground(ctx, p) {
    if (!this.style.backgroundColor && !this.style.backgroundGradient) return;
    
    ctx.save();
    ctx.globalAlpha = this.style.opacity;
    
    const r = this.style.borderRadius * p.scale;
    this._createPath(ctx, p.x, p.y, this.computedWidth, this.computedHeight, r);
    
    if (this.style.backgroundGradient) {
      let grad;
      if (this.style.backgroundGradient.type === 'linear') {
        const angle = this.style.backgroundGradient.angle * Math.PI / 180;
        const cx = p.x + this.computedWidth / 2;
        const cy = p.y + this.computedHeight / 2;
        const x1 = cx - (this.computedWidth / 2) * Math.cos(angle);
        const y1 = cy - (this.computedHeight / 2) * Math.sin(angle);
        const x2 = cx + (this.computedWidth / 2) * Math.cos(angle);
        const y2 = cy + (this.computedHeight / 2) * Math.sin(angle);
        grad = ctx.createLinearGradient(x1, y1, x2, y2);
      } else {
        grad = ctx.createRadialGradient(
          p.x + this.computedWidth / 2, p.y + this.computedHeight / 2, 0,
          p.x + this.computedWidth / 2, p.y + this.computedHeight / 2, Math.max(this.computedWidth, this.computedHeight) / 2
        );
      }
      
      this.style.backgroundGradient.colors.forEach((color, i) => {
        grad.addColorStop(i / (this.style.backgroundGradient.colors.length - 1), color);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = this.style.backgroundColor;
    }
    
    ctx.fill();
    ctx.restore();
  }
  
  // Draw border
  _drawBorder(ctx, p) {
    ctx.save();
    ctx.strokeStyle = this.style.borderColor;
    ctx.lineWidth = this.style.borderWidth * p.scale;
    const r = this.style.borderRadius * p.scale;
    this._createPath(ctx, p.x, p.y, this.computedWidth, this.computedHeight, r);
    ctx.stroke();
    ctx.restore();
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
  
  // Draw a child element
  _drawChild(ctx, metrics, p) {
    const { child, computedX, computedY, computedWidth, computedHeight } = metrics;
    
    const absoluteX = p.x + computedX;
    const absoluteY = p.y + computedY;
    
    if (child instanceof FlexContainer) {
      // Recursively draw child container
      child.x = (absoluteX - sx(0)) / ss(1);
      child.y = (absoluteY - sy(0)) / ss(1);
      child.useGameCoords = this.useGameCoords;
      child.draw(ctx);
    } else if (child instanceof RoundedRectangle) {
      // Update rounded rect position and size
      child.x = (absoluteX - sx(0)) / ss(1);
      child.y = (absoluteY - sy(0)) / ss(1);
      if (child.width !== computedWidth / p.scale) {
        child.width = computedWidth / p.scale;
      }
      if (child.height !== computedHeight / p.scale) {
        child.height = computedHeight / p.scale;
      }
      child.useGameCoords = this.useGameCoords;
      child.draw(ctx);
    } else if (child instanceof FlexItem) {
      // Draw flex item content
      child.draw(ctx, absoluteX, absoluteY, computedWidth, computedHeight, p.scale);
    }
  }
}

/**
 * FlexItem - A leaf node in the flex layout that can contain text, images, or custom content
 */
class FlexItem {
  constructor() {
    this.width = null; // null = auto based on content
    this.height = null;
    this.minWidth = 0;
    this.minHeight = 0;
    this.maxWidth = Infinity;
    this.maxHeight = Infinity;
    
    // Flex properties
    this.flexGrow = 0;
    this.flexShrink = 1;
    this.flexBasis = null; // null = use width/height
    this.alignSelf = 'auto'; // 'auto', 'flex-start', 'center', 'flex-end', 'stretch'
    
    // Content
    this.content = null; // Can be string (text), Image, or custom render function
    this.contentWidth = 0;
    this.contentHeight = 0;
    
    // Style
    this.style = {
      backgroundColor: null,
      textColor: '#000',
      fontSize: 14,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      textAlign: 'center',
      borderRadius: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    };
  }
  
  // Fixed size
  size(width, height) {
    this.width = width;
    this.height = height;
    return this;
  }
  
  // Auto size with constraints
  autoSize(minWidth = 0, minHeight = 0, maxWidth = Infinity, maxHeight = Infinity) {
    this.width = null;
    this.height = null;
    this.minWidth = minWidth;
    this.minHeight = minHeight;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    return this;
  }
  
  // Flex properties
  flex(grow = 0, shrink = 1, basis = null) {
    this.flexGrow = grow;
    this.flexShrink = shrink;
    this.flexBasis = basis;
    return this;
  }
  
  // Set content
  text(content, fontSize = 14, fontFamily = 'Arial') {
    this.content = content;
    this.style.fontSize = fontSize;
    this.style.fontFamily = fontFamily;
    return this;
  }
  
  // Set image content
  image(img, width, height) {
    this.content = img;
    this.contentWidth = width;
    this.contentHeight = height;
    return this;
  }
  
  // Custom render function
  render(renderFn) {
    this.content = renderFn;
    return this;
  }
  
  // Style
  background(color) {
    this.style.backgroundColor = color;
    this.style.backgroundGradient = null;
    return this;
  }
  
  // Linear gradient
  linearGradient(colors, angle = 0) {
    this.style.backgroundGradient = { type: 'linear', colors, angle };
    this.style.backgroundColor = null;
    return this;
  }
  
  textStyle(color, fontSize, fontFamily = 'Arial', fontWeight = 'normal') {
    this.style.textColor = color;
    this.style.fontSize = fontSize;
    this.style.fontFamily = fontFamily;
    this.style.fontWeight = fontWeight;
    return this;
  }
  
  align(alignment) {
    this.style.textAlign = alignment;
    return this;
  }
  
  padding(value) {
    if (typeof value === 'number') {
      this.style.padding = { top: value, right: value, bottom: value, left: value };
    } else {
      this.style.padding = {
        top: value.top || 0,
        right: value.right || 0,
        bottom: value.bottom || 0,
        left: value.left || 0
      };
    }
    return this;
  }
  
  cornerRadius(radius) {
    this.style.borderRadius = radius;
    return this;
  }
  
  // Measure content
  getMetrics(ctx, scale) {
    let width = this.width !== null ? this.width * scale : 0;
    let height = this.height !== null ? this.height * scale : 0;
    
    if (this.width === null || this.height === null) {
      // Measure content
      let contentW = 0;
      let contentH = 0;
      
      if (typeof this.content === 'string') {
        ctx.font = `${this.style.fontWeight} ${this.style.fontSize * scale}px ${this.style.fontFamily}`;
        const metrics = ctx.measureText(this.content);
        contentW = metrics.width;
        contentH = this.style.fontSize * scale;
      } else if (this.content instanceof Image) {
        contentW = this.contentWidth * scale;
        contentH = this.contentHeight * scale;
      } else if (typeof this.content === 'function') {
        // Custom render function - use explicit size or default
        contentW = this.contentWidth * scale;
        contentH = this.contentHeight * scale;
      }
      
      // Add padding
      const padding = this.style.padding;
      contentW += (padding.left + padding.right) * scale;
      contentH += (padding.top + padding.bottom) * scale;
      
      if (this.width === null) {
        width = Math.max(contentW, this.minWidth * scale);
        if (this.maxWidth !== Infinity) {
          width = Math.min(width, this.maxWidth * scale);
        }
      }
      
      if (this.height === null) {
        height = Math.max(contentH, this.minHeight * scale);
        if (this.maxHeight !== Infinity) {
          height = Math.min(height, this.maxHeight * scale);
        }
      }
    }
    
    return { width, height };
  }
  
  // Draw the item
  draw(ctx, x, y, width, height, scale) {
    // Draw background
    if (this.style.backgroundColor || this.style.backgroundGradient) {
      ctx.save();
      const r = this.style.borderRadius * scale;
      this._createPath(ctx, x, y, width, height, r);
      
      if (this.style.backgroundGradient) {
        let grad;
        if (this.style.backgroundGradient.type === 'linear') {
          const angle = this.style.backgroundGradient.angle * Math.PI / 180;
          const cx = x + width / 2;
          const cy = y + height / 2;
          const x1 = cx - (width / 2) * Math.cos(angle);
          const y1 = cy - (height / 2) * Math.sin(angle);
          const x2 = cx + (width / 2) * Math.cos(angle);
          const y2 = cy + (height / 2) * Math.sin(angle);
          grad = ctx.createLinearGradient(x1, y1, x2, y2);
        } else {
          grad = ctx.createRadialGradient(
            x + width / 2, y + height / 2, 0,
            x + width / 2, y + height / 2, Math.max(width, height) / 2
          );
        }
        
        this.style.backgroundGradient.colors.forEach((color, i) => {
          grad.addColorStop(i / (this.style.backgroundGradient.colors.length - 1), color);
        });
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = this.style.backgroundColor;
      }
      
      ctx.fill();
      ctx.restore();
    }
    
    // Draw content
    if (typeof this.content === 'string') {
      ctx.save();
      ctx.fillStyle = this.style.textColor;
      ctx.font = `${this.style.fontWeight} ${this.style.fontSize * scale}px ${this.style.fontFamily}`;
      ctx.textBaseline = 'middle';
      
      // Calculate text position
      const padding = this.style.padding;
      let textX, textY;
      
      if (this.style.textAlign === 'left') {
        ctx.textAlign = 'left';
        textX = x + padding.left * scale;
      } else if (this.style.textAlign === 'right') {
        ctx.textAlign = 'right';
        textX = x + width - padding.right * scale;
      } else {
        ctx.textAlign = 'center';
        textX = x + width / 2;
      }
      
      textY = y + height / 2;
      ctx.fillText(this.content, textX, textY);
      ctx.restore();
    } else if (this.content instanceof Image) {
      const padding = this.style.padding;
      const drawX = x + padding.left * scale;
      const drawY = y + padding.top * scale;
      const drawW = width - (padding.left + padding.right) * scale;
      const drawH = height - (padding.top + padding.bottom) * scale;
      ctx.drawImage(this.content, drawX, drawY, drawW, drawH);
    } else if (typeof this.content === 'function') {
      // Custom render function
      this.content(ctx, x, y, width, height, scale);
    }
  }
  
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
    ctx.quadraticCurveTo(x, x, y, x + radius, y);
    ctx.closePath();
  }
}

// Factory functions
function flexContainer() {
  return new FlexContainer();
}

function flexItem() {
  return new FlexItem();
}

module.exports = {
  FlexContainer,
  FlexItem,
  flexContainer,
  flexItem
};