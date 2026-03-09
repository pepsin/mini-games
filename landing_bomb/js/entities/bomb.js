// Bomb Entity Module

const { W, GROUND_Y, RESOURCE_COLORS } = require('../config.js');
const { isResourcesLoaded, getResource } = require('../resources.js');
const { drawImageProportional, drawPlaceholder } = require('../renderer.js');
const { animationLoader } = require('../animationLoader.js');
const { Parachute } = require('../parachute.js');
const { sx, sy, ss } = require('../config.js');

// Draw bomb
function drawBomb(ctx, bomb, frameCount) {
  if (bomb.exploding) return;
  
  // Draw parachute
  const resources = {
    bomb: getResource('bomb'),
    parachute: getResource('parachute')
  };
  Parachute.draw(ctx, bomb, resources, animationLoader, sx, sy, frameCount, ss);
  
  // Draw bomb body
  let usePlaceholder = true;
  const bombRes = getResource('bomb');
  
  if (isResourcesLoaded() && bombRes) {
    const img = animationLoader.getCurrentFrame(bombRes);
    if (img && img.width > 0 && img.height > 0) {
      const size = animationLoader.getSize(bombRes);
      const anchor = animationLoader.getAnchor(bombRes);
      
      const result = drawImageProportional(
        ctx, img,
        bomb.x, bomb.y,
        size.width * 0.8,
        anchor.x, anchor.y
      );
      
      if (result) {
        usePlaceholder = false;
      }
    }
  }
  
  if (usePlaceholder) {
    drawPlaceholder(ctx, bomb.x, bomb.y, 64, 64, 'BOMB', RESOURCE_COLORS.bomb, 0.5, 0.5);
  }
}

// Create bomb properties based on wave config
function createBomb(waveConfig, currentWave) {
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
  const x = margin + Math.random() * (W - margin * 2);
  
  return {
    x: x,
    y: -50,
    radius: radius,
    speed: speed,
    sway: sway,
    swayOffset: Math.random() * Math.PI * 2,
    exploding: false,
    bombType: bombType,
    health: health,
    maxHealth: health,
    parachute: Parachute.createBombParachute()
  };
}

// Update bomb position
function updateBomb(bomb, frameCount) {
  bomb.y += bomb.speed;
  bomb.x += Math.sin(frameCount * 0.02 + bomb.swayOffset) * bomb.sway;
}

module.exports = {
  drawBomb,
  createBomb,
  updateBomb
};
