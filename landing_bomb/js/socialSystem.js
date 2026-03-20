// Social System Module - WeChat Mini Game Social Features
// Features: Friend Leaderboard, Share to Revive, Daily High Score

const { getScore, getHighScore, setScore } = require('./gameState.js');

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
  dailyHighScore: 'bobomb_daily_highscore',
  dailyHighScoreDate: 'bobomb_daily_highscore_date',
  lastReviveTime: 'bobomb_last_revive_time',
  reviveCountToday: 'bobomb_revive_count_today',
  leaderboardShared: 'bobomb_leaderboard_shared'
};

// Daily limits
const MAX_REVIVES_PER_DAY = 3;
const REVIVE_COOLDOWN_MINUTES = 5;

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
      reason: '每局游戏只能复活一次',
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
    title: `我在一起来护花中坚持了${getCurrentWave ? getCurrentWave() : 0}关，快来挑战我吧！`,
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

let leaderboardTouchListener = null;

function showFriendRank() {
  if (!openDataContext) {
    initLeaderboard();
  }
  
  try {
    openDataContext.postMessage({
      action: 'showFriendRank'
    });
    console.log('Friend rank display triggered');
    
    // Add touch listener to close leaderboard
    if (!leaderboardTouchListener) {
      leaderboardTouchListener = () => {
        hideFriendRank();
      };
      wx.onTouchStart(leaderboardTouchListener);
    }
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
    
    // Remove touch listener
    if (leaderboardTouchListener) {
      wx.offTouchStart(leaderboardTouchListener);
      leaderboardTouchListener = null;
    }
  } catch (e) {
    console.log('Failed to hide friend rank:', e);
  }
}

// ==================== Share Features ====================

function shareGame(from = 'menu') {
  const score = getScore();
  const highScore = getHighScore();
  const dailyHigh = getDailyHighScore();
  
  let title = '一起来护花 - 保护花朵，消灭炸弹！';
  
  if (score > 0) {
    title = `我在一起来护花中获得了${score}分，你能超过我吗？`;
  } else if (dailyHigh > 0) {
    title = `我今天最高分${dailyHigh}，一起来挑战！`;
  } else if (highScore > 0) {
    title = `我的最高分是${highScore}，来比比看！`;
  }
  
  wx.shareAppMessage({
    title: title,
    imageUrl: '',
    query: `from=${from}&score=${score}&highScore=${highScore}`
  });
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
    reviveMessage: '分享复活',
    canShare: true
  };
}

// ==================== Initialize ====================

function initSocialSystem() {
  resetDailyStatsIfNeeded();
  initLeaderboard();
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
  
  // Share
  shareGame,
  
  // Game over data
  getGameOverSocialData,
  
  // Constants
  MAX_REVIVES_PER_DAY
};
