const DIRS = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];

class Maze {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.grid = new Uint8Array(w * h);
    this.clear();
  }

  clear() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        this.grid[y * this.w + x] = (x === 0 || y === 0 || x === this.w - 1 || y === this.h - 1) ? 1 : 0;
      }
    }
  }

  fillWalls() {
    for (let i = 0; i < this.grid.length; i++) this.grid[i] = 1;
  }

  get(x, y) { return this.grid[y * this.w + x]; }
  set(x, y, v) { this.grid[y * this.w + x] = v; }
  isWall(x, y) { return this.get(x, y) === 1; }
  isPath(x, y) { return this.get(x, y) === 0; }
  inBounds(x, y) { return x >= 0 && x < this.w && y >= 0 && y < this.h; }

  pathCells() {
    const cells = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.isPath(x, y)) cells.push({x, y});
    return cells;
  }

  clone() {
    const m = new Maze(this.w, this.h);
    m.grid.set(this.grid);
    return m;
  }

  toJSON() {
    return { w: this.w, h: this.h, grid: Array.from(this.grid) };
  }

  static fromJSON(data) {
    const m = new Maze(data.w, data.h);
    if (data.grid && data.grid.length === m.grid.length) m.grid.set(data.grid);
    return m;
  }
}

function solveMaze(maze, maxSolutions = 1, timeLimitMs = 3000) {
  const cells = maze.pathCells();
  const total = cells.length;
  if (total === 0) return { solutions: [], hasSolution: false };

  const idxMap = new Map();
  cells.forEach((c, i) => idxMap.set(c.x + ',' + c.y, i));

  const neighbors = cells.map(c => {
    const n = [];
    for (const d of DIRS) {
      const nx = c.x + d.dx, ny = c.y + d.dy;
      if (maze.inBounds(nx, ny) && maze.isPath(nx, ny)) {
        n.push(idxMap.get(nx + ',' + ny));
      }
    }
    return n;
  });

  const visited = new Uint8Array(total);
  const path = [];
  const solutions = [];
  const startTime = performance.now();

  function isConnected(startIdx) {
    const queue = [startIdx];
    const seen = new Uint8Array(total);
    seen[startIdx] = 1;
    let count = 1, head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      for (const v of neighbors[u]) {
        if (!visited[v] && !seen[v]) { seen[v] = 1; queue.push(v); count++; }
      }
    }
    let unvisitedCount = 0;
    for (let i = 0; i < total; i++) if (!visited[i]) unvisitedCount++;
    return count === unvisitedCount;
  }

  function dfs(u, depth) {
    if (performance.now() - startTime > timeLimitMs) return true;
    if (solutions.length >= maxSolutions) return true;

    visited[u] = 1;
    path.push(u);

    if (depth === total) {
      solutions.push(path.slice());
      visited[u] = 0;
      path.pop();
      return false;
    }

    const nexts = [];
    for (const v of neighbors[u]) {
      if (!visited[v]) {
        let free = 0;
        for (const w of neighbors[v]) if (!visited[w]) free++;
        nexts.push({ v, free });
      }
    }
    nexts.sort((a, b) => a.free - b.free);

    for (const {v} of nexts) {
      if (!isConnected(v)) continue;
      if (dfs(v, depth + 1)) { visited[u] = 0; path.pop(); return true; }
    }

    visited[u] = 0;
    path.pop();
    return false;
  }

  for (let start = 0; start < total && solutions.length < maxSolutions; start++) {
    if (dfs(start, 1)) break;
    if (performance.now() - startTime > timeLimitMs) break;
  }

  return {
    solutions: solutions.map(s => s.map(i => cells[i])),
    hasSolution: solutions.length > 0
  };
}

function scoreMaze(maze) {
  const cells = maze.pathCells();
  const totalInner = (maze.w - 2) * (maze.h - 2);
  const pathCount = cells.length;
  const coverage = totalInner > 0 ? pathCount / totalInner : 0;
  const solResult = solveMaze(maze, 5, 2000);
  if (!solResult.hasSolution) return { valid: false, total: 0 };

  let totalNeighbors = 0;
  for (const c of cells) {
    let n = 0;
    for (const d of DIRS) {
      if (maze.inBounds(c.x + d.dx, c.y + d.dy) && maze.isPath(c.x + d.dx, c.y + d.dy)) n++;
    }
    totalNeighbors += n;
  }
  const avgNeighbors = pathCount > 0 ? totalNeighbors / pathCount : 0;
  const branchScore = Math.min(10, avgNeighbors * 2);
  const lengthScore = Math.min(50, pathCount * 2);
  const coverageScore = Math.min(20, coverage * 30);
  const uniquenessScore = solResult.solutions.length === 1 ? 30 : solResult.solutions.length <= 3 ? 15 : 5;
  const difficulty = Math.round(lengthScore + coverageScore + uniquenessScore + branchScore);
  return {
    total: Math.min(9999, Math.round(difficulty * (0.8 + coverage * 0.4))),
    difficulty: Math.min(100, difficulty),
    coverage: Math.round(coverage * 100),
    length: pathCount,
    branch: Math.round(branchScore * 10) / 10,
    valid: true,
    solutionCount: solResult.solutions.length
  };
}

const moduleExports = { Maze, solveMaze, scoreMaze, DIRS };
if (typeof module !== 'undefined' && module.exports) module.exports = moduleExports;
if (typeof window !== 'undefined') {
  window.__modules = window.__modules || {};
  window.__modules['js/maze.js'] = moduleExports;
}
