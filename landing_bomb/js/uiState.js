// Shared UI state - stores computed button bounds from flex layout rendering

const buttonBounds = {
  startButton: null,   // { x, y, width, height } in game coordinates
  restartButton: null,
  skinGalleryButton: null
};

function setButtonBounds(name, x, y, width, height) {
  buttonBounds[name] = { x, y, width, height };
}

function getButtonBounds(name) {
  return buttonBounds[name];
}

function hitTest(name, gx, gy) {
  const b = buttonBounds[name];
  if (!b) return false;
  return gx >= b.x && gx <= b.x + b.width && gy >= b.y && gy <= b.y + b.height;
}

module.exports = { setButtonBounds, getButtonBounds, hitTest };
