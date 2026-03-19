// Falling Shield Effect Module
// When a shielded bomb gets hit, the shield drops and falls to the ground

const { GROUND_Y } = require('../config.js');
const { getResource } = require('../resources.js');

// Array to track all falling shields
const fallingShields = [];

// Configuration
const SHIELD_CONFIG = {
  fallSpeed: 3.6,
  rotationSpeedBase: 0.1,
  size: 64,
  groundYOffsetMin: -20,
  groundYOffsetMax: 30
};

// Create a falling shield at the bomb's position
function createFallingShield(x, y) {
  const shieldRes = getResource('bottom_shield');
  if (!shieldRes || !shieldRes.image) return null;

  // Random rotation parameters (2x faster rotation)
  const rotationDirection = Math.random() < 0.5 ? -1 : 1;
  const rotationSpeed = (SHIELD_CONFIG.rotationSpeedBase + Math.random() * 0.1) * rotationDirection;
  const initialRotation = Math.random() * Math.PI * 2;
  
  // Random ground Y position (slight variation for visual interest)
  const groundY = GROUND_Y + SHIELD_CONFIG.groundYOffsetMin + Math.random() * (SHIELD_CONFIG.groundYOffsetMax - SHIELD_CONFIG.groundYOffsetMin);

  const shield = {
    x: x,
    y: y,
    rotation: initialRotation,
    rotationSpeed: rotationSpeed,
    groundY: groundY,
    opacity: 1,
    landed: false,
    fadeOutFrame: 0
  };

  fallingShields.push(shield);
  return shield;
}

// Update all falling shields
function updateFallingShields() {
  for (let i = fallingShields.length - 1; i >= 0; i--) {
    const shield = fallingShields[i];

    if (!shield.landed) {
      // Falling phase
      shield.y += SHIELD_CONFIG.fallSpeed;
      shield.rotation += shield.rotationSpeed;

      // Check if hit ground
      if (shield.y >= shield.groundY) {
        shield.y = shield.groundY;
        shield.landed = true;
      }
    } else {
      // Landed - fade out
      shield.fadeOutFrame++;
      const fadeDuration = 30; // frames to fade out
      shield.opacity = Math.max(0, 1 - shield.fadeOutFrame / fadeDuration);

      if (shield.opacity <= 0) {
        fallingShields.splice(i, 1);
      }
    }
  }
}

// Draw all falling shields
function drawFallingShields(ctx, sx, sy, ss) {
  const shieldRes = getResource('bottom_shield');
  if (!shieldRes || !shieldRes.image) return;

  const img = shieldRes.image;
  const size = SHIELD_CONFIG.size;

  ctx.save();
  
  for (const shield of fallingShields) {
    ctx.globalAlpha = shield.opacity;
    
    // Transform to shield position
    const screenX = sx(shield.x);
    const screenY = sy(shield.y);
    const screenSize = ss(size);
    
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(shield.rotation);
    
    // Draw the shield centered
    ctx.drawImage(
      img,
      -screenSize / 2,
      -screenSize / 2,
      screenSize,
      screenSize
    );
    
    ctx.restore();
  }
  
  ctx.restore();
}

// Clear all falling shields (for game reset)
function clearFallingShields() {
  fallingShields.length = 0;
}

module.exports = {
  createFallingShield,
  updateFallingShields,
  drawFallingShields,
  clearFallingShields
};
