// Challenge System Module

const { W, H, sx, sy, ss } = require('./config.js');
const { roundedRect } = require('./roundedRect.js');

// Challenge types
const CHALLENGE_TYPES = {
  kill_n_in_time: {
    generate: (wave) => {
      const target = 3 + Math.floor(wave / 5);
      return {
        type: 'kill_n_in_time',
        description: `${10}秒内消灭${target}只!`,
        target: target,
        progress: 0,
        timeLimit: 600, // 10 seconds at 60fps
        timeElapsed: 0,
        failed: false,
        reward: { type: 'heal', value: 1 }
      };
    }
  },
  no_flower_loss: {
    generate: (wave) => ({
      type: 'no_flower_loss',
      description: '本波零伤亡!',
      target: 1,
      progress: 0,
      timeLimit: 0,
      timeElapsed: 0,
      failed: false,
      reward: { type: 'heal', value: 1 }
    })
  },
  kill_streak: {
    generate: (wave) => {
      const target = 3;
      return {
        type: 'kill_streak',
        description: `连续命中${target}只!`,
        target: target,
        progress: 0,
        timeLimit: 0,
        timeElapsed: 0,
        failed: false,
        reward: { type: 'powerup', value: 1 }
      };
    }
  }
};

// Current challenge state
let currentChallenge = null;
let challengeResult = null; // { success: bool, reward, frame, maxFrames }
let lastKillFrame = -999;
const KILL_STREAK_WINDOW = 90; // 1.5 seconds to maintain streak

// Check if wave should have a challenge
function isChallengeWave(wave) {
  return wave >= 5 && wave % 3 === 0 && Math.random() > 0.3;
}

// Generate a challenge for the given wave
function generateChallenge(wave) {
  const types = Object.keys(CHALLENGE_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  currentChallenge = CHALLENGE_TYPES[type].generate(wave);
  return currentChallenge;
}

// Get current challenge
function getCurrentChallenge() {
  return currentChallenge;
}

// Get challenge result
function getChallengeResult() {
  return challengeResult;
}

// Update challenge progress each frame
function updateChallenge(frameCount) {
  if (!currentChallenge || currentChallenge.failed) return;

  // Time-limited challenges
  if (currentChallenge.type === 'kill_n_in_time' && currentChallenge.timeLimit > 0) {
    currentChallenge.timeElapsed++;
    if (currentChallenge.timeElapsed >= currentChallenge.timeLimit &&
        currentChallenge.progress < currentChallenge.target) {
      currentChallenge.failed = true;
    }
  }

  // Kill streak timeout
  if (currentChallenge.type === 'kill_streak' && currentChallenge.progress > 0) {
    if (frameCount - lastKillFrame > KILL_STREAK_WINDOW) {
      currentChallenge.progress = 0; // Reset streak
    }
  }
}

// Notify challenge of a bomb kill
// Returns { completed: true, reward } if kill_streak challenge is fulfilled immediately
function onBombKilled(frameCount) {
  if (!currentChallenge || currentChallenge.failed) return false;

  if (currentChallenge.type === 'kill_n_in_time') {
    currentChallenge.progress++;
    if (currentChallenge.progress >= currentChallenge.target) {
      return true; // Challenge completed
    }
  }

  if (currentChallenge.type === 'kill_streak') {
    if (frameCount - lastKillFrame <= KILL_STREAK_WINDOW || currentChallenge.progress === 0) {
      currentChallenge.progress++;
      lastKillFrame = frameCount;
      if (currentChallenge.progress >= currentChallenge.target) {
        // Kill streak fulfilled - immediately complete and reward
        const reward = currentChallenge.reward;
        challengeResult = {
          success: true,
          reward: reward,
          description: currentChallenge.description,
          frame: 0,
          maxFrames: 120
        };
        currentChallenge = null;
        return { completed: true, reward };
      }
    } else {
      currentChallenge.progress = 1; // Restart streak
      lastKillFrame = frameCount;
    }
  }

  return false;
}

// Notify challenge of flower damage
function onFlowerDamaged() {
  if (!currentChallenge || currentChallenge.failed) return;
  if (currentChallenge.type === 'no_flower_loss') {
    currentChallenge.failed = true;
  }
}

// Complete the challenge (wave ended without failure for no_flower_loss)
function completeChallenge() {
  if (!currentChallenge) return null;

  let success = false;
  if (currentChallenge.type === 'no_flower_loss') {
    success = !currentChallenge.failed;
  } else if (currentChallenge.type === 'kill_n_in_time' || currentChallenge.type === 'kill_streak') {
    success = currentChallenge.progress >= currentChallenge.target;
  }

  challengeResult = {
    success: success,
    reward: success ? currentChallenge.reward : null,
    description: currentChallenge.description,
    frame: 0,
    maxFrames: 120
  };

  const result = { ...challengeResult };
  currentChallenge = null;
  return result;
}

// Update challenge result display
function updateChallengeResult() {
  if (challengeResult) {
    challengeResult.frame++;
    if (challengeResult.frame >= challengeResult.maxFrames) {
      challengeResult = null;
    }
  }
}

// Reset challenge state
function resetChallenges() {
  currentChallenge = null;
  challengeResult = null;
  lastKillFrame = -999;
}

// Draw challenge HUD (during wave)
function drawChallengeHUD(ctx) {
  if (!currentChallenge) return;
  const ch = currentChallenge;

  // Challenge banner at top center
  const bannerW = 220;
  const bannerH = 44;
  const bx = (W - bannerW) / 2;
  const by = 48;

  // Background
  const bgColor = ch.failed ? 'rgba(255,50,50,0.7)' : 'rgba(0,0,0,0.6)';
  roundedRect()
    .position(bx, by)
    .size(bannerW, bannerH)
    .cornerRadius(8)
    .background(bgColor)
    .border(1.5, ch.failed ? '#FF6666' : '#FFD700')
    .draw(ctx);

  // Description
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `bold ${ss(11)}px Arial`;
  ctx.fillStyle = ch.failed ? '#FF9999' : '#FFD700';
  ctx.fillText(ch.failed ? '挑战失败' : '挑战', sx(W / 2), sy(by + 4));

  ctx.font = `${ss(12)}px Arial`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(ch.description, sx(W / 2), sy(by + 18));

  // Progress bar for kill-based challenges
  if (ch.type === 'kill_n_in_time' || ch.type === 'kill_streak') {
    const barW = 160;
    const barH = 4;
    const barX = sx((W - barW) / 2);
    const barY = sy(by + bannerH - 8);
    const progress = Math.min(1, ch.progress / ch.target);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(barX, barY, ss(barW), ss(barH));
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(barX, barY, ss(barW) * progress, ss(barH));
  }

  // Timer for time-limited challenges
  if (ch.type === 'kill_n_in_time' && ch.timeLimit > 0) {
    const remaining = Math.max(0, ch.timeLimit - ch.timeElapsed);
    const secs = Math.ceil(remaining / 60);
    ctx.textAlign = 'right';
    ctx.font = `bold ${ss(11)}px Arial`;
    ctx.fillStyle = remaining < 180 ? '#FF6666' : '#FFFFFF';
    ctx.fillText(`${secs}s`, sx(bx + bannerW - 8), sy(by + 4));
  }
}

// Draw challenge result popup
function drawChallengeResult(ctx) {
  if (!challengeResult) return;
  const cr = challengeResult;
  const progress = cr.frame / cr.maxFrames;

  // Fade in/out
  let alpha = 1;
  if (progress < 0.15) {
    alpha = progress / 0.15;
  } else if (progress > 0.7) {
    alpha = 1 - (progress - 0.7) / 0.3;
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  const bannerW = 240;
  const bannerH = 60;
  const bx = (W - bannerW) / 2;
  const by = 200;

  const bgColor = cr.success ? 'rgba(40,160,40,0.85)' : 'rgba(160,40,40,0.85)';
  const borderColor = cr.success ? '#44FF44' : '#FF4444';

  roundedRect()
    .position(bx, by)
    .size(bannerW, bannerH)
    .cornerRadius(12)
    .background(bgColor)
    .border(2, borderColor)
    .draw(ctx);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${ss(18)}px Arial`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(
    cr.success ? '挑战成功!' : '挑战失败',
    sx(W / 2), sy(by + 20)
  );

  if (cr.success && cr.reward) {
    ctx.font = `${ss(13)}px Arial`;
    ctx.fillStyle = '#FFD700';
    let rewardText = '';
    if (cr.reward.type === 'heal') rewardText = '奖励: 修复一朵花';
    else if (cr.reward.type === 'score') rewardText = `奖励: +${cr.reward.value}分`;
    else if (cr.reward.type === 'powerup') rewardText = '奖励: 随机道具';
    ctx.fillText(rewardText, sx(W / 2), sy(by + 42));
  }

  ctx.restore();
}

// Draw challenge announcement during inter-wave
function drawChallengeAnnounce(ctx, challenge, options) {
  if (!challenge) return;

  const bannerW = 280;
  const bannerH = 100;
  const bx = (W - bannerW) / 2;
  const by = (H - bannerH) / 2 - 50;

  roundedRect()
    .position(bx, by)
    .size(bannerW, bannerH)
    .cornerRadius(14)
    .background('rgba(0,0,0,0.8)')
    .border(3, '#FFD700')
    .draw(ctx);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `bold ${ss(18)}px Arial`;
  ctx.fillStyle = '#FFD700';
  ctx.fillText('挑战任务!', sx(W / 2), sy(by + 20));

  ctx.font = `${ss(15)}px Arial`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(challenge.description, sx(W / 2), sy(by + 46));

  // Reward hint
  let rewardHint = '';
  if (challenge.reward.type === 'heal') {
    if (options && !options.hasDeadFlower) {
      rewardHint = `奖励: +${10000 * (options.wave || 1)}分`;
    } else {
      rewardHint = '奖励: 修复一朵花';
    }
  } else if (challenge.reward.type === 'score') {
    rewardHint = `奖励: +${challenge.reward.value}分`;
  } else if (challenge.reward.type === 'powerup') {
    rewardHint = '奖励: 随机道具';
  }
  ctx.font = `${ss(12)}px Arial`;
  ctx.fillStyle = '#FFD700';
  ctx.fillText(rewardHint, sx(W / 2), sy(by + 70));
}

module.exports = {
  isChallengeWave,
  generateChallenge,
  getCurrentChallenge,
  getChallengeResult,
  updateChallenge,
  onBombKilled,
  onFlowerDamaged,
  completeChallenge,
  updateChallengeResult,
  resetChallenges,
  drawChallengeHUD,
  drawChallengeResult,
  drawChallengeAnnounce
};
