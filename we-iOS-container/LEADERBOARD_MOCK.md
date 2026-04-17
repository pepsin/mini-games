# Leaderboard Mock & Backend Data Specification

## What was changed in `WeChatMock.js`

The iOS container now provides functional stub implementations for the WeChat open-data / cloud-storage APIs so that the **friend leaderboard UI renders** even when the game runs outside the WeChat runtime.

### 1. `wx.getOpenDataContext()`
- On first call it dynamically injects the game's own open-data context script:  
  `js/openDataContext/index.js` (the file that normally lives in the WeChat "open data context").
- `postMessage(...)` forwards messages to the handler registered by `wx.onMessage(...)`.

### 2. `wx.onMessage(handler)`
- Stores the callback so that `getOpenDataContext().postMessage()` can deliver messages to it.

### 3. `wx.setUserCloudStorage(options)`
- Persists `KVDataList` items to `localStorage` (key prefix: `wechat_cloud_`).
- Calls `options.success` asynchronously.

### 4. `wx.getFriendCloudStorage(options)`
- Returns a mix of **dummy friend data** + the current user's locally-saved scores.
- This is what makes the leaderboard canvas actually draw rows instead of staying empty.

### 5. `wx.getUserCloudStorage(options)`
- Also mocked; reads back the `wechat_cloud_*` localStorage entries.

---

## How the leaderboard flow works (in the game)

1. **Main context** (`js/socialSystem.js`)  
   ```js
   const odc = wx.getOpenDataContext();
   odc.postMessage({ action: 'showFriendRank' });
   ```

2. **Open data context** (`js/openDataContext/index.js`) receives the message and calls:  
   ```js
   wx.getFriendCloudStorage({
     keyList: ['score'],
     success: (res) => {
       userData = res.data; // array of user objects
       drawLeaderboard();
     }
   });
   ```

3. The open-data context draws onto `wx.getSharedCanvas()`.

---

## Data format your custom backend should return

When you later replace the mock with calls to your own backend server, make sure the JSON returned for a "friend leaderboard" query matches the shape that `wx.getFriendCloudStorage` normally produces.

### Success response shape

```json
{
  "data": [
    {
      "avatarUrl": "https://your-cdn.com/avatars/user123.png",
      "nickname": "Player One",
      "openid": "user_openid_123",
      "KVDataList": [
        { "key": "score", "value": "8420" }
      ]
    },
    {
      "avatarUrl": "https://your-cdn.com/avatars/user456.png",
      "nickname": "Player Two",
      "openid": "user_openid_456",
      "KVDataList": [
        { "key": "score", "value": "7650" }
      ]
    }
  ]
}
```

### Field descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | `Array` | ✅ | List of friend entries (including the current user). |
| `data[].avatarUrl` | `string` | ❌ | URL of the player's avatar. The current landingBomb game does **not** draw avatars yet, but keep it for future use. |
| `data[].nickname` | `string` | ✅ | Display name shown in the leaderboard. |
| `data[].openid` | `string` | ✅ | Unique player identifier. |
| `data[].KVDataList` | `Array` | ✅ | Key-value list of cloud-storage items. |
| `data[].KVDataList[].key` | `string` | ✅ | Key name, e.g. `"score"`. |
| `data[].KVDataList[].value` | `string` | ✅ | **Must be a string** (WeChat stores values as strings). e.g. `"8420"`. |

---

## Backend API Specification

### 1. Submit user score (`POST /api/leaderboard/score`)

This is the endpoint the client (or the iOS container on behalf of the client) calls whenever `wx.setUserCloudStorage` is triggered.

#### Request headers
| Header | Value | Description |
|--------|-------|-------------|
| `Authorization` | `Bearer <id_token>` or `Bearer <session_token>` | Identify the current player. |
| `Content-Type` | `application/json` | |

#### Request body
```json
{
  "openid": "user_openid_abc",
  "nickname": "Player One",
  "avatarUrl": "https://your-cdn.com/avatars/user123.png",
  "KVDataList": [
    { "key": "score", "value": "8420" },
    { "key": "highScore", "value": "12000" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `openid` | `string` | ✅ | Player unique ID (from your auth system). |
| `nickname` | `string` | ✅ | Display name shown on the leaderboard. Max 20 chars recommended. |
| `avatarUrl` | `string` | ❌ | URL to the player's avatar image. If missing or empty, the server should assign a fallback emoji (see avatar section below). |
| `KVDataList` | `Array` | ✅ | List of key-value pairs to store. |

#### Response (success)
```json
{
  "errMsg": "setUserCloudStorage:ok",
  "data": {
    "avatarUrl": "https://your-cdn.com/avatars/user123.png",
    "nickname": "Player One"
  }
}
```

#### Response (error)
```json
{
  "errMsg": "setUserCloudStorage:fail invalid score value",
  "errCode": -1
}
```

#### Server-side logic you must enforce
1. **Value sanitisation** — trim and validate that each `value` is a plain numeric string (regex `^\d+$`). Reject non-numeric values before storing.
2. **High-score logic** (optional but recommended) — only overwrite the stored score if the incoming value is numerically greater than the existing one.
3. **Nickname sanitisation** — strip HTML tags and excessive whitespace; cap length.
4. **Rate limiting** — allow only a few score updates per minute per user to prevent spam.

---

### 2. Get friend leaderboard (`GET /api/leaderboard/friends`)

Returns the current user + their friends, sorted by score descending.

#### Request
```http
GET /api/leaderboard/friends?keyList=score&openid=user_openid_abc
Authorization: Bearer <session_token>
```

Or `POST` with the same JSON body shape as WeChat's `getFriendCloudStorage`:
```json
{
  "openid": "user_openid_abc",
  "keyList": ["score"]
}
```

#### Response
```json
{
  "data": [
    {
      "avatarUrl": "https://your-cdn.com/avatars/user123.png",
      "nickname": "Player One",
      "openid": "user_openid_abc",
      "KVDataList": [
        { "key": "score", "value": "8420" }
      ]
    },
    {
      "avatarUrl": "https://your-cdn.com/emoji-avatars/emoji_42.png",
      "nickname": "LazyCat",
      "openid": "friend_openid_456",
      "KVDataList": [
        { "key": "score", "value": "7650" }
      ]
    }
  ]
}
```

---

### 3. Get user storage (`GET /api/leaderboard/user`)

Reads back the current user's own KV data.

#### Response
```json
{
  "KVDataList": [
    { "key": "score", "value": "8420" },
    { "key": "highScore", "value": "12000" }
  ]
}
```

---

## Avatar strategy (no WeChat = no automatic avatar)

Since this container runs outside WeChat, you do **not** get a free user avatar. You need a deliberate fallback strategy.

### Option A: Emoji avatar (Recommended for zero friction)

When the server receives a score submission **without** an `avatarUrl`, it auto-assigns a deterministic emoji avatar based on the user's `openid` hash.

**How it works:**
1. Server hashes the `openid` → picks an index from a pre-defined emoji list.
2. Generates a small static image (e.g. 64×64 PNG) on the fly or serves a pre-rendered sprite.
3. Returns the generated URL as `avatarUrl` in all subsequent leaderboard responses.

**Example deterministic emoji list (42 items):**
```js
const EMOJI_AVATARS = [
  "🦁", "🐯", "🐻", "🐨", "🐼", "🐸", "🐙", "🐵",
  "🐔", "🦄", "🐝", "🦋", "🐞", "🦕", "🦖", "🐬",
  "🐳", "🦭", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧",
  "🐘", "🦛", "🦏", "🐪", "🦒", "🦘", "🐃", "🐂",
  "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌",
  "🐕", "🐈"
];
```

**Implementation sketch (Node.js / server):**
```js
function getEmojiAvatarUrl(openid) {
    const hash = openid.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const emoji = EMOJI_AVATARS[hash % EMOJI_AVATARS.length];
    // Option 1: Render on the fly with canvas library (node-canvas / satori)
    // Option 2: Pre-bake 42 PNGs and serve from /static/avatars/emoji_{idx}.png
    return `https://your-cdn.com/emoji-avatars/emoji_${hash % EMOJI_AVATARS.length}.png`;
}
```

If you do not want to render images, you can simply return the emoji as a string field (`avatarEmoji`) and modify the open-data context drawing code to draw the emoji directly on the canvas instead of an image.

### Option B: Ask the user to pick a photo (native iOS pickers)

If you want real photos, you can extend the iOS container with a native image picker triggered via the JS bridge.

**Flow:**
1. First time the user opens the leaderboard (or after a score is submitted without an avatar), the main game context calls:
   ```js
   wx.chooseImage({
     count: 1,
     sizeType: ['compressed'],
     sourceType: ['album', 'camera'],
     success: (res) => {
       const localPath = res.tempFilePaths[0];
       // upload to your server / CDN
     }
   });
   ```
2. You add `wx.chooseImage` to `WeChatMock.js` so it posts a message to the native Swift bridge.
3. Swift presents `UIImagePickerController`, gets the image, compresses it, and either:
   - Returns a local `game://localhost/` path so the JS can upload it via `fetch`, or
   - Uploads it directly to your CDN and returns the final URL.
4. Server stores the `avatarUrl` permanently for that `openid`.

**Trade-off:** Option B is richer but requires extra native work and privacy permissions. **Option A (emoji) gives you an instant, polished leaderboard with no native permissions.**

### Recommended hybrid approach
1. **Default:** Assign a deterministic emoji avatar on first score submission (zero friction).
2. **Opt-in:** Add a small "Change avatar" button in the leaderboard or settings that triggers the native photo picker (Option B). If the user picks a photo, overwrite the emoji URL with the real photo URL on the server.

---

## Updating the mock to reflect avatar fallback

If you want the **dummy data** in `WeChatMock.js` to demonstrate the emoji-avatar concept right now, you can update the dummy friends array like this:

```js
const EMOJI_AVATARS = [
  "🦁", "🐯", "🐻", "🐨", "🐼", "🐸", "🐙", "🐵"
];

function getDummyAvatar(seed) {
    const idx = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % EMOJI_AVATARS.length;
    return EMOJI_AVATARS[idx];
}

const dummyFriends = [
    { nickname: 'Alice',  openid: 'mock_alice',  avatarEmoji: getDummyAvatar('mock_alice'),  KVDataList: [{ key: 'score', value: '9999' }] },
    { nickname: 'Bob',    openid: 'mock_bob',    avatarEmoji: getDummyAvatar('mock_bob'),    KVDataList: [{ key: 'score', value: '8500' }] },
    ...
];
```

Then in `js/openDataContext/index.js` you can draw the emoji instead of (or next to) the green circle placeholder:

```js
// Replace the green circle placeholder with an emoji
ctx.font = '24px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(user.avatarEmoji || '👤', 90, y + 25);
```

---

### Important notes

1. **Values are strings** — the real WeChat API stores all KV values as strings. The game code does `parseInt(...)` when sorting, so `