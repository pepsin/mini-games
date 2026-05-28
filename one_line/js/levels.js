const { Maze, solveMaze } = typeof require !== 'undefined' ? require('./maze.js') : window.__modules['js/maze.js'];

function snakePath(w, h) {
  const path = [];
  for (let y = 1; y < h - 1; y++) {
    if ((y - 1) % 2 === 0) {
      for (let x = 1; x < w - 1; x++) path.push({x, y});
    } else {
      for (let x = w - 2; x >= 1; x--) path.push({x, y});
    }
  }
  return path;
}

function generateLevel(w, h, density) {
  const innerW = w - 2, innerH = h - 2;
  const targetPaths = Math.max(2, Math.round(innerW * innerH * density));

  for (let attempt = 0; attempt < 800; attempt++) {
    const m = new Maze(w, h);
    m.fillWalls();
    let cx = 1 + Math.floor(Math.random() * innerW);
    let cy = 1 + Math.floor(Math.random() * innerH);
    m.set(cx, cy, 0);
    const path = [{x: cx, y: cy}];

    while (path.length < targetPaths) {
      const moves = [];
      const last = path[path.length - 1];
      for (const d of [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}]) {
        const nx = last.x + d.dx, ny = last.y + d.dy;
        if (nx >= 1 && nx < w - 1 && ny >= 1 && ny < h - 1 && m.isWall(nx, ny)) {
          moves.push({x: nx, y: ny});
        }
      }
      if (moves.length === 0) break;
      const pick = moves[Math.floor(Math.random() * moves.length)];
      m.set(pick.x, pick.y, 0);
      path.push(pick);
    }

    if (path.length >= targetPaths) {
      return { ...m.toJSON(), solution: path };
    }
  }

  // Fallback: full grid with snake solution
  const m = new Maze(w, h);
  m.fillWalls();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) m.set(x, y, 0);
  }
  return { ...m.toJSON(), solution: snakePath(w, h) };
}

function generateAllLevels() {
  const specs = [
    { w: 5, h: 5, d: 0.55 },
    { w: 5, h: 5, d: 0.70 },
    { w: 6, h: 6, d: 0.55 },
    { w: 6, h: 6, d: 0.70 },
    { w: 7, h: 7, d: 0.55 },
    { w: 7, h: 7, d: 0.70 },
    { w: 8, h: 8, d: 0.55 },
    { w: 8, h: 8, d: 0.70 },
    { w: 9, h: 9, d: 0.55 },
    { w: 9, h: 9, d: 0.70 },
    { w: 10, h: 10, d: 0.55 },
    { w: 10, h: 10, d: 0.70 },
    { w: 11, h: 11, d: 0.55 },
    { w: 11, h: 11, d: 0.70 },
    { w: 12, h: 12, d: 0.55 },
    { w: 12, h: 12, d: 0.70 },
    { w: 12, h: 12, d: 0.80 },
    { w: 13, h: 13, d: 0.60 },
    { w: 13, h: 13, d: 0.75 },
    { w: 14, h: 14, d: 0.65 },
  ];

  const levels = [];
  for (const spec of specs) {
    levels.push(generateLevel(spec.w, spec.h, spec.d));
  }
  return levels;
}

function getLevels() {
  const storage = typeof wx !== 'undefined' ? wx : {
    getStorageSync: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return undefined; } },
    setStorageSync: (k, v) => { localStorage.setItem(k, JSON.stringify(v)); }
  };

  let levels = storage.getStorageSync('one_line_levels');
  if (!levels || !levels.length) {
    levels = generateAllLevels();
    storage.setStorageSync('one_line_levels', levels);
  }
  return levels;
}

function getProgress() {
  const storage = typeof wx !== 'undefined' ? wx : {
    getStorageSync: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return undefined; } },
    setStorageSync: (k, v) => { localStorage.setItem(k, JSON.stringify(v)); }
  };
  return storage.getStorageSync('one_line_progress') || { currentLevel: 0, highestLevel: 0, scores: [] };
}

function saveProgress(progress) {
  const storage = typeof wx !== 'undefined' ? wx : {
    getStorageSync: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return undefined; } },
    setStorageSync: (k, v) => { localStorage.setItem(k, JSON.stringify(v)); }
  };
  storage.setStorageSync('one_line_progress', progress);
}

function resetProgress() {
  const storage = typeof wx !== 'undefined' ? wx : {
    getStorageSync: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return undefined; } },
    setStorageSync: (k, v) => { localStorage.setItem(k, JSON.stringify(v)); }
  };
  storage.setStorageSync('one_line_progress', { currentLevel: 0, highestLevel: 0, scores: [] });
}

const moduleExports = { getLevels, getProgress, saveProgress, resetProgress, generateAllLevels };
if (typeof module !== 'undefined' && module.exports) module.exports = moduleExports;
if (typeof window !== 'undefined') {
  window.__modules = window.__modules || {};
  window.__modules['js/levels.js'] = moduleExports;
}
