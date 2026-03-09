// SwayMotion Component - adds horizontal swaying motion

const { Component } = require('./Component.js');
const { Node2D } = require('../Node2D.js');

class SwayMotion extends Component {
  constructor(amplitude = 20, frequency = 0.02, phaseOffset = 0) {
    super('SwayMotion');
    this.amplitude = amplitude;
    this.frequency = frequency;
    this.phaseOffset = phaseOffset;
    this.time = 0;
    this.baseX = 0;
    this._initialized = false;
  }

  setAmplitude(amplitude) {
    this.amplitude = amplitude;
    return this;
  }

  setFrequency(frequency) {
    this.frequency = frequency;
    return this;
  }

  _ready() {
    const node = this.getNode();
    if (node && node instanceof Node2D) {
      this.baseX = node.x;
      this._initialized = true;
    }
  }

  _process(delta) {
    const node = this.getNode();
    if (!node || !(node instanceof Node2D)) return;

    if (!this._initialized) {
      this.baseX = node.x;
      this._initialized = true;
    }

    // Convert delta from ms to seconds
    const dt = delta / 1000;
    this.time += dt;
    node.x = this.baseX + Math.sin(this.time * this.frequency + this.phaseOffset) * this.amplitude;
  }
}

module.exports = { SwayMotion };
