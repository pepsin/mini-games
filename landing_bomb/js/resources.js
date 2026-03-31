// Resource Management Module - Autoload Version
// Automatically discovers and loads all assets from the assets/ folder

const { animationLoader } = require('./animationLoader.js');

// Resource object - will be populated dynamically
const resources = {};

let resourcesLoaded = false;
let onLoadCallbacks = [];

function onResourcesLoaded(callback) {
  onLoadCallbacks.push(callback);
}

/**
 * Static asset manifest for cross-platform compatibility
 * Android WeChat mini-games cannot reliably use fs.readdirSync() on bundled assets
 */
const STATIC_ASSET_MANIFEST = [
  // Simple static assets
  { folder: 'background', key: 'background' },
  { folder: 'birds', key: 'birds' },
  { folder: 'cloud', key: 'cloud' },
  { folder: 'fireball', key: 'fireball' },
  { folder: 'flower', key: 'flower' },
  { folder: 'flower_covered', key: 'flower_covered' },
  { folder: 'iced_box', key: 'iced_box' },
  { folder: 'powerup', key: 'powerup' },
  { folder: 'rainbow', key: 'rainbow' },
  { folder: 'slingshot', key: 'slingshot' },
  { folder: 'wastes', key: 'wastes' },
  // Sun with parts (loaded separately)
  { folder: 'sun', key: 'sun_inner', part: 'inner' },
  { folder: 'sun', key: 'sun_outer', part: 'outer' },
  // Parachutes with parts
  { folder: 'parachute/normal', key: 'parachute_normal', part: 'normal' },
  { folder: 'parachute/shield', key: 'parachute_shield', part: 'shield' },
  { folder: 'parachute/twin', key: 'parachute_twin', part: 'twin' },
];

/**
 * Scan a directory recursively for info.json files
 * Returns array of { folder, key, hasParts } objects
 * Note: This uses dynamic scanning on iOS/DevTools, but falls back to static manifest on Android
 */
async function scanForAssets(fs, path, prefix = '') {
  const assets = [];
  
  try {
    // Try dynamic scanning first (works on iOS and DevTools)
    const entries = fs.readdirSync(path);
    
    for (const entry of entries) {
      const fullPath = path + entry;
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          const infoPath = fullPath + '/info.json';
          const folderPath = prefix ? `${prefix}/${entry}` : entry;
          
          try {
            // Check if this folder has info.json
            fs.accessSync(infoPath);
            
            // Read the info.json to check for parts
            const configData = fs.readFileSync(infoPath, 'utf8');
            const config = JSON.parse(configData);
            
            // If it has parts, we need to load each part separately
            if (config.parts && Array.isArray(config.parts)) {
              for (const part of config.parts) {
                const key = `${entry}_${part.id}`;
                assets.push({ 
                  folder: folderPath, 
                  key,
                  part: part.id,
                  hasParts: true 
                });
              }
            } else {
              // Regular asset without parts
              const key = entry;
              assets.push({ 
                folder: folderPath, 
                key,
                part: null,
                hasParts: false 
              });
            }
          } catch (e) {
            // No info.json here, scan deeper
            const subAssets = await scanForAssets(fs, fullPath + '/', folderPath);
            assets.push(...subAssets);
          }
        }
      } catch (statErr) {
        // Skip entries we can't stat
        console.warn(`Cannot stat ${fullPath}:`, statErr.message);
      }
    }
    
    // If we found assets dynamically, return them
    if (assets.length > 0) {
      console.log(`[Resources] Dynamic scanning found ${assets.length} assets`);
      return assets;
    }
  } catch (e) {
    console.warn('[Resources] Dynamic scanning failed:', e.message);
  }
  
  // Fall back to static manifest (for Android)
  console.log('[Resources] Using static asset manifest for Android compatibility');
  return STATIC_ASSET_MANIFEST.map(asset => ({
    folder: asset.folder,
    key: asset.key,
    part: asset.part || null,
    hasParts: asset.parts || false
  }));
}

/**
 * Load all resources by scanning the assets folder
 */
async function loadResources() {
  console.log('=== Starting resource autoload ===');
  
  const fs = wx.getFileSystemManager();
  const basePath = 'assets/';
  
  // Discover all assets
  const assetList = await scanForAssets(fs, basePath);
  console.log(`Discovered ${assetList.length} resources:`, assetList.map(a => a.key).join(', '));
  
  // Load all discovered resources
  const loadResults = await Promise.all(
    assetList.map(async ({ folder, key, part }) => {
      try {
        const resource = await animationLoader.load(folder, part);
        resources[key] = resource;
        
        const status = resource ? 'loaded' : 'failed';
        console.log(`${key}: ${status}`);
        return { key, success: !!resource };
      } catch (e) {
        console.error(`Failed to load ${folder}${part ? `/${part}` : ''}:`, e.message);
        resources[key] = null;
        return { key, success: false };
      }
    })
  );
  
  // Check if any resource loaded successfully
  const anyLoaded = loadResults.some(r => r.success);
  resourcesLoaded = anyLoaded;
  
  console.log(anyLoaded 
    ? `=== Resources loaded successfully (${loadResults.filter(r => r.success).length}/${loadResults.length}) ===` 
    : '=== No resources loaded, using placeholder mode ==='
  );
  
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
