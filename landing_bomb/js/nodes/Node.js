// Base Node class - Godot-inspired node system
// All entities in the game are composed of nodes

class Node {
  constructor(name = 'Node') {
    this.name = name;
    this.parent = null;
    this.children = [];
    this.enabled = true;
    this.processEnabled = true;
    this._readyCalled = false;
  }

  // Add a child node
  addChild(child) {
    if (child.parent) {
      child.parent.removeChild(child);
    }
    this.children.push(child);
    child.parent = this;
    return child;
  }

  // Remove a child node
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parent = null;
    }
    return child;
  }

  // Remove this node from parent
  queueFree() {
    if (this.parent) {
      this.parent.removeChild(this);
    }
  }

  // Find node by name
  getNode(name) {
    for (const child of this.children) {
      if (child.name === name) return child;
      const found = child.getNode(name);
      if (found) return found;
    }
    return null;
  }

  // Get nodes by type
  getNodesByType(type) {
    const result = [];
    for (const child of this.children) {
      if (child instanceof type) result.push(child);
      result.push(...child.getNodesByType(type));
    }
    return result;
  }

  // Lifecycle: Called when node is added to tree
  _ready() {
    // Override in subclasses
  }

  // Lifecycle: Called every frame
  _process(delta) {
    // Override in subclasses
  }

  // Lifecycle: Called every physics frame
  _physicsProcess(delta) {
    // Override in subclasses
  }

  // Lifecycle: Called when node is drawn
  _draw(ctx) {
    // Override in subclasses
  }

  // Internal: Process this node and all children
  process(delta) {
    if (!this.enabled) return;
    
    if (!this._readyCalled) {
      this._ready();
      this._readyCalled = true;
    }
    
    if (this.processEnabled) {
      this._process(delta);
    }
    
    for (const child of this.children) {
      child.process(delta);
    }
  }

  // Internal: Physics process
  physicsProcess(delta) {
    if (!this.enabled) return;
    
    this._physicsProcess(delta);
    
    for (const child of this.children) {
      child.physicsProcess(delta);
    }
  }

  // Internal: Draw this node and all children
  draw(ctx) {
    if (!this.enabled) return;
    
    ctx.save();
    this._draw(ctx);
    
    for (const child of this.children) {
      child.draw(ctx);
    }
    ctx.restore();
  }

  // Get root node
  getRoot() {
    let node = this;
    while (node.parent) {
      node = node.parent;
    }
    return node;
  }
}

module.exports = { Node };
