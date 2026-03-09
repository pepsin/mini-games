# Sun Asset

Place your custom sun image here as `sun.png`.

## Specifications

- **Recommended Size**: 80x80 pixels (or larger with same aspect ratio 1:1)
- **Format**: PNG with transparency (for glow effects)
- **Anchor**: Center (0.5, 0.5)
- **Position**: Top-right area of screen at game coordinates (380, 70)

## Configuration

Edit `info.json` to customize:
- `size.width/height`: Target display size in game coordinates
- `position.x/y`: Where to place the sun
- `anchor.x/y`: Anchor point for positioning

## Default Content

The sun should be a bright yellow/orange glowing circle. If no image is provided, the game will use a simple yellow circle as fallback.
