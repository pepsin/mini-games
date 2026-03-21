# Asset Convention Guide

This document describes the conventions for organizing and configuring game assets.

## Folder Structure

Assets are organized in the `assets/` folder with the following structure:

```
assets/
├── background/           # Static background image
├── bomb/                 # Bomb-related assets
│   ├── bomb_normal/      # Normal bomb animation
│   ├── bomb_shielded/    # Shielded bomb animation
│   ├── bomb_twin/        # Twin/dumbbell bomb animation
│   ├── iced_box/         # Frozen overlay image (for time_slow effect)
│   ├── bottom_shield/    # Shield powerup image
│   └── parachute/        # Parachute image
├── cloud/                # Cloud animation
├── flower/               # Flower animations
│   └── flower_covered/   # Protected flower animation
├── powerup/              # Powerup items
├── rainbow/              # Rainbow animation
├── slingshot/            # Slingshot image
└── sun/                  # Sun with rotating parts
```

## Naming Conventions

### Folder Names

- Use `snake_case` for folder names (e.g., `bomb_normal`, `iced_bomb`)
- The folder name becomes the resource key used in code
- Example: `assets/bomb/bomb_normal/` → `getResource('bomb_normal')`

### Multi-Part Assets

For assets with multiple parts (like the sun with inner/outer):

Use `snake_case` for part IDs. The resource key will be `{folder}_{part}`:
- `sun` folder + `inner` part → `sun_inner` resource key
- `sun` folder + `outer` part → `sun_outer` resource key

```json
{
  "parts": [
    { "id": "inner", ... },  // Results in "sun_inner"
    { "id": "outer", ... }   // Results in "sun_outer"
  ]
}
```

## info.json Configuration

Every asset folder must contain an `info.json` file that describes the asset.

### Common Fields

```json
{
  "name": "bomb_normal",
  "type": "animation",
  "description": "Human-readable description"
}
```

### Types

#### 1. Animation (Sprite Sheet)

For animated sprites using a single sprite sheet image:

```json
{
  "name": "bomb_normal",
  "type": "animation",
  "description": "Normal bomb animation",
  "fps": 8,
  "loop": true,
  "spriteSheet": {
    "file": "normal_bomb_sheet.png",
    "frameWidth": 64,
    "frameHeight": 64,
    "frameDuration": 125
  },
  "size": {
    "width": 128,
    "height": 128
  },
  "anchor": {
    "x": 0.5,
    "y": 0.5
  }
}
```

#### 2. Animation (Frame-based)

For animations with individual frame files:

```json
{
  "name": "flower",
  "type": "animation",
  "description": "Flower with states",
  "fps": 4,
  "loop": true,
  "states": {
    "alive": {
      "frames": [
        { "file": "alive_01.png", "duration": 250 },
        { "file": "alive_02.png", "duration": 250 }
      ]
    },
    "dead": {
      "frames": [
        { "file": "dead.png", "duration": 1000 }
      ]
    }
  },
  "size": { "width": 90, "height": 147 },
  "anchor": { "x": 0.5, "y": 0.8 }
}
```

#### 3. Static Image

For single static images:

```json
{
  "name": "parachute",
  "type": "static",
  "description": "Parachute image",
  "file": "parachute.png",
  "size": {
    "width": 132,
    "height": 74
  },
  "anchor": {
    "x": 0.5,
    "y": 0.8
  }
}
```

#### 4. Multi-Part Static

For assets composed of multiple parts:

```json
{
  "name": "sun",
  "type": "static",
  "description": "Sun with rotating outer ring",
  "parts": [
    {
      "id": "inner",
      "file": "sun_inner.png",
      "size": { "width": 180, "height": 180 },
      "anchor": { "x": 0.5, "y": 0.5 }
    },
    {
      "id": "outer",
      "file": "sun_outer.png",
      "size": { "width": 180, "height": 180 },
      "anchor": { "x": 0.5, "y": 0.5 },
      "rotation": {
        "speed": -0.2
      }
    }
  ],
  "position": {
    "x": 380,
    "y": 70
  }
}
```

## Autoload Behavior

The resource system automatically:

1. Scans `assets/` recursively for `info.json` files
2. Loads each discovered asset
3. Generates resource keys based on folder structure and part IDs
4. Makes assets available via `getResource('key')`

### Resource Key Generation Rules

1. **Simple assets**: Folder name = resource key
   - `assets/cloud/` → `cloud`
   - `assets/bomb/bomb_normal/` → `bomb_normal`

2. **Multi-part assets**: `{folder}_{part}`
   - `sun` folder + `inner` part → `sun_inner`
   - `sun` folder + `outer` part → `sun_outer`

## Adding New Assets

To add a new asset:

1. Create a folder in the appropriate location under `assets/`
2. Add image files to the folder
3. Create an `info.json` file with proper configuration
4. The asset will be automatically loaded on game start

No code changes needed in `resources.js`!

## Examples

### Adding a New Bomb Type

1. Create folder: `assets/bomb/bomb_ice/`
2. Add sprite sheet: `assets/bomb/bomb_ice/ice_bomb_sheet.png`
3. Create `assets/bomb/bomb_ice/info.json`:

```json
{
  "name": "bomb_ice",
  "type": "animation",
  "description": "Ice bomb that slows time",
  "fps": 8,
  "loop": true,
  "spriteSheet": {
    "file": "ice_bomb_sheet.png",
    "frameWidth": 64,
    "frameHeight": 64,
    "frameDuration": 125
  },
  "size": {
    "width": 128,
    "height": 128
  },
  "anchor": {
    "x": 0.5,
    "y": 0.5
  }
}
```

4. Use in code: `getResource('bomb_ice')`

### Adding a New Powerup

1. Create folder: `assets/powerup/shield/`
2. Add image: `assets/powerup/shield/shield_icon.png`
3. Create `assets/powerup/shield/info.json`:

```json
{
  "name": "shield",
  "type": "static",
  "description": "Shield powerup icon",
  "file": "shield_icon.png",
  "size": {
    "width": 64,
    "height": 64
  },
  "anchor": {
    "x": 0.5,
    "y": 0.5
  }
}
```

4. Use in code: `getResource('shield')`

## Troubleshooting

### Asset not loading

- Check that `info.json` exists and is valid JSON
- Verify image files exist and paths in `info.json` are correct
- Check browser console for error messages

### Wrong resource key

- Verify folder naming follows conventions
- For multi-part assets, check part ID capitalization
- Review generated keys in console output: `Discovered X resources: ...`

### Animation not playing

- Verify `fps` and `frameDuration` values
- Check that `loop` is set correctly
- For state-based animations, ensure state names match code references
