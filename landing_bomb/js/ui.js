// UI Rendering Module

const { W, H, GROUND_Y, sx, sy, ss, TOPBAR_CONFIG, WAVE_DISPLAY_OFFSET, INVENTORY_CONFIG } = require('./config.js');
const { getScore, getHighScore, isGameOver, isGamePaused, activePowerups, hasDeadFlower, getFrameCount } = require('./gameState.js');
const { getCurrentWave, isInInterWave, isChallengeAnnouncing, getPendingChallenge, getWaveChangeAnimationProgress } = require('./waveSystem.js');
const { roundedRect } = require('./roundedRect.js');
const { POWERUP_TYPES, getPowerupImage } = require('./powerupSystem.js');
const { drawChallengeHUD, drawChallengeResult, drawChallengeAnnounce } = require('./challengeSystem.js');
const { flexContainer, flexItem } = require('./flexLayout.js');
const { setButtonBounds } = require('./uiState.js');
const { getGameOverSocialData, getDailyHighScore } = require('./socialSystem.js');

// Draw score panel using flex layout
function drawUI(ctx) {
  const score = getScore();
  const highScore = getHighScore();
  const currentWave = getCurrentWave();
  const inInterWave = isInInterWave();
  const isPaused = isGamePaused();

  // Use shared topbar config
  const { marginX, marginY, buttonSize, gap } = TOPBAR_CONFIG;
  const pauseButtonSize = buttonSize;
  const pauseButtonX = marginX;
  const pauseButtonY = marginY;

  // Draw pause button background with roundedRect
  roundedRect()
    .position(pauseButtonX, pauseButtonY)
    .size(pauseButtonSize, pauseButtonSize)
    .cornerRadius(12)
    .background('#ffffff55')
    .border(2, '#444')
    .draw(ctx);

  // Draw pause/play icon
  const px = sx(pauseButtonX);
  const py = sy(pauseButtonY);
  const ps = ss(pauseButtonSize);
  ctx.fillStyle = '#444';
  if (isPaused) {
    // Play icon (triangle)
    ctx.beginPath();
    ctx.moveTo(px + ps * 0.35, py + ps * 0.25);
    ctx.lineTo(px + ps * 0.35, py + ps * 0.75);
    ctx.lineTo(px + ps * 0.7, py + ps * 0.5);
    ctx.closePath();
    ctx.fill();
  } else {
    // Pause icon (two bars)
    const barWidth = ps * 0.2;
    const gap = ps * 0.15;
    const totalWidth = barWidth * 2 + gap;
    const startX = px + (ps - totalWidth) / 2;
    const startY = py + ps * 0.28;
    const barHeight = ps * 0.44;
    ctx.fillRect(startX, startY, barWidth, barHeight);
    ctx.fillRect(startX + barWidth + gap, startY, barWidth, barHeight);
  }

  // Store pause button bounds for hit testing
  setButtonBounds('pauseButton', pauseButtonX, pauseButtonY, pauseButtonSize, pauseButtonSize);

  // Score panel using roundedRect
  const scorePanelX = pauseButtonX + pauseButtonSize + gap;
  const scorePanelWidth = W - marginX * 2 - pauseButtonSize - gap;

  roundedRect()
    .position(scorePanelX, pauseButtonY)
    .size(scorePanelWidth, pauseButtonSize)
    .cornerRadius(12)
    .background('#ffffff55')
    .border(2, '#444')
    .draw(ctx);

  // Draw score text
  const spx = sx(scorePanelX);
  const spy = sy(pauseButtonY);
  const sps = ss(pauseButtonSize);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${20}px Arial`;
  ctx.fillStyle = '#444';
  ctx.fillText(`分数: ${score}`, spx + 12 * sps / pauseButtonSize, spy + sps / 2);

  // Draw wave text on the right side (maps wave 1->1, wave 30->2, etc. to hide the jump)
  const displayWave = currentWave <= 1 ? 1 : (currentWave - WAVE_DISPLAY_OFFSET);
  // Dynamic target: show 30 before reaching 30, 50 before reaching 50, 100 after
  let targetWave = 0;
  if (displayWave < 30) {
    targetWave = 30;
  } else if (displayWave < 50) {
    targetWave = 50;
  } else {
    targetWave = 100;
  }
  
  // Calculate wave change animation scale with quadratic ease-in curve
  const animProgress = getWaveChangeAnimationProgress();
  const easeInProgress = animProgress * animProgress; // Quadratic ease-in
  const waveTextScale = 1.6 - (0.6 * easeInProgress); // Starts at 1.6, animates to 1.0
  
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = `bold ${20}px Arial`;
  ctx.fillStyle = '#444';
  
  const textX = spx + (scorePanelWidth - 12) * sps / pauseButtonSize;
  const textY = spy + sps / 2;
  
  // Measure parts of the wave text
  const suffixAfterSlash = ` ${targetWave} 关`;
  const suffixAfterSlashWidth = ctx.measureText(suffixAfterSlash).width;
  
  // The "/" is positioned at: textX - suffixAfterSlashWidth
  const slashX = textX - suffixAfterSlashWidth;
  
  // Draw static suffix text (the part after "/")
  ctx.fillText(suffixAfterSlash, textX, textY);
  
  // Draw the static "/" separator
  ctx.fillText('/', slashX, textY);
  
  // Draw animated display wave text separately
  // Scale from right edge (where "/" is) to stay aligned
  const displayWaveText = `${displayWave}`;
  const displayWaveWidth = ctx.measureText(displayWaveText).width;
  ctx.translate(slashX, textY);
  ctx.scale(waveTextScale, waveTextScale);
  ctx.fillText(displayWaveText, -displayWaveWidth, 0);
  ctx.restore();

  // Row 2: Powerup HUD (only if active) - positioned to the right of inventory
  let topbarHeight = TOPBAR_CONFIG.baseHeight;
  if (activePowerups.length > 0) {
    // Position HUD to the right of inventory with 10px margin
    const inventoryRightEdge = INVENTORY_CONFIG.baseX + 
      INVENTORY_CONFIG.maxSlots * (INVENTORY_CONFIG.buttonSize + INVENTORY_CONFIG.gap) - 
      INVENTORY_CONFIG.gap;
    const powerupHudX = inventoryRightEdge + 10; // 10px margin from inventory
    const powerupHudY = INVENTORY_CONFIG.baseY + (INVENTORY_CONFIG.buttonSize - 36) / 2; // Vertically centered
    drawPowerupHUD(ctx, activePowerups, powerupHudX, powerupHudY);
    topbarHeight = Math.max(topbarHeight, INVENTORY_CONFIG.baseY + INVENTORY_CONFIG.buttonSize);
  }

  // Challenge HUD (drawn separately as it's centered and has different styling)
  drawChallengeHUD(ctx, getFrameCount(), topbarHeight);
  drawChallengeResult(ctx);

  // Challenge announce during inter-wave
  if (inInterWave && isChallengeAnnouncing()) {
    drawChallengeAnnounce(ctx, getPendingChallenge(), { hasDeadFlower: hasDeadFlower(), wave: currentWave + 1 });
  }
}

// Draw powerup HUD icons at specified position
function drawPowerupHUD(ctx, activePowerups, startX, startY) {
  const iconSize = 36; // 24 * 1.5
  const gap = 9; // 6 * 1.5

  activePowerups.forEach((ap, idx) => {
    const def = POWERUP_TYPES[ap.type];
    const cx = sx(startX + (iconSize + gap) * idx + iconSize / 2);
    const cy = sy(startY + iconSize / 2);
    const r = ss(iconSize / 2);

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Progress arc
    let progress = 1;
    const maxDuration = def.duration;
    if (maxDuration > 0) {
      progress = ap.remaining / maxDuration;
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.closePath();
    ctx.fillStyle = def.color;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Border
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = ss(2.25); // 1.5 * 1.5
    ctx.stroke();

    // Icon or text
    if (ap.type === 'multi_shot' || ap.type === 'explosive' || ap.type === 'dragon_bullet') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${ss(16.5)}px Arial`; // 11 * 1.5
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${ap.remaining}`, cx, cy);
    } else {
      const img = getPowerupImage(ap.type);
      const isSpriteFrame = img && img.isSpriteFrame;
      const actualImg = isSpriteFrame ? img.image : img;
      
      if (actualImg && actualImg.width > 0) {
        const imgSize = r * 0.8;
        if (isSpriteFrame) {
          // Sprite frame: use cropping coordinates
          ctx.drawImage(actualImg, img.sx, img.sy, img.sw, img.sh, cx - imgSize, cy - imgSize, imgSize * 2, imgSize * 2);
        } else {
          // Regular image
          ctx.drawImage(actualImg, cx - imgSize, cy - imgSize, imgSize * 2, imgSize * 2);
        }
      }
    }
  });
}

// Draw game over screen using flex layout
function drawGameOver(ctx, canvas, showSocialFeatures = true) {
  const score = getScore();
  const highScore = getHighScore();
  const currentWave = getCurrentWave();
  
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Rating text
  let rating = '';
  let ratingColor = '#333';
  if (currentWave >= 100) {
    rating = '⭐ 传说! 前1%! ⭐';
    ratingColor = '#FFD700';
  } else if (currentWave >= 50) {
    rating = '🔥 高手! 前10%! 🔥';
    ratingColor = '#FF6B6B';
  } else if (currentWave >= 30) {
    rating = '🌻 干得漂亮! 🌻';
    ratingColor = '#4ECDC4';
  }

  // Get social data
  let socialData = null;
  if (showSocialFeatures) {
    socialData = getGameOverSocialData();
    console.log('GameOver socialData:', socialData);
  }
  const dailyHigh = socialData ? socialData.dailyHigh : getDailyHighScore();
  const isNewDailyHigh = socialData ? socialData.isNewDailyHigh : false;

  // Game over panel with flex layout - 与开始菜单风格一致
  const gameOverPanel = flexContainer()
    .position((W - 300) / 2, (H - 480) / 2)
    .size(300, null) // Fixed width, auto height
    .direction('column')
    .justify('center')
    .align('center')
    .setGap(12)
    .setPadding(25)
    .background('#FFFFFF')
    .border(6, '#FF6B35')
    .cornerRadius(20);

  // Title
  gameOverPanel.addChild(
    flexItem()
      .text('游戏结束', 28)
      .textStyle('#FF6B35', 28, 'Arial', 'bold')
  );

  // Stats container
  const statsContainer = flexContainer()
    .direction('column')
    .justify('center')
    .align('center')
    .setGap(8)
    .addChildren(
      flexItem()
        .text(`分数: ${score}`, 18)
        .textStyle('#333', 18, 'Arial', 'bold'),
      flexItem()
        .text(`今日最高: ${dailyHigh}`, 15)
        .textStyle('#666', 15, 'Arial', 'normal'),
      flexItem()
        .text(`历史最高: ${highScore}`, 14)
        .textStyle('#999', 14, 'Arial', 'normal')
    );

  if (rating) {
    statsContainer.addChild(
      flexItem()
        .text(rating, 14)
        .textStyle(ratingColor, 14, 'Arial', 'bold')
    );
  }

  gameOverPanel.addChild(statsContainer);

  // Buttons container - 与开始菜单一致的垂直排列
  const buttonContainer = flexContainer()
    .direction('column')
    .justify('center')
    .align('center')
    .setGap(10);

  // 分享按钮（如果可用）- 与开始菜单按钮风格一致
  if (showSocialFeatures && socialData) {
    buttonContainer.addChild(
      flexItem()
        .tag('shareButton')
        .text('分享战绩', 16)
        .textStyle('#FFFFFF', 16, 'Arial', 'bold')
        .background('#4ECDC4')
        .size(200, 45)
        .cornerRadius(12)
    );

    // 复活按钮（如果可用）- 与开始菜单按钮风格一致
    if (socialData.canRevive) {
      buttonContainer.addChild(
        flexItem()
          .tag('reviveButton')
          .text(socialData.reviveMessage, 16)
          .textStyle('#FFFFFF', 16, 'Arial', 'bold')
          .background('#FF6B6B')
          .size(200, 45)
          .cornerRadius(12)
      );
    }
  }

  // 再来一次按钮 - 主按钮风格，与开始菜单的"开始游戏"按钮一致
  buttonContainer.addChild(
    flexItem()
      .tag('restartButton')
      .text('再来一次', 18)
      .textStyle('#FFFFFF', 18, 'Arial', 'bold')
      .background('#FF6B35')
      .linearGradient(['#FF6B35', '#FF4500'], 90)
      .size(200, 45)
      .cornerRadius(12)
  );

  gameOverPanel.addChild(buttonContainer);

  gameOverPanel.draw(ctx);
  
  // Store button bounds
  const restartBounds = gameOverPanel.getTaggedBounds('restartButton');
  if (restartBounds) setButtonBounds('restartButton', restartBounds.x, restartBounds.y, restartBounds.width, restartBounds.height);
  
  if (showSocialFeatures && socialData) {
    const shareBounds = gameOverPanel.getTaggedBounds('shareButton');
    if (shareBounds) setButtonBounds('shareButton', shareBounds.x, shareBounds.y, shareBounds.width, shareBounds.height);
    
    const reviveBounds = gameOverPanel.getTaggedBounds('reviveButton');
    if (reviveBounds) setButtonBounds('reviveButton', reviveBounds.x, reviveBounds.y, reviveBounds.width, reviveBounds.height);
  }
}

// Draw start screen using flex layout
function drawStartScreen(ctx, canvas, isPaused = false) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Start screen panel with flex layout
  const panel = flexContainer()
    .position((W - 300) / 2, (H - 400) / 2)
    .size(300, null) // Fixed width, auto height
    .direction('column')
    .justify('center')
    .align('center')
    .setGap(15)
    .setPadding(25)
    .background('#FFFFFF')
    .border(6, '#FF6B35')
    .cornerRadius(20)
    .addChildren(
      // Title
      flexItem()
        .text(isPaused ? '游戏暂停' : '一起来护花', 28)
        .textStyle('#FF6B35', 28, 'Arial', 'bold'),
      
      // Instructions container (only show when not paused)
      !isPaused ? flexContainer()
        .direction('column')
        .justify('center')
        .align('center')
        .setGap(7)
        .addChildren(
          flexItem()
            .text('拖动弹弓瞄准,松开发射!', 15)
            .textStyle('#666', 15),
          flexItem()
            .text('在垃圾落地前打爆它们,', 15)
            .textStyle('#666', 15),
          flexItem()
            .text('保护四朵小花!', 15)
            .textStyle('#666', 15)
        ) : flexItem().size(0, 0),
      
      // Buttons container - sequential arrangement with consistent sizing
      flexContainer()
        .direction('column')
        .justify('center')
        .align('center')
        .setGap(10)
        .addChildren(
          // Start/Resume button - 主按钮风格
          flexItem()
            .tag('startButton')
            .text(isPaused ? '继续游戏' : '< 开始游戏 >', 18)
            .textStyle('#FFFFFF', 18, 'Arial', 'bold')
            .background('#FF6B35')
            .linearGradient(['#FF6B35', '#FF4500'], 90)
            .size(200, 45)
            .cornerRadius(12),
          
          // Restart button - 只在暂停菜单显示
          isPaused ? flexItem()
            .tag('restartFromPauseButton')
            .text('重新开始', 16)
            .textStyle('#FFFFFF', 16, 'Arial', 'bold')
            .background('#FF6B6B')
            .size(200, 45)
            .cornerRadius(12) : flexItem().size(0, 0),
          
          // Leaderboard button
          !isPaused ? flexItem()
            .tag('leaderboardButton')
            .text('排行榜', 16)
            .textStyle('#FFFFFF', 16, 'Arial', 'bold')
            .background('#CCAC00')
            .size(200, 45)
            .cornerRadius(12) : flexItem().size(0, 0),
          
          // Share button
          !isPaused ? flexItem()
            .tag('menuShareButton')
            .text('邀请好友', 16)
            .textStyle('#FFFFFF', 16, 'Arial', 'bold')
            .background('#3EA49D')
            .size(200, 45)
            .cornerRadius(12) : flexItem().size(0, 0),
          
          // Bird album button
          flexItem()
            .tag('birdAlbumButton')
            .text('观鸟图鉴', 16)
            .textStyle('#FFFFFF', 16, 'Arial', 'bold')
            .background('#8B4513')
            .size(200, 45)
            .cornerRadius(12)
        )
    );

  panel.draw(ctx);
  const startBounds = panel.getTaggedBounds('startButton');
  if (startBounds) setButtonBounds('startButton', startBounds.x, startBounds.y, startBounds.width, startBounds.height);
  
  if (!isPaused) {
    const shareBounds = panel.getTaggedBounds('menuShareButton');
    if (shareBounds) setButtonBounds('menuShareButton', shareBounds.x, shareBounds.y, shareBounds.width, shareBounds.height);
    
    const leaderboardBounds = panel.getTaggedBounds('leaderboardButton');
    if (leaderboardBounds) setButtonBounds('leaderboardButton', leaderboardBounds.x, leaderboardBounds.y, leaderboardBounds.width, leaderboardBounds.height);
  } else {
    // 暂停菜单中的重新开始按钮
    const restartFromPauseBounds = panel.getTaggedBounds('restartFromPauseButton');
    if (restartFromPauseBounds) setButtonBounds('restartFromPauseButton', restartFromPauseBounds.x, restartFromPauseBounds.y, restartFromPauseBounds.width, restartFromPauseBounds.height);
  }
  
  // Bird album button bounds (available in both start and pause menus)
  const birdAlbumBounds = panel.getTaggedBounds('birdAlbumButton');
  if (birdAlbumBounds) setButtonBounds('birdAlbumButton', birdAlbumBounds.x, birdAlbumBounds.y, birdAlbumBounds.width, birdAlbumBounds.height);
}

function drawPauseScreen(ctx, canvas) {
  drawStartScreen(ctx, canvas, true);
}

module.exports = {
  drawUI,
  drawGameOver,
  drawStartScreen,
  drawPauseScreen
};
