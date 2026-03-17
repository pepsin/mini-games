// UI Rendering Module

const { W, H, GROUND_Y, sx, sy, ss } = require('./config.js');
const { getScore, getHighScore, isGameOver, isGamePaused, activePowerups, hasDeadFlower, getFrameCount } = require('./gameState.js');
const { getCurrentWave, isInInterWave, isChallengeAnnouncing, getPendingChallenge } = require('./waveSystem.js');
const { roundedRect } = require('./roundedRect.js');
const { drawActivePowerupHUD } = require('./powerupSystem.js');
const { drawChallengeHUD, drawChallengeResult, drawChallengeAnnounce } = require('./challengeSystem.js');
const { flexContainer, flexItem } = require('./flexLayout.js');
const { setButtonBounds } = require('./uiState.js');

// Draw score panel using flex layout
function drawUI(ctx) {
  const score = getScore();
  const highScore = getHighScore();
  const currentWave = getCurrentWave();
  const inInterWave = isInInterWave();

  // Independent pause button on the left
  const isPaused = isGamePaused();
  const pauseButtonSize = 36;
  const pauseButtonX = 10;
  const pauseButtonY = 23;
  
  // Score panel with flex layout - auto-sizing container
  const scorePanelWidth = W - 20 - 44; // Leave space for pause button (36 + 8 gap)
  flexContainer()
    .position(10 + pauseButtonSize + 8, 23)
    .size(scorePanelWidth, 36) // Fixed width, fixed height
    .direction('row')
    .justify('space-between')
    .align('center')
    .setPadding({ left: 12, right: 12, top: 0, bottom: 0 })
    .background('#ffffff55')
    .border(2, '#444')
    .cornerRadius(8)
    .addChildren(
      flexItem()
        .text(`分数: ${score}`, 20)
        .textStyle('#444', 20, 'Arial', 'bold'),
      flexItem()
        .size(20,20),
      flexItem()
        .text(`最高: ${highScore}`, 16)
        .textStyle('#666', 20)
    )
    .draw(ctx);

  // Pause button rendering - same style as topbar
  
  flexItem()
    .tag('pauseButton')
    .size(pauseButtonSize, pauseButtonSize)
    .render((ctx, x, y, w, h, scale) => {
      const cornerRadius = 8 * scale;
      
      // Draw rounded square background - same as topbar (#ffffff55)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + cornerRadius, y);
      ctx.lineTo(x + w - cornerRadius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + cornerRadius);
      ctx.lineTo(x + w, y + h - cornerRadius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - cornerRadius, y + h);
      ctx.lineTo(x + cornerRadius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - cornerRadius);
      ctx.lineTo(x, y + cornerRadius);
      ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
      ctx.closePath();
      
      // Fill with same background as topbar
      ctx.fillStyle = '#ffffff55';
      ctx.fill();
      
      // Draw border - same as topbar (#444)
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
      ctx.restore();
      
      // Draw pause icon (two vertical bars) or play icon (triangle) - same color as border (#444)
      ctx.fillStyle = '#444';
      if (isPaused) {
        // Play icon (triangle) - centered
        ctx.beginPath();
        ctx.moveTo(x + w * 0.35, y + h * 0.25);
        ctx.lineTo(x + w * 0.35, y + h * 0.75);
        ctx.lineTo(x + w * 0.7, y + h * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        // Pause icon (two vertical bars) - centered
        const barWidth = w * 0.2;
        const gap = w * 0.15;
        const totalWidth = barWidth * 2 + gap;
        const startX = x + (w - totalWidth) / 2;
        const startY = y + h * 0.28;
        const barHeight = h * 0.44;
        ctx.fillRect(startX, startY, barWidth, barHeight);
        ctx.fillRect(startX + barWidth + gap, startY, barWidth, barHeight);
      }
    })
    .draw(ctx, sx(pauseButtonX), sy(pauseButtonY), ss(pauseButtonSize), ss(pauseButtonSize), ss(1));
  
  // Store pause button bounds for hit testing
  setButtonBounds('pauseButton', pauseButtonX, pauseButtonY, pauseButtonSize, pauseButtonSize);

  // Active powerup icons
  drawActivePowerupHUD(ctx, activePowerups);

  // Challenge HUD
  drawChallengeHUD(ctx, getFrameCount());
  drawChallengeResult(ctx);

  // Challenge announce during inter-wave
  if (inInterWave && isChallengeAnnouncing()) {
    drawChallengeAnnounce(ctx, getPendingChallenge(), { hasDeadFlower: hasDeadFlower(), wave: currentWave + 1 });
  }
}

// Draw game over screen using flex layout
function drawGameOver(ctx, canvas) {
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

  // Game over panel with flex layout
  const gameOverPanel = flexContainer()
    .position((W - 300) / 2, (H - 320) / 2)
    .size(300, null) // Fixed width, auto height
    .direction('column')
    .justify('center')
    .align('center')
    .setGap(12)
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
    .setGap(8)
    .addChildren(
      flexItem()
        .size(10, 30),
      flexItem()
        .text(`分数: ${score}`, 20)
        .textStyle('#333', 20, 'Arial', 'bold'),
      flexItem()
        .text(`最高分: ${highScore}`, 16)
        .textStyle('#ff6f00', 16, 'Arial', 'bold')
    );

  if (score >= highScore && score > 0) {
    statsContainer.addChild(
      flexItem()
        .text('✨ 新纪录! ✨', 14)
        .textStyle('#FFD700', 14, 'Arial', 'bold')
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

  // Play again button
  gameOverPanel.addChild(
    flexItem()
      .tag('restartButton')
      .text('再来一次', 22)
      .textStyle('#FFFFFF', 22, 'Arial', 'bold')
      .background('#FF6B35')
      .padding({ left: 40, right: 40, top: 12, bottom: 12 })
      .cornerRadius(12)
  );

  gameOverPanel.draw(ctx);
  const restartBounds = gameOverPanel.getTaggedBounds('restartButton');
  if (restartBounds) setButtonBounds('restartButton', restartBounds.x, restartBounds.y, restartBounds.width, restartBounds.height);
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
        .cornerRadius(15)
    );

  panel.draw(ctx);
  const startBounds = panel.getTaggedBounds('startButton');
  if (startBounds) setButtonBounds('startButton', startBounds.x, startBounds.y, startBounds.width, startBounds.height);
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
