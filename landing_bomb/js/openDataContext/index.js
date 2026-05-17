// Open Data Context for WeChat Friend Leaderboard
// This runs in a separate context and handles rendering the leaderboard

let sharedCanvas = wx.getSharedCanvas();
let ctx = sharedCanvas.getContext('2d');

let isLeaderboardVisible = false;
let userData = [];
let safeAreaTop = 0;

// Avatar image cache: openid -> HTMLImageElement
const avatarCache = {};
// Track which avatars have finished loading
const avatarLoaded = {};

// Initialize
wx.onMessage((data) => {
  console.log('Open data context received message:', data);
  
  switch (data.action) {
    case 'setUserCloudStorage':
      // Store score to cloud
      wx.setUserCloudStorage({
        KVDataList: [
          { key: 'score', value: String(data.value) }
        ],
        success: () => {
          console.log('Score saved to cloud:', data.value);
        },
        fail: (err) => {
          console.log('Failed to save score:', err);
        }
      });
      break;
      
    case 'showFriendRank':
      // Set shared canvas size from main canvas dimensions
      if (data.width && data.height) {
        sharedCanvas.width = data.width;
        sharedCanvas.height = data.height;
      }
      safeAreaTop = data.safeAreaTop || 0;
      showLeaderboard();
      break;
      
    case 'hideFriendRank':
      hideLeaderboard();
      break;
      
    default:
      console.log('Unknown action:', data.action);
  }
});

function loadAvatar(user) {
  const openid = user.openid;
  const url = user.avatarUrl;
  if (!openid || !url) return;
  if (avatarCache[openid]) return; // Already loading or loaded

  const img = wx.createImage();
  avatarCache[openid] = img;
  img.onload = () => {
    avatarLoaded[openid] = true;
    if (isLeaderboardVisible) {
      drawLeaderboard();
    }
  };
  img.onerror = () => {
    console.log('Failed to load avatar for', openid);
    // Keep as not loaded; fallback placeholder will be used
  };
  img.src = url;
}

function showLeaderboard() {
  isLeaderboardVisible = true;

  // Get friend data
  wx.getFriendCloudStorage({
    keyList: ['score'],
    success: (res) => {
      console.log('Friend data:', res);
      userData = res.data || [];
      // Sort by score (descending)
      userData.sort((a, b) => {
        const kvA = a.KVDataList && a.KVDataList.find(function(kv) { return kv.key === 'score'; });
        const kvB = b.KVDataList && b.KVDataList.find(function(kv) { return kv.key === 'score'; });
        const scoreA = parseInt((kvA && kvA.value) || 0);
        const scoreB = parseInt((kvB && kvB.value) || 0);
        return scoreB - scoreA;
      });
      // Preload avatars
      userData.forEach(loadAvatar);
      drawLeaderboard();
    },
    fail: (err) => {
      console.log('Failed to get friend data:', err);
      drawError('无法加载排行榜');
    }
  });
}

function hideLeaderboard() {
  isLeaderboardVisible = false;
  ctx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
}

function drawLeaderboard() {
  if (!isLeaderboardVisible) return;
  
  const W = sharedCanvas.width;
  const H = sharedCanvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, W, H);
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);
  
  // Title - offset by safe area top
  const titleY = 40 + safeAreaTop;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('🏆 好友排行榜 🏆', W / 2, titleY);
  
  // Draw user list
  const startY = titleY + 40;
  const itemHeight = 50;
  const maxItems = Math.min(userData.length, 10);
  
  for (let i = 0; i < maxItems; i++) {
    const user = userData[i];
    const y = startY + i * itemHeight;
    
    // Background
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(20, y, W - 40, itemHeight - 2);
    }
    
    // Rank
    let rankColor = '#FFFFFF';
    if (i === 0) rankColor = '#FFD700'; // Gold
    if (i === 1) rankColor = '#C0C0C0'; // Silver
    if (i === 2) rankColor = '#CD7F32'; // Bronze
    
    ctx.fillStyle = rankColor;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}`, 40, y + 25);
    
    // Avatar (real WeChat avatar, circular clip)
    const openid = user.openid;
    const avatarImg = avatarCache[openid];
    const avatarReady = avatarLoaded[openid];
    const cx = 90;
    const cy = y + 25;
    const r = 15;

    if (avatarImg && avatarReady) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      // White border around avatar
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Placeholder while loading or if no avatar
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#4ECDC4';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Nickname
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const nickname = user.nickname || '未知玩家';
    ctx.fillText(nickname, 120, y + 25);
    
    // Score
    const score = (user.KVDataList && user.KVDataList.find(function(kv) { return kv.key === 'score'; }));
    const scoreVal = (score && score.value) || '0';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(scoreVal, W - 40, y + 25);
  }
  
  // Close hint
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('点击任意处关闭', W / 2, H - 30);
}

function drawError(message) {
  const W = sharedCanvas.width;
  const H = sharedCanvas.height;
  
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);
  
  ctx.fillStyle = '#FF6B6B';
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, W / 2, H / 2);
}

console.log('Open data context loaded');
