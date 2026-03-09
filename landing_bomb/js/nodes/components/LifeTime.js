// LifeTime Component - destroys node after a duration

const { Component } = require('./Component.js');

class LifeTime extends Component {
  constructor(duration = 1000) {
    super('LifeTime');
    this.duration = duration;
    this.elapsed = 0;
    this.onExpired = null;
    this.autoDestroy = true;
  }

  setDuration(duration) {
    this.duration = duration;
    return this;
  }

  setAutoDestroy(autoDestroy) {
    this.autoDestroy = autoDestroy;
    return this;
  }

  reset() {
    this.elapsed = 0;
    return this;
  }

  getProgress() {
    return Math.min(1, this.elapsed / this.duration);
  }

  _process(delta) {
    // delta is in ms, duration is in ms
    this.elapsed += delta;

    if (this.elapsed >= this.duration) {
      if (this.onExpired) this.onExpired();
      
      if (this.autoDestroy) {
        const node = this.getNode();
        if (node) {
          node.queueFree();
        }
      }
    }
  }
}

module.exports = { LifeTime };
