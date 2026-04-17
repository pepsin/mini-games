import UIKit
import WebKit
import UniformTypeIdentifiers

class ViewController: UIViewController {

    var webView: WKWebView!
    var webViewBridge: WebViewBridge!
    var projectManager: ProjectManager!
    var toolbar: UIView!
    var projectNameLabel: UILabel!
    var currentProjectURL: URL?

    // Security-scoped resource access for external folders
    private var accessedProjectURL: URL?
    private var isAccessingProject: Bool = false

    // macOS resize debounce
    private var resizeDebouncer: Timer?
    private var lastViewSize: CGSize?

    /// Serves all project files under the `game://` custom scheme.
    /// Kept alive for the lifetime of the WKWebView configuration.
    let schemeHandler = GameSchemeHandler()

    // MARK: - Lifecycle

    var isStandaloneGame: Bool {
        #if STANDALONE_GAME
        return true
        #else
        return false
        #endif
    }

    deinit {
        stopAccessingProject()
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        projectManager = ProjectManager()
        setupUI()
        setupWebView()

        if isStandaloneGame {
            loadDefaultGame()
        } else {
            loadLastProject()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        #if targetEnvironment(macCatalyst)
        guard currentProjectURL != nil else { return }
        let size = view.bounds.size
        guard size != lastViewSize else { return }
        lastViewSize = size

        resizeDebouncer?.invalidate()
        resizeDebouncer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: false) { [weak self] _ in
            self?.reloadCurrentProject()
        }
        #endif
    }

    // MARK: - UI

    func setupUI() {
        toolbar = UIView()
        toolbar.translatesAutoresizingMaskIntoConstraints = false
        toolbar.backgroundColor = UIColor(white: 0.1, alpha: 0.2)
        toolbar.layer.cornerRadius = 8
        toolbar.layer.masksToBounds = true
        toolbar.isHidden = isStandaloneGame
        view.addSubview(toolbar)

        projectNameLabel = UILabel()
        projectNameLabel.translatesAutoresizingMaskIntoConstraints = false
        projectNameLabel.textColor = .white
        projectNameLabel.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        projectNameLabel.text = "No Project Loaded"
        toolbar.addSubview(projectNameLabel)

        let addButton = UIButton(type: .system)
        addButton.translatesAutoresizingMaskIntoConstraints = false
        addButton.setTitle("Open Project", for: .normal)
        addButton.setTitleColor(.white, for: .normal)
        addButton.backgroundColor = UIColor.systemBlue
        addButton.layer.cornerRadius = 6
        addButton.configuration?.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)
        addButton.addTarget(self, action: #selector(showAddProjectOptions), for: .touchUpInside)
        toolbar.addSubview(addButton)

        let reloadButton = UIButton(type: .system)
        reloadButton.translatesAutoresizingMaskIntoConstraints = false
        reloadButton.setTitle("Reload", for: .normal)
        reloadButton.setTitleColor(.white, for: .normal)
        reloadButton.backgroundColor = UIColor.systemGray
        reloadButton.layer.cornerRadius = 6
        reloadButton.configuration?.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)
        reloadButton.addTarget(self, action: #selector(reloadCurrentProject), for: .touchUpInside)
        toolbar.addSubview(reloadButton)

        let languageButton = UIButton(type: .system)
        languageButton.translatesAutoresizingMaskIntoConstraints = false
        languageButton.setTitle(LanguageManager.shared.currentOption.displayName, for: .normal)
        languageButton.setTitleColor(.white, for: .normal)
        languageButton.backgroundColor = UIColor.systemIndigo
        languageButton.layer.cornerRadius = 6
        languageButton.configuration?.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)
        languageButton.addTarget(self, action: #selector(showLanguageOptions), for: .touchUpInside)
        languageButton.accessibilityIdentifier = "languageButton"
        toolbar.addSubview(languageButton)

        NSLayoutConstraint.activate([
            toolbar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            toolbar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            toolbar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            toolbar.heightAnchor.constraint(equalToConstant: 44),

            projectNameLabel.leadingAnchor.constraint(equalTo: toolbar.leadingAnchor, constant: 12),
            projectNameLabel.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor),

            reloadButton.trailingAnchor.constraint(equalTo: toolbar.trailingAnchor, constant: -12),
            reloadButton.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor),

            addButton.trailingAnchor.constraint(equalTo: reloadButton.leadingAnchor, constant: -8),
            addButton.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor),

            languageButton.trailingAnchor.constraint(equalTo: addButton.leadingAnchor, constant: -8),
            languageButton.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor)
        ])
        
        NotificationCenter.default.addObserver(self, selector: #selector(languageDidChange), name: .languageDidChange, object: nil)
    }

    func setupWebView() {
        let config = WKWebViewConfiguration()
        let pagePrefs = WKWebpagePreferences()
        pagePrefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = pagePrefs
        config.allowsInlineMediaPlayback = true

        // Register the custom scheme handler.
        // All project files are served under game://localhost/ — this avoids
        // every WKWebView file:// restriction (XHR, fetch, CORS, module loading).
        config.setURLSchemeHandler(schemeHandler, forURLScheme: "game")

        webViewBridge = WebViewBridge(viewController: self)
        config.userContentController.add(webViewBridge, name: "wechatBridge")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false
        webView.backgroundColor = .black
        if #available(iOS 15.0, *) {
            webView.configuration.preferences.isTextInteractionEnabled = false
        }
        webView.navigationDelegate = self

        // Disable tap highlight / text selection on all platforms (especially Mac Catalyst)
        let cssScript = WKUserScript(
            source: """
                (function() {
                    var style = document.createElement('style');
                    style.innerHTML = '* { -webkit-tap-highlight-color: transparent !important; user-select: none !important; -webkit-user-select: none !important; outline: none !important; }';
                    if (document.head) { document.head.appendChild(style); }
                    else { document.addEventListener('DOMContentLoaded', function() { document.head.appendChild(style); }); }
                })();
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        config.userContentController.addUserScript(cssScript)



        // Enable Safari Web Inspector in debug builds; disable it only for release standalone builds
        if #available(iOS 16.4, *) {
            #if DEBUG
            webView.isInspectable = true
            #else
            webView.isInspectable = false
            #endif
        }

        view.addSubview(webView)

        let webViewBottomConstraint: NSLayoutConstraint
        if isStandaloneGame {
            webViewBottomConstraint = webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        } else {
            webViewBottomConstraint = webView.bottomAnchor.constraint(equalTo: toolbar.topAnchor)
        }

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webViewBottomConstraint
        ])
    }

    // MARK: - Project loading

    @objc func showAddProjectOptions() {
        let alert = UIAlertController(title: "Open Project", message: "Choose a game project folder", preferredStyle: .actionSheet)

        alert.addAction(UIAlertAction(title: "Open Folder", style: .default) { [weak self] _ in
            self?.presentFolderPicker()
        })

        alert.addAction(UIAlertAction(title: "Load Default", style: .default) { [weak self] _ in
            self?.loadDefaultGame()
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))

        if let popover = alert.popoverPresentationController {
            popover.sourceView = toolbar
            popover.sourceRect = toolbar.bounds
        }
        present(alert, animated: true)
    }

    func presentFolderPicker() {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder])
        picker.delegate = self
        picker.allowsMultipleSelection = false
        present(picker, animated: true)
    }

    // MARK: - Security-scoped resource helpers

    private func startAccessingProject(_ url: URL?) {
        stopAccessingProject()
        guard let url = url else { return }
        accessedProjectURL = url
        isAccessingProject = url.startAccessingSecurityScopedResource()
    }

    private func stopAccessingProject() {
        guard isAccessingProject, let url = accessedProjectURL else { return }
        url.stopAccessingSecurityScopedResource()
        isAccessingProject = false
        accessedProjectURL = nil
    }

    private func saveBookmark(for url: URL) -> Data? {
        do {
            #if os(macOS)
            let bookmarkData = try url.bookmarkData(options: .withSecurityScope, includingResourceValuesForKeys: nil, relativeTo: nil)
            #else
            let bookmarkData = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
            #endif
            UserDefaults.standard.set(bookmarkData, forKey: "lastProjectBookmark")
            UserDefaults.standard.removeObject(forKey: "lastProjectPath")
            return bookmarkData
        } catch {
            print("Failed to create bookmark: \(error)")
            return nil
        }
    }

    private func resolveBookmark() -> URL? {
        guard let bookmarkData = UserDefaults.standard.data(forKey: "lastProjectBookmark") else { return nil }
        do {
            var isStale = false
            #if os(macOS)
            let url = try URL(resolvingBookmarkData: bookmarkData, options: .withSecurityScope, relativeTo: nil, bookmarkDataIsStale: &isStale)
            if isStale {
                if let freshData = try? url.bookmarkData(options: .withSecurityScope, includingResourceValuesForKeys: nil, relativeTo: nil) {
                    UserDefaults.standard.set(freshData, forKey: "lastProjectBookmark")
                }
            }
            #else
            let url = try URL(resolvingBookmarkData: bookmarkData, options: [], relativeTo: nil, bookmarkDataIsStale: &isStale)
            if isStale {
                if let freshData = try? url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil) {
                    UserDefaults.standard.set(freshData, forKey: "lastProjectBookmark")
                }
            }
            #endif
            return url
        } catch {
            print("Failed to resolve bookmark: \(error)")
            return nil
        }
    }

    func importProject(from selectedURL: URL) {
        let isDirectory = (try? selectedURL.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false

        guard isDirectory else {
            showError("Please select a folder containing the game.")
            return
        }

        // Load folder in-place: create a bookmark so we can reload it later
        _ = saveBookmark(for: selectedURL)
        startAccessingProject(selectedURL)
        loadProject(from: selectedURL)
    }

    @objc func reloadCurrentProject() {
        // Aggressively clear caches so disk edits are reflected on reload
        URLCache.shared.removeAllCachedResponses()
        let dataStore = WKWebsiteDataStore.default()
        let types = WKWebsiteDataStore.allWebsiteDataTypes()
        dataStore.removeData(ofTypes: types, modifiedSince: Date.distantPast) { }

        if let projectURL = currentProjectURL {
            loadProject(from: projectURL)
        } else {
            loadDefaultGame()
        }
    }

    @objc func showLanguageOptions() {
        let alert = UIAlertController(title: "Language", message: "Choose language for WeChat runtime", preferredStyle: .actionSheet)

        for option in LanguageOption.allCases {
            let isSelected = LanguageManager.shared.currentOption == option
            let title = isSelected ? "✓ \(option.displayName)" : option.displayName
            alert.addAction(UIAlertAction(title: title, style: .default) { [weak self] _ in
                LanguageManager.shared.currentOption = option
                self?.languageDidChange()
            })
        }

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))

        if let popover = alert.popoverPresentationController {
            if let languageButton = toolbar.subviews.first(where: { $0.accessibilityIdentifier == "languageButton" }) {
                popover.sourceView = languageButton
                popover.sourceRect = languageButton.bounds
            } else {
                popover.sourceView = toolbar
                popover.sourceRect = toolbar.bounds
            }
        }
        present(alert, animated: true)
    }

    @objc func languageDidChange() {
        if let languageButton = toolbar.subviews.first(where: { $0.accessibilityIdentifier == "languageButton" }) as? UIButton {
            languageButton.setTitle(LanguageManager.shared.currentOption.displayName, for: .normal)
        }
        reloadCurrentProject()
    }

    func loadLastProject() {
        if let bookmarkURL = resolveBookmark() {
            loadProject(from: bookmarkURL)
        } else if let lastProject = UserDefaults.standard.string(forKey: "lastProjectPath"),
                  let projectURL = URL(string: lastProject) {
            loadProject(from: projectURL)
        } else {
            loadDefaultGame()
        }
    }

    func loadDefaultGame() {
        if let gameURL = Bundle.main.url(forResource: "game/index", withExtension: "html") {
            currentProjectURL = gameURL.deletingLastPathComponent()
            if let url = currentProjectURL {
                loadProject(from: url)
            }
        } else if let gameURL = Bundle.main.url(forResource: "game", withExtension: nil) {
            currentProjectURL = gameURL
            loadProject(from: gameURL)
        } else {
            currentProjectURL = nil
            loadGameWithWrapper()
        }
    }

    /// Main entry point for loading any project folder.
    /// Looks for index.html → game.html → generates wrapper for game.js.
    /// All content is served through `game://localhost/` to avoid file:// restrictions.
    func loadProject(from url: URL) {
        startAccessingProject(url)
        currentProjectURL = url
        UserDefaults.standard.set(url.absoluteString, forKey: "lastProjectPath")
        projectNameLabel.text = url.lastPathComponent

        injectWeChatMock()

        // Point the scheme handler at this project folder
        schemeHandler.projectURL = url
        schemeHandler.inMemoryFiles.removeAll()

        let fileManager = FileManager.default

        // Check for a real HTML entry point
        for candidate in ["index.html", "game.html"] {
            if fileManager.fileExists(atPath: url.appendingPathComponent(candidate).path) {
                let gameURL = URL(string: "game://localhost/\(candidate)")!
                var request = URLRequest(url: gameURL)
                request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
                webView.load(request)
                print("Loading project via game:// scheme: \(candidate)")
                return
            }
        }

        // No HTML found — generate a wrapper in memory
        loadGameWithWrapper()
    }

    /// Generates a minimal HTML wrapper that bootstraps game.js via a proper
    /// CommonJS require() polyfill and serves it through the custom scheme.
    func loadGameWithWrapper() {
        let fileManager = FileManager.default
        let gameJSPath = currentProjectURL?.appendingPathComponent("game.js").path ?? ""
        let gameJSExists = fileManager.fileExists(atPath: gameJSPath)
        
        // Check if game.js uses ES6 module syntax (import statements)
        let isES6Module: Bool
        if gameJSExists,
           let gameJSContent = try? String(contentsOfFile: gameJSPath, encoding: .utf8) {
            // Simple check for ES6 import statements: import ... from '...'
            // This pattern matches: import { foo } from './bar' or import foo from './bar'
            let importPattern = #"^\s*import\s+.*\s+from\s+['"]"#
            isES6Module = gameJSContent.range(of: importPattern, options: .regularExpression) != nil
        } else {
            isES6Module = false
        }

        let scriptTag: String
        if gameJSExists {
            if isES6Module {
                // Load as ES6 module - no CommonJS polyfill needed
                print("Detected ES6 module in game.js, loading with type=module")
                scriptTag = """
                    <script type="module" src="game://localhost/game.js"></script>
                """
            } else {
                // Load with CommonJS require() polyfill for WeChat-style modules
                print("Using CommonJS polyfill for game.js")
                let polyfillScript = """
                    // CommonJS require() polyfill for WeChat Mini Games
                    //
                    // Key behaviours that match WeChat's runtime:
                    //  1. Paths are resolved relative to the *calling* module's directory,
                    //     just like Node.js — so require('./animationLoader') inside
                    //     js/resources.js correctly resolves to js/animationLoader.js,
                    //     not animationLoader.js at the project root.
                    //  2. Each module is executed inside a factory function, giving it a
                    //     private scope so top-level var/let/const declarations don't
                    //     collide across modules.
                    //  3. Modules are fetched synchronously (XHR sync) so exports are
                    //     available to the caller before require() returns.
                    //  4. A module cache prevents double-execution.
                    (function () {
                        const cache = {};
                        const BASE = 'game://localhost/';

                        // Built-in Node.js stubs — defined inline so they are always
                        // available regardless of WeChatMock injection order.
                        const fsMock = {
                            readdirSync: function(path) {
                                try {
                                    const rel = String(path).replace(/^(\\.?\\/)+/, '');
                                    const xhr = new XMLHttpRequest();
                                    xhr.open('GET', BASE + '_ls?path=' + encodeURIComponent(rel), false);
                                    xhr.send();
                                    if (xhr.status === 200 || xhr.status === 0) return JSON.parse(xhr.responseText);
                                } catch(e) { console.warn('[fs.readdirSync] error:', path, e); }
                                return [];
                            },
                            existsSync: function(path) {
                                try {
                                    const rel = String(path).replace(/^(\\.?\\/)+/, '');
                                    const xhr = new XMLHttpRequest();
                                    xhr.open('HEAD', BASE + rel, false);
                                    xhr.send();
                                    return xhr.status === 200 || xhr.status === 0;
                                } catch(e) { return false; }
                            },
                            readFileSync: function(path, enc) {
                                const rel = String(path).replace(/^(\\.?\\/)+/, '');
                                const xhr = new XMLHttpRequest();
                                xhr.open('GET', BASE + rel, false);
                                xhr.send();
                                if (xhr.status === 200 || xhr.status === 0) return xhr.responseText;
                                throw new Error('File not found: ' + path);
                            },
                            writeFileSync: function() {},
                            mkdirSync:     function() {},
                            statSync: function() {
                                return { isDirectory: function() { return false; }, isFile: function() { return true; } };
                            }
                        };

                        const pathMock = {
                            join:     function() { return Array.from(arguments).join('/').replace(/\\/+/g, '/'); },
                            resolve:  function() { return Array.from(arguments).join('/').replace(/\\/+/g, '/'); },
                            dirname:  function(p) { return String(p).replace(/\\/[^\\/]*$/, '') || '.'; },
                            basename: function(p, ext) { let b = String(p).replace(/.*\\//, ''); return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; },
                            extname:  function(p) { const m = String(p).match(/\\.[^\\.]*$/); return m ? m[0] : ''; }
                        };

                        // Expose on window so code that reads window.fs / window._pathMock directly still works
                        window.fs = fsMock;
                        window._pathMock = pathMock;

                        // Resolve a require() path to a canonical cache key (no leading slash).
                        // `callerDir` is the directory of the module calling require(),
                        // e.g. "js/" for a module at "js/resources.js".
                        function resolvePath(requested, callerDir) {
                            if (requested.startsWith('./') || requested.startsWith('../')) {
                                // Relative path — resolve against caller's directory
                                const combined = callerDir + requested;
                                // Collapse . and .. segments
                                const parts = combined.split('/');
                                const resolved = [];
                                for (const p of parts) {
                                    if (p === '..') resolved.pop();
                                    else if (p !== '.') resolved.push(p);
                                }
                                return resolved.join('/');
                            }
                            // Absolute path (no leading ./ or ../) — relative to project root
                            return requested.replace(/^\\//, '');
                        }

                        function loadModule(key) {
                            if (cache[key]) return cache[key].exports;

                            // Built-in Node.js / WeChat module stubs —
                            // intercept before attempting a network fetch.
                            if (key === 'fs') return window.fs || {};
                            if (key === 'path') return window._pathMock || {};

                            const mod = { exports: {} };
                            cache[key] = mod; // register early to handle circular deps

                            const xhr = new XMLHttpRequest();
                            xhr.open('GET', BASE + key, false /* synchronous */);
                            try { xhr.send(); } catch (e) {
                                console.error('[require] network error loading:', key, e);
                                return mod.exports;
                            }

                            if (xhr.status !== 200 && xhr.status !== 0) {
                                console.error('[require] HTTP', xhr.status, 'loading:', key);
                                return mod.exports;
                            }

                            // Derive this module's directory for resolving its own require() calls
                            const lastSlash = key.lastIndexOf('/');
                            const moduleDir = lastSlash >= 0 ? key.slice(0, lastSlash + 1) : '';

                            // Each module gets a scoped require that resolves relative to itself
                            const scopedRequire = function(path) {
                                return loadModule(resolvePath(path, moduleDir));
                            };

                            try {
                                new Function('module', 'exports', 'require', xhr.responseText)
                                    (mod, mod.exports, scopedRequire);
                            } catch (e) {
                                console.error('[require] error executing module:', key, e);
                            }
                            return mod.exports;
                        }

                        // game.js is the entry point — it lives at the project root
                        window.require = function(path) { return loadModule(resolvePath(path, '')); };
                        window.module  = { exports: {} };
                        window.exports = window.module.exports;
                    })();
                """
                scriptTag = "<script>" + polyfillScript + "</script>\n<script src=\"game://localhost/game.js\"></script>"
            }
        } else {
            scriptTag = "<h1 style='color:white;text-align:center;padding-top:50%'>No game.js found</h1>"
        }

        let html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
            <title>Mini Game</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; height: 100%; overflow: hidden; background: #000; touch-action: none; }
                canvas { display: block; width: 100%; height: 100%; }
            </style>
        </head>
        <body>
            \(scriptTag)
        </body>
        </html>
        """

        // Store the wrapper in memory so the scheme handler can serve it
        schemeHandler.inMemoryFiles["/_wrapper.html"] = Data(html.utf8)
        let wrapperURL = URL(string: "game://localhost/_wrapper.html")!
        var request = URLRequest(url: wrapperURL)
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        webView.load(request)
        print("Loading in-memory wrapper via game:// scheme")
    }

    // MARK: - WeChat mock injection

    func injectWeChatMock() {
        // Remove previously injected scripts to avoid duplicates on reload
        webView.configuration.userContentController.removeAllUserScripts()

        // Re-add the CSS disable-tap-highlight script (it was wiped by removeAllUserScripts)
        let cssScript = WKUserScript(
            source: """
                (function() {
                    var style = document.createElement('style');
                    style.innerHTML = '* { -webkit-tap-highlight-color: transparent !important; user-select: none !important; -webkit-user-select: none !important; outline: none !important; }';
                    if (document.head) { document.head.appendChild(style); }
                    else { document.addEventListener('DOMContentLoaded', function() { document.head.appendChild(style); }); }
                })();
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        webView.configuration.userContentController.addUserScript(cssScript)

        // Inject selected language override before WeChatMock loads
        let languageScript = WKUserScript(
            source: "window.__appLanguage = '\(LanguageManager.shared.wechatLanguage)';",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        webView.configuration.userContentController.addUserScript(languageScript)

        guard let mockPath = Bundle.main.path(forResource: "WeChatMock", ofType: "js"),
              let mockScript = try? String(contentsOfFile: mockPath, encoding: .utf8) else {
            print("Failed to load WeChatMock.js")
            return
        }

        let userScript = WKUserScript(
            source: mockScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        webView.configuration.userContentController.addUserScript(userScript)
    }

    // MARK: - Helpers

    func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    // MARK: - Orientation / status bar

    override var prefersStatusBarHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }
}

// MARK: - WKNavigationDelegate

extension ViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("Game loaded successfully")
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("Navigation failed: \(error)")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("Provisional navigation failed: \(error)")
    }
}

// MARK: - UIDocumentPickerDelegate

extension ViewController: UIDocumentPickerDelegate {
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let selectedURL = urls.first else { return }
        importProject(from: selectedURL)
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        print("File picker cancelled")
    }
}
