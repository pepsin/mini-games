// Open Data Context for WeChat Friend Leaderboard
// This runs in a separate context and handles rendering the leaderboard

let sharedCanvas = wx.getSharedCanvas();
let ctx = sharedCanvas.getContext('2d');

let isLeaderboardVisible = false;
let userData = [];
let safeAreaTop = 0;
let currentTab = 'score'; // 'score' or 'bird'

// Avatar image cache: openid -> HTMLImageElement
const avatarCache = {};
// Track which avatars have finished loading
const avatarLoaded = {};

// Initialize
wx.onMessage((data) => {
  console.log('Open data context received message:', data);
  
  switch (data.action) {
    case 'setUserCloudStorage':
      // Store score/birdCount to cloud
      wx.setUserCloudStorage({
        KVDataList: [
          { key: data.key, value: String(data.value) }
        ],
        success: () => {
          console.log('Cloud data saved:', data.key, data.value);
        },
        fail: (err) => {
          console.log('Failed to save cloud data:', err);
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
      if (data.tab) {
        currentTab = data.tab;
      }
      showLeaderboard();
      break;
      
    case 'hideFriendRank':
      hideLeaderboard();
      break;

    case 'switchTab':
      if (data.tab && data.tab !== currentTab) {
        currentTab = data.tab;
        if (isLeaderboardVisible) {
          showLeaderboard();
        }
      }
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

  // Draw loading state immediately so user sees feedback
  drawLoading();

  // Guard against API hanging due to privacy permission issues
  let hasResponded = false;
  const TIMEOUT_MS = 5000;

  function handleResponse(callback) {
    return function(...args) {
      if (hasResponded) return;
      hasResponded = true;
      callback.apply(null, args);
    };
  }

  const timeoutId = setTimeout(handleResponse(() => {
    console.log('getFriendCloudStorage timed out - likely privacy permission not granted');
    drawError('无法加载排行榜', '请检查隐私授权设置');
  }), TIMEOUT_MS);

  // Get friend data (both score and birdCount)
  wx.getFriendCloudStorage({
    keyList: ['score', 'birdCount'],
    success: handleResponse((res) => {
      clearTimeout(timeoutId);
      console.log('Friend data:', res);
      userData = res.data || [];
      // Sort by current tab's key (descending)
      userData.sort((a, b) => {
        const kvA = a.KVDataList && a.KVDataList.find(function(kv) { return kv.key === currentTab; });
        const kvB = b.KVDataList && b.KVDataList.find(function(kv) { return kv.key === currentTab; });
        const valA = parseInt((kvA && kvA.value) || 0);
        const valB = parseInt((kvB && kvB.value) || 0);
        return valB - valA;
      });
      // Preload avatars
      userData.forEach(loadAvatar);
      drawLeaderboard();
    }),
    fail: handleResponse((err) => {
      clearTimeout(timeoutId);
      console.log('Failed to get friend data:', err);
      const errMsg = (err && err.errMsg) || '';
      if (errMsg.indexOf('auth') !== -1 || errMsg.indexOf('privacy') !== -1 || errMsg.indexOf('permission') !== -1) {
        drawError('无法加载排行榜', '请检查隐私授权设置');
      } else {
        drawError('无法加载排行榜', '请稍后重试');
      }
    })
  });
}

function hideLeaderboard() {
  isLeaderboardVisible = false;
  ctx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
}

function getTabLabel(tab) {
  return tab === 'score' ? '分数排行' : '观鸟排行';
}

function getTabValueLabel(tab) {
  return tab === 'score' ? '分' : '种';
}

function drawRoundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawTabs(W, titleY) {
  const tabY = titleY + 35;
  const tabHeight = 36;
  const tabGap = 10;
  const sideMargin = 40;
  const tabWidth = (W - sideMargin * 2 - tabGap) / 2;

  const tabs = [
    { key: 'score', x: sideMargin, label: getTabLabel('score') },
    { key: 'bird', x: sideMargin + tabWidth + tabGap, label: getTabLabel('bird') }
  ];

  tabs.forEach(tab => {
    const isActive = currentTab === tab.key;
    const cx = tab.x + tabWidth / 2;
    const cy = tabY + tabHeight / 2;

    // Tab background
    if (isActive) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
      drawRoundRectPath(ctx, tab.x, tabY, tabWidth, tabHeight, 8);
      ctx.fill();

      // Active bottom border
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(tab.x + 10, tabY + tabHeight - 3, tabWidth - 20, 3);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      drawRoundRectPath(ctx, tab.x, tabY, tabWidth, tabHeight, 8);
      ctx.fill();
    }

    // Tab text
    ctx.fillStyle = isActive ? '#FFD700' : '#AAAAAA';
    ctx.font = isActive ? 'bold 16px Arial' : '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tab.label, cx, cy);
  });

  return tabY + tabHeight;
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
  
  // Draw tabs
  const listStartY = drawTabs(W, titleY);
  
  // Draw user list
  const startY = listStartY + 15;
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
    
    // Score / Bird count
    const kv = user.KVDataList && user.KVDataList.find(function(kv) { return kv.key === currentTab; });
    const val = (kv && kv.value) || '0';
    const unit = getTabValueLabel(currentTab);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(val + unit, W - 40, y + 25);
  }
  
  // Close button (top-left, circular with ×, same style as bird album)
  const closeSize = 40;
  const closeX = 20;
  const closeY = 20 + safeAreaTop;

  ctx.fillStyle = '#AAAAAA';
  ctx.beginPath();
  ctx.arc(closeX + closeSize / 2, closeY + closeSize / 2, closeSize / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('×', closeX + closeSize / 2, closeY + closeSize / 2 + 2);
}

function drawLoading() {
  const W = sharedCanvas.width;
  const H = sharedCanvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('排行榜加载中...', W / 2, H / 2);
}

function drawError(message, subMessage) {
  const W = sharedCanvas.width;
  const H = sharedCanvas.height;
  
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);
  
  ctx.fillStyle = '#FF6B6B';
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, W / 2, H / 2 - 15);

  if (subMessage) {
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '14px Arial';
    ctx.fillText(subMessage, W / 2, H / 2 + 15);
  }
}

console.log('Open data context loaded');
