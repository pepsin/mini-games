// Bird Album Module
// Manages bird collection, album display, and capture tracking

const { getResource, isResourcesLoaded } = require('./resources.js');
const { W, H } = require('./config.js');

const ALBUM_STORAGE_KEY = 'bowaste_bird_album';

// Album state
let isAlbumVisible = false;
let albumScrollOffset = 0;
let albumCloseBounds = null;

// Load captured birds from storage
function loadCapturedBirds() {
  try {
    const data = wx.getStorageSync(ALBUM_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('Failed to load bird album:', e);
  }
  return {};
}

// Save captured birds to storage
function saveCapturedBirds(capturedBirds) {
  try {
    wx.setStorageSync(ALBUM_STORAGE_KEY, JSON.stringify(capturedBirds));
  } catch (e) {
    console.log('Failed to save bird album:', e);
  }
}

// All captured birds data
const capturedBirds = loadCapturedBirds();

// Record that a bird variant/frame has been captured
function recordBirdCapture(variant, frameIndex) {
  const key = `${variant}_${frameIndex}`;
  if (!capturedBirds[key]) {
    capturedBirds[key] = {
      variant: variant,
      frameIndex: frameIndex,
      capturedAt: Date.now(),
      count: 1
    };
    saveCapturedBirds(capturedBirds);
    console.log(`Bird captured: ${key}`);
    return true;
  } else {
    capturedBirds[key].count++;
    capturedBirds[key].capturedAt = Date.now();
    saveCapturedBirds(capturedBirds);
    return false;
  }
}

// Check if a specific bird variant/frame has been captured
function isBirdCaptured(variant, frameIndex) {
  const key = `${variant}_${frameIndex}`;
  return !!capturedBirds[key];
}

// Get all bird data organized by variant
function getAllBirdsData() {
  const birdRes = getResource('birds');
  if (!birdRes?.variants) return [];

  const allBirds = [];
  
  Object.keys(birdRes.variants).forEach(variantKey => {
    const variant = birdRes.variants[variantKey];
    if (variant?.frames && variant.names) {
      variant.frames.forEach((frame, index) => {
        const name = variant.names[index] || `Unknown Bird ${index + 1}`;
        const captured = isBirdCaptured(variantKey, index);
        
        allBirds.push({
          variant: variantKey,
          frameIndex: index,
          name: name,
          captured: captured,
          frame: frame,
          variantData: variant
        });
      });
    }
  });
  
  return allBirds;
}

// Get album statistics
function getAlbumStats() {
  const allBirds = getAllBirdsData();
  const capturedCount = allBirds.filter(b => b.captured).length;
  return {
    total: allBirds.length,
    captured: capturedCount,
    progress: allBirds.length > 0 ? capturedCount / allBirds.length : 0
  };
}

// Get bird name by variant and frame index
function getBirdName(variant, frameIndex) {
  const birdRes = getResource('birds');
  if (!birdRes?.variants?.[variant]?.names) return 'Unknown Bird';
  
  const names = birdRes.variants[variant].names;
  return names[frameIndex] || 'Unknown Bird';
}

// Album UI functions

function openBirdAlbum() {
  isAlbumVisible = true;
  albumScrollOffset = 0;
  console.log('Bird album opened');
}

function closeBirdAlbum() {
  isAlbumVisible = false;
  albumScrollOffset = 0;
  console.log('Bird album closed');
}

function isBirdAlbumVisible() {
  return isAlbumVisible;
}

function handleAlbumScroll(dy) {
  albumScrollOffset += dy;
  // Clamp scroll
  const allBirds = getAllBirdsData();
  const rowHeight = 120;
  const maxOffset = Math.max(0, Math.ceil(allBirds.length / 3) * rowHeight - H + 150);
  albumScrollOffset = Math.max(-maxOffset, Math.min(0, albumScrollOffset));
}

function handleAlbumTouch(x, y) {
  // Check close button
  if (albumCloseBounds) {
    const padding = 10;
    if (x >= albumCloseBounds.x - padding && x <= albumCloseBounds.x + albumCloseBounds.width + padding &&
        y >= albumCloseBounds.y - padding && y <= albumCloseBounds.y + albumCloseBounds.height + padding) {
      closeBirdAlbum();
      return true;
    }
  }
  return false;
}

// Draw the bird album
function drawBirdAlbum(ctx, canvas) {
  if (!isAlbumVisible) return;

  const { W, H, sx, sy, ss } = require('./config.js');
  
  // Semi-transparent background overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Title
  const stats = getAlbumStats();
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${ss(24)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('鸟类图鉴', sx(W / 2), sy(50));
  
  // Progress
  ctx.fillStyle = '#FFF';
  ctx.font = `${ss(14)}px Arial`;
  ctx.fillText(`已收集: ${stats.captured}/${stats.total}`, sx(W / 2), sy(80));
  
  // Close button
  const closeSize = 40;
  const closeX = W - closeSize - 20;
  const closeY = 20;
  
  ctx.fillStyle = '#FF6B6B';
  ctx.beginPath();
  ctx.arc(sx(closeX + closeSize/2), sy(closeY + closeSize/2), ss(closeSize/2), 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${ss(20)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('×', sx(closeX + closeSize/2), sy(closeY + closeSize/2));
  
  albumCloseBounds = { x: closeX, y: closeY, width: closeSize, height: closeSize };
  
  // Draw bird grid
  const allBirds = getAllBirdsData();
  const cols = 3;
  const cardWidth = (W - 60) / cols;
  const cardHeight = 100;
  const gap = 10;
  const startY = 100;
  
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx(20), sy(startY), sx(W - 40), sy(H - startY - 20));
  ctx.clip();
  
  allBirds.forEach((bird, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 30 + col * (cardWidth + gap);
    const y = startY + row * (cardHeight + gap) + albumScrollOffset;
    
    // Skip if out of visible area
    if (y + cardHeight < startY || y > H - 20) return;
    
    const screenX = sx(x);
    const screenY = sy(y);
    const screenW = sx(cardWidth);
    const screenH = sy(cardHeight);
    
    // Card background
    ctx.fillStyle = bird.captured ? '#2C3E50' : '#1A1A2E';
    ctx.fillRect(screenX, screenY, screenW, screenH);
    
    // Border
    ctx.strokeStyle = bird.captured ? '#FFD700' : '#444';
    ctx.lineWidth = ss(2);
    ctx.strokeRect(screenX, screenY, screenW, screenH);
    
    // Draw bird sprite or silhouette
    const imageSize = Math.min(screenW * 0.5, screenH * 0.6);
    const imageX = screenX + (screenW - imageSize) / 2;
    const imageY = screenY + 10;
    
    if (bird.captured && bird.frame?.image) {
      // Draw actual bird image
      ctx.drawImage(
        bird.frame.image,
        bird.frame.sx, bird.frame.sy, bird.frame.sw, bird.frame.sh,
        imageX, imageY, imageSize, imageSize
      );
    } else {
      // Draw silhouette (gray placeholder)
      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.ellipse(
        imageX + imageSize/2, 
        imageY + imageSize/2, 
        imageSize/3, 
        imageSize/4, 
        0, 0, Math.PI * 2
      );
      ctx.fill();
      
      // Question mark for unknown
      ctx.fillStyle = '#666';
      ctx.font = `bold ${ss(20)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', imageX + imageSize/2, imageY + imageSize/2);
    }
    
    // Bird name
    ctx.fillStyle = bird.captured ? '#FFF' : '#666';
    ctx.font = `${ss(10)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Truncate long names
    let displayName = bird.name;
    if (displayName.length > 6) {
      displayName = displayName.substring(0, 5) + '...';
    }
    ctx.fillText(displayName, screenX + screenW/2, imageY + imageSize + ss(5));
  });
  
  ctx.restore();
  ctx.restore();
}

module.exports = {
  recordBirdCapture,
  isBirdCaptured,
  getAllBirdsData,
  getAlbumStats,
  getBirdName,
  openBirdAlbum,
  closeBirdAlbum,
  isBirdAlbumVisible,
  handleAlbumScroll,
  handleAlbumTouch,
  drawBirdAlbum
};
