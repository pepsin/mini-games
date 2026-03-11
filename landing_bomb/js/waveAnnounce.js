// Wave Announce - Arc-shaped glyph animation for wave starts

const { W, H, sx, sy, ss } = require('./config.js');

// Spritesheet image and frame data
let sprite = null;
let frames = null;
let loaded = false;

// Animation state
let active = false;
let wave = 0;
let startTime = 0;
const DURATION = 1000;

// Load spritesheet
function initWaveAnnounce() {
  const fs = wx.getFileSystemManager();
  try {
    const jsonStr = fs.readFileSync('assets/bomb_round_glyphs/info.json', 'utf8');
    const info = JSON.parse(jsonStr);
    frames = info.frames;

    sprite = wx.createImage();
    sprite.src = 'assets/bomb_round_glyphs/' + info.image;
    sprite.onload = () => { loaded = true; };
  } catch (e) {
    console.error('Failed to load wave announce glyphs:', e);
  }
}

function triggerWaveAnnounce(waveNum) {
  wave = waveNum;
  startTime = Date.now();
  active = true;
}

function updateWaveAnnounce() {
  if (!active) return;
  if (Date.now() - startTime >= DURATION) {
    active = false;
  }
}

function drawWaveAnnounce(ctx) {
  if (!active || !loaded || !frames) return;

  const elapsed = Date.now() - startTime;
  if (elapsed >= DURATION) return;

  // Compute animation phase
  let animScale, alpha, yOffset;
  if (elapsed < 200) {
    // Entrance: scale 1.5→1.0, alpha 0→1, move up
    const t = elapsed / 200;
    animScale = 1.5 - 0.5 * t;
    alpha = t;
    yOffset = 20 * (1 - t);
  } else if (elapsed < 700) {
    // Hold
    animScale = 1.0;
    alpha = 1.0;
    yOffset = 0;
  } else {
    // Exit: scale 1.0→0.7, alpha 1→0
    const t = (elapsed - 700) / 300;
    animScale = 1.0 - 0.3 * t;
    alpha = 1.0 - t;
    yOffset = 0;
  }

  // Build character sequence: ["第"] + digits + ["波"]
  const digits = String(wave).split('');
  const chars = ['第'].concat(digits).concat(['波']);

  // Glyph display size (in game coordinates)
  const glyphSize = 60;
  const spacing = 8;

  // Calculate total width and per-char widths
  const charWidths = [];
  let totalWidth = 0;
  for (const ch of chars) {
    const frame = frames[ch];
    if (!frame) continue;
    const aspect = frame.w / frame.h;
    const w = glyphSize * aspect;
    charWidths.push(w);
    totalWidth += w;
  }
  totalWidth += spacing * (chars.length - 1);

  // Arc parameters
  const centerX = W / 2;
  const arcCenterY = H / 3;
  const arcRadius = 225;
  const arcSpan = totalWidth / arcRadius; // angular span in radians

  // Apply animation transform to the whole group at once
  const pivotX = sx(centerX);
  const pivotY = sy(arcCenterY) + ss(yOffset);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(pivotX, pivotY);
  ctx.scale(animScale, animScale);
  ctx.translate(-pivotX, -pivotY);
  // Apply yOffset as a simple vertical shift
  ctx.translate(0, ss(yOffset));

  // Draw each glyph along the arc (no per-glyph animation)
  let accumWidth = 0;
  let charIdx = 0;
  for (const ch of chars) {
    const frame = frames[ch];
    if (!frame) continue;

    const w = charWidths[charIdx];
    const charCenter = accumWidth + w / 2;
    // Angle from top of arc (-PI/2 is straight up)
    const angle = -Math.PI / 2 + (charCenter / totalWidth - 0.5) * arcSpan;

    // Position on arc (circle center is below the text)
    const gx = centerX + arcRadius * Math.cos(angle);
    const gy = arcCenterY + arcRadius + arcRadius * Math.sin(angle);

    const dstW = w;
    const dstH = glyphSize;

    // Transform: translate to glyph position, rotate along tangent
    const screenX = sx(gx);
    const screenY = sy(gy);
    const rotation = angle + Math.PI / 2;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(rotation);
    ctx.drawImage(
      sprite,
      frame.x, frame.y, frame.w, frame.h,
      -ss(dstW) / 2, -ss(dstH) / 2, ss(dstW), ss(dstH)
    );
    ctx.restore();

    accumWidth += w + spacing;
    charIdx++;
  }

  ctx.restore();
}

// Initialize on require
initWaveAnnounce();

module.exports = {
  triggerWaveAnnounce,
  updateWaveAnnounce,
  drawWaveAnnounce
};
