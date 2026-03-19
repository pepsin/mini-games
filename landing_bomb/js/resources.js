// Resource Management Module

const { animationLoader } = require('./animationLoader.js');
const { GROUND_Y } = require('./config.js');

// Resource object
const resources = {
  bomb_normal: null,
  bomb_shielded: null,
  bomb_twin: null,
  iced_bomb: null,
  bottom_shield: null,
  parachute: null,
  flower: null,
  flower_covered: null,
  cloud: null,
  rainbow: null,
  slingshot: null,
  background: null,
  sun: null,
  sunInner: null,
  sunOuter: null,
  powerup: null
};

let resourcesLoaded = false;
let onLoadCallbacks = [];

function onResourcesLoaded(callback) {
  onLoadCallbacks.push(callback);
}

// Load all resources
async function loadResources() {
  console.log('=== Starting resource loading ===');

  // Load new bomb type sheets (64x64 frames)
  resources.bomb_normal = await animationLoader.load('bomb/normal_bomb');
  console.log('Normal bomb sheet:', resources.bomb_normal ? 'loaded' : 'failed');

  resources.bomb_shielded = await animationLoader.load('bomb/shielded_bomb');
  console.log('Shielded bomb sheet:', resources.bomb_shielded ? 'loaded' : 'failed');

  resources.bomb_twin = await animationLoader.load('bomb/twin_bomb');
  console.log('Twin bomb sheet:', resources.bomb_twin ? 'loaded' : 'failed');

  // Load iced_bomb as a static image
  resources.iced_bomb = await animationLoader.load('bomb/iced_bomb');
  console.log('Iced bomb resource:', resources.iced_bomb ? 'loaded' : 'failed');

  // Load bottom_shield as a static image
  resources.bottom_shield = await animationLoader.load('bomb/bottom_shield');
  console.log('Bottom shield resource:', resources.bottom_shield ? 'loaded' : 'failed');

  resources.parachute = await animationLoader.load('bomb/parachute');
  console.log('Parachute resource:', resources.parachute ? 'loaded' : 'failed');
  
  resources.flower = await animationLoader.load('flower');
  console.log('Flower resource:', resources.flower ? 'loaded' : 'failed');

  // Load flower_covered as a static image
  resources.flower_covered = await animationLoader.load('flower/flower_covered');
  console.log('Flower covered resource:', resources.flower_covered ? 'loaded' : 'failed');

  resources.cloud = await animationLoader.load('cloud');
  console.log('Cloud resource:', resources.cloud ? 'loaded' : 'failed');
  
  resources.rainbow = await animationLoader.load('rainbow');
  console.log('Rainbow resource:', resources.rainbow ? 'loaded' : 'failed');
  
  resources.slingshot = await animationLoader.load('slingshot');
  console.log('Slingshot resource:', resources.slingshot ? 'loaded' : 'failed');
  
  resources.background = await animationLoader.load('background');
  console.log('Background resource:', resources.background ? 'loaded' : 'failed');
  
  resources.sunInner = await animationLoader.load('sun', 'inner');
  resources.sunOuter = await animationLoader.load('sun', 'outer');
  console.log('Sun inner:', resources.sunInner ? 'loaded' : 'failed');
  console.log('Sun outer:', resources.sunOuter ? 'loaded' : 'failed');

  resources.powerup = await animationLoader.load('powerup');
  console.log('Powerup resource:', resources.powerup ? 'loaded' : 'failed');

  // Check if any resource loaded
  const anyLoaded = resources.bomb_normal || resources.bomb_shielded || resources.bomb_twin ||
                    resources.parachute || resources.flower || 
                    resources.cloud || resources.rainbow || resources.slingshot || 
                    resources.background || resources.sunInner || resources.sunOuter;
  
  resourcesLoaded = anyLoaded;
  console.log(anyLoaded ? '=== Resources loaded, using image mode ===' : '=== No resources loaded, using placeholder mode ===');
  
  // Notify callbacks
  onLoadCallbacks.forEach(cb => cb(resourcesLoaded));
  
  return resourcesLoaded;
}

function isResourcesLoaded() {
  return resourcesLoaded;
}

function getResource(name) {
  return resources[name];
}

function getAllResources() {
  return resources;
}

module.exports = {
  resources,
  loadResources,
  isResourcesLoaded,
  getResource,
  getAllResources,
  onResourcesLoaded
};
