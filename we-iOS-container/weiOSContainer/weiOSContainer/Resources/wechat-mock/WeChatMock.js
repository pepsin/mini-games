// WeChat Mini Game SDK Mock for iOS Container
// This file mocks the wx.* APIs to allow WeChat mini games to run in WKWebView

(function() {
    'use strict';
    
    // Check if already initialized
    if (window.wx && window.wx._isMock) {
        return;
    }
    
    // Storage for callbacks
    const storageCallbacks = {};
    let storageCallbackId = 0;
    let systemInfoCallback = null;
    let openDataContextHandler = null;
    let openDataContextLoaded = false;
    const cloudStoragePrefix = 'wechat_cloud_';
    
    // Touch event handlers
    const touchStartHandlers = [];
    const touchMoveHandlers = [];
    const touchEndHandlers = [];
    const touchCancelHandlers = [];

    // Pointer event support (Mac Catalyst sends pointer events instead of touch)
    const pointerState = new Map(); // track active pointers

    function convertPointerToTouch(pointerEvent) {
        return {
            identifier: pointerEvent.pointerId,
            clientX: pointerEvent.clientX,
            clientY: pointerEvent.clientY,
            pageX: pointerEvent.pageX,
            pageY: pointerEvent.pageY,
            screenX: pointerEvent.screenX,
            screenY: pointerEvent.screenY
        };
    }

    function buildTouchListFromPointers(excludeId) {
        const list = [];
        pointerState.forEach((pt, id) => {
            if (id !== excludeId) list.push(pt);
        });
        return list;
    }

    function handlePointerDown(e) {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen' && e.pointerType !== 'touch') return;
        e.preventDefault();
        pointerState.set(e.pointerId, convertPointerToTouch(e));
        const touches = buildTouchListFromPointers();
        const changed = [convertPointerToTouch(e)];
        touchStartHandlers.forEach(handler => {
            try {
                handler({ touches: touches, changedTouches: changed, timeStamp: Date.now() });
            } catch (err) {
                console.error('TouchStart handler error:', err);
            }
        });
    }

    function handlePointerMove(e) {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen' && e.pointerType !== 'touch') return;
        if (!pointerState.has(e.pointerId) && e.pointerType === 'mouse' && touchStartHandlers.length === 0) return;
        e.preventDefault();
        pointerState.set(e.pointerId, convertPointerToTouch(e));
        const touches = buildTouchListFromPointers();
        const changed = [convertPointerToTouch(e)];
        touchMoveHandlers.forEach(handler => {
            try {
                handler({ touches: touches, changedTouches: changed, timeStamp: Date.now() });
            } catch (err) {
                console.error('TouchMove handler error:', err);
            }
        });
    }

    function handlePointerUp(e) {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen' && e.pointerType !== 'touch') return;
        e.preventDefault();
        pointerState.delete(e.pointerId);
        const touches = buildTouchListFromPointers();
        const changed = [convertPointerToTouch(e)];
        touchEndHandlers.forEach(handler => {
            try {
                handler({ touches: touches, changedTouches: changed, timeStamp: Date.now() });
            } catch (err) {
                console.error('TouchEnd handler error:', err);
            }
        });
    }

    function handlePointerCancel(e) {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen' && e.pointerType !== 'touch') return;
        e.preventDefault();
        pointerState.delete(e.pointerId);
        const touches = buildTouchListFromPointers();
        const changed = [convertPointerToTouch(e)];
        touchCancelHandlers.forEach(handler => {
            try {
                handler({ touches: touches, changedTouches: changed, timeStamp: Date.now() });
            } catch (err) {
                console.error('TouchCancel handler error:', err);
            }
        });
    }
    
    // Create the wx object
    window.wx = {
        _isMock: true,
        
        // Canvas API
        createCanvas: function() {
            const canvas = document.createElement('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            document.body.appendChild(canvas);
            
            // Add 2D context with WeChat-specific methods
            const originalGetContext = canvas.getContext.bind(canvas);
            canvas.getContext = function(type) {
                const ctx = originalGetContext(type);
                if (ctx && type === '2d') {
                    // WeChat canvas has some specific behaviors
                    ctx.wxCanvas = true;
                }
                return ctx;
            };
            
            return canvas;
        },
        
        getSharedCanvas: function() {
            // For open data context - create a shared canvas
            let sharedCanvas = document.getElementById('sharedCanvas');
            if (!sharedCanvas) {
                sharedCanvas = document.createElement('canvas');
                sharedCanvas.id = 'sharedCanvas';
                sharedCanvas.width = window.innerWidth;
                sharedCanvas.height = window.innerHeight;
                sharedCanvas.style.display = 'none';
                document.body.appendChild(sharedCanvas);
            }
            return sharedCanvas;
        },
        
        createOffscreenCanvas: function(options) {
            const canvas = document.createElement('canvas');
            if (options) {
                if (options.width) canvas.width = options.width;
                if (options.height) canvas.height = options.height;
            }
            // Do not append to DOM — it's offscreen
            return canvas;
        },
        
        // Image API
        createImage: function() {
            const img = new Image();
            const BASE = 'game://localhost/';
            
            // Override src setter to prefix with game:// scheme
            const originalSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
            Object.defineProperty(img, 'src', {
                get: function() {
                    return originalSrc.get.call(this);
                },
                set: function(value) {
                    let newSrc = value;
                    // If it's a relative path (not starting with http, https, data, or game://)
                    if (value && !value.match(/^(https?:|data:|game:\/\/)/i)) {
                        // Remove leading ./ or /
                        const cleanPath = value.replace(/^\.\//, '').replace(/^\//, '');
                        newSrc = BASE + cleanPath;
                        console.log('[wx.createImage] Rewriting src:', value, '->', newSrc);
                    }
                    originalSrc.set.call(this, newSrc);
                }
            });
            
            return img;
        },
        
        // Safe area helper using CSS env() variables
        _getSafeAreaInsets: function() {
            const div = document.createElement('div');
            div.style.position = 'fixed';
            div.style.paddingTop = 'env(safe-area-inset-top)';
            div.style.paddingBottom = 'env(safe-area-inset-bottom)';
            div.style.paddingLeft = 'env(safe-area-inset-left)';
            div.style.paddingRight = 'env(safe-area-inset-right)';
            document.body.appendChild(div);
            const computed = getComputedStyle(div);
            const insets = {
                top: parseFloat(computed.paddingTop) || 0,
                bottom: parseFloat(computed.paddingBottom) || 0,
                left: parseFloat(computed.paddingLeft) || 0,
                right: parseFloat(computed.paddingRight) || 0
            };
            document.body.removeChild(div);
            return insets;
        },
        
        // System Info API
        getSystemInfoSync: function() {
            const insets = this._getSafeAreaInsets();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            return {
                brand: 'Apple',
                model: 'iPhone',
                system: 'iOS',
                version: navigator.userAgent.match(/OS (\d+)[_\d]* like/)?.[1] || '15',
                platform: 'ios',
                windowWidth: windowWidth,
                windowHeight: windowHeight,
                pixelRatio: window.devicePixelRatio || 1,
                language: window.__appLanguage || navigator.language,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                statusBarHeight: insets.top,
                safeArea: {
                    left: insets.left,
                    right: windowWidth - insets.right,
                    top: insets.top,
                    bottom: windowHeight - insets.bottom,
                    width: windowWidth - insets.left - insets.right,
                    height: windowHeight - insets.top - insets.bottom
                },
                safeAreaInsets: insets
            };
        },
        
        getSystemInfo: function(options) {
            const info = this.getSystemInfoSync();
            if (options && options.success) {
                setTimeout(() => options.success(info), 0);
            }
            return info;
        },
        
        _onSystemInfoCallback: function(info) {
            // Called from native bridge
            console.log('System info from native:', info);
        },
        
        // Storage API
        getStorageSync: function(key) {
            try {
                const value = localStorage.getItem('wechat_' + key);
                return value !== null ? value : '';
            } catch (e) {
                console.error('Storage get error:', e);
                return '';
            }
        },
        
        setStorageSync: function(key, data) {
            try {
                localStorage.setItem('wechat_' + key, String(data));
            } catch (e) {
                console.error('Storage set error:', e);
            }
        },
        
        removeStorageSync: function(key) {
            try {
                localStorage.removeItem('wechat_' + key);
            } catch (e) {
                console.error('Storage remove error:', e);
            }
        },
        
        clearStorageSync: function() {
            try {
                // Only clear wechat_ prefixed items
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('wechat_')) {
                        localStorage.removeItem(key);
                    }
                }
            } catch (e) {
                console.error('Storage clear error:', e);
            }
        },
        
        // Async storage APIs (call native bridge)
        getStorage: function(options) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.wechatBridge) {
                const callbackId = 'storage_' + (++storageCallbackId);
                storageCallbacks[callbackId] = options;
                window.webkit.messageHandlers.wechatBridge.postMessage({
                    action: 'loadStorage',
                    key: options.key,
                    callbackId: callbackId
                });
            } else {
                // Fallback to sync
                const data = this.getStorageSync(options.key);
                if (options.success) {
                    options.success({ data: data });
                }
            }
        },
        
        setStorage: function(options) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.wechatBridge) {
                window.webkit.messageHandlers.wechatBridge.postMessage({
                    action: 'saveStorage',
                    key: options.key,
                    data: options.data
                });
            } else {
                this.setStorageSync(options.key, options.data);
            }
            if (options.success) {
                options.success();
            }
        },
        
        _onStorageCallback: function(callbackId, data) {
            const callback = storageCallbacks[callbackId];
            if (callback && callback.success) {
                callback.success({ data: data });
                delete storageCallbacks[callbackId];
            }
        },
        
        // Touch Event APIs
        onTouchStart: function(callback) {
            if (typeof callback !== 'function') return;
            touchStartHandlers.push(callback);
            
            if (touchStartHandlers.length === 1) {
                if (window.PointerEvent) {
                    document.addEventListener('pointerdown', handlePointerDown, { passive: false });
                } else {
                    document.addEventListener('touchstart', handleTouchStart, { passive: false });
                }
            }
        },
        
        offTouchStart: function(callback) {
            if (callback) {
                const index = touchStartHandlers.indexOf(callback);
                if (index > -1) {
                    touchStartHandlers.splice(index, 1);
                }
            } else {
                touchStartHandlers.length = 0;
            }
            
            if (touchStartHandlers.length === 0) {
                if (window.PointerEvent) {
                    document.removeEventListener('pointerdown', handlePointerDown);
                } else {
                    document.removeEventListener('touchstart', handleTouchStart);
                }
            }
        },
        
        onTouchMove: function(callback) {
            if (typeof callback !== 'function') return;
            touchMoveHandlers.push(callback);
            
            if (touchMoveHandlers.length === 1) {
                if (window.PointerEvent) {
                    document.addEventListener('pointermove', handlePointerMove, { passive: false });
                } else {
                    document.addEventListener('touchmove', handleTouchMove, { passive: false });
                }
            }
        },
        
        offTouchMove: function(callback) {
            if (callback) {
                const index = touchMoveHandlers.indexOf(callback);
                if (index > -1) {
                    touchMoveHandlers.splice(index, 1);
                }
            } else {
                touchMoveHandlers.length = 0;
            }
            
            if (touchMoveHandlers.length === 0) {
                if (window.PointerEvent) {
                    document.removeEventListener('pointermove', handlePointerMove);
                } else {
                    document.removeEventListener('touchmove', handleTouchMove);
                }
            }
        },
        
        onTouchEnd: function(callback) {
            if (typeof callback !== 'function') return;
            touchEndHandlers.push(callback);
            
            if (touchEndHandlers.length === 1) {
                if (window.PointerEvent) {
                    document.addEventListener('pointerup', handlePointerUp, { passive: false });
                    document.addEventListener('pointercancel', handlePointerUp, { passive: false });
                } else {
                    document.addEventListener('touchend', handleTouchEnd, { passive: false });
                    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
                }
            }
        },
        
        offTouchEnd: function(callback) {
            if (callback) {
                const index = touchEndHandlers.indexOf(callback);
                if (index > -1) {
                    touchEndHandlers.splice(index, 1);
                }
            } else {
                touchEndHandlers.length = 0;
            }
            
            if (touchEndHandlers.length === 0) {
                if (window.PointerEvent) {
                    document.removeEventListener('pointerup', handlePointerUp);
                    document.removeEventListener('pointercancel', handlePointerUp);
                } else {
                    document.removeEventListener('touchend', handleTouchEnd);
                    document.removeEventListener('touchcancel', handleTouchEnd);
                }
            }
        },
        
        onTouchCancel: function(callback) {
            if (typeof callback !== 'function') return;
            touchCancelHandlers.push(callback);
            
            if (touchCancelHandlers.length === 1) {
                if (window.PointerEvent) {
                    document.addEventListener('pointercancel', handlePointerCancel, { passive: false });
                } else {
                    document.addEventListener('touchcancel', handleTouchCancel, { passive: false });
                }
            }
        },
        
        offTouchCancel: function(callback) {
            if (callback) {
                const index = touchCancelHandlers.indexOf(callback);
                if (index > -1) {
                    touchCancelHandlers.splice(index, 1);
                }
            } else {
                touchCancelHandlers.length = 0;
            }
            
            if (touchCancelHandlers.length === 0) {
                if (window.PointerEvent) {
                    document.removeEventListener('pointercancel', handlePointerCancel);
                } else {
                    document.removeEventListener('touchcancel', handleTouchCancel);
                }
            }
        },
        
        // Vibration API
        vibrateShort: function(options) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.wechatBridge) {
                window.webkit.messageHandlers.wechatBridge.postMessage({
                    action: 'vibrate',
                    intensity: options && options.type ? options.type : 'medium'
                });
            }
            // Also try web vibration API as fallback
            if (navigator.vibrate) {
                navigator.vibrate(15);
            }
        },
        
        // File System API
        getFileSystemManager: function() {
            const BASE = 'game://localhost/';

            function syncXHR(method, url) {
                const xhr = new XMLHttpRequest();
                xhr.open(method, url, false);
                try { xhr.send(); } catch(e) { return { status: -1, text: '' }; }
                return { status: xhr.status, text: xhr.responseText };
            }

            function normPath(path) {
                // Strip WeChat virtual path prefixes like wxfile://usr
                return String(path)
                    .replace(/^wxfile:\/\/[^/]*/, '')
                    .replace(/^\.\//, '')
                    .replace(/^\//, '');
            }

            return {
                readdirSync: function(path) {
                    try {
                        const rel = normPath(path);
                        const url = BASE + '_ls?path=' + encodeURIComponent(rel);
                        console.log('[FSM.readdirSync] path:', path, '-> rel:', rel, '-> url:', url);
                        const res = syncXHR('GET', url);
                        console.log('[FSM.readdirSync] response - status:', res.status, 'text:', res.text.substring(0, 200));
                        if (res.status === 200 || res.status === 0) {
                            const result = JSON.parse(res.text);
                            console.log('[FSM.readdirSync] parsed:', result);
                            return result;
                        }
                    } catch(e) { 
                        console.error('[FSM.readdirSync] error:', path, e); 
                    }
                    return [];
                },
                accessSync: function(path) {
                    const rel = normPath(path);
                    const res = syncXHR('HEAD', BASE + rel);
                    if (res.status !== 200 && res.status !== 0) {
                        throw new Error('no such file: ' + path);
                    }
                },
                statSync: function(path) {
                    const rel = normPath(path);
                    // Check if it's a directory by trying to list it
                    const res = syncXHR('GET', BASE + '_ls?path=' + encodeURIComponent(rel));
                    const isDir = (res.status === 200 || res.status === 0) && res.text.startsWith('[');
                    console.log('[FSM.statSync]', path, '-> isDirectory:', isDir);
                    return { 
                        isDirectory: function() { return isDir; }, 
                        isFile: function() { return !isDir; } 
                    };
                },
                readFileSync: function(path, enc) {
                    const rel = normPath(path);
                    const res = syncXHR('GET', BASE + rel);
                    if (res.status === 200 || res.status === 0) return res.text;
                    throw new Error('File not found: ' + path);
                },
                readFile: function(options) {
                    try {
                        const data = this.readFileSync(options.filePath, options.encoding);
                        if (options.success) options.success({ data: data });
                    } catch(e) {
                        if (options.fail) options.fail({ errMsg: e.message });
                    }
                },
                writeFile: function(options) {
                    console.log('FileSystem writeFile:', options.filePath);
                    if (options.success) options.success();
                },
                writeFileSync: function() {},
                access: function(options) {
                    try {
                        this.accessSync(options.path);
                        if (options.success) options.success();
                    } catch(e) {
                        if (options.fail) options.fail({ errMsg: e.message });
                    }
                },
                mkdir: function(options) {
                    if (options.success) options.success();
                },
                mkdirSync: function() {}
            };
        },
        
        env: {
            USER_DATA_PATH: 'wxfile://usr'
        },
        
        // Open Data Context (Social/Friends)
        getOpenDataContext: function() {
            if (!openDataContextLoaded) {
                openDataContextLoaded = true;
                // Dynamically load the game's open data context script
                const script = document.createElement('script');
                script.src = 'js/openDataContext/index.js';
                script.onerror = function() {
                    console.warn('Failed to load open data context script: js/openDataContext/index.js');
                };
                document.head.appendChild(script);
            }
            return {
                postMessage: function(data) {
                    console.log('OpenDataContext postMessage:', data);
                    if (openDataContextHandler) {
                        setTimeout(() => openDataContextHandler(data), 0);
                    }
                }
            };
        },
        
        onMessage: function(callback) {
            openDataContextHandler = callback;
            console.log('OpenDataContext onMessage registered');
        },
        
        // Social APIs
        shareAppMessage: function(options) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.wechatBridge) {
                window.webkit.messageHandlers.wechatBridge.postMessage({
                    action: 'share',
                    title: options.title,
                    imageUrl: options.imageUrl,
                    query: options.query
                });
            }
            console.log('Share:', options);
            if (options.success) {
                setTimeout(options.success, 500);
            }
        },
        
        // Cloud Storage (mocked)
        setUserCloudStorage: function(options) {
            console.log('Cloud storage set:', options);
            try {
                if (options.KVDataList) {
                    options.KVDataList.forEach(kv => {
                        localStorage.setItem(cloudStoragePrefix + kv.key, kv.value);
                    });
                }
            } catch (e) {
                console.error('Cloud storage set error:', e);
            }
            if (options.success) {
                setTimeout(options.success, 100);
            }
        },
        
        getUserCloudStorage: function(options) {
            console.log('Cloud storage get user:', options);
            const keyList = options.keyList || [];
            const kvDataList = [];
            keyList.forEach(key => {
                const value = localStorage.getItem(cloudStoragePrefix + key) || '';
                kvDataList.push({ key: key, value: value });
            });
            if (options.success) {
                setTimeout(() => options.success({ KVDataList: kvDataList }), 100);
            }
        },
        
        getFriendCloudStorage: function(options) {
            console.log('Cloud storage get friends:', options);
            
            // Build dummy friend leaderboard data with deterministic emoji avatars
            const EMOJI_AVATARS = [
                "🦁", "🐯", "🐻", "🐨", "🐼", "🐸", "🐙", "🐵",
                "🐔", "🦄", "🐝", "🦋", "🐞", "🦕", "🦖", "🐬"
            ];
            function getDummyAvatar(seed) {
                const idx = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % EMOJI_AVATARS.length;
                return EMOJI_AVATARS[idx];
            }
            const dummyFriends = [
                { nickname: 'Alice',   openid: 'mock_alice',   avatarEmoji: getDummyAvatar('mock_alice'),   KVDataList: [{ key: 'score', value: '9999' }] },
                { nickname: 'Bob',     openid: 'mock_bob',     avatarEmoji: getDummyAvatar('mock_bob'),     KVDataList: [{ key: 'score', value: '8500' }] },
                { nickname: 'Charlie', openid: 'mock_charlie', avatarEmoji: getDummyAvatar('mock_charlie'), KVDataList: [{ key: 'score', value: '7200' }] },
                { nickname: 'Dave',    openid: 'mock_dave',    avatarEmoji: getDummyAvatar('mock_dave'),    KVDataList: [{ key: 'score', value: '6400' }] },
                { nickname: 'Eve',     openid: 'mock_eve',     avatarEmoji: getDummyAvatar('mock_eve'),     KVDataList: [{ key: 'score', value: '5300' }] }
            ];
            
            // Inject current user's saved scores so they see themselves in the list
            const currentUser = {
                nickname: '我 (You)',
                openid: 'mock_self',
                KVDataList: []
            };
            
            const keyList = options.keyList || ['score'];
            keyList.forEach(key => {
                const value = localStorage.getItem(cloudStoragePrefix + key) || '0';
                currentUser.KVDataList.push({ key: key, value: value });
            });
            
            const data = [currentUser, ...dummyFriends];
            
            if (options.success) {
                setTimeout(() => options.success({ data: data }), 100);
            }
        },
        
        // Analytics APIs
        reportEvent: function(eventName, data) {
            console.log('Analytics event:', eventName, data);
        },
        
        reportPerformance: function(id, value, dimensions) {
            console.log('Performance:', id, value, dimensions);
        },
        
        canIUse: function(api) {
            const supportedAPIs = [
                'getSystemInfoSync',
                'getStorageSync',
                'setStorageSync',
                'createCanvas',
                'createOffscreenCanvas',
                'createImage',
                'onTouchStart',
                'onTouchMove',
                'onTouchEnd',
                'onTouchCancel',
                'vibrateShort',
                'shareAppMessage',
                'reportEvent',
                'reportPerformance',
                'getOpenDataContext',
                'onMessage',
                'getSharedCanvas',
                'setUserCloudStorage',
                'getUserCloudStorage',
                'getFriendCloudStorage'
            ];
            return supportedAPIs.some(supported => api.includes(supported));
        }
    };
    
    // Touch event handlers
    function handleTouchStart(e) {
        e.preventDefault();
        const touches = convertTouches(e.touches);
        touchStartHandlers.forEach(handler => {
            try {
                handler({ touches: touches, changedTouches: touches, timeStamp: Date.now() });
            } catch (err) {
                console.error('TouchStart handler error:', err);
            }
        });
    }
    
    function handleTouchMove(e) {
        e.preventDefault();
        const touches = convertTouches(e.touches);
        touchMoveHandlers.forEach(handler => {
            try {
                handler({ touches: touches, changedTouches: touches, timeStamp: Date.now() });
            } catch (err) {
                console.error('TouchMove handler error:', err);
            }
        });
    }
    
    function handleTouchEnd(e) {
        e.preventDefault();
        const touches = convertTouches(e.touches);
        const changedTouches = convertTouches(e.changedTouches);
        touchEndHandlers.forEach(handler => {
            try {
                handler({ touches: touches, changedTouches: changedTouches, timeStamp: Date.now() });
            } catch (err) {
                console.error('TouchEnd handler error:', err);
            }
        });
    }
    
    function handleTouchCancel(e) {
        e.preventDefault();
        const touches = convertTouches(e.touches);
        const changedTouches = convertTouches(e.changedTouches);
        touchCancelHandlers.forEach(handler => {
            try {
                handler({ touches: touches, changedTouches: changedTouches, timeStamp: Date.now() });
            } catch (err) {
                console.error('TouchCancel handler error:', err);
            }
        });
    }
    
    function convertTouches(touchList) {
        return Array.from(touchList).map(touch => ({
            identifier: touch.identifier,
            clientX: touch.clientX,
            clientY: touch.clientY,
            pageX: touch.pageX,
            pageY: touch.pageY
        }));
    }
    
    // Override console.log to also send to native bridge
    const originalLog = console.log;
    console.log = function(...args) {
        originalLog.apply(console, args);
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.wechatBridge) {
            window.webkit.messageHandlers.wechatBridge.postMessage({
                action: 'log',
                message: args.map(arg => {
                    try { return String(arg); } catch(e) { return '[unstringable]'; }
                }).join(' ')
            });
        }
    };
    
    console.log('WeChat SDK Mock loaded successfully');
})();
