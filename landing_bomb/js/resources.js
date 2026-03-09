// Resource Management Module

const { animationLoader } = require('./animationLoader.js');
const { GROUND_Y } = require('./config.js');

// Resource object
const resources = {
  bomb: null,
  parachute: null,
  flower: null,
  cloud: null,
  rainbow: null,
  slingshot: null,
  background: null,
  sun: null
};

let resourcesLoaded = false;
let onLoadCallbacks = [];

function onResourcesLoaded(callback) {
  onLoadCallbacks.push(callback);
}

// Load all resources
async function loadResources() {
  console.log('=== Starting resource loading ===');
  
  resources.bomb = await animationLoader.load('bomb');
  console.log('Bomb resource:', resources.bomb ? 'loaded' : 'failed');
  
  resources.parachute = await animationLoader.load('bomb/parachute');
  console.log('Parachute resource:', resources.parachute ? 'loaded' : 'failed');
  
  resources.flower = await animationLoader.load('flower');
  console.log('Flower resource:', resources.flower ? 'loaded' : 'failed');
  
  resources.cloud = await animationLoader.load('cloud');
  console.log('Cloud resource:', resources.cloud ? 'loaded' : 'failed');
  
  resources.rainbow = await animationLoader.load('rainbow');
  console.log('Rainbow resource:', resources.rainbow ? 'loaded' : 'failed');
  
  resources.slingshot = await animationLoader.load('slingshot');
  console.log('Slingshot resource:', resources.slingshot ? 'loaded' : 'failed');
  
  resources.background = await animationLoader.load('background');
  console.log('Background resource:', resources.background ? 'loaded' : 'failed');
  
  resources.sun = await animationLoader.load('sun');
  console.log('Sun resource:', resources.sun ? 'loaded' : 'failed');
  
  // Check if any resource loaded
  const anyLoaded = resources.bomb || resources.parachute || resources.flower || 
                    resources.cloud || resources.rainbow || resources.slingshot || 
                    resources.background || resources.sun;
  
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
