// UI Rendering Module

const { W, H, GROUND_Y, sx, sy, ss } = require('./config.js');
const { getScore, getHighScore, isGameOver, activePowerups, hasDeadFlower } = require('./gameState.js');
const { getCurrentWave, isInInterWave, isChallengeAnnouncing, getPendingChallenge } = require('./waveSystem.js');
const { roundedRect } = require('./roundedRect.js');
const { drawActivePowerupHUD } = require('./powerupSystem.js');
const { drawChallengeHUD, drawChallengeResult, drawChallengeAnnounce } = require('./challengeSystem.js');
const { flexContainer, flexItem } = require('./flexLayout.js');

// Draw score panel using flex layout
function drawUI(ctx) {
  const score = getScore();
  const highScore = getHighScore();
  const currentWave = getCurrentWave();
  const inInterWave = isInInterWave();

  // Score panel with flex layout - auto-sizing container
  flexContainer()
    .position(10, 10)
    .size(W - 20, 40) // Fixed width, fixed height
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
        .text(`最高: ${highScore}`, 16)
        .textStyle('#666', 16)
    )
    .draw(ctx);

  // Active powerup icons
  drawActivePowerupHUD(ctx, activePowerups);

  // Challenge HUD
  drawChallengeHUD(ctx);
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
        .text(`坚持到第 ${currentWave} 波!`, 24)
        .textStyle('#333', 24),
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
      .text('再来一次', 22)
      .textStyle('#FFFFFF', 22, 'Arial', 'bold')
      .background('#FF6B35')
      .padding({ left: 40, right: 40, top: 12, bottom: 12 })
      .cornerRadius(12)
  );

  gameOverPanel.draw(ctx);
}

// Draw start screen using flex layout
function drawStartScreen(ctx, canvas) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Start screen panel with flex layout
  flexContainer()
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
        .text('一起来护花!', 42)
        .textStyle('#FF6B35', 42, 'Arial', 'bold'),
      
      // Instructions container
      flexContainer()
        .direction('column')
        .justify('center')
        .align('center')
        .setGap(5)
        .addChildren(
          flexItem()
            .text('拖动弹弓瞄准,松开发射!', 15)
            .textStyle('#666', 15),
          flexItem()
            .text('在炸弹落地前击碎它们!', 15)
            .textStyle('#666', 15)
        ),
      
      // Bomb icon (using custom render)
      flexItem()
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
        }),
      
      // Start button
      flexItem()
        .text('开始游戏', 22)
        .textStyle('#FFFFFF', 22, 'Arial', 'bold')
        .background('#FF6B35')
        .linearGradient(['#FF6B35', '#FF4500'], 90)
        .padding({ left: 50, right: 50, top: 12, bottom: 12 })
        .cornerRadius(15)
    )
    .draw(ctx);
}

module.exports = {
  drawUI,
  drawGameOver,
  drawStartScreen
};
