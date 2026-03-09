// BombScene - A bomb enemy composed of nodes (Godot-style scene)

const { Node2D, Sprite, AnimatedSprite, Velocity, Collider, SwayMotion, Health } = require('../index.js');
const { Parachute } = require('../../parachute.js');
const { getResource, isResourcesLoaded } = require('../../resources.js');
const { animationLoader } = require('../../animationLoader.js');
const { RESOURCE_COLORS } = require('../../config.js');

class BombScene extends Node2D {
  constructor(options = {}) {
    super('Bomb');
    
    // Bomb properties
    this.bombType = options.bombType || 'normal';
    this.radius = options.radius || 15;
    this.speed = options.speed || 1;
    this.sway = options.sway || 0;
    this.points = options.points || 100;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.parachuteConfig = options.parachute || null;
    
    // Setup transform
    this.setPosition(options.x || 0, options.y || -50);
    
    // Add sway motion component
    if (this.sway > 0) {
      this.swayMotion = new SwayMotion(this.sway, 0.02, this.swayOffset);
      this.addChild(this.swayMotion);
    }
    
    // Add velocity component for falling (speed in pixels/second)
    this.velocity = new Velocity(0, this.speed * 60);
    this.velocity.setMaxSpeed(300);
    this.addChild(this.velocity);
    
    // Add collider
    this.collider = new Collider(this.radius);
    this.collider.layer = 2; // Bomb layer
    this.collider.mask = 1;  // Collide with projectiles
    this.addChild(this.collider);
    
    // Add health for tank bombs
    const maxHealth = this.bombType === 'tank' ? 2 : 1;
    this.health = new Health(maxHealth);
    this.addChild(this.health);
    
    // Sprite placeholder (actual drawing is custom)
    this.sprite = new Sprite();
    this.addChild(this.sprite);
    
    // Animation state
    this.frameCount = 0;
  }

  _process(delta) {
    this.frameCount++;
  }

  _draw(ctx) {
    // Draw parachute
    if (this.parachuteConfig) {
      const resources = {
        bomb: getResource('bomb'),
        parachute: getResource('parachute')
      };
      Parachute.draw(ctx, this, resources, animationLoader, 
        x => x, y => y, this.frameCount, s => s);
    }
    
    // Draw bomb body
    const bombRes = getResource('bomb');
    let drawn = false;
    
    if (isResourcesLoaded() && bombRes) {
      const img = animationLoader.getCurrentFrame(bombRes);
      if (img && img.width > 0 && img.height > 0) {
        const size = animationLoader.getSize(bombRes);
        const anchor = animationLoader.getAnchor(bombRes);
        
        const drawWidth = size.width * 0.8;
        const drawHeight = (img.height / img.width) * drawWidth;
        
        ctx.drawImage(img, 
          -drawWidth * anchor.x, 
          -drawHeight * anchor.y, 
          drawWidth, 
          drawHeight
        );
        drawn = true;
      }
    }
    
    if (!drawn) {
      // Fallback placeholder
      ctx.fillStyle = RESOURCE_COLORS.bomb;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Type indicator
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.bombType[0].toUpperCase(), 0, 3);
    }
  }

  // Factory method
  static create(waveConfig, currentWave) {
    const cfg = waveConfig;
    
    const isSpecial = Math.random() < cfg.specialBombChance;
    const isCluster = Math.random() < cfg.clusterBombChance;
    
    const radius = cfg.minRadius + Math.random() * (cfg.maxRadius - cfg.minRadius);
    let speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
    let sway = Math.random() * cfg.maxSway;
    
    let bombType = 'normal';
    let health = cfg.bombHealth;
    
    if (isCluster) {
      bombType = 'cluster';
      speed *= 0.85;
    } else if (isSpecial) {
      const specialTypes = ['fast', 'zigzag', 'tank'];
      bombType = specialTypes[Math.floor(Math.random() * specialTypes.length)];
      
      switch (bombType) {
        case 'fast':
          speed *= 1.5;
          sway *= 0.5;
          break;
        case 'zigzag':
          speed *= 0.9;
          sway *= 2.5;
          break;
        case 'tank':
          speed *= 0.6;
          health = Math.max(2, health + 1);
          break;
      }
    }
    
    const margin = 30 + Math.min(currentWave * 0.5, 30);
    const W = 750; // Default width
    const x = margin + Math.random() * (W - margin * 2);
    
    return new BombScene({
      x: x,
      y: -50,
      radius: radius,
      speed: speed,
      sway: sway,
      bombType: bombType,
      parachute: Parachute.createBombParachute()
    });
  }
}

module.exports = { BombScene };
