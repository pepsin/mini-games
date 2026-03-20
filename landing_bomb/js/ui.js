// UI Rendering Module

const { W, H, GROUND_Y, sx, sy, ss, TOPBAR_CONFIG } = require('./config.js');
const { getScore, getHighScore, isGameOver, isGamePaused, activePowerups, hasDeadFlower, getFrameCount } = require('./gameState.js');
const { getCurrentWave, isInInterWave, isChallengeAnnouncing, getPendingChallenge } = require('./waveSystem.js');
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
    .cornerRadius(8)
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
    .cornerRadius(8)
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

  // Draw wave text in the middle of the topbar (maps wave 1->1, wave 30->2, etc. to hide the jump)
  const displayWave = currentWave <= 1 ? 1 : (currentWave - 28);
  // Dynamic target: show 30 before reaching 30, 50 before reaching 50, 100 after
  let targetWave;
  if (currentWave < 30) {
    targetWave = 30;
  } else if (currentWave < 50) {
    targetWave = 50;
  } else {
    targetWave = 100;
  }
  ctx.textAlign = 'center';
  ctx.font = `bold ${20}px Arial`;
  ctx.fillStyle = '#444';
  ctx.fillText(`${displayWave}/${targetWave} 关`, spx + (scorePanelWidth * sps / pauseButtonSize) / 2, spy + sps / 2);

  // Draw high score text (right aligned)
  ctx.textAlign = 'right';
  ctx.font = `13px Arial`;
  ctx.fillStyle = '#666';
  ctx.fillText(`最高: ${highScore}`, spx + (scorePanelWidth - 12) * sps / pauseButtonSize, spy + sps / 2 - 6);
  
  // Draw daily high score
  const dailyHigh = getDailyHighScore();
  ctx.font = `11px Arial`;
  ctx.fillStyle = '#4ECDC4';
  ctx.fillText(`今日: ${dailyHigh}`, spx + (scorePanelWidth - 12) * sps / pauseButtonSize, spy + sps / 2 + 8);

  // Row 2: Powerup HUD (only if active) - positioned below inventory
  let topbarHeight = TOPBAR_CONFIG.baseHeight;
  if (activePowerups.length > 0) {
    // Inventory is at baseHeight + 6 with buttonSize 40, so HUD goes below it
    const inventoryBottom = TOPBAR_CONFIG.baseHeight + 6 + 40;
    const powerupRowY = inventoryBottom + 8; // 8px gap below inventory
    drawPowerupHUD(ctx, activePowerups, marginX, powerupRowY);
    topbarHeight = powerupRowY + 42; // 42 is icon height (28 * 1.5)
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
      if (img && img.width > 0) {
        const imgSize = r * 0.8;
        ctx.drawImage(img, cx - imgSize, cy - imgSize, imgSize * 2, imgSize * 2);
      }
    }
  });
}

// Draw game over screen using flex layout
function drawGameOver(ctx, canvas, showSocialFeatures = true) {
  const score = getScore();
  const highScore = getHighScore();
  const currentWave = getCurrentWave();
  
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
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
  }
  const dailyHigh = socialData ? socialData.dailyHigh : getDailyHighScore();
  const isNewDailyHigh = socialData ? socialData.isNewDailyHigh : false;

  // Game over panel with flex layout
  const gameOverPanel = flexContainer()
    .position((W - 320) / 2, (H - 420) / 2)
    .size(320, null) // Fixed width, auto height
    .direction('column')
    .justify('center')
    .align('center')
    .setGap(10)
    .setPadding(20)
    .background('#FFFFFF')
    .border(6, '#FF6B35')
    .cornerRadius(16);

  // Title
  gameOverPanel.addChild(
    flexItem()
      .text('游戏结束', 32)
      .textStyle('#FF6B35', 32, 'Arial', 'bold')
  );

  // Stats container
  const statsContainer = flexContainer()
    .direction('column')
    .justify('center')
    .align('center')
    .setGap(6)
    .addChildren(
      flexItem()
        .size(10, 20),
      flexItem()
        .text(`分数: ${score}`, 20)
        .textStyle('#333', 20, 'Arial', 'bold'),
      flexItem()
        .text(`今日最高: ${dailyHigh}`, 16)
        .textStyle('#4ECDC4', 16, 'Arial', 'bold'),
      flexItem()
        .text(`历史最高: ${highScore}`, 14)
        .textStyle('#666', 14, 'Arial', 'normal')
    );

  if (score >= highScore && score > 0) {
    statsContainer.addChild(
      flexItem()
        .text('🏆 新纪录! 🏆', 14)
        .textStyle('#FFD700', 14, 'Arial', 'bold')
    );
  } else if (isNewDailyHigh && score > 0) {
    statsContainer.addChild(
      flexItem()
        .text('📅 今日新高! 📅', 14)
        .textStyle('#4ECDC4', 14, 'Arial', 'bold')
    );
  }

  if (rating) {
    statsContainer.addChild(
      flexItem()
        .text(rating, 14)
        .textStyle(ratingColor, 14, 'Arial', 'bold')
    );
  }

  gameOverPanel.addChild(statsContainer);

  // Social buttons container
  if (showSocialFeatures && socialData) {
    const buttonContainer = flexContainer()
      .direction('row')
      .justify('center')
      .align('center')
      .setGap(10);

    // Share button
    buttonContainer.addChild(
      flexItem()
        .tag('shareButton')
        .text('分享战绩', 16)
        .textStyle('#FFFFFF', 16, 'Arial', 'bold')
        .background('#4ECDC4')
        .padding({ left: 20, right: 20, top: 10, bottom: 10 })
        .cornerRadius(8)
    );

    // Revive button (if available)
    if (socialData.canRevive) {
      buttonContainer.addChild(
        flexItem()
          .tag('reviveButton')
          .text(socialData.reviveMessage, 16)
          .textStyle('#FFFFFF', 16, 'Arial', 'bold')
          .background('#FF6B6B')
          .padding({ left: 20, right: 20, top: 10, bottom: 10 })
          .cornerRadius(8)
      );
    }

    gameOverPanel.addChild(buttonContainer);
  }

  // Play again button
  gameOverPanel.addChild(
    flexItem()
      .tag('restartButton')
      .text('再来一次', 22)
      .textStyle('#FFFFFF', 22, 'Arial', 'bold')
      .background('#FF6B35')
      .padding({ left: 50, right: 50, top: 12, bottom: 12 })
      .cornerRadius(12)
  );

  gameOverPanel.draw(ctx);
  
  // Store button bounds
  const restartBounds = gameOverPanel.getTaggedBounds('restartButton');
  if (restartBounds) setButtonBounds('restartButton', restartBounds.x, restartBounds.y, restartBounds.width, restartBounds.height);
  
  if (showSocialFeatures) {
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
        .text(isPaused ? '游戏暂停' : '一起来护花!', 28)
        .textStyle('#FF6B35', 28, 'Arial', 'bold'),
      
      // Instructions container (only show when not paused)
      !isPaused ? flexContainer()
        .direction('column')
        .justify('center')
        .align('center')
        .setGap(5)
        .addChildren(
          flexItem()
            .text('拖动弹弓瞄准,松开发射!', 15)
            .textStyle('#666', 15),
          flexItem()
            .text('在炸弹落地前打穿它们!', 15)
            .textStyle('#666', 15)
        ) : flexItem().size(0, 0),
      
      // Bomb icon (only show when not paused)
      !isPaused ? flexItem()
        .size(40, 40)
        .render((ctx, x, y, w, h, scale) => {
          const cx = x + w / 2;
          const cy = y + h / 2;
          const radius = 18 * scale;
          
          // Bomb body
          ctx.beginPath();
          ctx.arc(cx, cy + 5 * scale, radius, 0, Math.PI * 2);
          ctx.fillStyle = '#333';
          ctx.fill();
          
          // Fuse
          ctx.fillStyle = '#FF6B35';
          ctx.beginPath();
          ctx.arc(cx, cy - 10 * scale, 5 * scale, 0, Math.PI * 2);
          ctx.fill();
        }) : flexItem().size(0, 0),
      
      // Start/Resume button
      flexItem()
        .tag('startButton')
        .text(isPaused ? '继续' : '开始游戏', 22)
        .textStyle('#FFFFFF', 22, 'Arial', 'bold')
        .background('#FF6B35')
        .linearGradient(['#FF6B35', '#FF4500'], 90)
        .padding({ left: 50, right: 50, top: 12, bottom: 12 })
        .cornerRadius(15),
      
      // Social buttons row
      !isPaused ? flexContainer()
        .direction('row')
        .justify('center')
        .align('center')
        .setGap(10)
        .addChildren(
          // Leaderboard button
          flexItem()
            .tag('leaderboardButton')
            .text('排行榜', 14)
            .textStyle('#FFFFFF', 14, 'Arial', 'bold')
            .background('#FFD700')
            .padding({ left: 20, right: 20, top: 8, bottom: 8 })
            .cornerRadius(8),
          // Share button
          flexItem()
            .tag('menuShareButton')
            .text('邀请好友', 14)
            .textStyle('#FFFFFF', 14, 'Arial', 'bold')
            .background('#4ECDC4')
            .padding({ left: 20, right: 20, top: 8, bottom: 8 })
            .cornerRadius(8)
        ) : flexItem().size(0, 0),
      
      // Skin gallery button (hidden for now)
      flexItem().size(0, 0)
    );

  panel.draw(ctx);
  const startBounds = panel.getTaggedBounds('startButton');
  if (startBounds) setButtonBounds('startButton', startBounds.x, startBounds.y, startBounds.width, startBounds.height);
  
  if (!isPaused) {
    const shareBounds = panel.getTaggedBounds('menuShareButton');
    if (shareBounds) setButtonBounds('menuShareButton', shareBounds.x, shareBounds.y, shareBounds.width, shareBounds.height);
    
    const leaderboardBounds = panel.getTaggedBounds('leaderboardButton');
    if (leaderboardBounds) setButtonBounds('leaderboardButton', leaderboardBounds.x, leaderboardBounds.y, leaderboardBounds.width, leaderboardBounds.height);
  }
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
