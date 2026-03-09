// Base Component class - attachable behaviors for nodes

const { Node } = require('../Node.js');

class Component extends Node {
  constructor(name = 'Component') {
    super(name);
    this.node = null; // Reference to the parent node this component is attached to
  }

  // Called when component is added to a node
  _enterTree() {
    // Find the node this component is attached to
    if (this.parent) {
      this.node = this.parent;
    }
  }

  // Called when component is removed from a node
  _exitTree() {
    this.node = null;
  }

  // Get the node this component is attached to
  getNode() {
    return this.node;
  }

  // Get a sibling component by type
  getComponent(type) {
    if (!this.node) return null;
    for (const child of this.node.children) {
      if (child instanceof type && child !== this) {
        return child;
      }
    }
    return null;
  }

  // Get all sibling components by type
  getComponents(type) {
    if (!this.node) return [];
    return this.node.children.filter(child => child instanceof type && child !== this);
  }
}

module.exports = { Component };
