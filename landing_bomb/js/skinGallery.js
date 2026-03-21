// Slingshot Skin Gallery UI
const { W, H, sx, sy, ss } = require('./config.js');
const { getAllSkins, getCurrentSkinId, setCurrentSkin, isSkinUnlocked } = require('./slingshotSkinSystem.js');
const analytics = require('./analytics.js');

// Gallery state
let isGalleryOpen = false;
let selectedSkin = null;

// Gallery layout constants
const GALLERY_CONFIG = {
  cols: 3,
  rows: 2,
  cellWidth: 120,
  cellHeight: 140,
  cellGap: 20,
  startX: 45,
  startY: 180
};

// Open gallery
function openGallery() {
  isGalleryOpen = true;
  selectedSkin = getCurrentSkinId();
}

// Close gallery
function closeGallery() {
  isGalleryOpen = false;
  selectedSkin = null;
}

// Check if gallery is open
function isGalleryVisible() {
  return isGalleryOpen;
}

// Handle touch in gallery
function handleGalleryTouch(x, y) {
  if (!isGalleryOpen) return false;

  // Check close button
  const closeBtnX = W - 60;
  const closeBtnY = 80;
  const dx = x - closeBtnX;
  const dy = y - closeBtnY;
  if (Math.sqrt(dx * dx + dy * dy) < 25) {
    closeGallery();
    return true;
  }

  // Check skin selection
  const skins = getAllSkins();
  for (let i = 0; i < skins.length; i++) {
    const row = Math.floor(i / GALLERY_CONFIG.cols);
    const col = i % GALLERY_CONFIG.cols;
    const cellX = GALLERY_CONFIG.startX + col * (GALLERY_CONFIG.cellWidth + GALLERY_CONFIG.cellGap);
    const cellY = GALLERY_CONFIG.startY + row * (GALLERY_CONFIG.cellHeight + GALLERY_CONFIG.cellGap);
    
    if (x >= cellX && x <= cellX + GALLERY_CONFIG.cellWidth &&
        y >= cellY && y <= cellY + GALLERY_CONFIG.cellHeight) {
      if (isSkinUnlocked(skins[i].id)) {
        selectedSkin = skins[i].id;
        setCurrentSkin(skins[i].id);
        // Track skin change
        analytics.trackSkinChanged(skins[i].id);
      }
      return true;
    }
  }

  return true; // Consume touch when gallery is open
}

// Draw gallery
function drawGallery(ctx) {
  if (!isGalleryOpen) return;

  // Background overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, sx(W), sy(H));

  // Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${ss(28)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(sx(W / 2), sy(40), '弹弓图鉴');

  // Close button
  const closeBtnX = sx(W - 60);
  const closeBtnY = sy(80);
  ctx.beginPath();
  ctx.arc(closeBtnX, closeBtnY, ss(25), 0, Math.PI * 2);
  ctx.fillStyle = '#FF4444';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = ss(3);
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${ss(20)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(closeBtnX, closeBtnY, '×');

  // Draw skin cells
  const skins = getAllSkins();
  for (let i = 0; i < skins.length; i++) {
    const skin = skins[i];
    const row = Math.floor(i / GALLERY_CONFIG.cols);
    const col = i % GALLERY_CONFIG.cols;
    const cellX = sx(GALLERY_CONFIG.startX + col * (GALLERY_CONFIG.cellWidth + GALLERY_CONFIG.cellGap));
    const cellY = sy(GALLERY_CONFIG.startY + row * (GALLERY_CONFIG.cellHeight + GALLERY_CONFIG.cellGap));
    const cellW = ss(GALLERY_CONFIG.cellWidth);
    const cellH = ss(GALLERY_CONFIG.cellHeight);

    // Cell background
    ctx.fillStyle = skin.unlocked ? 'rgba(255, 255, 255, 0.1)' : 'rgba(100, 100, 100, 0.3)';
    ctx.fillRect(cellX, cellY, cellW, cellH);
    
    // Selection border
    if (skin.id === selectedSkin) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = ss(3);
      ctx.strokeRect(cellX, cellY, cellW, cellH);
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = ss(1);
      ctx.strokeRect(cellX, cellY, cellW, cellH);
    }

    // Skin color preview (slingshot shape)
    const previewX = cellX + cellW / 2;
    const previewY = cellY + ss(50);
    const previewSize = ss(40);
    
    if (skin.unlocked) {
      // Draw simple slingshot shape
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = ss(4);
      ctx.beginPath();
      ctx.moveTo(previewX - previewSize/2, previewY + previewSize/2);
      ctx.lineTo(previewX, previewY - previewSize/2);
      ctx.lineTo(previewX + previewSize/2, previewY + previewSize/2);
      ctx.stroke();
      
      // Draw band
      ctx.beginPath();
      ctx.moveTo(previewX - previewSize/2, previewY + previewSize/2);
      ctx.quadraticCurveTo(previewX, previewY, previewX + previewSize/2, previewY + previewSize/2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = ss(2);
      ctx.stroke();
    } else {
      // Locked indicator
      ctx.fillStyle = '#666666';
      ctx.font = `bold ${ss(24)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(previewX, previewY, '?');
    }

    // Skin name
    ctx.fillStyle = skin.unlocked ? '#FFFFFF' : '#888888';
    ctx.font = `bold ${ss(14)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(cellX + cellW / 2, cellY + ss(95), skin.name);

    // Skin description
    ctx.fillStyle = skin.unlocked ? '#AAAAAA' : '#666666';
    ctx.font = `${ss(10)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const desc = skin.unlocked ? skin.description : '未解锁';
    ctx.fillText(cellX + cellW / 2, cellY + ss(115), desc);
  }

  // Instructions
  ctx.fillStyle = '#AAAAAA';
  ctx.font = `${ss(12)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(sx(W / 2), sy(H - 40), '点击选择已解锁的弹弓皮肤');
}

module.exports = {
  openGallery,
  closeGallery,
  isGalleryVisible,
  handleGalleryTouch,
  drawGallery
};
