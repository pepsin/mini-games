const config = typeof require !== 'undefined' ? require('./config.js') : window.__modules['js/config.js'];

let odCanvas = null;
let odContext = null;
let leaderboardVisible = false;

function initSocial() {
  if (typeof wx !== 'undefined' && wx.getOpenDataContext) {
    odContext = wx.getOpenDataContext();
    odCanvas = odContext.canvas;
    const info = config.systemInfo || wx.getSystemInfoSync();
    odCanvas.width = info.windowWidth * (info.pixelRatio || 1);
    odCanvas.height = info.windowHeight * (info.pixelRatio || 1);
  }
}

function showLeaderboard(level) {
  leaderboardVisible = true;
  if (odContext) {
    odContext.postMessage({ action: 'showLeaderboard', level });
  }
}

function hideLeaderboard() {
  leaderboardVisible = false;
  if (odContext) {
    odContext.postMessage({ action: 'hideLeaderboard' });
  }
}

function isLeaderboardVisible() {
  return leaderboardVisible;
}

function updateScore(level) {
  if (typeof wx !== 'undefined' && wx.setStorageSync) {
    const key = 'one_line_best_level';
    const current = wx.getStorageSync(key) || 0;
    if (level > current) {
      wx.setStorageSync(key, level);
      if (wx.getOpenDataContext) {
        const od = wx.getOpenDataContext();
        od.postMessage({ action: 'updateScore', level });
      }
    }
  }
}

function shareGame(level) {
  if (typeof wx !== 'undefined' && wx.shareAppMessage) {
    wx.shareAppMessage({
      title: `我在一笔画突破了第${level + 1}关，来挑战我吧！`,
      imageUrl: '',
      query: `level=${level}`
    });
  }
}

function drawLeaderboardOverlay(ctx) {
  if (!leaderboardVisible || !odCanvas) return;
  ctx.drawImage(odCanvas, 0, 0, config.screenWidth, config.screenHeight);
}

const moduleExports = {
  initSocial, showLeaderboard, hideLeaderboard,
  isLeaderboardVisible, updateScore, shareGame, drawLeaderboardOverlay
};
if (typeof module !== 'undefined' && module.exports) module.exports = moduleExports;
if (typeof window !== 'undefined') {
  window.__modules = window.__modules || {};
  window.__modules['js/social.js'] = moduleExports;
}
