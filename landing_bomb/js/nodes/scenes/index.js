// Scene nodes exports - Godot-style scenes

const { BombScene } = require('./BombScene.js');
const { ProjectileScene } = require('./ProjectileScene.js');
const { ExplosionScene, EXPLOSION_COLORS } = require('./ExplosionScene.js');
const { ScorePopupScene } = require('./ScorePopupScene.js');
const { FlowerScene } = require('./FlowerScene.js');
const { CloudScene } = require('./CloudScene.js');
const { SlingshotScene } = require('./SlingshotScene.js');
const { SkyScene } = require('./SkyScene.js');
const { SunScene } = require('./SunScene.js');
const { RainbowScene } = require('./RainbowScene.js');
const { WallScene } = require('./WallScene.js');

module.exports = {
  // Game entities
  BombScene,
  ProjectileScene,
  ExplosionScene,
  EXPLOSION_COLORS,
  ScorePopupScene,
  FlowerScene,
  CloudScene,
  SlingshotScene,
  
  // Background scenes
  SkyScene,
  SunScene,
  RainbowScene,
  WallScene
};
