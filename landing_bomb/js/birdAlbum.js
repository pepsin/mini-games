// Bird Album Module
// Manages bird collection, album display, and capture tracking

const { getResource, isResourcesLoaded } = require('./resources.js');
const { W, H } = require('./config.js');
const { FlexContainer, FlexItem, flexContainer, flexItem } = require('./flexLayout.js');

const ALBUM_STORAGE_KEY = 'bowaste_bird_album';

// Album state
let isAlbumVisible = false;
let albumScrollOffset = 0;
let albumCloseBounds = null;
let currentPage = 0;
let totalPages = 1;
let prevButtonBounds = null;
let nextButtonBounds = null;

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
  currentPage = 0;
  console.log('Bird album opened');
}

function closeBirdAlbum() {
  isAlbumVisible = false;
  albumScrollOffset = 0;
  currentPage = 0;
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
  
  // Check previous button
  if (prevButtonBounds && currentPage > 0) {
    const padding = 10;
    if (x >= prevButtonBounds.x - padding && x <= prevButtonBounds.x + prevButtonBounds.width + padding &&
        y >= prevButtonBounds.y - padding && y <= prevButtonBounds.y + prevButtonBounds.height + padding) {
      currentPage--;
      return true;
    }
  }
  
  // Check next button
  if (nextButtonBounds && currentPage < totalPages - 1) {
    const padding = 10;
    if (x >= nextButtonBounds.x - padding && x <= nextButtonBounds.x + nextButtonBounds.width + padding &&
        y >= nextButtonBounds.y - padding && y <= nextButtonBounds.y + nextButtonBounds.height + padding) {
      currentPage++;
      return true;
    }
  }
  
  return false;
}

// Draw the bird album
function drawBirdAlbum(ctx, canvas) {
  if (!isAlbumVisible) return;

  const { W, H, sx, sy, ss } = require('./config.js');
  
  // Theme color
  const themeColor = '#FF6B35';
  const themeLight = '#FF8C5A';
  
  // Semi-transparent background overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Title
  const stats = getAlbumStats();
  ctx.fillStyle = themeColor;
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
  
  // Draw bird grid with pagination - 9 cells per page (3x3)
  const allBirds = getAllBirdsData();
  const itemsPerPage = 9;
  totalPages = Math.ceil(allBirds.length / itemsPerPage);
  if (currentPage >= totalPages) currentPage = totalPages - 1;
  if (currentPage < 0) currentPage = 0;
  
  // Get birds for current page
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, allBirds.length);
  const pageBirds = allBirds.slice(startIndex, endIndex);
  
  // Calculate grid dimensions
  const gridPadding = 30;
  const availableWidth = W - gridPadding * 2;
  const gap = 10;
  const cardWidth = (availableWidth - gap * 2) / 3; // Subtract 2 gaps for 3 columns
  const cardHeight = cardWidth * 1; // 2:3 width to height ratio
  const startY = 100;
  
  // Create 3 rows manually to ensure proper 3x3 grid layout
  for (let row = 0; row < 3; row++) {
    const rowContainer = new FlexContainer()
      .position(gridPadding, startY + row * (cardHeight + gap))
      .size(availableWidth, cardHeight)
      .direction('row')
      .justify('space-between')
      .setPadding(0)
      .setGap(10);
    
    // Add 3 cells to each row
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      
      if (index < pageBirds.length) {
        const bird = pageBirds[index];
        const birdCell = new FlexItem()
          .size(cardWidth, cardHeight)
          .tag(`bird_${index}`)
          .background(bird.captured ? '#2C3E50' : '#1A1A2E')
          .cornerRadius(8);
        
        // Custom render function for bird cell
        birdCell.render((ctx, x, y, width, height, scale) => {
          // Calculate image size
          const imageSize = Math.min(width * 0.4, height * 0.45);
          const imageX = x + (width - imageSize) / 2;
          const imageY = y + (height - imageSize) / 2 - 6;
          
          if (bird.captured && bird.frame?.image) {
            // Draw actual bird image
            ctx.drawImage(
              bird.frame.image,
              bird.frame.sx, bird.frame.sy, bird.frame.sw, bird.frame.sh,
              imageX, imageY, imageSize, imageSize
            );
          } else {
            // Draw silhouette (darker gray placeholder)
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.ellipse(
              imageX + imageSize/2, 
              imageY + imageSize/2, 
              imageSize/3, 
              imageSize/3, 
              0, 0, Math.PI * 2
            );
            ctx.fill();
            
            // Question mark for unknown - lighter color for visibility
            ctx.fillStyle = '#999';
            ctx.font = `bold ${ss(20)}px`;
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
          if (bird.captured) {
            let displayName = bird.name;
            ctx.fillText(displayName, x + width/2, imageY + imageSize + ss(4));
          } else {
            ctx.fillText("???", x + width/2, imageY + imageSize + ss(4));
          }
        });
        
        rowContainer.addChild(birdCell);
      }
    }
    
    // Draw each row
    rowContainer.draw(ctx);
  }
  
  // Calculate button position
  const buttonRadius = 24;
  const buttonY = startY + cardHeight * 3 + gap * 2 + buttonRadius + 30;
  
  // Previous button enabled state
  const prevEnabled = currentPage > 0;
  const nextEnabled = currentPage < totalPages - 1;
  
  // Create button container using flex layout
  const buttonContainer = new FlexContainer()
    .position(0, buttonY - buttonRadius)
    .size(W, buttonRadius * 2)
    .direction('row')
    .justify('center')
    .setGap(60)
    .setPadding(0);
  
  // Previous button - circle shape with custom rendering
  const prevButton = new FlexItem()
    .size(buttonRadius * 2, buttonRadius * 2)
    .tag('prevButton');
  
  prevButton.render((ctx, x, y, width, height, scale) => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = buttonRadius * scale;
    
    // Draw circular button background
    ctx.fillStyle = prevEnabled ? themeColor : '#444';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Button border
    ctx.strokeStyle = prevEnabled ? themeLight : '#666';
    ctx.lineWidth = ss(2);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Left-pointing triangle
    if (prevEnabled) {
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.moveTo(centerX + 8 * scale, centerY - 10 * scale);
      ctx.lineTo(centerX - 6 * scale, centerY);
      ctx.lineTo(centerX + 8 * scale, centerY + 10 * scale);
      ctx.closePath();
      ctx.fill();
    }
  });
  
  buttonContainer.addChild(prevButton);
  
  // Next button - circle shape with custom rendering
  const nextButton = new FlexItem()
    .size(buttonRadius * 2, buttonRadius * 2)
    .tag('nextButton');
  
  nextButton.render((ctx, x, y, width, height, scale) => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = buttonRadius * scale;
    
    // Draw circular button background
    ctx.fillStyle = nextEnabled ? themeColor : '#444';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Button border
    ctx.strokeStyle = nextEnabled ? themeLight : '#666';
    ctx.lineWidth = ss(2);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Right-pointing triangle
    if (nextEnabled) {
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.moveTo(centerX - 8 * scale, centerY - 10 * scale);
      ctx.lineTo(centerX + 6 * scale, centerY);
      ctx.lineTo(centerX - 8 * scale, centerY + 10 * scale);
      ctx.closePath();
      ctx.fill();
    }
  });
  
  buttonContainer.addChild(nextButton);
  
  // Draw the button container
  buttonContainer.draw(ctx);
  
  // Get button bounds from flex layout
  const prevBounds = buttonContainer.getTaggedBounds('prevButton');
  const nextBounds = buttonContainer.getTaggedBounds('nextButton');
  
  if (prevBounds) {
    prevButtonBounds = prevBounds;
  }
  if (nextBounds) {
    nextButtonBounds = nextBounds;
  }
  
  // Page indicator between cells and buttons
  ctx.fillStyle = '#888';
  ctx.font = `${ss(12)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${currentPage + 1} / ${totalPages}`, sx(W / 2), sy(buttonY - buttonRadius - 15));
  
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
