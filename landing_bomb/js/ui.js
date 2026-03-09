// UI Rendering Module

const { W, H, GROUND_Y, sx, sy, ss } = require('./config.js');
const { getScore, getHighScore, isGameOver } = require('./gameState.js');
const { getCurrentWave, isInInterWave, getInterWaveTimer, getInterWaveDuration, getWaveProgress } = require('./waveSystem.js');

// Draw score panel
function drawUI(ctx) {
  const score = getScore();
  const highScore = getHighScore();
  const currentWave = getCurrentWave();
  const inInterWave = isInInterWave();
  
  // Score panel
  const panelH = ss(30);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(sx(10), sy(10), ss(150), panelH);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = ss(2);
  ctx.strokeRect(sx(10), sy(10), ss(150), panelH);
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${ss(15)}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score}`, sx(18), sy(10) + panelH * 0.65);

  // High score panel
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(sx(W - 170), sy(10), ss(160), panelH);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = ss(2);
  ctx.strokeRect(sx(W - 170), sy(10), ss(160), panelH);
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${ss(13)}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillText(`HI-SCORE: ${highScore}`, sx(W - 160), sy(10) + panelH * 0.65);
  
  // Wave display
  const wavePanelW = ss(100);
  const waveX = (sx(W) - wavePanelW) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(waveX, sy(10), wavePanelW, panelH);
  ctx.strokeStyle = inInterWave ? '#4CAF50' : '#FF6B6B';
  ctx.lineWidth = ss(2);
  ctx.strokeRect(waveX, sy(10), wavePanelW, panelH);
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${ss(14)}px Arial`;
  ctx.textAlign = 'center';
  
  if (inInterWave) {
    const remainingBreak = Math.ceil((getInterWaveDuration() - getInterWaveTimer()) / 60);
    ctx.fillText(`BREAK ${remainingBreak}s`, sx(W / 2), sy(10) + panelH * 0.65);
  } else {
    ctx.fillText(`WAVE ${currentWave}`, sx(W / 2), sy(10) + panelH * 0.65);
  }
  
  // Wave progress bar
  if (!inInterWave) {
    const progress = getWaveProgress();
    const barWidth = wavePanelW - ss(10);
    const barHeight = ss(4);
    const barY = sy(10) + panelH - barHeight - ss(3);
    
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(waveX + ss(5), barY, barWidth, barHeight);
    
    ctx.fillStyle = progress > 0.8 ? '#FF6B6B' : (progress > 0.5 ? '#FFD700' : '#4CAF50');
    ctx.fillRect(waveX + ss(5), barY, barWidth * (1 - progress), barHeight);
  }
}

// Draw game over screen
function drawGameOver(ctx, canvas) {
  const score = getScore();
  const highScore = getHighScore();
  const currentWave = getCurrentWave();
  
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const boxW = ss(320);
  const boxH = ss(280);
  const bx = sx(W / 2) - boxW / 2;
  const by = sy(H / 2) - boxH / 2;
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = ss(3);
  ctx.strokeRect(bx, by, boxW, boxH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF4444';
  ctx.font = `bold ${ss(32)}px Arial`;
  ctx.fillText('GAME OVER', sx(W / 2), by + boxH * 0.22);

  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${ss(24)}px Arial`;
  ctx.fillText(`Wave ${currentWave} Reached!`, sx(W / 2), by + boxH * 0.38);

  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${ss(20)}px Arial`;
  ctx.fillText(`Score: ${score}`, sx(W / 2), by + boxH * 0.52);

  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${ss(16)}px Arial`;
  ctx.fillText(`High Score: ${highScore}`, sx(W / 2), by + boxH * 0.63);

  if (score >= highScore && score > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${ss(14)}px Arial`;
    ctx.fillText('NEW HIGH SCORE!', sx(W / 2), by + boxH * 0.72);
  }
  
  // Rating
  let rating = '';
  let ratingColor = '#FFF';
  if (currentWave >= 100) {
    rating = '⭐ LEGEND! TOP 1%! ⭐';
    ratingColor = '#FFD700';
  } else if (currentWave >= 50) {
    rating = '🔥 EXPERT! Top 10%! 🔥';
    ratingColor = '#FF6B6B';
  } else if (currentWave >= 30) {
    rating = '🌻 Good Job! 🌻';
    ratingColor = '#4ECDC4';
  }
  
  if (rating) {
    ctx.fillStyle = ratingColor;
    ctx.font = `bold ${ss(14)}px Arial`;
    ctx.fillText(rating, sx(W / 2), by + boxH * 0.79);
  }

  // Play again button
  const btnW = ss(140);
  const btnH = ss(40);
  const btnX = sx(W / 2) - btnW / 2;
  const btnY = by + boxH * 0.86;
  
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = '#388E3C';
  ctx.lineWidth = ss(2);
  ctx.strokeRect(btnX, btnY, btnW, btnH);
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${ss(16)}px Arial`;
  ctx.fillText('PLAY AGAIN', sx(W / 2), btnY + btnH * 0.65);
}

// Draw start screen
function drawStartScreen(ctx, canvas) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = sx(W / 2);
  const centerY = sy(H / 2);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${ss(34)}px Arial`;
  ctx.fillText('BOB-OMB SQUAD', centerX, centerY - ss(80));

  ctx.fillStyle = '#FFF';
  ctx.font = `${ss(13)}px Arial`;
  ctx.fillText('Drag the slingshot to aim and release to fire!', centerX, centerY - ss(35));
  ctx.fillText('Hit the bombs before they land!', centerX, centerY - ss(10));

  // Bomb icon
  ctx.beginPath();
  ctx.arc(centerX, centerY + ss(40), ss(15), 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(centerX, centerY + ss(28), ss(4), 0, Math.PI * 2);
  ctx.fill();

  // Start button
  const btnW = ss(140);
  const btnH = ss(44);
  const btnX = centerX - btnW / 2;
  const btnY = centerY + ss(80);
  
  ctx.fillStyle = '#FF5722';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = '#E64A19';
  ctx.lineWidth = ss(2);
  ctx.strokeRect(btnX, btnY, btnW, btnH);
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${ss(20)}px Arial`;
  ctx.fillText('START', centerX, btnY + btnH * 0.6);
}

module.exports = {
  drawUI,
  drawGameOver,
  drawStartScreen
};
