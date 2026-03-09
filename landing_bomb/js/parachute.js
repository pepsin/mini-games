/**
 * ==============================================================================
 * Parachute Module - Bob-omb Squad
 * ==============================================================================
 * 
 * DESCRIPTION:
 * -----------
 * This module handles all parachute-related functionality for the Bob-omb Squad
 * game. It manages the rendering, positioning, and visual variations of parachutes
 * attached to falling bombs.
 * 
 * KEY FEATURES:
 * ------------
 * 1. CONFIGURABLE CONNECTING LINES
 *    - Number of gray lines connecting parachute to bomb center is configurable
 *      via info.json (connectingLines.count)
 *    - Line appearance (color, width) is also configurable
 * 
 * 2. PER-BOMB VARIATIONS
 *    - Each bomb gets its own random scale variation within a configurable range
 *      (configured via info.json variation.scale.min/max)
 *    - Scale variations make the game look more organic and less uniform
 * 
 * 3. DIRECTION-BASED ROTATION
 *    - Parachutes rotate slightly based on bomb's horizontal movement (sway)
 *    - Rotation indicates the direction the bomb is moving
 *    - Configurable rotation range and sway influence factor in info.json
 * 
 * 4. CONFIGURABLE OFFSET
 *    - Distance between parachute and bomb is configurable via info.json
 *    - Default offset is 45px (5px closer than original 50px)
 * 
 * CONFIGURATION (info.json):
 * -------------------------
 * {
 *   "parachuteOffset": 45,        // Distance from bomb center to parachute
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
 * 1. Initialize bomb parachute properties when spawning:
 *    const bomb = {
 *      x: 100,
 *      y: -40,
 *      // ... other bomb properties
 *      parachute: Parachute.createBombParachute()
 *    };
 * 
 * 2. Draw parachute for a bomb:
 *    Parachute.draw(ctx, bomb, resources, animationLoader, sx, sy, frameCount);
 * 
 * 3. Access default configuration:
 *    const defaults = Parachute.DEFAULT_CONFIG;
 * 
 * DEPENDENCIES:
 * ------------
 * - Requires animationLoader.js for resource loading
 * - Parachute configuration is loaded from assets/bomb/parachute/info.json
 * 
 * NOTES:
 * ------
 * - The module uses the game coordinate system and requires sx()/sy() transform
 *   functions to convert game coordinates to screen coordinates
 * - If info.json configuration is missing, sensible defaults are used
 * - Rotation is calculated based on bomb's sway offset and current frame
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
   * Create parachute properties for a new bomb
   * Each bomb gets randomized scale within the configured range
   * @param {Object} config - Optional override config
   * @returns {Object} Parachute properties for the bomb
   */
  createBombParachute(config = null) {
    const cfg = config || this.getConfig();
    const scaleRange = cfg.variation.scale;
    
    return {
      // Random scale within configured range
      scale: scaleRange.min + Math.random() * (scaleRange.max - scaleRange.min),
      // Rotation offset for this specific bomb (adds variety)
      rotationOffset: (Math.random() - 0.5) * 0.1
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
   * Calculate parachute rotation based on bomb's sway movement
   * @param {Object} bomb - The bomb object
   * @param {number} frameCount - Current frame count
   * @param {Object} config - Rotation configuration
   * @returns {number} Rotation in radians
   */
  calculateRotation(bomb, frameCount, config) {
    // Calculate sway velocity (derivative of sway position)
    // sway position = sin(frameCount * 0.02 + bomb.swayOffset) * bomb.sway
    // sway velocity ≈ cos(frameCount * 0.02 + bomb.swayOffset) * bomb.sway * 0.02
    const swayPhase = frameCount * 0.02 + (bomb.swayOffset || 0);
    const swayVelocity = Math.cos(swayPhase) * (bomb.sway || 0) * 0.02;
    
    // Convert velocity to rotation, clamped to configured range
    const rawRotation = swayVelocity * config.swayFactor * 10;
    const clampedRotation = Math.max(
      config.min,
      Math.min(config.max, rawRotation)
    );
    
    // Add bomb's individual rotation offset
    return clampedRotation + (bomb.parachute?.rotationOffset || 0);
  }

  /**
   * Draw connecting lines between parachute and bomb
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} bombX - Bomb X position (screen coordinates)
   * @param {number} bombY - Bomb Y position (screen coordinates)
   * @param {number} parachuteX - Parachute X position (screen coordinates)
 * @param {number} parachuteY - Parachute Y position (screen coordinates)
   * @param {number} parachuteWidth - Parachute width (screen coordinates)
   * @param {number} parachuteHeight - Parachute height (screen coordinates)
   * @param {Object} config - Line configuration
   * @param {number} rotation - Current rotation in radians
   */
  drawConnectingLines(ctx, bombX, bombY, parachuteX, parachuteY, parachuteWidth, parachuteHeight, config, rotation = 0) {
    const lineCount = config.count;
    const color = config.color;
    const lineWidth = config.lineWidth;
    
    // Parachute canopy edge positions (relative to parachute center)
    // Assuming the parachute canopy extends from -width/2 to +width/2 at the bottom
    const canopyHalfWidth = parachuteWidth * 0.45;
    const canopyBottomY = parachuteY + parachuteHeight * 0.1;
    
    // Bomb connection point (top of bomb)
    const bombTopY = bombY - parachuteHeight * 0.2;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    // Draw lines from evenly spaced points on parachute edge to bomb center
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
      ctx.lineTo(bombX, bombTopY);
      ctx.stroke();
    }
  }

  /**
   * Draw parachute for a bomb
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} bomb - The bomb object (must have x, y, radius, parachute properties)
   * @param {Object} resources - Game resources object (must contain parachute)
   * @param {Object} animationLoader - Animation loader instance
   * @param {Function} sx - X coordinate transform function
   * @param {Function} sy - Y coordinate transform function
   * @param {number} frameCount - Current frame count for sway calculation
   */
  draw(ctx, bomb, resources, animationLoader, sx, sy, frameCount) {
    if (!bomb || bomb.exploding) return;
    
    const parachuteResource = resources?.parachute;
    if (!parachuteResource) return;
    
    const config = this.getConfig(parachuteResource);
    const parachuteOffset = config.parachuteOffset;
    
    // Get bomb's individual parachute scale, or default to 1
    const bombScale = bomb.parachute?.scale ?? 1.0;
    
    // Calculate rotation based on bomb's sway
    const rotation = this.calculateRotation(bomb, frameCount, config.variation.rotation);
    
    // Calculate positions in game coordinates
    const parachuteX = bomb.x;
    const parachuteY = bomb.y - parachuteOffset;
    
    // Convert to screen coordinates
    const screenBombX = sx(bomb.x);
    const screenBombY = sy(bomb.y);
    const screenParachuteX = sx(parachuteX);
    const screenParachuteY = sy(parachuteY);
    
    // Get parachute size from config
    const size = animationLoader.getSize(parachuteResource);
    const anchor = animationLoader.getAnchor(parachuteResource);
    
    // Base scale factor (0.6 matches original game) multiplied by individual variation
    const baseScale = 0.6;
    const totalScale = baseScale * bombScale;
    
    // Calculate draw dimensions
    const drawWidth = sx(size.width * totalScale);
    const drawHeight = drawWidth / (size.width / size.height);
    
    // Save context for rotation
    ctx.save();
    
    // Translate to parachute position, rotate, then draw
    ctx.translate(screenParachuteX, screenParachuteY);
    ctx.rotate(rotation);
    
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
      screenBombX,
      screenBombY,
      screenParachuteX,
      screenParachuteY,
      drawWidth,
      drawHeight,
      config.connectingLines,
      rotation
    );
  }

  /**
   * Get the actual parachute Y position for a bomb (for debugging or other calculations)
   * @param {Object} bomb - The bomb object
   * @param {Object} parachuteResource - The parachute resource
   * @returns {number} Y position in game coordinates
   */
  getParachuteY(bomb, parachuteResource = null) {
    const config = this.getConfig(parachuteResource);
    return bomb.y - config.parachuteOffset;
  }
}

// Export singleton instance
const Parachute = new ParachuteClass();

// Module exports for WeChat mini game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Parachute, ParachuteClass };
}
