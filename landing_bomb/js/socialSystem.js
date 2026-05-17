// Social System Module - WeChat Mini Game Social Features
// Features: Friend Leaderboard, Share to Revive, Daily High Score

const { getScore, getHighScore } = require('./gameState.js');
const analytics = require('./analytics.js');

// i18n
const { t } = require('./i18n.js');

// Wave getter - will be set dynamically
let getCurrentWaveFn = null;
function setGetCurrentWaveFn(fn) {
  getCurrentWaveFn = fn;
}
function getCurrentWave() {
  return getCurrentWaveFn ? getCurrentWaveFn() : 0;
}

// Track if player has revived in current game session
let hasRevivedInCurrentGame = false;

// Storage keys
const STORAGE_KEYS = {
  dailyHighScore: 'bowaste_daily_highscore',
  dailyHighScoreDate: 'bowaste_daily_highscore_date',
  lastReviveTime: 'bowaste_last_revive_time',
  reviveCountToday: 'bowaste_revive_count_today',
  leaderboardShared: 'bowaste_leaderboard_shared'
};

// Daily limits
const MAX_REVIVES_PER_DAY = 3;

// Get today's date string (YYYY-MM-DD)
function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ==================== Daily High Score ====================

function getDailyHighScore() {
  try {
    const savedDate = wx.getStorageSync(STORAGE_KEYS.dailyHighScoreDate);
    const today = getTodayString();
    
    if (savedDate === today) {
      const savedScore = wx.getStorageSync(STORAGE_KEYS.dailyHighScore);
      return parseInt(savedScore) || 0;
    }
  } catch (e) {
    console.log('Failed to load daily high score:', e);
  }
  return 0;
}

function saveDailyHighScore(score) {
  try {
    const today = getTodayString();
    const currentDailyHigh = getDailyHighScore();
    
    if (score > currentDailyHigh) {
      wx.setStorageSync(STORAGE_KEYS.dailyHighScore, score.toString());
      wx.setStorageSync(STORAGE_KEYS.dailyHighScoreDate, today);
      return true;
    }
  } catch (e) {
    console.log('Failed to save daily high score:', e);
  }
  return false;
}

function resetDailyStatsIfNeeded() {
  try {
    const savedDate = wx.getStorageSync(STORAGE_KEYS.dailyHighScoreDate);
    const today = getTodayString();
    
    if (savedDate !== today) {
      // New day - reset daily stats
      wx.setStorageSync(STORAGE_KEYS.dailyHighScore, '0');
      wx.setStorageSync(STORAGE_KEYS.dailyHighScoreDate, today);
      wx.setStorageSync(STORAGE_KEYS.reviveCountToday, '0');
      console.log('New day - daily stats reset');
    }
  } catch (e) {
    console.log('Failed to check daily reset:', e);
  }
}

// ==================== Share to Revive ====================

function canRevive() {
  // Only allow revive once per game
  if (hasRevivedInCurrentGame) {
    return {
      canRevive: false,
      reason: t('social.reviveLimit'),
      remainingRevives: 0,
      maxRevives: 1
    };
  }
  
  return { 
    canRevive: true, 
    remainingRevives: 1,
    maxRevives: 1
  };
}

function recordRevive() {
  // Mark that player has revived in current game
  hasRevivedInCurrentGame = true;
  console.log('Revive recorded (once per game)');
  return true;
}

// Reset revive status for new game
function resetReviveStatus() {
  hasRevivedInCurrentGame = false;
  console.log('Revive status reset for new game');
}

function triggerShareToRevive(onSuccess, onCancel) {
  const reviveStatus = canRevive();
  
  if (!reviveStatus.canRevive) {
    if (onCancel) onCancel(reviveStatus.reason);
    return;
  }
  
  wx.shareAppMessage({
    title: t('social.shareReviveTitle', { wave: getCurrentWave ? getCurrentWave() : 0 }),
    imageUrl: '', // Will use default share image
    query: `from=revive&score=${getScore()}&wave=${getCurrentWave ? getCurrentWave() : 0}`
  });
  
  // Note: We can't know if share was successful, so we optimistically allow revive
  // In production, you might want to use a backend to verify share completion
  recordRevive();
  if (onSuccess) onSuccess();
}

// ==================== Friend Leaderboard ====================

let openDataContext = null;

function initLeaderboard() {
  try {
    openDataContext = wx.getOpenDataContext();
    console.log('Open data context initialized');
  } catch (e) {
    console.log('Failed to init leaderboard:', e);
  }
}

function updateLeaderboardScore(score) {
  if (!openDataContext) {
    initLeaderboard();
  }
  
  try {
    // Post message to open data context to update score
    openDataContext.postMessage({
      action: 'setUserCloudStorage',
      key: 'score',
      value: score
    });
    console.log('Leaderboard score updated:', score);
  } catch (e) {
    console.log('Failed to update leaderboard:', e);
  }
}

let leaderboardVisible = false;

function isLeaderboardVisible() {
  return leaderboardVisible;
}

function showFriendRank() {
  if (!openDataContext) {
    initLeaderboard();
  }

  try {
    // Get main canvas size from WeChat system info
    const sysInfo = wx.getSystemInfoSync();
    const canvasWidth = sysInfo.windowWidth;
    const canvasHeight = sysInfo.windowHeight;
    const safeArea = sysInfo.safeArea || { top: 0, left: 0, right: canvasWidth, bottom: canvasHeight, width: canvasWidth, height: canvasHeight };

    // Ensure sharedCanvas size matches main canvas
    if (openDataContext && openDataContext.canvas) {
      openDataContext.canvas.width = canvasWidth;
      openDataContext.canvas.height = canvasHeight;
    }

    openDataContext.postMessage({
      action: 'showFriendRank',
      width: canvasWidth,
      height: canvasHeight,
      safeAreaTop: safeArea.top
    });
    leaderboardVisible = true;
    console.log('Friend rank display triggered');

    // Track leaderboard view
    analytics.trackLeaderboardView('friends');
  } catch (e) {
    console.log('Failed to show friend rank:', e);
  }
}

function hideFriendRank() {
  if (!openDataContext) return;

  try {
    openDataContext.postMessage({
      action: 'hideFriendRank'
    });
    leaderboardVisible = false;
  } catch (e) {
    console.log('Failed to hide friend rank:', e);
  }
}

// ==================== Share Features ====================

function buildShareData(from = 'menu') {
  const score = getScore();
  const highScore = getHighScore();
  const dailyHigh = getDailyHighScore();

  let title = t('social.shareDefaultTitle');

  if (score > 0) {
    title = t('social.shareScoreTitle', { score: score });
  } else if (dailyHigh > 0) {
    title = t('social.shareDailyHighTitle', { score: dailyHigh });
  } else if (highScore > 0) {
    title = t('social.shareHighScoreTitle', { score: highScore });
  }

  return {
    title,
    imageUrl: '',
    query: `from=${from}&score=${score}&highScore=${highScore}`
  };
}

function shareGame(from = 'menu') {
  const shareData = buildShareData(from);

  // Track share event
  analytics.trackShare(from, getScore());

  wx.shareAppMessage(shareData);
}

function initShareMenu() {
  try {
    // Enable the top-right capsule share button
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    // Set up share callback for top-right menu forwarding
    wx.onShareAppMessage(() => {
      return buildShareData('capsule');
    });

    console.log('Share menu initialized');
  } catch (e) {
    console.log('Failed to init share menu:', e);
  }
}

// ==================== Game Over Social Data ====================

function getGameOverSocialData() {
  resetDailyStatsIfNeeded();

  const score = getScore();
  const highScore = getHighScore();
  const dailyHigh = getDailyHighScore();
  const reviveStatus = canRevive();

  // Save scores
  const isNewDailyHigh = saveDailyHighScore(score);

  // Update leaderboard
  updateLeaderboardScore(score);

  return {
    score,
    highScore,
    dailyHigh,
    isNewDailyHigh,
    canRevive: reviveStatus.canRevive,
    reviveMessage: t('social.shareToRevive'),
    canShare: true
  };
}

// ==================== Initialize ====================

function initSocialSystem() {
  resetDailyStatsIfNeeded();
  initLeaderboard();
  initShareMenu();
  console.log('Social system initialized');
}

module.exports = {
  // Initialization
  initSocialSystem,
  setGetCurrentWaveFn,
  
  // Daily high score
  getDailyHighScore,
  saveDailyHighScore,
  
  // Revive
  canRevive,
  recordRevive,
  triggerShareToRevive,
  resetReviveStatus,
  
  // Leaderboard
  updateLeaderboardScore,
  showFriendRank,
  hideFriendRank,
  isLeaderboardVisible,
  
  // Share
  shareGame,
  
  // Game over data
  getGameOverSocialData,
  
  // Constants
  MAX_REVIVES_PER_DAY
};
