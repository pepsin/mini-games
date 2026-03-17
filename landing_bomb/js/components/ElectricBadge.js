// ElectricBadge.js - Animated badge component with electric effect
// Draws an oval badge with an image in center and zigzag electric lines around it

class ElectricBadge {
  constructor(options) {
    this.image = options.image;
    this.color = options.color || '#00FFFF';
    this.radiusX = options.radiusX || 60;
    this.radiusY = options.radiusY || 40;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.imageWidth = options.imageWidth || this.radiusX;
    this.imageHeight = options.imageHeight || this.radiusY;
    
    // Electric lines cover radius - controls the coverage area of electric lines
    // If value <= 1: lines extend from edge inward (0 = at edge, 1 = to center)
    // If value > 1: lines extend from center outward (1.5 = from center to 1.5x radius)
    this.coverRadius = options.coverRadius !== undefined ? options.coverRadius : 0.8;
    
    // Parse base color and create brighter variants
    this.baseColor = this.color;
    this.brightColors = this.generateBrightColors(this.color);
    
    // Electric effect properties
    this.electricLines = [];
    this.maxLines = options.maxLines != undefined ? options.maxLines : 12;
    this.lineLifetime = 150; // ms
    this.lastUpdate = Date.now();
    
    // Initialize electric lines
    this.initElectricLines();
  }
  
  // Generate brighter color variants
  generateBrightColors(baseColor) {
    // Parse hex color
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Create brighter variants
    const colors = [];
    for (let i = 0; i < 3; i++) {
      // Make it brighter by increasing each channel
      const brightness = 1.2 + i * 0.3; // 1.2x to 1.8x brightness
      const nr = Math.min(255, Math.floor(r * brightness));
      const ng = Math.min(255, Math.floor(g * brightness));
      const nb = Math.min(255, Math.floor(b * brightness));
      colors.push(`rgb(${nr}, ${ng}, ${nb})`);
    }
    return colors;
  }
  
  // Get a random bright color variant
  getRandomBrightColor() {
    return this.brightColors[Math.floor(Math.random() * this.brightColors.length)];
  }
  
  initElectricLines() {
    for (let i = 0; i < this.maxLines; i++) {
      this.electricLines.push({
        active: false,
        startAngle: 0,
        segments: [],
        life: 0,
        maxLife: 0
      });
    }
  }
  
  // Generate a zigzag path based on coverRadius setting
  generateZigzagPath(startAngle, numSegments = 8) {
    const segments = [];
    
    // Determine start and end points based on coverRadius
    let startRadius, endRadius;
    
    if (this.coverRadius <= 1) {
      // Inward mode: start from edge, go toward center
      // coverRadius 0 = stay at edge, 1 = go to center
      startRadius = this.radiusX;
      endRadius = this.radiusX * (1 - this.coverRadius);
    } else {
      // Outward mode: start from center, go outward
      // coverRadius 1.5 = from center to 1.5x radius
      startRadius = 0;
      endRadius = this.radiusX * this.coverRadius;
    }
    
    const startX = this.x + Math.cos(startAngle) * startRadius;
    const startY = this.y + Math.sin(startAngle) * startRadius;
    
    // Generate zigzag segments
    let currentX = startX;
    let currentY = startY;
    
    for (let i = 0; i < numSegments; i++) {
      const progress = (i + 1) / numSegments;
      
      // Calculate current radius based on progress
      const currentRadius = startRadius + (endRadius - startRadius) * progress;
      
      // Add randomness for zigzag effect
      const perpAngle = startAngle + Math.PI / 2;
      const zigzagIntensity = 6 + progress * 15;
      const zigzagOffset = (Math.random() - 0.5) * zigzagIntensity;
      
      // Add angle jitter
      const angleJitter = (Math.random() - 0.5) * 0.4;
      const actualAngle = startAngle + angleJitter;
      
      const nextX = this.x + Math.cos(actualAngle) * currentRadius + 
                    Math.cos(perpAngle) * zigzagOffset;
      const nextY = this.y + Math.sin(actualAngle) * currentRadius + 
                    Math.sin(perpAngle) * zigzagOffset;
      
      segments.push({
        x1: currentX,
        y1: currentY,
        x2: nextX,
        y2: nextY
      });
      
      currentX = nextX;
      currentY = nextY;
    }
    
    return segments;
  }
  
  update() {
    const now = Date.now();
    const deltaTime = now - this.lastUpdate;
    this.lastUpdate = now;
    
    // Randomly activate new electric lines - higher chance for more activity
    this.electricLines.forEach(line => {
      if (line.active) {
        line.life += deltaTime;
        if (line.life >= line.maxLife) {
          line.active = false;
        }
      } else if (Math.random() < 0.08) { // 8% chance per frame to activate
        line.active = true;
        line.startAngle = Math.random() * Math.PI * 2;
        line.segments = this.generateZigzagPath(line.startAngle);
        line.life = 0;
        line.maxLife = this.lineLifetime + Math.random() * 100;
        line.color = this.getRandomBrightColor(); // Assign a bright color to this line
      }
    });
  }
  
  draw(ctx) {
    ctx.save();
    
    // Draw oval background with gradient
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radiusX, this.radiusY, 0, 0, Math.PI * 2);
    
    // Create radial gradient for background
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, Math.max(this.radiusX, this.radiusY)
    );
    let colors = this.generateBrightColors(this.color)
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.6, colors[1]);
    gradient.addColorStop(1, colors[2]);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw oval border with glow
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Reset shadow for image
    ctx.shadowBlur = 0;
    
    // Draw image in center - always map to given size, no aspect ratio preservation
    if (this.image && this.image.complete) {
      ctx.drawImage(
        this.image,
        this.x - this.imageWidth / 2,
        this.y - this.imageHeight / 2,
        this.imageWidth,
        this.imageHeight
      );
    }

        
    // Draw top-left highlight (small white oval at top edge)
    const highlightWidth = this.radiusX * 0.3;
    const highlightHeight = this.radiusY * 0.15;
    const highlightX = this.x - this.radiusX * 0.5;
    const highlightY = this.y - this.radiusY * 0.5;
    
    ctx.beginPath();
    ctx.ellipse(highlightX, highlightY, highlightWidth, highlightHeight, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    // Draw bottom highlight arc (from right middle to bottom middle)
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(this.radiusX, this.radiusY) * 0.85, Math.PI * 0, Math.PI * 0.45);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Draw electric lines
    ctx.lineCap = 'round';
    
    this.electricLines.forEach(line => {
      if (!line.active) return;
      
      // Calculate opacity based on life - fade in and out
      const lifeProgress = line.life / line.maxLife;
      let opacity;
      if (lifeProgress < 0.15) {
        opacity = lifeProgress / 0.15;
      } else if (lifeProgress > 0.7) {
        opacity = (1 - lifeProgress) / 0.3;
      } else {
        opacity = 1;
      }
      
      // Use the line's assigned bright color or get a random one
      const lineColor = line.color || this.getRandomBrightColor();
      
      // Draw main zigzag line
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      line.segments.forEach((seg, idx) => {
        if (idx === 0) {
          ctx.moveTo(seg.x1, seg.y1);
        }
        ctx.lineTo(seg.x2, seg.y2);
      });
      ctx.stroke();
      
      // Draw thinner inner line for more electric effect
      ctx.lineWidth = 1;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = opacity * 0.9;
      ctx.beginPath();
      line.segments.forEach((seg, idx) => {
        if (idx === 0) {
          ctx.moveTo(seg.x1, seg.y1);
        }
        // Offset slightly for inner glow
        const offsetX = (Math.random() - 0.5) * 2;
        const offsetY = (Math.random() - 0.5) * 2;
        ctx.lineTo(seg.x2 + offsetX, seg.y2 + offsetY);
      });
      ctx.stroke();
      
      // Draw small sparks at the end
      const lastSeg = line.segments[line.segments.length - 1];
      if (lastSeg) {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = lineColor;
        
        // Main spark - brighter
        ctx.beginPath();
        ctx.arc(lastSeg.x2, lastSeg.y2, 2 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Small surrounding sparks
        if (Math.random() > 0.3) {
          for (let i = 0; i < 3; i++) {
            const sparkAngle = Math.random() * Math.PI * 2;
            const sparkDist = 4 + Math.random() * 8;
            ctx.beginPath();
            ctx.arc(
              lastSeg.x2 + Math.cos(sparkAngle) * sparkDist,
              lastSeg.y2 + Math.sin(sparkAngle) * sparkDist,
              1 + Math.random() * 1.5,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
    });
    
    ctx.restore();
  }
  
  // Update position
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }
  
  // Change color
  setColor(color) {
    this.color = color;
  }
  
  // Change image
  setImage(image) {
    this.image = image;
  }
}

// Factory function for creating electric badges
function createElectricBadge(options) {
  return new ElectricBadge(options);
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ElectricBadge, createElectricBadge };
}

if (typeof window !== 'undefined') {
  window.ElectricBadge = ElectricBadge;
  window.createElectricBadge = createElectricBadge;
}
