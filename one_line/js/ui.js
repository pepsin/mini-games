const { sx, sy, ss, W, H, COLORS, FONTS } = typeof require !== 'undefined' ? require('./config.js') : window.__modules['js/config.js'];

function drawText(ctx, text, x, y, opts = {}) {
  ctx.font = opts.font || FONTS.body;
  ctx.fillStyle = opts.color || COLORS.text;
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  if (opts.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = ss(4);
  }
  ctx.fillText(text, sx(x), sy(y));
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

function drawPanel(ctx, x, y, w, h, opts = {}) {
  const ctx2 = ctx;
  ctx2.fillStyle = opts.bg || COLORS.panel;
  const r = ss(opts.radius || 16);
  roundRect(ctx2, sx(x), sy(y), ss(w), ss(h), r);
  ctx2.fill();
  if (opts.border) {
    ctx2.strokeStyle = opts.border;
    ctx2.lineWidth = ss(opts.borderWidth || 2);
    roundRect(ctx2, sx(x), sy(y), ss(w), ss(h), r);
    ctx2.stroke();
  }
}

function drawButton(ctx, x, y, w, h, text, opts = {}) {
  const hover = opts.hover || false;
  const bg = hover ? (opts.hoverBg || COLORS.buttonHover) : (opts.bg || COLORS.button);
  ctx.fillStyle = bg;
  const r = ss(opts.radius || 12);
  roundRect(ctx, sx(x), sy(y), ss(w), ss(h), r);
  ctx.fill();
  if (opts.border) {
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = ss(2);
    roundRect(ctx, sx(x), sy(y), ss(w), ss(h), r);
    ctx.stroke();
  }
  drawText(ctx, text, x + w / 2, y + h / 2, {
    font: opts.font || FONTS.body,
    color: opts.color || COLORS.text,
    align: 'center',
    baseline: 'middle'
  });
  return { x, y, w, h };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hitTestButton(x, y, btn) {
  return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
}

// ==================== Screens ====================

function drawStartScreen(ctx, opts = {}) {
  const { onStart, onLeaderboard, onReset } = opts;
  const mx = opts.mx || 0;
  const my = opts.my || 0;

  // BG
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, sx(W), sy(H));

  // Title
  drawText(ctx, '一笔画', W / 2, 200, { font: FONTS.title, color: COLORS.accent, align: 'center', shadow: true });
  drawText(ctx, 'One Line', W / 2, 260, { font: FONTS.subtitle, color: COLORS.textDim, align: 'center' });

  // Subtitle
  drawText(ctx, '从任意起点出发，一笔画完所有道路', W / 2, 340, { font: FONTS.small, color: COLORS.textDim, align: 'center' });

  const btns = [];

  // Start button
  let hover = hitTestButton(mx, my, { x: W / 2 - 100, y: 420, w: 200, h: 50 });
  btns.push({
    ...drawButton(ctx, W / 2 - 100, 420, 200, 50, '开始游戏', { bg: COLORS.accent, hoverBg: COLORS.accentLight, hover, color: '#fff', font: 'bold 20px Arial' }),
    id: 'start'
  });

  // Leaderboard button
  hover = hitTestButton(mx, my, { x: W / 2 - 100, y: 490, w: 200, h: 45 });
  btns.push({
    ...drawButton(ctx, W / 2 - 100, 490, 200, 45, '排行榜', { hover, font: 'bold 18px Arial' }),
    id: 'leaderboard'
  });

  // Reset button
  hover = hitTestButton(mx, my, { x: W / 2 - 100, y: 550, w: 200, h: 40 });
  btns.push({
    ...drawButton(ctx, W / 2 - 100, 550, 200, 40, '重置进度', { hover, font: FONTS.small }),
    id: 'reset'
  });

  return btns;
}

function drawPauseScreen(ctx, opts = {}) {
  const { onResume, onRestart, onHome, onLeaderboard } = opts;
  const mx = opts.mx || 0;
  const my = opts.my || 0;

  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, sx(W), sy(H));

  drawPanel(ctx, W / 2 - 140, 300, 280, 260, { border: COLORS.accent });
  drawText(ctx, '暂停', W / 2, 350, { font: FONTS.subtitle, color: COLORS.accent });

  const btns = [];
  let hover = hitTestButton(mx, my, { x: W / 2 - 100, y: 390, w: 200, h: 44 });
  btns.push({ ...drawButton(ctx, W / 2 - 100, 390, 200, 44, '继续游戏', { bg: COLORS.success, hover, color: '#1a1a2e', font: 'bold 18px Arial' }), id: 'resume' });

  hover = hitTestButton(mx, my, { x: W / 2 - 100, y: 445, w: 200, h: 40 });
  btns.push({ ...drawButton(ctx, W / 2 - 100, 445, 200, 40, '重新开始', { hover, font: 'bold 16px Arial' }), id: 'restart' });

  hover = hitTestButton(mx, my, { x: W / 2 - 100, y: 495, w: 200, h: 40 });
  btns.push({ ...drawButton(ctx, W / 2 - 100, 495, 200, 40, '排行榜', { hover, font: 'bold 16px Arial' }), id: 'leaderboard' });

  return btns;
}

function drawLevelComplete(ctx, level, score, opts = {}) {
  const { onNext, onHome } = opts;
  const mx = opts.mx || 0;
  const my = opts.my || 0;

  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, sx(W), sy(H));

  drawPanel(ctx, W / 2 - 150, 280, 300, 240, { border: COLORS.gold });
  drawText(ctx, '关卡完成!', W / 2, 330, { font: FONTS.subtitle, color: COLORS.gold });
  drawText(ctx, `第 ${level + 1} 关`, W / 2, 370, { font: FONTS.body, color: COLORS.text });
  drawText(ctx, `得分: ${score}`, W / 2, 405, { font: FONTS.body, color: COLORS.success });

  const btns = [];
  let hover = hitTestButton(mx, my, { x: W / 2 - 100, y: 435, w: 200, h: 44 });
  btns.push({ ...drawButton(ctx, W / 2 - 100, 435, 200, 44, '下一关', { bg: COLORS.gold, hover, color: '#1a1a2e', font: 'bold 18px Arial' }), id: 'next' });

  hover = hitTestButton(mx, my, { x: W / 2 - 100, y: 490, w: 200, h: 40 });
  btns.push({ ...drawButton(ctx, W / 2 - 100, 490, 200, 40, '返回主页', { hover, font: '16px Arial' }), id: 'home' });

  return btns;
}

function drawGameHUD(ctx, level, totalLevels, pathCount, totalPath) {
  // Top bar background
  ctx.fillStyle = 'rgba(22,33,62,0.9)';
  ctx.fillRect(0, 0, sx(W), ss(60));

  // Level info
  drawText(ctx, `第 ${level + 1}/${totalLevels} 关`, 20, 30, { font: FONTS.small, color: COLORS.text, align: 'left' });

  // Progress
  const progress = totalPath > 0 ? pathCount / totalPath : 0;
  const barW = 160;
  const barH = 10;
  const barX = W / 2 - barW / 2;
  const barY = 25;
  ctx.fillStyle = '#333';
  roundRect(ctx, sx(barX), sy(barY), ss(barW), ss(barH), ss(5));
  ctx.fill();
  ctx.fillStyle = COLORS.success;
  roundRect(ctx, sx(barX), sy(barY), ss(barW * progress), ss(barH), ss(5));
  ctx.fill();
  drawText(ctx, `${pathCount}/${totalPath}`, W / 2, 50, { font: FONTS.tiny, color: COLORS.textDim });

  // Pause button
  ctx.fillStyle = COLORS.button;
  roundRect(ctx, sx(W - 55), sy(10), ss(40), ss(40), ss(8));
  ctx.fill();
  ctx.fillStyle = COLORS.text;
  ctx.fillRect(sx(W - 47), sy(20), ss(4), ss(20));
  ctx.fillRect(sx(W - 35), sy(20), ss(4), ss(20));
}

function drawAllComplete(ctx, highest, opts = {}) {
  const { onHome, onShare } = opts;
  const mx = opts.mx || 0;
  const my = opts.my || 0;

  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, sx(W), sy(H));

  drawPanel(ctx, W / 2 - 160, 260, 320, 280, { border: COLORS.gold });
  drawText(ctx, '🎉 恭喜! 🎉', W / 2, 310, { font: FONTS.subtitle, color: COLORS.gold });
  drawText(ctx, '你已通关所有关卡!', W / 2, 350, { font: FONTS.body, color: COLORS.text });
  drawText(ctx, `最高纪录: 第 ${highest + 1} 关`, W / 2, 385, { font: FONTS.body, color: COLORS.success });

  const btns = [];
  let hover = hitTestButton(mx, my, { x: W / 2 - 100, y: 420, w: 200, h: 44 });
  btns.push({ ...drawButton(ctx, W / 2 - 100, 420, 200, 44, '分享成绩', { bg: COLORS.success, hover, color: '#1a1a2e', font: 'bold 18px Arial' }), id: 'share' });

  hover = hitTestButton(mx, my, { x: W / 2 - 100, y: 475, w: 200, h: 40 });
  btns.push({ ...drawButton(ctx, W / 2 - 100, 475, 200, 40, '返回主页', { hover, font: '16px Arial' }), id: 'home' });

  return btns;
}

function drawToast(ctx, text, progress) {
  const alpha = progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  const w = 200;
  const h = 40;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  roundRect(ctx, sx(W / 2 - w / 2), sy(200), ss(w), ss(h), ss(8));
  ctx.fill();
  drawText(ctx, text, W / 2, 220, { font: FONTS.small, color: COLORS.text });
  ctx.restore();
}

const moduleExports = {
  drawStartScreen, drawPauseScreen, drawLevelComplete, drawGameHUD,
  drawAllComplete, drawToast, drawButton, drawPanel, drawText,
  roundRect, hitTestButton
};
if (typeof module !== 'undefined' && module.exports) module.exports = moduleExports;
if (typeof window !== 'undefined') {
  window.__modules = window.__modules || {};
  window.__modules['js/ui.js'] = moduleExports;
}
