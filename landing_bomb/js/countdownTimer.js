// Countdown Timer - Animated circular countdown icon
// Reusable component for displaying time-based progress

const { sx, sy, ss } = require('./config.js');

class CountdownTimer {
  /**
   * @param {object} options
   * @param {number} options.x - Center X in game coordinates
   * @param {number} options.y - Center Y in game coordinates
   * @param {number} [options.radius=10] - Circle radius in game units
   * @param {number} [options.lineWidth=3] - Arc stroke width in game units
   * @param {boolean} [options.showText=true] - Whether to show seconds text inside
   */
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.radius = options.radius || 10;
    this.lineWidth = options.lineWidth || 3;
    this.showText = options.showText !== undefined ? options.showText : true;
  }

  /**
   * Get color based on progress (1=full/green, 0=empty/red)
   * Green > 50%, Yellow 25-50%, Red < 25%
   */
  _getColor(progress) {
    if (progress > 0.5) return '#4CAF50';
    if (progress > 0.25) return '#FFC107';
    return '#FF5252';
  }

  /**
   * All-in-one draw call
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} progress - 0.0 (empty) to 1.0 (full)
   * @param {number} [remainingSeconds] - Seconds to display in center
   * @param {number} [frameCount=0] - For animation timing
   */
  draw(ctx, progress, remainingSeconds, frameCount) {
    frameCount = frameCount || 0;
    progress = Math.max(0, Math.min(1, progress));

    const centerX = sx(this.x);
    const centerY = sy(this.y);
    const radius = ss(this.radius);
    const lineWidth = ss(this.lineWidth);
    const color = this._getColor(progress);

    ctx.save();

    // Pulse animation when < 25% remaining
    let pulseScale = 1;
    if (progress < 0.25 && progress > 0) {
      pulseScale = 1 + 0.08 * Math.sin(frameCount * 0.15);
    }

    const drawRadius = radius * pulseScale;

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = ss(4) * pulseScale;

    // Track ring (faint background circle)
    ctx.beginPath();
    ctx.arc(centerX, centerY, drawRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Sweeping arc from 12 o'clock (top), clockwise
    if (progress > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * progress;

      ctx.beginPath();
      ctx.arc(centerX, centerY, drawRadius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Center text (remaining seconds)
    if (this.showText && remainingSeconds !== undefined && remainingSeconds !== null) {
      const secs = Math.ceil(remainingSeconds);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${ss(this.radius * 0.9)}px Arial`;
      ctx.fillStyle = color;
      ctx.fillText(secs, centerX, centerY);
    }

    ctx.restore();
  }
}

module.exports = { CountdownTimer };
