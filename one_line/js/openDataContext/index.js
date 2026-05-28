// WeChat Open Data Context - Leaderboard
const sharedCanvas = wx.getSharedCanvas();
const ctx = sharedCanvas.getContext('2d');

let visible = false;
let currentLevel = 0;
let friendData = [];
let myRank = null;

function render() {
  if (!visible) {
    ctx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
    return;
  }

  const w = sharedCanvas.width;
  const h = sharedCanvas.height;
  const dpr = wx.getSystemInfoSync().pixelRatio || 1;

  ctx.clearRect(0, 0, w, h);

  // BG overlay
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, w, h);

  const panelW = Math.min(380 * dpr, w * 0.9);
  const panelH = Math.min(520 * dpr, h * 0.75);
  const px = (w - panelW) / 2;
  const py = (h - panelH) / 2;

  // Panel
  ctx.fillStyle = '#16213e';
  roundRect(ctx, px, py, panelW, panelH, 16 * dpr);
  ctx.fill();
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2 * dpr;
  roundRect(ctx, px, py, panelW, panelH, 16 * dpr);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold ${24 * dpr}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏆 好友排行榜 🏆', px + panelW / 2, py + 35 * dpr);

  // Subtitle
  ctx.fillStyle = '#aaa';
  ctx.font = `${14 * dpr}px Arial`;
  ctx.fillText(`突破关卡数排名`, px + panelW / 2, py + 60 * dpr);

  // Close button
  const cx = px + panelW - 30 * dpr;
  const cy = py + 30 * dpr;
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(cx, cy, 16 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${16 * dpr}px Arial`;
  ctx.fillText('×', cx, cy + 2 * dpr);

  // List
  const rowH = 48 * dpr;
  const startY = py + 90 * dpr;
  const maxRows = Math.floor((panelH - 110 * dpr) / rowH);

  const data = friendData.slice(0, maxRows);
  data.forEach((item, idx) => {
    const ry = startY + idx * rowH;
    if (idx % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(px + 10 * dpr, ry, panelW - 20 * dpr, rowH);
    }

    // Rank
    const rank = idx + 1;
    let rankColor = '#fff';
    if (rank === 1) rankColor = '#ffd700';
    else if (rank === 2) rankColor = '#c0c0c0';
    else if (rank === 3) rankColor = '#cd7f32';
    ctx.fillStyle = rankColor;
    ctx.font = `bold ${16 * dpr}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(String(rank), px + 30 * dpr, ry + rowH / 2 + 4 * dpr);

    // Avatar
    if (item.avatarUrl) {
      const img = wx.createImage();
      img.src = item.avatarUrl;
      ctx.save();
      ctx.beginPath();
      ctx.arc(px + 70 * dpr, ry + rowH / 2, 16 * dpr, 0, Math.PI * 2);
      ctx.clip();
      try { ctx.drawImage(img, px + 54 * dpr, ry + rowH / 2 - 16 * dpr, 32 * dpr, 32 * dpr); } catch(e) {}
      ctx.restore();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = dpr;
      ctx.beginPath();
      ctx.arc(px + 70 * dpr, ry + rowH / 2, 16 * dpr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Nickname
    ctx.fillStyle = '#eee';
    ctx.font = `${14 * dpr}px Arial`;
    ctx.textAlign = 'left';
    const nick = item.nickname || '匿名';
    ctx.fillText(nick.length > 8 ? nick.slice(0, 8) + '...' : nick, px + 95 * dpr, ry + rowH / 2 + 4 * dpr);

    // Score
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${14 * dpr}px Arial`;
    ctx.textAlign = 'right';
    ctx.fillText(`第${(item.level || 0) + 1}关`, px + panelW - 20 * dpr, ry + rowH / 2 + 4 * dpr);
  });

  if (data.length === 0) {
    ctx.fillStyle = '#888';
    ctx.font = `${14 * dpr}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('暂无好友数据', px + panelW / 2, py + panelH / 2);
  }
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

function fetchData() {
  wx.getFriendCloudStorage({
    keyList: ['one_line_best_level'],
    success: (res) => {
      friendData = res.data
        .map(item => ({
          openid: item.openid,
          nickname: item.nickname,
          avatarUrl: item.avatarUrl,
          level: parseInt(item.KVDataList.find(kv => kv.key === 'one_line_best_level')?.value || '0')
        }))
        .sort((a, b) => b.level - a.level);
      render();
    },
    fail: () => {
      friendData = [];
      render();
    }
  });
}

wx.onMessage((msg) => {
  if (msg.action === 'showLeaderboard') {
    visible = true;
    currentLevel = msg.level || 0;
    fetchData();
  } else if (msg.action === 'hideLeaderboard') {
    visible = false;
    render();
  } else if (msg.action === 'updateScore') {
    wx.setUserCloudStorage({
      KVDataList: [{ key: 'one_line_best_level', value: String(msg.level || 0) }]
    });
  }
});
