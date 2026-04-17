// Slingshot Skin System
// Manages different slingshot skins with attributes

// Skin definitions with attributes
const SLINGSHOT_SKINS = {
  default: {
    id: 'default',
    name: '经典弹弓',
    description: '基础弹弓，平衡稳定',
    color: '#8B4513',
    attributes: {},
    unlocked: true,
    dropWeight: 0
  },
  dual_shot: {
    id: 'dual_shot',
    name: '双发弹弓',
    description: '默认双弹齐发',
    color: '#4169E1',
    attributes: { defaultDualShot: true },
    unlocked: false,
    dropWeight: 15
  },
  ice_frost: {
    id: 'ice_frost',
    name: '冰封弹弓',
    description: '子弹半径翻倍',
    color: '#00CED1',
    attributes: { bulletRadiusMultiplier: 2 },
    unlocked: false,
    dropWeight: 15
  },
  rapid_fire: {
    id: 'rapid_fire',
    name: '速射弹弓',
    description: '射击速度提升',
    color: '#FF6347',
    attributes: { fireRateMultiplier: 1.5 },
    unlocked: false,
    dropWeight: 15
  },
  heavy_strike: {
    id: 'heavy_strike',
    name: '重击弹弓',
    description: '子弹伤害翻倍',
    color: '#8B0000',
    attributes: { damageMultiplier: 2 },
    unlocked: false,
    dropWeight: 12
  },
  phantom: {
    id: 'phantom',
    name: '幻影弹弓',
    description: '子弹可穿透敌人',
    color: '#9932CC',
    attributes: { piercing: true },
    unlocked: false,
    dropWeight: 10
  },
  golden_master: {
    id: 'golden_master',
    name: '黄金大师',
    description: '全属性小幅提升',
    color: '#FFD700',
    attributes: { 
      bulletRadiusMultiplier: 1.3,
      fireRateMultiplier: 1.2,
      damageMultiplier: 1.3
    },
    unlocked: false,
    dropWeight: 8
  }
};

// Current equipped skin
let currentSkin = 'default';

// Skin collection (unlocked skins)
let unlockedSkins = ['default'];

// Get all skins
function getAllSkins() {
  return Object.values(SLINGSHOT_SKINS);
}

// Get current skin
function getCurrentSkin() {
  return SLINGSHOT_SKINS[currentSkin];
}

// Get current skin ID
function getCurrentSkinId() {
  return currentSkin;
}

// Set current skin
function setCurrentSkin(skinId) {
  if (SLINGSHOT_SKINS[skinId] && SLINGSHOT_SKINS[skinId].unlocked) {
    currentSkin = skinId;
    return true;
  }
  return false;
}

// Unlock a skin
function unlockSkin(skinId) {
  if (SLINGSHOT_SKINS[skinId] && !SLINGSHOT_SKINS[skinId].unlocked) {
    SLINGSHOT_SKINS[skinId].unlocked = true;
    if (!unlockedSkins.includes(skinId)) {
      unlockedSkins.push(skinId);
    }
    return true;
  }
  return false;
}

// Check if skin is unlocked
function isSkinUnlocked(skinId) {
  return SLINGSHOT_SKINS[skinId]?.unlocked || false;
}

// Get unlocked skins
function getUnlockedSkins() {
  return unlockedSkins.map(id => SLINGSHOT_SKINS[id]);
}

// Get skin attributes
function getSkinAttributes(skinId = currentSkin) {
  return SLINGSHOT_SKINS[skinId]?.attributes || {};
}

// Randomly drop a skin (called when conditions are met)
function tryDropSkin() {
  const lockedSkins = Object.values(SLINGSHOT_SKINS).filter(s => !s.unlocked && s.dropWeight > 0);
  if (lockedSkins.length === 0) return null;
  
  const totalWeight = lockedSkins.reduce((sum, s) => sum + s.dropWeight, 0);
  let roll = Math.random() * totalWeight;
  
  for (const skin of lockedSkins) {
    roll -= skin.dropWeight;
    if (roll <= 0) return skin.id;
  }
  
  return lockedSkins[lockedSkins.length - 1]?.id || null;
}

// Apply skin attributes to projectile
function applySkinToProjectile(proj, skinId = currentSkin) {
  const attrs = getSkinAttributes(skinId);
  
  if (attrs.bulletRadiusMultiplier) {
    proj.radius *= attrs.bulletRadiusMultiplier;
  }
  
  if (attrs.damageMultiplier) {
    proj.damage = (proj.damage || 1) * attrs.damageMultiplier;
  }
  
  if (attrs.piercing) {
    proj.piercing = true;
  }
  
  return proj;
}

// Check if dual shot is default for current skin
function isDefaultDualShot() {
  return getSkinAttributes().defaultDualShot || false;
}

// Get fire rate multiplier
function getFireRateMultiplier() {
  return getSkinAttributes().fireRateMultiplier || 1;
}

module.exports = {
  SLINGSHOT_SKINS,
  getAllSkins,
  getCurrentSkin,
  getCurrentSkinId,
  setCurrentSkin,
  unlockSkin,
  isSkinUnlocked,
  getUnlockedSkins,
  getSkinAttributes,
  tryDropSkin,
  applySkinToProjectile,
  isDefaultDualShot,
  getFireRateMultiplier
};
