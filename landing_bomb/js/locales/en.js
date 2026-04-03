// English Translations

const en = {
  // Common
  common: {
    score: 'Score',
    wave: 'Wave',
    target: 'Target',
    start: 'Start',
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    prev: 'Previous',
    unlock: 'Unlock',
    locked: 'Locked',
    level: 'Level',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    unknown: 'Unknown'
  },

  // Game Title & Menu
  game: {
    title: 'Flower Guardians',
    startGame: '< Start Game >',
    resumeGame: 'Resume Game',
    restart: 'Restart',
    restartConfirm: 'Confirm Restart',
    gameOver: 'Game Over',
    pause: 'Game Paused',
    paused: 'Paused',
    playAgain: 'Play Again'
  },

  // Instructions
  instructions: {
    title: 'How to Play',
    dragAim: 'Drag to aim, release to shoot!',
    protectFlowers: 'Destroy all wastes before they land,',
    protectFlowers2: 'Protect all four flowers!',
    line1: 'Drag to aim the slingshot',
    line2: 'Release to shoot',
    line3: 'Destroy all wastes',
    line4: 'Protect the flowers'
  },

  // Score & Stats
  stats: {
    score: 'Score',
    highScore: 'High Score',
    dailyHigh: 'Daily Best',
    wavesCompleted: 'Waves Completed',
    newRecord: 'New Record!',
    rating: {
      legendary: '⭐ Legendary! Top 1%! ⭐',
      expert: '🔥 Expert! Top 10%! 🔥',
      good: '🌻 Great Job! 🌻'
    }
  },

  // Wave System
  wave: {
    current: 'Wave {{wave}}',
    target: 'Target: {{target}}',
    progress: '{{current}} / {{target}}',
    completed: 'Wave {{wave}} Complete!',
    starting: 'Starting Wave {{wave}}',
    interWave: 'Break Time...',
    waveBreak: 'Wave Break'
  },

  // Powerups
  powerup: {
    title: 'Power-ups',
    inventory: 'Inventory',
    inventoryFull: 'Inventory Full',
    emptySlot: 'Empty',
    useNow: 'Use Now',
    store: 'Store',
    types: {
      time_slow: 'Slow Time',
      multi_shot: 'Multi-Shot',
      explosive: 'Explosive',
      heal: 'Heal',
      shield: 'Shield',
      dragon_bullet: 'Dragon'
    },
    descriptions: {
      time_slow: 'Waste fall speed halved for 5 seconds',
      multi_shot: 'Next shot fires 3 projectiles',
      explosive: 'Clear all wastes on screen instantly',
      heal: 'Revive one withered flower',
      shield: 'Invincible shield for 8 seconds',
      dragon_bullet: 'Dragon bullet with massive range'
    }
  },

  // Challenge System
  challenge: {
    title: 'Challenge!',
    active: 'Challenge',
    success: 'Challenge Complete!',
    failed: 'Challenge Failed',
    timeout: 'Time Out',
    types: {
      kill_n_in_time: {
        description: 'Destroy {{target}} in {{time}} seconds!',
        reward: 'Reward: Heal one flower'
      },
      no_flower_loss: {
        description: 'Zero casualties this wave!',
        reward: 'Reward: Heal one flower'
      },
      kill_streak: {
        description: 'Hit {{target}} in a row!',
        reward: 'Reward: Random power-up'
      }
    },
    rewards: {
      heal: 'Reward: Heal one flower (+{{score}} pts backup)',
      score: 'Reward: +{{score}} points',
      powerup: 'Reward: Random power-up'
    }
  },

  // Bird Watching / Album
  bird: {
    album: 'Bird Album',
    albumTitle: 'Bird Collection',
    collection: 'Collection',
    captured: 'Captured',
    unknown: '???',
    unknownBird: 'Unknown Bird',
    watchBird: 'Bird Watch',
    camera: 'Camera',
    capture: 'Capture',
    emptyAlbum: 'Album is empty',
    progress: 'Collected: {{captured}}/{{total}}',
    stats: {
      totalUnique: 'Total Species',
      totalWatches: 'Total Observations'
    }
  },

  // Skin Gallery
  skin: {
    gallery: 'Skin Gallery',
    title: 'Slingshot Gallery',
    selectSkin: 'Tap to select unlocked skins',
    current: 'Currently Using',
    default: 'Default Skin',
    unlocked: 'Unlocked',
    locked: 'Locked'
  },

  // Social Features
  social: {
    leaderboard: 'Leaderboard',
    share: 'Share Score',
    invite: 'Invite Friends',
    shareGame: 'Share Game',
    revive: 'Revive',
    reviveMessage: 'Watch ad to revive',
    shareToRevive: 'Share to Revive',
    watchAdToRevive: 'Watch Ad to Revive',
    rank: 'Rank {{rank}}',
    reviveLimit: 'Only one revive per game',
    shareReviveTitle: 'I survived {{wave}} waves in Flower Guardians, can you beat me?',
    shareDefaultTitle: 'Flower Guardians - Protect flowers, destroy wastes!',
    shareScoreTitle: 'I scored {{score}} in Flower Guardians, can you beat me?',
    shareDailyHighTitle: 'My daily high score is {{score}}, challenge me!',
    shareHighScoreTitle: 'My high score is {{score}}, let's compete!'
  },

  // Messages
  messages: {
    playerRevived: 'Player revived! Got one flower! Wastes cleared.',
    waveAdvanced: 'Entering Wave {{wave}}!',
    skinUnlocked: 'Unlocked skin: {{skin}}',
    powerupSpawned: 'Power-up appeared: {{type}}',
    flowerHealed: 'Flower revived!',
    allWastesCleared: 'All wastes cleared!'
  },

  // Waste Types
  waste: {
    normal: 'Normal Waste',
    armored: 'Armored Waste',
    dumbbell: 'Dumbbell Waste',
    special: 'Special Waste'
  },

  // Flowers
  flower: {
    healthy: 'Healthy',
    damaged: 'Damaged',
    dead: 'Withered',
    healed: 'Revived'
  },

  // UI Elements
  ui: {
    pause: 'Pause',
    play: 'Play',
    sound: 'Sound',
    music: 'Music',
    settings: 'Settings',
    language: 'Language'
  }
};

module.exports = { en };
