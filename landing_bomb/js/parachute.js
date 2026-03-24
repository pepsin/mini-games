/**
 * ==============================================================================
 * Parachute Module - Bob-omb Squad
 * ==============================================================================
 * 
 * DESCRIPTION:
 * -----------
 * This module handles all parachute-related functionality for the Bob-omb Squad
 * game. It manages the rendering, positioning, and visual variations of parachutes
 * attached to falling wastes.
 * 
 * KEY FEATURES:
 * ------------
 * 1. CONFIGURABLE CONNECTING LINES
 *    - Number of gray lines connecting parachute to waste center is configurable
 *      via info.json (connectingLines.count)
 *    - Line appearance (color, width) is also configurable
 * 
 * 2. PER-Waste VARIATIONS
 *    - Each waste gets its own random scale variation within a configurable range
 *      (configured via info.json variation.scale.min/max)
 *    - Scale variations make the game look more organic and less uniform
 * 
 * 3. DIRECTION-BASED ROTATION
 *    - Parachutes rotate slightly based on waste's horizontal movement (sway)
 *    - Rotation indicates the direction the waste is moving
 *    - Configurable rotation range and sway influence factor in info.json
 * 
 * 4. CONFIGURABLE OFFSET
 *    - Distance between parachute and waste is configurable via info.json
 *    - Default offset is 45px (5px closer than original 50px)
 * 
 * CONFIGURATION (info.json):
 * -------------------------
 * {
 *   "parachuteOffset": 45,        // Distance from waste center to parachute
 *   "connectingLines": {
 *     "count": 4,                 // Number of gray lines (default: 4)
 *     "color": "#888",            // Line color
 *     "lineWidth": 1              // Line width in pixels
 *   },
 *   "variation": {
 *     "scale": {
 *       "min": 0.95,              // Minimum scale multiplier
 *       "max": 1.05               // Maximum scale multiplier
 *     },
 *     "rotation": {
 *       "min": -0.15,             // Min rotation in radians (-8.6 degrees)
 *       "max": 0.15,              // Max rotation in radians (8.6 degrees)
 *       "swayFactor": 0.5         // How much sway affects rotation
 *     }
 *   }
 * }
 * 
 * USAGE:
 * ------
 * 1. Initialize waste parachute properties when spawning:
 *    const waste = {
 *      x: 100,
 *      y: -40,
 *      // ... other waste properties
 *      parachute: Parachute.createWasteParachute()
 *    };
 * 
 * 2. Draw parachute for a waste:
 *    Parachute.draw(ctx, waste, resources, animationLoader, sx, sy, frameCount);
 * 
 * 3. Access default configuration:
 *    const defaults = Parachute.DEFAULT_CONFIG;
 * 
 * DEPENDENCIES:
 * ------------
 * - Requires animationLoader.js for resource loading
 * - Parachute configuration is loaded from assets/waste/parachute/info.json
 * 
 * NOTES:
 * ------
 * - The module uses the game coordinate system and requires sx()/sy() transform
 *   functions to convert game coordinates to screen coordinates
 * - If info.json configuration is missing, sensible defaults are used
 * - Rotation is calculated based on waste's sway offset and current frame
 * 
 * ==============================================================================
 */

class ParachuteClass {
  constructor() {
    // Default configuration used when info.json values are not available
    this.DEFAULT_CONFIG = {
      parachuteOffset: 45,
      connectingLines: {
        count: 4,
        color: '#888',
        lineWidth: 1
      },
      variation: {
        scale: {
          min: 0.95,
          max: 1.05
        },
        rotation: {
          min: -0.15,
          max: 0.15,
          swayFactor: 0.5
        }
      }
    };
  }

  /**
   * Create parachute properties for a new waste
   * Each waste gets randomized scale within the configured range
   * @param {Object} config - Optional override config
   * @returns {Object} Parachute properties for the waste
   */
  createWasteParachute(config = null) {
    const cfg = config || this.getConfig();
    const scaleRange = cfg.variation.scale;
    
    return {
      // Random scale within configured range
      scale: scaleRange.min + Math.random() * (scaleRange.max - scaleRange.min),
      // Rotation offset for this specific waste (adds variety)
      rotationOffset: (Math.random() - 0.5) * 0.1,
      // Random X flip for visual variety
      flipX: Math.random() < 0.5
    };
  }

  /**
   * Get configuration from loaded resources or use defaults
   * @param {Object} parachuteResource - The loaded parachute resource
   * @returns {Object} Configuration object
   */
  getConfig(parachuteResource = null) {
    if (parachuteResource && parachuteResource.config) {
      const config = parachuteResource.config;
      return {
        parachuteOffset: config.parachuteOffset ?? this.DEFAULT_CONFIG.parachuteOffset,
        connectingLines: {
          count: config.connectingLines?.count ?? this.DEFAULT_CONFIG.connectingLines.count,
          color: config.connectingLines?.color ?? this.DEFAULT_CONFIG.connectingLines.color,
          lineWidth: config.connectingLines?.lineWidth ?? this.DEFAULT_CONFIG.connectingLines.lineWidth
        },
        variation: {
          scale: {
            min: config.variation?.scale?.min ?? this.DEFAULT_CONFIG.variation.scale.min,
            max: config.variation?.scale?.max ?? this.DEFAULT_CONFIG.variation.scale.max
          },
          rotation: {
            min: config.variation?.rotation?.min ?? this.DEFAULT_CONFIG.variation.rotation.min,
            max: config.variation?.rotation?.max ?? this.DEFAULT_CONFIG.variation.rotation.max,
            swayFactor: config.variation?.rotation?.swayFactor ?? this.DEFAULT_CONFIG.variation.rotation.swayFactor
          }
        }
      };
    }
    return this.DEFAULT_CONFIG;
  }

  /**
   * Calculate parachute rotation based on waste's sway movement
   * @param {Object} waste - The waste object
   * @param {number} frameCount - Current frame count
   * @param {Object} config - Rotation configuration
   * @returns {number} Rotation in radians
   */
  calculateRotation(waste, frameCount, config) {
    // Calculate sway velocity (derivative of sway position)
    // sway position = sin(frameCount * 0.02 + waste.swayOffset) * waste.sway
    // sway velocity ≈ cos(frameCount * 0.02 + waste.swayOffset) * waste.sway * 0.02
    const swayPhase = frameCount * 0.02 + (waste.swayOffset || 0);
    const swayVelocity = Math.cos(swayPhase) * (waste.sway || 0) * 0.02;
    
    // Convert velocity to rotation, clamped to configured range
    const rawRotation = swayVelocity * config.swayFactor * 10;
    const clampedRotation = Math.max(
      config.min,
      Math.min(config.max, rawRotation)
    );
    
    // Add waste's individual rotation offset
    return clampedRotation + (waste.parachute?.rotationOffset || 0);
  }

  /**
   * Draw connecting lines between parachute and waste
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} wasteX - Waste X position (screen coordinates)
   * @param {number} wasteY - Waste Y position (screen coordinates)
   * @param {number} parachuteX - Parachute X position (screen coordinates)
 * @param {number} parachuteY - Parachute Y position (screen coordinates)
   * @param {number} parachuteWidth - Parachute width (screen coordinates)
   * @param {number} parachuteHeight - Parachute height (screen coordinates)
   * @param {Object} config - Line configuration
   * @param {number} rotation - Current rotation in radians
   * @param {Function} ss - Size scaling function (optional, for consistent scaling)
   */
  drawConnectingLines(ctx, wasteX, wasteY, parachuteX, parachuteY, parachuteWidth, parachuteHeight, config, rotation = 0, ss = null) {
    const lineCount = config.count;
    const color = config.color;
    // 使用传入的 ss 函数或默认 1 像素
    const lineWidth = ss ? ss(config.lineWidth) : config.lineWidth;
    
    // Parachute canopy edge positions (relative to parachute center)
    // Assuming the parachute canopy extends from -width/2 to +width/2 at the bottom
    const canopyHalfWidth = parachuteWidth * 0.45;
    const canopyBottomY = parachuteY + parachuteHeight * 0.1;
    
    // Waste connection point (top of waste)
    const wasteTopY = wasteY - parachuteHeight * 0.2;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    // Draw lines from evenly spaced points on parachute edge to waste center
    for (let i = 0; i < lineCount; i++) {
      // Calculate horizontal position on parachute edge
      const t = lineCount > 1 ? i / (lineCount - 1) : 0.5;
      const edgeX = parachuteX - canopyHalfWidth + t * 2 * canopyHalfWidth;
      
      // Apply rotation to the edge point
      const dx = edgeX - parachuteX;
      const rotatedX = parachuteX + dx * Math.cos(rotation);
      const rotatedY = canopyBottomY + Math.abs(dx * Math.sin(rotation) * 0.3);
      
      ctx.beginPath();
      ctx.moveTo(rotatedX, rotatedY);
      ctx.lineTo(wasteX, wasteTopY);
      ctx.stroke();
    }
  }

  /**
   * Draw parachute for a waste
   * @param {Object} waste - The waste object (must have x, y, radius, parachute properties)
   * @param {Object} resources - Game resources object (must contain parachute)
   * @param {Object} animationLoader - Animation loader instance
   * @param {Function} sx - X coordinate transform function
   * @param {Function} sy - Y coordinate transform function
   * @param {number} frameCount - Current frame count for sway calculation
   * @param {Function} ss - Size scaling function (optional, for consistent scaling)
   * @param {string} parachuteType - Parachute type: 'normal', 'shield', 'twin' (optional, defaults to waste's parachuteType or 'normal')
   */
  draw(ctx, waste, resources, animationLoader, sx, sy, frameCount, ss = null, parachuteType = null) {
    if (!waste || waste.exploding) return;
    
    // Determine which parachute resource to use
    // Resource keys are: normal, shield, twin (based on folder names)
    const type = parachuteType || waste.parachuteType || 'normal';
    const parachuteResource = resources?.[type];
    if (!parachuteResource) return;
    
    const config = this.getConfig(parachuteResource);
    const parachuteOffset = config.parachuteOffset;
    
    // Get waste's individual parachute scale, or default to 1
    const wasteScale = waste.parachute?.scale ?? 1.0;
    
    // Calculate rotation based on waste's sway
    const rotation = this.calculateRotation(waste, frameCount, config.variation.rotation);
    
    // Calculate positions in game coordinates
    const parachuteX = waste.x;
    const parachuteY = waste.y - parachuteOffset;
    
    // Convert to screen coordinates
    const screenWasteX = sx(waste.x);
    const screenWasteY = sy(waste.y);
    const screenParachuteX = sx(parachuteX);
    const screenParachuteY = sy(parachuteY);
    
    // Get parachute size from config
    const size = animationLoader.getSize(parachuteResource);
    const anchor = animationLoader.getAnchor(parachuteResource);
    
    // Base scale factor (0.6 matches original game) multiplied by individual variation
    const baseScale = 0.6;
    const totalScale = baseScale * wasteScale;
    
    // Calculate draw dimensions (使用统一 scale 保持宽高比)
    // 通过 sx(1) 获取当前 scale 值（因为 sx(x) = x * scale + offsetX）
    const currentScale = sx(1) - sx(0);
    const drawWidth = size.width * totalScale * currentScale;
    const drawHeight = drawWidth / (size.width / size.height);
    
    // Save context for rotation
    ctx.save();
    
    // Translate to parachute position, rotate, then draw
    ctx.translate(screenParachuteX, screenParachuteY);
    ctx.rotate(rotation);
    
    // Apply X flip based on waste's flipX property
    if (waste.parachute?.flipX) {
      ctx.scale(-1, 1);
    }
    
    // Draw the parachute image
    const img = parachuteResource.image;
    if (img && img.width > 0) {
      const drawX = -drawWidth * anchor.x;
      const drawY = -drawHeight * anchor.y;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }
    
    ctx.restore();
    
    // Draw connecting lines (after restoring context, in screen space)
    this.drawConnectingLines(
      ctx,
      screenWasteX,
      screenWasteY,
      screenParachuteX,
      screenParachuteY,
      drawWidth,
      drawHeight,
      config.connectingLines,
      rotation,
      ss
    );
  }

  /**
   * Get the actual parachute Y position for a waste (for debugging or other calculations)
   * @param {Object} waste - The waste object
   * @param {Object} parachuteResource - The parachute resource
   * @returns {number} Y position in game coordinates
   */
  getParachuteY(waste, parachuteResource = null) {
    const config = this.getConfig(parachuteResource);
    return waste.y - config.parachuteOffset;
  }
}

// Export singleton instance
const Parachute = new ParachuteClass();

// Module exports for WeChat mini game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Parachute, ParachuteClass };
}
