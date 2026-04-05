# Code Conventions - beach_golf

## Module System
- Use ES6 modules: `export class X` / `import { X } from './file.js'`
- NEVER use CommonJS: `module.exports` or `require()`

## WeChat APIs
- Use `wx.*` APIs (already mocked in iOS container)
- Canvas: `wx.createCanvas()`
- Touch events: `wx.onTouchStart()`, `wx.onTouchMove()`, `wx.onTouchEnd()`, `wx.onTouchCancel()`
- Image: `wx.createImage()`
- Storage: `wx.getStorageSync()`, `wx.setStorageSync()`
- System info: `wx.getSystemInfoSync()`
- Vibration: `wx.vibrateShort()`

## Code Style
- Class names: PascalCase (e.g., `Ball`, `InputHandler`)
- Methods/variables: camelCase
- Constants: UPPER_CASE for true constants only
- 4-space indentation
- Semicolons required

## Project Structure
- `game.js` - Entry point, game loop
- `js/*.js` - Game modules (classes/components)
- All modules in `/js/` folder
- Each class in separate file

## Game Loop Pattern
```javascript
function gameLoop() {
    // 1. Clear canvas
    // 2. Update objects
    // 3. Render
    requestAnimationFrame(gameLoop);
}
```

## Canvas Setup
```javascript
const { windowWidth, windowHeight, pixelRatio } = wx.getSystemInfoSync();
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
canvas.width = windowWidth * pixelRatio;
canvas.height = windowHeight * pixelRatio;
ctx.scale(pixelRatio, pixelRatio);
```

## Common Issues
- ES6 modules MUST use `export` not `module.exports`
- Touch events use WeChat API, not DOM events
- iOS container serves files via `game://localhost/` scheme
