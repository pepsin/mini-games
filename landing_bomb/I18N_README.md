# Landing Bomb 国际化 (i18n) 文档

## 概述

Landing Bomb 游戏现已支持国际化，目前支持以下语言：
- 中文 (zh) - 默认语言
- 英文 (en)

## 文件结构

```
landing_bomb/js/
├── i18n.js              # 国际化核心模块
└── locales/
    ├── zh.js            # 中文翻译
    └── en.js            # 英文翻译
```

## 使用方法

### 1. 在游戏代码中使用翻译

```javascript
const { t } = require('./i18n.js');

// 简单翻译
const title = t('game.title');  // 返回 "一起来护花" 或 "Flower Guardians"

// 带参数的翻译
const waveText = t('wave.current', { wave: 5 });  // 返回 "第 5 关" 或 "Wave 5"

// 在 UI 中使用
ctx.fillText(t('game.gameOver'), x, y);
```

### 2. 切换语言

```javascript
const { setLanguage, getLanguage } = require('./i18n.js');

// 切换到英文
setLanguage('en');

// 切换到中文
setLanguage('zh');

// 获取当前语言
const currentLang = getLanguage();  // 返回 'zh' 或 'en'
```

### 3. 支持的翻译键

#### 游戏相关
- `game.title` - 游戏标题
- `game.startGame` - 开始游戏按钮
- `game.gameOver` - 游戏结束
- `game.pause` - 游戏暂停

#### 分数和统计
- `stats.score` - 分数
- `stats.highScore` - 历史最高
- `stats.dailyHigh` - 今日最高
- `stats.rating.legendary` - 传说评级
- `stats.rating.expert` - 高手评级
- `stats.rating.good` - 干得漂亮

#### 波次系统
- `wave.current` - 当前波次
- `wave.target` - 目标波次
- `wave.completed` - 波次完成

#### 道具系统
- `powerup.types.time_slow` - 减速
- `powerup.types.multi_shot` - 散射
- `powerup.types.explosive` - 爆破
- `powerup.types.heal` - 治愈
- `powerup.types.shield` - 护盾
- `powerup.types.dragon_bullet` - 火龙
- `powerup.useNow` - 立刻使用
- `powerup.store` - 暂存
- `powerup.inventoryFull` - 暂存已满

#### 挑战系统
- `challenge.title` - 挑战任务
- `challenge.success` - 挑战成功
- `challenge.failed` - 挑战失败
- `challenge.types.kill_n_in_time.description` - 限时击杀描述
- `challenge.types.no_flower_loss.description` - 零伤亡描述
- `challenge.types.kill_streak.description` - 连击描述

#### 观鸟图鉴
- `bird.albumTitle` - 观鸟图鉴标题
- `bird.unknown` - 未知 (???)
- `bird.unknownBird` - 未知鸟类
- `bird.progress` - 收集进度

#### 弹弓皮肤
- `skin.title` - 弹弓图鉴标题
- `skin.locked` - 未解锁
- `skin.selectSkin` - 选择皮肤提示

#### 社交功能
- `social.leaderboard` - 排行榜
- `social.share` - 分享战绩
- `social.invite` - 邀请好友
- `social.shareToRevive` - 分享复活
- `social.reviveLimit` - 复活限制提示

#### 玩法说明
- `instructions.dragAim` - 拖动弹弓瞄准
- `instructions.protectFlowers` - 保护花朵提示

## 添加新语言

1. 在 `locales/` 目录下创建新的翻译文件，例如 `fr.js` (法语)
2. 在 `i18n.js` 中添加新语言到 `SUPPORTED_LANGUAGES` 数组
3. 在 `loadTranslations()` 函数中加载新语言文件

## 语言自动检测

系统会自动检测用户设备的语言设置：
- 如果设备语言以 "en" 开头，自动使用英文
- 否则使用默认中文

用户的语言偏好会自动保存到本地存储中，下次启动游戏时会自动恢复。

## 注意事项

1. 翻译键使用点号分隔的层级结构，例如 `game.title`
2. 支持参数插值，使用 `{{paramName}}` 语法
3. 如果翻译键不存在，会返回键名本身作为回退
4. 如果当前语言的翻译缺失，会回退到默认语言（中文）

## 示例

```javascript
// 在 UI 模块中
const { t } = require('./i18n.js');

// 绘制游戏结束画面
gameOverPanel.addChild(
  flexItem()
    .text(t('game.gameOver'), 28)
    .textStyle('#FF6B35', 28, 'Arial', 'bold')
);

// 显示分数
ctx.fillText(`${t('stats.score')}: ${score}`, x, y);

// 显示波次进度
const waveText = t('wave.progress', { 
  current: currentWave, 
  target: targetWave 
});
ctx.fillText(waveText, x, y);
```
