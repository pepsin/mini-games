// UI Rendering Module

const { W, H, GROUND_Y, sx, sy, ss } = require('./config.js');
const { getScore, getHighScore, isGameOver } = require('./gameState.js');
const { getCurrentWave, isInInterWave, getInterWaveTimer, getInterWaveDuration, getWaveProgress } = require('./waveSystem.js');
const { roundedRect } = require('./roundedRect.js');

// Draw score panel
function drawUI(ctx) {
  const score = getScore();
  const highScore = getHighScore();
  const currentWave = getCurrentWave();
  const inInterWave = isInInterWave();
  
  // Score panel - Orange/Red gradient
  roundedRect()
    .position(10, 10)
    .size(150, 32)
    .cornerRadius(8)
    .background('#338833')
    .border(1, "#fff")
    .setText(`分数: ${score}`)
    .textStyle('#FFFFFF', 15, 'Arial', 'bold')
    .align('middle', 'middle')
    .setPadding({ left: 12, right: 8, top: 6, bottom: 6 })
    .draw(ctx);

  // High score panel - Purple/Pink gradient
  roundedRect()
    .position(W - 160, 10)
    .size(150, 32)
    .cornerRadius(8)
    .background('#ffaf58')
    .border(1, "#ffe200")
    .setText(`最高分: ${highScore}`)
    .textStyle('#FFFFFF', 13, 'Arial', 'bold')
    .align('middle', 'middle')
    .setPadding({ left: 10, right: 8, top: 6, bottom: 6 })
    .draw(ctx);
  
  // Wave display - Blue/Cyan gradient (changes to green during break)
  const waveText = inInterWave 
    ? `休息 ${Math.ceil((getInterWaveDuration() - getInterWaveTimer()) / 60)}s`
    : `第 ${currentWave} 波`;
  
  roundedRect()
    .position((W - 100) / 2, 10)
    .size(100, 32)
    .cornerRadius(8)
    .background('#000000')
    .setText(waveText)
    .textStyle('#FFFFFF', 14, 'Arial', 'bold')
    .align('center', 'middle')
    .setPadding({ left: 8, right: 8, top: 6, bottom: 6 })
    .draw(ctx);
  
  // Wave progress bar
  if (!inInterWave) {
    const progress = getWaveProgress();
    const fixedBarWidth = 80;
    const barWidth = ss(fixedBarWidth);
    const barHeight = ss(4);
    const barX = sx((W - fixedBarWidth) / 2);
    const barY = sy(10) + ss(32) - ss(8);
    const progressColor = progress > 0.8 ? '#FF6B6B' : (progress > 0.5 ? '#FFD700' : '#4CAF50');
    
    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress
    ctx.fillStyle = progressColor;
    ctx.fillRect(barX, barY, barWidth * Math.max(0,(1 - progress)), barHeight);
  }
}

// Draw game over screen
function drawGameOver(ctx, canvas) {
  const score = getScore();
  const highScore = getHighScore();
  const currentWave = getCurrentWave();
  
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // White background panel using roundedRect
  roundedRect()
    .position((W - 320) / 2, (H - 280) / 2)
    .size(320, 280)
    .cornerRadius(16)
    .background('#FFFFFF')
    .border(4, '#FFD700')
    .shadow('rgba(0,0,0,0.4)', 15, 0, 5)
    .draw(ctx);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF4444';
  ctx.font = `bold ${ss(32)}px Arial`;
  ctx.fillText('游戏结束', sx(W / 2), sy(H / 2) - ss(90));

  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${ss(24)}px Arial`;
  ctx.fillText(`坚持到第 ${currentWave} 波!`, sx(W / 2), sy(H / 2) - ss(50));

  ctx.fillStyle = '#333';
  ctx.font = `bold ${ss(20)}px Arial`;
  ctx.fillText(`分数: ${score}`, sx(W / 2), sy(H / 2) - ss(10));

  ctx.fillStyle = '#9C27B0';
  ctx.font = `bold ${ss(16)}px Arial`;
  ctx.fillText(`最高分: ${highScore}`, sx(W / 2), sy(H / 2) + ss(20));

  if (score >= highScore && score > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${ss(14)}px Arial`;
    ctx.fillText('✨ 新纪录! ✨', sx(W / 2), sy(H / 2) + ss(45));
  }
  
  // Rating
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
  
  if (rating) {
    ctx.fillStyle = ratingColor;
    ctx.font = `bold ${ss(14)}px Arial`;
    ctx.fillText(rating, sx(W / 2), sy(H / 2) + ss(65));
  }

  // Play again button - Orange
  roundedRect()
    .position((W - 140) / 2, (H / 2) + ss(90))
    .size(140, 44)
    .cornerRadius(12)
    .linearGradient(['#FF6B35', '#FF4500'], 90)
    .border(3, '#FFFFFF')
    .shadow('rgba(0,0,0,0.3)', 8, 0, 3)
    .setText('再来一次')
    .textStyle('#FFFFFF', 18, 'Arial', 'bold')
    .align('center', 'middle')
    .setPadding({ left: 10, right: 10, top: 8, bottom: 8 })
    .draw(ctx);
}

// Draw start screen
function drawStartScreen(ctx, canvas) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // White background panel
  const panelWidth = 300;
  const panelHeight = 360;
  roundedRect()
    .position((W - panelWidth) / 2, (H - panelHeight) / 2)
    .size(panelWidth, panelHeight)
    .cornerRadius(20)
    .background('#FFFFFF')
    .border(6, '#FF6B35')
    .draw(ctx);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF6B35';
  ctx.font = `bold ${ss(42)}px Arial`;
  ctx.fillText('一起来护花!', sx(W / 2), sy(H / 2) - ss(100));

  ctx.fillStyle = '#666';
  ctx.font = `${ss(15)}px Arial`;
  ctx.fillText('拖动弹弓瞄准,松开发射!', sx(W / 2), sy(H / 2) - ss(50));
  ctx.fillText('在炸弹落地前击碎它们!', sx(W / 2), sy(H / 2) - ss(25));

  // Bomb icon
  ctx.beginPath();
  ctx.arc(sx(W / 2), sy(H / 2) + ss(20), ss(18), 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();
  ctx.fillStyle = '#FF6B35';
  ctx.beginPath();
  ctx.arc(sx(W / 2), sy(H / 2) + ss(5), ss(5), 0, Math.PI * 2);
  ctx.fill();

  // Start button - Orange
  roundedRect()
    .position((W - 160) / 2, (H / 2) + ss(70))
    .size(160, 50)
    .cornerRadius(15)
    .linearGradient(['#FF6B35', '#FF4500'], 90)
    .border(3, '#FFFFFF')
    .setText('开始游戏')
    .textStyle('#FFFFFF', 22, 'Arial', 'bold')
    .align('center', 'middle')
    .setPadding({ left: 15, right: 15, top: 10, bottom: 10 })
    .draw(ctx);
}

module.exports = {
  drawUI,
  drawGameOver,
  drawStartScreen
};
