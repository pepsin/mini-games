// Node system exports - Godot-inspired composition

// Core nodes
const { Node } = require('./Node.js');
const { Node2D } = require('./Node2D.js');

// Components
const { Component } = require('./components/Component.js');
const { Sprite } = require('./components/Sprite.js');
const { AnimatedSprite } = require('./components/AnimatedSprite.js');
const { Velocity } = require('./components/Velocity.js');
const { Collider } = require('./components/Collider.js');
const { CollisionSystem } = require('./components/Collider.js');
const { LifeTime } = require('./components/LifeTime.js');
const { ParticleEmitter } = require('./components/ParticleEmitter.js');
const { Particle } = require('./components/ParticleEmitter.js');
const { SwayMotion } = require('./components/SwayMotion.js');
const { Health } = require('./components/Health.js');

module.exports = {
  // Core
  Node,
  Node2D,
  
  // Components
  Component,
  Sprite,
  AnimatedSprite,
  Velocity,
  Collider,
  CollisionSystem,
  LifeTime,
  ParticleEmitter,
  Particle,
  SwayMotion,
  Health
};
