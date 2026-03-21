# Rotate Tetris - Game Design Document

## Overview
A physics-based puzzle game where tetris pieces fall onto an **8x8 central platform**. When the accumulated stack extends beyond the platform boundaries, the entire platform (including the stack) **rotates 90° around its center**. Crucially, falling pieces always drop from the top of the screen regardless of platform rotation - only the platform and accumulated pieces rotate.

## Core Game Mechanics

### 1. Central 8x8 Platform
- **Size**: 8 columns × 8 rows
- **Position**: Centered on board (columns 1-8, rows 6-13)
- **Center Point**: (5.0, 10.0) - the rotation pivot
- **Visual**: Gray blocks with yellow dashed border
- **Function**: Collision surface for falling pieces

### 2. Falling Pieces
- Pieces spawn at the **top of the screen** (y=0)
- Always fall **downward** (screen-relative)
- Movement (left/right/down/rotate) is screen-relative
- Pieces are **not affected by platform rotation** while falling
- Once locked, pieces become part of the stack and rotate with the platform

### 3. Stack Accumulation
- Locked pieces join the accumulated stack
- Stack blocks rotate with the platform
- Stack positions are stored in "platform space" coordinates

### 4. Balance & Rotation
**Trigger Condition**: When any block in the stack extends beyond the 8x8 platform boundaries (x<1, x>=9, y<6, or y>=13)

**Rotation Action**:
- Platform and stack rotate 90° clockwise around platform center (5, 10)
- Animation lasts 500ms with ease-out interpolation
- Visual: Everything rotates except the falling piece
- After rotation, new pieces continue falling from top

**Example**:
```
Before rotation:
     ↓ (piece falling from top)
   [########]  <- platform (8x8)
   [########]
   [########]
[#][########]  <- stack extends left

After 90° rotation:
     ↓ (new piece falling from top)
   [#]
   [########]
   [########]
   [########]
   [########]
```

### 5. Line Clearing
- **Clearing Zone**: Within the 8x8 platform boundaries
- **Condition**: When all 8 cells in a horizontal row (within platform) are filled
- **Action**: Remove those blocks, shift everything above down
- **Scoring**: 100-800 points based on lines cleared

### 6. Game Over
- **Trigger**: When a new piece cannot spawn (collision at spawn position)
- **Result**: Game ends, final score displayed

## Technical Implementation

### Coordinate Systems

**Screen Space** (for falling pieces):
- Origin: Top-left of canvas
- x: 0 to CANVAS_WIDTH
- y: 0 to CANVAS_HEIGHT (increasing downward)
- Gravity: Always +y direction

**Platform Space** (for stack and platform):
- Origin: Top-left of board grid
- x: 0 to COLS (10)
- y: 0 to ROWS (20)
- Rotates with the platform

### Transform Function
```javascript
toScreen(x, y) {
    // Convert grid coordinates to screen coordinates
    // Apply rotation around platform center
    const dx = (x * CELL_SIZE) - centerX;
    const dy = (y * CELL_SIZE) - centerY;
    
    return {
        x: centerX + dx * cos(θ) - dy * sin(θ),
        y: centerY + dx * sin(θ) + dy * cos(θ)
    };
}
```

### Rendering Order
1. Clear canvas
2. Draw rotated grid lines (platform space → screen space)
3. Draw platform boundary (rotated)
4. Draw platform blocks (rotated)
5. Draw accumulated stack (rotated)
6. Draw falling piece (screen space - NOT rotated)
7. Draw rotation indicator overlay

### Collision Detection
Collision is checked in platform space:
- Falling piece's grid position vs platform blocks
- Falling piece's grid position vs stack blocks
- After platform rotation, stack positions are recalculated

## Controls

### Keyboard
- **← (Left)**: Move piece left
- **→ (Right)**: Move piece right
- **↓ (Down)**: Soft drop (faster fall, +1 point per cell)
- **↑ (Up)**: Rotate piece clockwise

### Key Insight
Controls are always screen-relative:
- Left always moves piece toward left edge of screen
- Down always moves piece toward bottom of screen
- Even when platform is rotated 90°, "down" is still screen-down

## Visual Design

### Colors
- **Background**: #0a0a0a (very dark gray)
- **Grid Lines**: #1a1a1a (dark gray, rotate with platform)
- **Platform**: #666666 (gray blocks with #888888 borders)
- **Platform Boundary**: #f0d000 (yellow/gold, dashed line, rotates)
- **Rotation Flash**: rgba(255, 255, 0, 0.3) overlay + "ROTATING!" text

### Tetromino Colors
- **I**: Cyan (#00f0f0)
- **O**: Yellow (#f0f000)
- **T**: Purple (#a000f0)
- **S**: Green (#00f000)
- **Z**: Red (#f00000)
- **J**: Blue (#0000f0)
- **L**: Orange (#f0a000)

### Animation
- **Rotation Duration**: 500ms
- **Easing**: Ease-out (cubic)
- **Effect**: Platform, grid, and stack smoothly rotate 90°
- **Falling Piece**: Remains stationary in screen space during rotation

## Data Structures

### Platform
```javascript
platform = [
    {x: 1, y: 6, color: '#666666'},
    {x: 2, y: 6, color: '#666666'},
    // ... 64 blocks total (8x8)
]
```

### Stack
```javascript
stack = [
    {x: 3, y: 10, color: '#00f0f0'},
    {x: 4, y: 10, color: '#00f0f0'},
    // ... accumulated pieces
]
```

### Current Piece
```javascript
currentPiece = {
    type: 'T',
    shape: [[0,1,0], [1,1,1], [0,0,0]],
    color: '#a000f0',
    x: 4,  // screen-relative grid position
    y: 2,
}
```

### Rotation State
```javascript
rotationAngle = 0;      // Current visual rotation (radians)
targetRotation = 0;     // Target rotation
isRotating = false;     // Animation in progress
rotationStartTime = 0;  // For interpolation
```

## Game Flow

1. **Initialize**: Create 8x8 platform in center
2. **Spawn**: New piece at top center
3. **Fall**: Piece drops until collision
4. **Lock**: Add piece to stack
5. **Check Balance**: Does stack extend beyond platform?
6. **If Yes**: 
   - Start rotation animation
   - Rotate platform and stack 90°
   - Continue falling pieces from top
7. **Clear Lines**: Check for complete rows in platform
8. **Repeat**: Back to step 2

## Strategy

### Key Insight
The player must balance two competing goals:
1. **Clear lines** by filling rows within the 8x8 platform
2. **Avoid extending** beyond platform to prevent rotation

After rotation, the stack's shape changes completely, which can:
- Create new line clearing opportunities
- Or make the stack more unstable

Players should think ahead about how the stack will look after rotation!

## Implementation Status

- [x] 8x8 central platform
- [x] Smooth rotation animation (500ms, ease-out)
- [x] Rotation around platform center
- [x] Falling pieces independent of rotation
- [x] Stack rotates with platform
- [x] Line clearing within platform boundaries
- [x] Screen-relative controls
- [ ] Sound effects
- [ ] Score persistence
- [ ] Difficulty progression
