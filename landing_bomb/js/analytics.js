// Cross-Platform Analytics Module
// Provides a unified analytics interface that works across different platforms
// Currently supports: WeChat Mini Games
// Easy to extend for: Facebook Instant Games, TikTok, native apps, web, etc.

const config = require('./config.js');

// ============== CONFIGURATION ==============
const ANALYTICS_CONFIG = {
  enabled: true,
  debug: false,
  platform: detectPlatform(), // 'wechat', 'web', 'unknown'
  batchEvents: true,
  batchInterval: 5000, // ms
  maxBatchSize: 20,
};

// ============== PLATFORM DETECTION ==============
function detectPlatform() {
  if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
    return 'wechat';
  }
  if (typeof window !== 'undefined' && window.document) {
    return 'web';
  }
  return 'unknown';
}

// ============== EVENT DEFINITIONS ==============
const EVENTS = {
  // Game lifecycle
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  SESSION_START: 'session_start',
  
  // Progression
  WAVE_START: 'wave_start',
  WAVE_COMPLETE: 'wave_complete',
  
  // Gameplay
  BOMB_DEFEATED: 'bomb_defeated',
  FLOWER_DAMAGED: 'flower_damaged',
  FLOWER_REVIVED: 'flower_revived',
  
  // Powerups
  POWERUP_SPAWNED: 'powerup_spawned',
  POWERUP_COLLECTED: 'powerup_collected',
  POWERUP_USED: 'powerup_used',
  
  // Social
  SHARE_GAME: 'share_game',
  LEADERBOARD_VIEW: 'leaderboard_view',
  
  // Skins
  SKIN_UNLOCKED: 'skin_unlocked',
  SKIN_CHANGED: 'skin_changed',
  
  // Challenges
  CHALLENGE_COMPLETED: 'challenge_completed',
  CHALLENGE_FAILED: 'challenge_failed',
  
  // Performance
  GAME_LOADED: 'game_loaded',
  FPS_DROP: 'fps_drop',
};

// ============== PLATFORM ADAPTERS ==============

/**
 * Base Analytics Adapter Interface
 * All platform adapters must implement these methods
 */
class BaseAnalyticsAdapter {
  constructor() {
    this.name = 'base';
  }
  
  isAvailable() {
    return false;
  }
  
  init() {
    // Override in subclass
  }
  
  trackEvent(eventName, data) {
    // Override in subclass
    console.log(`[Analytics][${this.name}] ${eventName}`, data);
  }
  
  trackPerformance(id, value, dimensions) {
    // Override in subclass
  }
  
  setUserProperties(properties) {
    // Override in subclass
  }
}

/**
 * WeChat Mini Games Analytics Adapter
 */
class WeChatAnalyticsAdapter extends BaseAnalyticsAdapter {
  constructor() {
    super();
    this.name = 'wechat';
  }
  
  isAvailable() {
    return typeof wx !== 'undefined' && wx.reportEvent !== undefined;
  }
  
  init() {
    if (!this.isAvailable()) return;
    
    // Report session start
    this.trackEvent(EVENTS.SESSION_START, {
      timestamp: Date.now(),
      platform: 'wechat_mini_game',
    });
  }
  
  trackEvent(eventName, data) {
    if (!this.isAvailable()) return;
    
    try {
      wx.reportEvent(eventName, data);
    } catch (e) {
      if (ANALYTICS_CONFIG.debug) {
        console.warn('[Analytics][WeChat] Failed to track:', e);
      }
    }
  }
  
  trackPerformance(id, value, dimensions) {
    if (!this.isAvailable()) return;
    
    try {
      if (wx.canIUse && wx.canIUse('reportPerformance')) {
        wx.reportPerformance(id, value, dimensions);
      }
    } catch (e) {
      if (ANALYTICS_CONFIG.debug) {
        console.warn('[Analytics][WeChat] Failed to track performance:', e);
      }
    }
  }
  
  setUserProperties(properties) {
    // WeChat doesn't support user properties directly
    // Could be implemented via cloud functions if needed
  }
}

/**
 * Web Analytics Adapter (Google Analytics, Mixpanel, etc.)
 */
class WebAnalyticsAdapter extends BaseAnalyticsAdapter {
  constructor() {
    super();
    this.name = 'web';
    this.ga = null; // Google Analytics reference
  }
  
  isAvailable() {
    return typeof window !== 'undefined' && window.document;
  }
  
  init() {
    if (!this.isAvailable()) return;
    
    // Check for Google Analytics
    if (typeof gtag !== 'undefined') {
      this.ga = gtag;
    }
    
    this.trackEvent(EVENTS.SESSION_START, {
      timestamp: Date.now(),
      platform: 'web',
    });
  }
  
  trackEvent(eventName, data) {
    if (!this.isAvailable()) return;
    
    // Google Analytics 4
    if (this.ga) {
      this.ga('event', eventName, data);
    }
    
    // Fallback to console in debug mode
    if (ANALYTICS_CONFIG.debug) {
      console.log(`[Analytics][Web] ${eventName}`, data);
    }
  }
  
  trackPerformance(id, value, dimensions) {
    // Web performance tracking via GA4 or custom
    this.trackEvent('performance_metric', {
      metric_id: id,
      value: value,
      ...dimensions,
    });
  }
  
  setUserProperties(properties) {
    if (this.ga) {
      this.ga('config', 'GA_MEASUREMENT_ID', {
        user_properties: properties,
      });
    }
  }
}

/**
 * No-op adapter for when no analytics platform is available
 */
class NoopAnalyticsAdapter extends BaseAnalyticsAdapter {
  constructor() {
    super();
    this.name = 'noop';
  }
  
  isAvailable() {
    return true;
  }
  
  trackEvent(eventName, data) {
    if (ANALYTICS_CONFIG.debug) {
      console.log(`[Analytics][Noop] ${eventName}`, data);
    }
  }
}

// ============== ADAPTER REGISTRY ==============
const ADAPTERS = {
  wechat: WeChatAnalyticsAdapter,
  web: WebAnalyticsAdapter,
  noop: NoopAnalyticsAdapter,
};

// ============== ANALYTICS MANAGER ==============
class AnalyticsManager {
  constructor() {
    this.adapters = [];
    this.sessionStartTime = Date.now();
    this.gameStartTime = null;
    this.currentWave = 0;
    this.bombsDefeated = 0;
    this.scoreAtGameStart = 0;
    this.eventQueue = [];
    this.batchTimer = null;
    
    this.init();
  }
  
  init() {
    if (!ANALYTICS_CONFIG.enabled) {
      console.log('[Analytics] Disabled');
      return;
    }
    
    // Initialize appropriate adapter(s)
    const platform = ANALYTICS_CONFIG.platform;
    
    if (ADAPTERS[platform]) {
      const AdapterClass = ADAPTERS[platform];
      const adapter = new AdapterClass();
      
      if (adapter.isAvailable()) {
        adapter.init();
        this.adapters.push(adapter);
        console.log(`[Analytics] Initialized ${platform} adapter`);
      }
    }
    
    // Fallback to noop if no adapter available
    if (this.adapters.length === 0) {
      const noop = new NoopAnalyticsAdapter();
      noop.init();
      this.adapters.push(noop);
      console.log('[Analytics] No platform detected, using noop adapter');
    }
    
    // Start batch timer if enabled
    if (ANALYTICS_CONFIG.batchEvents) {
      this.startBatchTimer();
    }
  }
  
  startBatchTimer() {
    this.batchTimer = setInterval(() => {
      this.flushEventQueue();
    }, ANALYTICS_CONFIG.batchInterval);
  }
  
  flushEventQueue() {
    if (this.eventQueue.length === 0) return;
    
    // Process batched events
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      try {
        this.sendToAdapters(event.name, event.data, event.eventTimestamp);
      } catch (e) {
        if (ANALYTICS_CONFIG.debug) {
          console.warn('[Analytics] Failed to send event:', event.name, e);
        }
      }
    }
  }
  
  sendToAdapters(eventName, data, eventTimestamp) {
    // Use provided timestamp or current time
    const timestamp = eventTimestamp || Date.now();
    
    // Add common data
    const enrichedData = {
      ...data,
      timestamp: timestamp,
      session_duration: Math.floor((timestamp - this.sessionStartTime) / 1000),
    };
    
    this.adapters.forEach(adapter => {
      try {
        adapter.trackEvent(eventName, enrichedData);
      } catch (e) {
        if (ANALYTICS_CONFIG.debug) {
          console.warn(`[Analytics] Adapter ${adapter.name} failed:`, e);
        }
      }
    });
  }
  
  track(eventName, data = {}) {
    if (!ANALYTICS_CONFIG.enabled) return;
    
    if (ANALYTICS_CONFIG.batchEvents) {
      // Add to queue for batching with timestamp at creation time
      this.eventQueue.push({ name: eventName, data, eventTimestamp: Date.now() });
      
      // Flush immediately if queue is full
      if (this.eventQueue.length >= ANALYTICS_CONFIG.maxBatchSize) {
        this.flushEventQueue();
      }
    } else {
      // Send immediately
      this.sendToAdapters(eventName, data);
    }
    
    if (ANALYTICS_CONFIG.debug) {
      console.log(`[Analytics] Track: ${eventName}`, data);
    }
  }
  
  trackPerformance(id, value, dimensions = {}) {
    if (!ANALYTICS_CONFIG.enabled) return;
    
    this.adapters.forEach(adapter => {
      try {
        adapter.trackPerformance(id, value, dimensions);
      } catch (e) {
        if (ANALYTICS_CONFIG.debug) {
          console.warn(`[Analytics] Performance tracking failed:`, e);
        }
      }
    });
  }
  
  // ============== GAME SPECIFIC TRACKING ==============
  
  trackGameStart(wave = 1, currentScore = 0) {
    this.gameStartTime = Date.now();
    this.bombsDefeated = 0;
    this.scoreAtGameStart = currentScore;
    this.currentWave = wave;
    
    this.track(EVENTS.GAME_START, {
      starting_wave: wave,
      score_at_start: currentScore,
    });
  }
  
  trackGameEnd({ score, wave, livesRemaining, reason = 'game_over' }) {
    const duration = this.gameStartTime 
      ? Math.floor((Date.now() - this.gameStartTime) / 1000) 
      : 0;
    const scoreGained = score - this.scoreAtGameStart;
    
    this.track(EVENTS.GAME_END, {
      score,
      score_gained: scoreGained,
      wave,
      lives_remaining: livesRemaining,
      duration_seconds: duration,
      bombs_defeated: this.bombsDefeated,
      reason,
    });
    
    // Reset game tracking
    this.gameStartTime = null;
    this.bombsDefeated = 0;
  }
  
  trackWaveStart(wave, waveType = 'normal') {
    this.currentWave = wave;
    
    this.track(EVENTS.WAVE_START, {
      wave,
      wave_type: waveType,
    });
  }
  
  trackWaveComplete(wave, challengeSuccess = false, challengeType = null) {
    this.track(EVENTS.WAVE_COMPLETE, {
      wave,
      challenge_success: challengeSuccess,
      challenge_type: challengeType,
    });
  }
  
  trackBombDefeated(bombType, comboHits = 1, scoreGained = 0) {
    this.bombsDefeated++;
    
    this.track(EVENTS.BOMB_DEFEATED, {
      bomb_type: bombType,
      combo_hits: comboHits,
      score_gained: scoreGained,
      wave: this.currentWave,
    });
  }
  
  trackFlowerDamaged(remainingLives, flowerIndex) {
    this.track(EVENTS.FLOWER_DAMAGED, {
      remaining_lives: remainingLives,
      flower_index: flowerIndex,
      wave: this.currentWave,
    });
  }
  
  trackFlowerRevived(remainingLives) {
    this.track(EVENTS.FLOWER_REVIVED, {
      remaining_lives: remainingLives,
      wave: this.currentWave,
    });
  }
  
  trackPowerupSpawned(powerupType) {
    this.track(EVENTS.POWERUP_SPAWNED, {
      powerup_type: powerupType,
      wave: this.currentWave,
    });
  }
  
  trackPowerupCollected(powerupType, collectionMethod = 'projectile') {
    this.track(EVENTS.POWERUP_COLLECTED, {
      powerup_type: powerupType,
      collection_method: collectionMethod,
      wave: this.currentWave,
    });
  }
  
  trackPowerupUsed(powerupType, usageContext = 'manual') {
    this.track(EVENTS.POWERUP_USED, {
      powerup_type: powerupType,
      usage_context: usageContext,
      wave: this.currentWave,
    });
  }
  
  trackShare(shareType = 'result', score = 0) {
    this.track(EVENTS.SHARE_GAME, {
      share_type: shareType,
      score,
      wave: this.currentWave,
    });
  }
  
  trackLeaderboardView(leaderboardType = 'friends') {
    this.track(EVENTS.LEADERBOARD_VIEW, {
      leaderboard_type: leaderboardType,
    });
  }
  
  trackSkinUnlocked(skinId, unlockMethod = 'drop') {
    this.track(EVENTS.SKIN_UNLOCKED, {
      skin_id: skinId,
      unlock_method: unlockMethod,
    });
  }
  
  trackSkinChanged(skinId) {
    this.track(EVENTS.SKIN_CHANGED, {
      skin_id: skinId,
    });
  }
  
  trackChallengeCompleted(challengeType, rewardType) {
    this.track(EVENTS.CHALLENGE_COMPLETED, {
      challenge_type: challengeType,
      reward_type: rewardType,
      wave: this.currentWave,
    });
  }
  
  trackChallengeFailed(challengeType, failReason) {
    this.track(EVENTS.CHALLENGE_FAILED, {
      challenge_type: challengeType,
      fail_reason: failReason,
      wave: this.currentWave,
    });
  }
  
  trackGameLoaded(loadTimeMs) {
    this.track(EVENTS.GAME_LOADED, {
      load_time_ms: loadTimeMs,
    });
    
    this.trackPerformance(1, loadTimeMs, {
      type: 'game_load',
    });
  }
  
  trackFPSDrop(fps, threshold = 30) {
    this.track(EVENTS.FPS_DROP, {
      fps,
      threshold,
      wave: this.currentWave,
    });
  }
  
  setScoreReference(score) {
    this.scoreAtGameStart = score;
  }
  
  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.flushEventQueue();
    }
  }
}

// ============== SINGLETON INSTANCE ==============
let analyticsInstance = null;

function getAnalytics() {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsManager();
  }
  return analyticsInstance;
}

// ============== CONVENIENCE EXPORTS ==============
// These provide a simpler API for direct imports

module.exports = {
  // Event names
  EVENTS,
  
  // Configuration
  config: ANALYTICS_CONFIG,
  
  // Main API
  getAnalytics,
  
  // Quick access methods (auto-initialize)
  track: (eventName, data) => getAnalytics().track(eventName, data),
  trackPerformance: (id, value, dimensions) => getAnalytics().trackPerformance(id, value, dimensions),
  
  // Game lifecycle
  trackGameStart: (wave, currentScore) => getAnalytics().trackGameStart(wave, currentScore),
  trackGameEnd: (params) => getAnalytics().trackGameEnd(params),
  
  // Progression
  trackWaveStart: (wave, type) => getAnalytics().trackWaveStart(wave, type),
  trackWaveComplete: (wave, success, type) => getAnalytics().trackWaveComplete(wave, success, type),
  
  // Gameplay
  trackBombDefeated: (type, combo, score) => getAnalytics().trackBombDefeated(type, combo, score),
  trackFlowerDamaged: (lives, index) => getAnalytics().trackFlowerDamaged(lives, index),
  trackFlowerRevived: (lives) => getAnalytics().trackFlowerRevived(lives),
  
  // Powerups
  trackPowerupSpawned: (type) => getAnalytics().trackPowerupSpawned(type),
  trackPowerupCollected: (type, method) => getAnalytics().trackPowerupCollected(type, method),
  trackPowerupUsed: (type, context) => getAnalytics().trackPowerupUsed(type, context),
  
  // Social
  trackShare: (type, score) => getAnalytics().trackShare(type, score),
  trackLeaderboardView: (type) => getAnalytics().trackLeaderboardView(type),
  
  // Skins
  trackSkinUnlocked: (id, method) => getAnalytics().trackSkinUnlocked(id, method),
  trackSkinChanged: (id) => getAnalytics().trackSkinChanged(id),
  
  // Challenges
  trackChallengeCompleted: (type, reward) => getAnalytics().trackChallengeCompleted(type, reward),
  trackChallengeFailed: (type, reason) => getAnalytics().trackChallengeFailed(type, reason),
  
  // Performance
  trackGameLoaded: (time) => getAnalytics().trackGameLoaded(time),
  trackFPSDrop: (fps, threshold) => getAnalytics().trackFPSDrop(fps, threshold),
  
  // Utility
  setScoreReference: (score) => getAnalytics().setScoreReference(score),
};