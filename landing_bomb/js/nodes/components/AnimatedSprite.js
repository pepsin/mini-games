// AnimatedSprite Component - renders animated sprites

const { Component } = require('./Component.js');
const { sx, sy } = require('../../config.js');

class AnimatedSprite extends Component {
  constructor(frames = [], options = {}) {
    super('AnimatedSprite');
    this.frames = frames; // Array of images
    this.frameIndex = 0;
    this.frameTime = options.frameTime || 100; // ms per frame
    this.elapsed = 0;
    this.playing = true;
    this.loop = options.loop !== false;
    this.width = options.width || 64;
    this.height = options.height || 64;
    this.anchorX = options.anchorX || 0.5;
    this.anchorY = options.anchorY || 0.5;
    this.onFinished = null; // Callback when animation finishes
  }

  setFrames(frames) {
    this.frames = frames;
    this.frameIndex = 0;
    this.elapsed = 0;
    return this;
  }

  play() {
    this.playing = true;
    return this;
  }

  pause() {
    this.playing = false;
    return this;
  }

  stop() {
    this.playing = false;
    this.frameIndex = 0;
    this.elapsed = 0;
    return this;
  }

  setFrameTime(frameTime) {
    this.frameTime = frameTime;
    return this;
  }

  _process(delta) {
    if (!this.playing || this.frames.length <= 1) return;

    this.elapsed += delta;

    if (this.elapsed >= this.frameTime) {
      this.elapsed = 0;
      this.frameIndex++;

      if (this.frameIndex >= this.frames.length) {
        if (this.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = this.frames.length - 1;
          this.playing = false;
          if (this.onFinished) this.onFinished();
        }
      }
    }
  }

  _draw(ctx) {
    if (!this.frames.length || this.frameIndex >= this.frames.length) return;

    const frame = this.frames[this.frameIndex];
    if (!frame) return;

    const w = sx(this.width);
    const h = sy(this.height);
    const offsetX = -w * this.anchorX;
    const offsetY = -h * this.anchorY;

    ctx.drawImage(frame, offsetX, offsetY, w, h);
  }
}

module.exports = { AnimatedSprite };
