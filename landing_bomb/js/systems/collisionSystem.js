// Collision Detection System with Spatial Partitioning
// Provides optimized collision detection using uniform grid spatial partitioning

const { W, H } = require('../config.js');

// Spatial grid configuration
const GRID_CELL_SIZE = 100; // Size of each grid cell
const GRID_COLS = Math.ceil(W / GRID_CELL_SIZE);
const GRID_ROWS = Math.ceil(H / GRID_CELL_SIZE);

/**
 * SpatialGrid - Uniform grid spatial partitioning for efficient collision detection
 * Reduces O(n×m) collision checks to O(n + k) where k is average entities per cell
 */
class SpatialGrid {
  constructor(cellSize = GRID_CELL_SIZE) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(W / cellSize);
    this.rows = Math.ceil(H / cellSize);
    this.cells = new Map(); // Map of "col,row" -> Set of entities
    this.entityCells = new Map(); // Map of entity -> Set of cell keys (for quick removal)
  }

  /**
   * Clear all entities from the grid
   */
  clear() {
    this.cells.clear();
    this.entityCells.clear();
  }

  /**
   * Get cell key from column and row
   */
  _getCellKey(col, row) {
    return `${col},${row}`;
  }

  /**
   * Get grid coordinates from world position
   */
  _getGridCoords(x, y) {
    return {
      col: Math.floor(x / this.cellSize),
      row: Math.floor(y / this.cellSize)
    };
  }

  /**
   * Get all cells that an entity overlaps based on its bounding box
   */
  _getOverlappingCells(x, y, radius) {
    const minCol = Math.floor((x - radius) / this.cellSize);
    const maxCol = Math.floor((x + radius) / this.cellSize);
    const minRow = Math.floor((y - radius) / this.cellSize);
    const maxRow = Math.floor((y + radius) / this.cellSize);

    const cells = [];
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
          cells.push(this._getCellKey(col, row));
        }
      }
    }
    return cells;
  }

  /**
   * Insert an entity into the grid
   * @param {Object} entity - Entity with x, y, radius properties
   * @param {string} entityId - Unique identifier for the entity
   */
  insert(entity, entityId) {
    // Remove from previous cells if already in grid
    this.remove(entityId);

    const cellKeys = this._getOverlappingCells(entity.x, entity.y, entity.radius);
    const entityCellSet = new Set();

    for (const key of cellKeys) {
      if (!this.cells.has(key)) {
        this.cells.set(key, new Set());
      }
      this.cells.get(key).add(entityId);
      entityCellSet.add(key);
    }

    this.entityCells.set(entityId, entityCellSet);
  }

  /**
   * Remove an entity from the grid
   * @param {string} entityId - Unique identifier for the entity
   */
  remove(entityId) {
    const cellKeys = this.entityCells.get(entityId);
    if (!cellKeys) return;

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(entityId);
        if (cell.size === 0) {
          this.cells.delete(key);
        }
      }
    }

    this.entityCells.delete(entityId);
  }

  /**
   * Query all entity IDs that could potentially collide with the given entity
   * @param {Object} entity - Entity with x, y, radius properties
   * @returns {Set} Set of potentially colliding entity IDs
   */
  query(entity) {
    const cellKeys = this._getOverlappingCells(entity.x, entity.y, entity.radius);
    const candidates = new Set();

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        for (const entityId of cell) {
          candidates.add(entityId);
        }
      }
    }

    return candidates;
  }

  /**
   * Get all entities in a specific cell
   * @param {number} col - Column index
   * @param {number} row - Row index
   * @returns {Set} Set of entity IDs in the cell
   */
  getCell(col, row) {
    return this.cells.get(this._getCellKey(col, row)) || new Set();
  }
}

/**
 * CollisionDetector - Main collision detection system
 * Manages spatial grids and provides collision check functions
 */
class CollisionDetector {
  constructor() {
    // Separate grids for different entity types to optimize queries
    this.bombGrid = new SpatialGrid();
    this.powerupGrid = new SpatialGrid();
    
    // Entity storage for ID lookup
    this.bombs = new Map(); // id -> bomb object
    this.powerups = new Map(); // id -> powerup object
    this.projectiles = new Map(); // id -> projectile object
    
    // Collision callbacks
    this.onProjectileBombCollision = null;
    this.onProjectilePowerupCollision = null;
    
    // Statistics for debugging
    this.stats = {
      checksPerFrame: 0,
      collisionsPerFrame: 0,
      totalEntities: 0
    };
  }

  /**
   * Clear all entities and reset grids
   */
  clear() {
    this.bombGrid.clear();
    this.powerupGrid.clear();
    this.bombs.clear();
    this.powerups.clear();
    this.projectiles.clear();
    this.stats.checksPerFrame = 0;
    this.stats.collisionsPerFrame = 0;
  }

  /**
   * Register a bomb in the collision system
   * @param {Object} bomb - Bomb entity
   * @param {string|number} id - Unique identifier
   */
  registerBomb(bomb, id) {
    this.bombs.set(id, bomb);
    this.bombGrid.insert(bomb, id);
  }

  /**
   * Register a powerup in the collision system
   * @param {Object} powerup - Powerup entity
   * @param {string|number} id - Unique identifier
   */
  registerPowerup(powerup, id) {
    this.powerups.set(id, powerup);
    this.powerupGrid.insert(powerup, id);
  }

  /**
   * Register a projectile for collision detection
   * @param {Object} projectile - Projectile entity
   * @param {string|number} id - Unique identifier
   */
  registerProjectile(projectile, id) {
    this.projectiles.set(id, projectile);
  }

  /**
   * Remove a bomb from the collision system
   * @param {string|number} id - Unique identifier
   */
  removeBomb(id) {
    this.bombGrid.remove(id);
    this.bombs.delete(id);
  }

  /**
   * Remove a powerup from the collision system
   * @param {string|number} id - Unique identifier
   */
  removePowerup(id) {
    this.powerupGrid.remove(id);
    this.powerups.delete(id);
  }

  /**
   * Remove a projectile from the collision system
   * @param {string|number} id - Unique identifier
   */
  removeProjectile(id) {
    this.projectiles.delete(id);
  }

  /**
   * Update bomb position in spatial grid (call after bomb moves)
   * @param {Object} bomb - Bomb entity
   * @param {string|number} id - Unique identifier
   */
  updateBomb(bomb, id) {
    this.bombGrid.insert(bomb, id);
  }

  /**
   * Update powerup position in spatial grid (call after powerup moves)
   * @param {Object} powerup - Powerup entity
   * @param {string|number} id - Unique identifier
   */
  updatePowerup(powerup, id) {
    this.powerupGrid.insert(powerup, id);
  }

  /**
   * AABB (Axis-Aligned Bounding Box) broad-phase collision check
   * Quickly eliminates entities that are too far apart
   * @param {Object} a - First entity with x, y, radius
   * @param {Object} b - Second entity with x, y, radius
   * @returns {boolean} True if AABB overlap
   */
  static checkAABB(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const minDist = a.radius + b.radius;
    return dx < minDist && dy < minDist;
  }

  /**
   * Circle-to-circle narrow-phase collision check
   * Precise collision detection for circular entities
   * @param {Object} a - First entity with x, y, radius
   * @param {Object} b - Second entity with x, y, radius
   * @param {number} extraMargin - Additional collision margin (default: 5)
   * @returns {boolean} True if circles collide
   */
  static checkCircleCircle(a, b, extraMargin = 5) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distSq = dx * dx + dy * dy;
    const minDist = a.radius + b.radius + extraMargin;
    return distSq < minDist * minDist;
  }

  /**
   * Full collision check with AABB broad-phase and circle narrow-phase
   * @param {Object} a - First entity
   * @param {Object} b - Second entity
   * @param {number} extraMargin - Additional collision margin
   * @returns {boolean} True if entities collide
   */
  static checkCollision(a, b, extraMargin = 5) {
    // AABB broad-phase
    if (!CollisionDetector.checkAABB(a, b)) {
      return false;
    }
    // Circle narrow-phase
    return CollisionDetector.checkCircleCircle(a, b, extraMargin);
  }

  /**
   * Check all projectile-bomb collisions using spatial partitioning
   * @param {Function} callback - Called for each collision with (projectile, projectileId, bomb, bombId)
   * @returns {Array} Array of collision results
   */
  checkProjectileBombCollisions(callback) {
    const collisions = [];
    this.stats.checksPerFrame = 0;
    this.stats.collisionsPerFrame = 0;

    for (const [projId, projectile] of this.projectiles) {
      // Query spatial grid for potential collisions
      const candidateIds = this.bombGrid.query(projectile);
      
      for (const bombId of candidateIds) {
        const bomb = this.bombs.get(bombId);
        if (!bomb) continue;

        this.stats.checksPerFrame++;

        // Check collision with AABB + Circle phases
        if (CollisionDetector.checkCollision(projectile, bomb)) {
          this.stats.collisionsPerFrame++;
          collisions.push({ projectile, projId, bomb, bombId });
          
          if (callback) {
            callback(projectile, projId, bomb, bombId);
          }
        }
      }
    }

    return collisions;
  }

  /**
   * Check all projectile-powerup collisions using spatial partitioning
   * @param {Function} callback - Called for each collision with (projectile, projectileId, powerup, powerupId)
   * @returns {Array} Array of collision results
   */
  checkProjectilePowerupCollisions(callback) {
    const collisions = [];

    for (const [projId, projectile] of this.projectiles) {
      // Query spatial grid for potential collisions
      const candidateIds = this.powerupGrid.query(projectile);
      
      for (const powerupId of candidateIds) {
        const powerup = this.powerups.get(powerupId);
        if (!powerup) continue;

        this.stats.checksPerFrame++;

        // Check collision with AABB + Circle phases
        if (CollisionDetector.checkCollision(projectile, powerup)) {
          this.stats.collisionsPerFrame++;
          collisions.push({ projectile, projId, powerup, powerupId });
          
          if (callback) {
            callback(projectile, projId, powerup, powerupId);
          }
        }
      }
    }

    return collisions;
  }

  /**
   * Batch update all entity positions in spatial grids
   * Call this once per frame after all entities have moved
   * @param {Array} bombs - Array of {bomb, id} objects
   * @param {Array} powerups - Array of {powerup, id} objects
   */
  updateSpatialGrids(bombs, powerups) {
    // Update bomb positions
    for (const { bomb, id } of bombs) {
      this.updateBomb(bomb, id);
    }

    // Update powerup positions
    for (const { powerup, id } of powerups) {
      this.updatePowerup(powerup, id);
    }
  }

  /**
   * Get collision statistics for debugging
   * @returns {Object} Statistics object
   */
  getStats() {
    this.stats.totalEntities = this.bombs.size + this.powerups.size + this.projectiles.size;
    return { ...this.stats };
  }
}

// Create singleton instance
const collisionDetector = new CollisionDetector();

// Legacy compatibility functions (for gradual migration)

/**
 * Legacy collision check function - delegates to CollisionDetector
 * @param {Object} proj - Projectile entity
 * @param {Object} bomb - Bomb entity
 * @returns {boolean} True if collision detected
 */
function checkCollision(proj, bomb) {
  if (!bomb || typeof bomb.x !== 'number' || typeof bomb.y !== 'number') {
    return false;
  }
  return CollisionDetector.checkCollision(proj, bomb);
}

/**
 * Legacy powerup collision check - delegates to CollisionDetector
 * @param {Object} proj - Projectile entity
 * @param {Object} powerup - Powerup entity
 * @returns {boolean} True if collision detected
 */
function checkPowerupCollision(proj, powerup) {
  if (!powerup || typeof powerup.x !== 'number' || typeof powerup.y !== 'number') {
    return false;
  }
  return CollisionDetector.checkCollision(proj, powerup);
}

module.exports = {
  // Main collision detector instance
  collisionDetector,
  
  // Classes for custom usage
  SpatialGrid,
  CollisionDetector,
  
  // Legacy compatibility
  checkCollision,
  checkPowerupCollision
};
