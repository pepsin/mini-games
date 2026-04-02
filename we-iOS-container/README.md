# weiOS Container

An iOS app that runs WeChat Mini Games in a WKWebView with mocked WeChat SDK APIs.

## What This Is

This iOS app creates a simulation environment for WeChat Mini Games by:
- Running the game in a WKWebView
- Injecting a JavaScript mock of the WeChat SDK (`wx.*` APIs)
- Providing native bridges for iOS-specific features (vibration, sharing, etc.)

## Project Structure

```
we-iOS-container/
└── weiOSContainer/
    ├── weiOSContainer.xcodeproj/          # Xcode project
    └── weiOSContainer/
        ├── AppDelegate.swift              # App entry point
        ├── ViewController.swift           # WKWebView setup & UI
        ├── WebViewBridge.swift            # Native bridges for WeChat APIs
        ├── ProjectManager.swift           # File management & project loading
        ├── LaunchScreen.storyboard        # Launch screen
        ├── Assets.xcassets/               # App icons
        ├── Info.plist                     # App configuration
        └── Resources/
            ├── wechat-mock/
            │   ├── WeChatMock.js          # WeChat SDK mock
            │   └── game/                  # Symlink to your game
            └── game/
                └── index.html             # Game wrapper
```

## Setup Instructions

### 1. Open in Xcode

Open `weiOSContainer.xcodeproj` in Xcode 15.0 or later.

### 2. Configure Signing

In Xcode, select the project → weiOSContainer target → Signing & Capabilities:
- Set your Team
- Update Bundle Identifier (optional)

### 3. Build and Run

Select your target device/simulator and press Cmd+R to build and run.

## How It Works

### WeChat SDK Mock

The `WeChatMock.js` file provides JavaScript implementations of WeChat Mini Game APIs:

- **Canvas**: `wx.createCanvas()`, `wx.getSharedCanvas()`
- **Input**: `wx.onTouchStart/Move/End()`
- **Storage**: `wx.getStorageSync()`, `wx.setStorageSync()`
- **System**: `wx.getSystemInfoSync()`
- **Images**: `wx.createImage()`
- **Vibration**: `wx.vibrateShort()` (bridged to native)
- **Sharing**: `wx.shareAppMessage()` (bridged to native iOS share sheet)
- **File System**: `wx.getFileSystemManager()` (simplified)
- **Cloud/Social**: Mocked with console logs

### Native Bridges

The `WebViewBridge.swift` handles native iOS functionality:
- Vibration via `UIImpactFeedbackGenerator`
- Sharing via `UIActivityViewController`
- Storage via `UserDefaults`
- System info from `UIDevice`

### Game Loading

The app loads the game from the `Resources/game/` folder. The folder structure should mirror your game's structure:
```
Resources/game/
├── index.html          # Entry point (provided)
├── game.js             # Main game file
├── js/
│   ├── gameState.js
│   ├── inputHandler.js
│   └── ...
└── assets/
    └── ...
```

## Development Workflow

### Option 1: File Picker (Easiest)
The app includes a file picker to load game projects from anywhere on your device:

1. Tap **"Add Project"** button in the toolbar
2. Choose **"Browse Files"**
3. Select a folder containing your game files **or** a `.zip` file
4. The app will copy the project and load it automatically

**Supported formats:**
- Folders containing game files
- `.zip` archives (auto-extracted)

The last loaded project is saved and will reload automatically when you reopen the app.

### Option 2: Static Bundle
The game files are bundled with the app. After making changes:
1. Rebuild and run in Xcode

### Option 3: Local Web Server (Recommended for development)
Run a local HTTP server and point the WKWebView to it:

```swift
// In ViewController.swift, replace loadGame() with:
if let url = URL(string: "http://192.168.1.xxx:8080") {
    webView.load(URLRequest(url: url))
}
```

This allows instant updates without rebuilding the app.

### Option 4: File Watching (Advanced)
Set up a file watcher that copies changes to the app bundle and triggers a WebView reload.

## Project Management

### Loading Projects
- **Add Project**: Import a new project from Files app
- **Reload**: Refresh the current project
- **Load Default**: Switch back to the bundled default game

### Project Storage
Imported projects are stored in the app's Documents/Projects directory and persist between app launches.

## Limitations

1. **No WeChat Login**: User authentication requires actual WeChat
2. **No Real Cloud Storage**: Friend leaderboards are mocked
3. **No Native Ads**: Ad APIs not implemented
4. **File System**: Simplified implementation
5. **Open Data Context**: Mocked only

## Adding New APIs

To add more WeChat APIs:

1. **JavaScript Mock** (`WeChatMock.js`):
```javascript
wx.newApi = function(options) {
    // Call native bridge if needed
    if (window.webkit?.messageHandlers?.wechatBridge) {
        window.webkit.messageHandlers.wechatBridge.postMessage({
            action: 'newApi',
            data: options
        });
    }
};
```

2. **Native Bridge** (`WebViewBridge.swift`):
```swift
case "newApi":
    handleNewApi(body)

func handleNewApi(_ body: [String: Any]) {
    // Implement native functionality
}
```

## Troubleshooting

### Game not loading
- Check that all game files are included in the Xcode project
- Verify file paths in `index.html`
- Check Safari Web Inspector console for JS errors

### Touch events not working
- Ensure the game doesn't prevent default on touch events
- Check that the canvas covers the full screen

### Storage not persisting
- Storage is cleared when app is reinstalled
- For persistent storage, use native `UserDefaults` via the bridge

## License

This is a development tool for testing WeChat Mini Games. Not for production use.
