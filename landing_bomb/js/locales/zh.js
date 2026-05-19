// Chinese (Simplified) Translations

const zh = {
  // Common
  common: {
    score: '分数',
    wave: '关',
    target: '目标',
    start: '开始',
    confirm: '确认',
    cancel: '取消',
    close: '关闭',
    back: '返回',
    next: '下一页',
    prev: '上一页',
    unlock: '解锁',
    locked: '未解锁',
    level: '等级',
    yes: '是',
    no: '否',
    ok: '确定',
    unknown: '未知'
  },

  // Game Title & Menu
  game: {
    title: '一起来护花',
    startGame: '< 开始游戏 >',
    resumeGame: '继续游戏',
    restart: '重新开始',
    restartConfirm: '确认重新开始',
    gameOver: '游戏结束',
    pause: '游戏暂停',
    paused: '已暂停',
    playAgain: '再来一次'
  },

  // Instructions
  instructions: {
    title: '玩法说明',
    dragAim: '拖动弹弓瞄准,松开发射!',
    protectFlowers: '在垃圾落地前打爆它们,',
    protectFlowers2: '保护四朵小花!',
    line1: '拖动弹弓瞄准',
    line2: '松开发射',
    line3: '消灭所有垃圾',
    line4: '保护花朵'
  },

  // Score & Stats
  stats: {
    score: '分数',
    highScore: '历史最高',
    dailyHigh: '今日最高',
    wavesCompleted: '已完成关卡',
    newRecord: '新纪录!',
    rating: {
      legendary: '⭐ 传说! 前1%! ⭐',
      expert: '🔥 高手! 前10%! 🔥',
      good: '🌻 干得漂亮! 🌻'
    }
  },

  // Wave System
  wave: {
    current: '第 {{wave}} 关',
    target: '目标: {{target}} 关',
    progress: '{{current}} / {{target}} 关',
    completed: '第 {{wave}} 关完成!',
    starting: '第 {{wave}} 关开始',
    interWave: '休息中...',
    waveBreak: '波次间隔'
  },

  // Powerups
  powerup: {
    title: '道具',
    inventory: '道具栏',
    inventoryFull: '暂存已满',
    emptySlot: '空槽',
    useNow: '立刻使用',
    store: '暂存',
    types: {
      time_slow: '减速',
      multi_shot: '散射',
      explosive: '爆破',
      heal: '治愈',
      shield: '护盾',
      dragon_bullet: '火龙'
    },
    descriptions: {
      time_slow: '垃圾下落速度减半，持续5秒',
      multi_shot: '下次发射散射3发子弹',
      explosive: '立即清除屏幕所有垃圾',
      heal: '复活一朵枯萎的花',
      shield: '无敌护盾，持续8秒',
      dragon_bullet: '火龙弹，超大范围攻击'
    }
  },

  // Challenge System
  challenge: {
    title: '挑战任务',
    active: '挑战',
    success: '挑战成功!',
    failed: '挑战失败',
    timeout: '超时',
    types: {
      kill_n_in_time: {
        description: '{{time}}秒内消灭{{target}}只!',
        reward: '奖励: 修复一朵花'
      },
      no_flower_loss: {
        description: '本波零伤亡!',
        reward: '奖励: 修复一朵花'
      },
      kill_streak: {
        description: '连续命中{{target}}只!',
        reward: '奖励: 随机道具'
      }
    },
    rewards: {
      heal: '奖励: 修复一朵花 (+{{score}}分备用)',
      score: '奖励: +{{score}}分',
      powerup: '奖励: 随机道具'
    }
  },

  // Bird Watching / Album
  bird: {
    album: '观鸟图鉴',
    albumTitle: '观鸟图鉴',
    collection: '已收集',
    captured: '已捕捉',
    unknown: '???',
    unknownBird: '未知鸟类',
    watchBird: '观鸟',
    camera: '相机',
    capture: '拍照',
    emptyAlbum: '图鉴为空',
    progress: '已收集: {{captured}}/{{total}}',
    stats: {
      totalUnique: '总种类',
      totalWatches: '总观察次数'
    }
  },

  // Skin Gallery
  skin: {
    gallery: '弹弓图鉴',
    title: '弹弓图鉴',
    selectSkin: '点击选择已解锁的弹弓皮肤',
    current: '当前使用',
    default: '默认皮肤',
    unlocked: '已解锁',
    locked: '未解锁'
  },

  // Social Features
  social: {
    leaderboard: '排行榜',
    scoreRank: '分数排行',
    birdRank: '观鸟排行',
    share: '分享战绩',
    invite: '邀请好友',
    shareGame: '分享游戏',
    revive: '复活',
    reviveMessage: '观看广告复活',
    shareToRevive: '分享复活',
    watchAdToRevive: '看广告复活',
    rank: '第 {{rank}} 名',
    reviveLimit: '每局游戏只能复活一次',
    shareReviveTitle: '我在一起来护花中坚持了{{wave}}关，快来挑战我吧！',
    shareDefaultTitle: '一起来护花 - 保护花朵，消灭垃圾！',
    shareScoreTitle: '我在一起来护花中获得了{{score}}分，你能超过我吗？',
    shareDailyHighTitle: '我今天最高分{{score}}，一起来挑战！',
    shareHighScoreTitle: '我的最高分是{{score}}，来比比看！',
    shareBirdAlbum: '分享观鸟进度',
    shareBirdAlbumTitle: '我已观察到{{captured}}/{{total}}种鸟，来一起护花观鸟吧！'
  },

  // Messages
  messages: {
    playerRevived: '玩家复活!获得一朵花!垃圾已清除。',
    waveAdvanced: '进入第 {{wave}} 关!',
    skinUnlocked: '解锁皮肤: {{skin}}',
    powerupSpawned: '道具出现: {{type}}',
    flowerHealed: '花朵复活!',
    allWastesCleared: '清除所有垃圾!'
  },

  // Waste Types
  waste: {
    normal: '普通垃圾',
    armored: '装甲垃圾',
    dumbbell: '哑铃垃圾',
    special: '特殊垃圾'
  },

  // Flowers
  flower: {
    healthy: '健康',
    damaged: '受损',
    dead: '枯萎',
    healed: '已复活'
  },

  // UI Elements
  ui: {
    pause: '暂停',
    play: '继续',
    sound: '声音',
    music: '音乐',
    settings: '设置',
    language: '语言'
  }
};

module.exports = { zh };
