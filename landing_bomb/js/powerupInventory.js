// Powerup Inventory System - 道具槽系统
// 管理玩家存储的道具，支持最多3个道具槽

const { W, H, sx, sy, ss, INVENTORY_CONFIG } = require('./config.js');
const { getResource } = require('./resources.js');
const analytics = require('./analytics.js');

// 避免循环依赖：延迟加载 powerupSystem 的导出
let powerupSystem = null;
function getPowerupSystem() {
  if (!powerupSystem) {
    powerupSystem = require('./powerupSystem.js');
  }
  return powerupSystem;
}

// 绘制圆角矩形的辅助函数
function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// 道具槽状态
const powerupInventory = []; // 存储的道具类型数组

// 飞行动画状态
const flyingPowerups = []; // { type, startX, startY, targetX, targetY, progress, speed }

// 重置道具槽
function resetInventory() {
  powerupInventory.length = 0;
  flyingPowerups.length = 0;
}

// 添加道具到槽位（带飞入动画）
function addPowerupToInventory(type, startX, startY) {
  if (powerupInventory.length >= INVENTORY_CONFIG.maxSlots) {
    return false; // 槽位已满
  }
  
  // 计算目标位置
  const slotIndex = powerupInventory.length;
  const targetPos = getSlotPosition(slotIndex);
  
  // 创建飞行动画
  flyingPowerups.push({
    type: type,
    startX: startX,
    startY: startY,
    targetX: targetPos.x + INVENTORY_CONFIG.buttonSize / 2,
    targetY: targetPos.y + INVENTORY_CONFIG.buttonSize / 2,
    progress: 0,
    speed: 0.08, // 飞入速度
    targetSlot: slotIndex
  });
  
  return true;
}

// 获取槽位位置
function getSlotPosition(slotIndex) {
  // 从左向右排列
  const x = INVENTORY_CONFIG.baseX + slotIndex * (INVENTORY_CONFIG.buttonSize + INVENTORY_CONFIG.gap);
  const y = INVENTORY_CONFIG.baseY;
  return { x, y };
}

// 更新飞行动画
function updateFlyingPowerups() {
  for (let i = flyingPowerups.length - 1; i >= 0; i--) {
    const fp = flyingPowerups[i];
    fp.progress += fp.speed;
    
    if (fp.progress >= 1) {
      // 动画完成，添加到库存
      powerupInventory.push(fp.type);
      flyingPowerups.splice(i, 1);
    }
  }
}

  // 使用道具（点击槽位）
function usePowerupFromInventory(slotIndex, activePowerups, gameState) {
  if (slotIndex < 0 || slotIndex >= powerupInventory.length) {
    return false;
  }
  
  const type = powerupInventory[slotIndex];

  // 激活道具效果
  getPowerupSystem().activatePowerup(type, activePowerups, gameState);
  
  // Track powerup used from inventory
  analytics.trackPowerupUsed(type, 'inventory');
  
  // 从槽位移除
  powerupInventory.splice(slotIndex, 1);
  
  return true;
}

// 获取库存中的道具
function getInventory() {
  return [...powerupInventory];
}

// 检查库存是否已满
function isInventoryFull() {
  return powerupInventory.length >= INVENTORY_CONFIG.maxSlots;
}

// 获取库存数量
function getInventoryCount() {
  return powerupInventory.length;
}

// 检查点击是否命中道具槽
function hitTestInventory(x, y) {
  for (let i = 0; i < powerupInventory.length; i++) {
    const pos = getSlotPosition(i);
    if (x >= pos.x && x <= pos.x + INVENTORY_CONFIG.buttonSize &&
        y >= pos.y && y <= pos.y + INVENTORY_CONFIG.buttonSize) {
      return i;
    }
  }
  return -1;
}

// 绘制道具槽按钮
function drawInventorySlots(ctx, frameCount = 0) {
  // 绘制已存储的道具槽
  for (let i = 0; i < powerupInventory.length; i++) {
    const type = powerupInventory[i];
    const pos = getSlotPosition(i);
    drawSlotButton(ctx, pos.x, pos.y, type, i, frameCount);
  }
  
  // 绘制空槽位（半透明）
  for (let i = powerupInventory.length; i < INVENTORY_CONFIG.maxSlots; i++) {
    const pos = getSlotPosition(i);
    drawEmptySlot(ctx, pos.x, pos.y);
  }
}

// 绘制单个道具槽按钮
function drawSlotButton(ctx, x, y, type, slotIndex, frameCount) {
  const pSystem = getPowerupSystem();
  const def = pSystem.POWERUP_TYPES[type];
  if (!def) return; // 防御性检查

  const px = sx(x);
  const py = sy(y);
  const size = ss(INVENTORY_CONFIG.buttonSize);
  const iconSize = ss(INVENTORY_CONFIG.iconSize);

  // 按钮背景（带发光效果）
  const pulse = Math.sin(frameCount * 0.1) * 0.1 + 0.9;

  // 外发光
  const glowGradient = ctx.createRadialGradient(
    px + size/2, py + size/2, size * 0.3,
    px + size/2, py + size/2, size * 0.8
  );
  glowGradient.addColorStop(0, def.color + '66'); // 40% opacity
  glowGradient.addColorStop(1, def.color + '00'); // 0% opacity

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(px + size/2, py + size/2, size * 0.8 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // 按钮背景（使用圆角矩形）
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, px, py, size, size, ss(12));
  ctx.fill();

  // 边框
  ctx.strokeStyle = def.color;
  ctx.lineWidth = ss(3);
  drawRoundedRect(ctx, px, py, size, size, ss(12));
  ctx.stroke();

  // 绘制道具图标
  const img = pSystem.getPowerupImage(type);
  if (img && img.width > 0) {
    const iconX = px + (size - iconSize) / 2;
    const iconY = py + (size - iconSize) / 2;
    ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
  } else {
    // 备用：绘制文字
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${ss(12)}px Arial`;
    ctx.fillStyle = def.color;
    ctx.fillText(def.label, px + size/2, py + size/2);
  }
  
}

// 绘制空槽位
function drawEmptySlot(ctx, x, y) {
  const px = sx(x);
  const py = sy(y);
  const size = ss(INVENTORY_CONFIG.buttonSize);
  
  // 半透明背景
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  drawRoundedRect(ctx, px, py, size, size, ss(12));
  ctx.fill();
  
  // 虚线边框
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = ss(2);
  ctx.setLineDash([ss(4), ss(4)]);
  drawRoundedRect(ctx, px, py, size, size, ss(12));
  ctx.stroke();
  ctx.setLineDash([]);
  
  // 加号图标
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = ss(2);
  const centerX = px + size / 2;
  const centerY = py + size / 2;
  const plusSize = ss(10);
  
  ctx.beginPath();
  ctx.moveTo(centerX - plusSize, centerY);
  ctx.lineTo(centerX + plusSize, centerY);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - plusSize);
  ctx.lineTo(centerX, centerY + plusSize);
  ctx.stroke();
}

// 绘制飞行动画中的道具
function drawFlyingPowerups(ctx, frameCount = 0) {
  const pSystem = getPowerupSystem();

  for (const fp of flyingPowerups) {
    const def = pSystem.POWERUP_TYPES[fp.type];
    if (!def) continue; // 防御性检查

    // 计算当前位置（缓动效果）
    const t = fp.progress;
    const easeT = 1 - Math.pow(1 - t, 3); // ease-out cubic

    const currentX = fp.startX + (fp.targetX - fp.startX) * easeT;
    const currentY = fp.startY + (fp.targetY - fp.startY) * easeT;

    const px = sx(currentX);
    const py = sy(currentY);
    const size = ss(INVENTORY_CONFIG.iconSize * (1 - t * 0.3)); // 逐渐变小

    // 绘制光晕
    const glowSize = size * 1.5;
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, glowSize);
    gradient.addColorStop(0, def.color + '88');
    gradient.addColorStop(0.5, def.color + '44');
    gradient.addColorStop(1, def.color + '00');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // 绘制道具图标
    const img = pSystem.getPowerupImage(fp.type);
    if (img && img.width > 0) {
      ctx.drawImage(img, px - size/2, py - size/2, size, size);
    } else {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(px, py, size/2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${ss(10)}px Arial`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(def.label, px, py);
    }
    
    // 绘制拖尾粒子
    const trailCount = 3;
    for (let i = 0; i < trailCount; i++) {
      const trailT = Math.max(0, t - i * 0.05);
      const trailEaseT = 1 - Math.pow(1 - trailT, 3);
      const trailX = sx(fp.startX + (fp.targetX - fp.startX) * trailEaseT);
      const trailY = sy(fp.startY + (fp.targetY - fp.startY) * trailEaseT);
      const trailSize = size * (1 - i * 0.2) * 0.5;
      const alpha = 1 - i * 0.3;
      
      ctx.fillStyle = def.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// 获取配置（用于外部访问）
function getInventoryConfig() {
  return INVENTORY_CONFIG;
}

module.exports = {
  // 配置
  INVENTORY_CONFIG,
  getInventoryConfig,
  
  // 库存管理
  powerupInventory,
  resetInventory,
  addPowerupToInventory,
  getInventory,
  isInventoryFull,
  getInventoryCount,
  
  // 使用道具
  usePowerupFromInventory,
  hitTestInventory,
  
  // 动画
  flyingPowerups,
  updateFlyingPowerups,
  
  // 绘制
  drawInventorySlots,
  drawFlyingPowerups,
  getSlotPosition
};
