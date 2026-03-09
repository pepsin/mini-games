// ScorePopupScene - Floating score display (Godot-style scene)

const { Node2D, LifeTime } = require('../index.js');
const { sx } = require('../../config.js');

class ScorePopupScene extends Node2D {
  constructor(options = {}) {
    super('ScorePopup');
    
    this.combo = options.combo || 1;
    this.baseScore = options.baseScore || 100;
    this.totalScore = this.baseScore * this.combo;
    this.riseSpeed = options.riseSpeed || 30; // pixels per second
    
    // Setup transform
    this.setPosition(options.x || 0, options.y || 0);
    
    // Auto-destroy after animation
    this.lifeTime = new LifeTime(options.duration || 800);
    this.addChild(this.lifeTime);
  }

  _process(delta) {
    // Rise up - convert delta from ms to seconds
    const dt = delta / 1000;
    this.y -= this.riseSpeed * dt;
  }

  _draw(ctx) {
    const progress = this.lifeTime.getProgress();
    
    const scale = 1.5 - progress * 0.8;
    let alpha = 1;
    if (progress > 0.5) {
      alpha = 1 - (progress - 0.5) * 2;
    }
    
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    
    const comboScale = scale * (1 + (this.combo - 1) * 0.2);
    const fontSize = Math.floor(sx(24) * comboScale);
    ctx.font = `bold ${fontSize}px Arial`;
    
    ctx.fillText(`+${this.totalScore}`, 0, 0);
    
    ctx.globalAlpha = 1;
  }

  // Factory method
  static create(x, y, combo) {
    return new ScorePopupScene({
      x, y,
      combo: combo,
      baseScore: 100,
      duration: 800
    });
  }
}

module.exports = { ScorePopupScene };
