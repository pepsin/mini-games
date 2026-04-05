import UIKit
import WebKit
import UniformTypeIdentifiers
import MobileCoreServices

class ViewController: UIViewController {

    var webView: WKWebView!
    var webViewBridge: WebViewBridge!
    var projectManager: ProjectManager!
    var toolbar: UIView!
    var projectNameLabel: UILabel!
    var currentProjectURL: URL?

    /// Serves all project files under the `game://` custom scheme.
    /// Kept alive for the lifetime of the WKWebView configuration.
    let schemeHandler = GameSchemeHandler()

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()

        projectManager = ProjectManager()
        setupUI()
        setupWebView()
        loadLastProject()
    }

    // MARK: - UI

    func setupUI() {
        toolbar = UIView()
        toolbar.translatesAutoresizingMaskIntoConstraints = false
        toolbar.backgroundColor = UIColor(white: 0.1, alpha: 0.2)
        toolbar.layer.cornerRadius = 8
        toolbar.layer.masksToBounds = true
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
        addButton.contentEdgeInsets = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
        addButton.addTarget(self, action: #selector(showAddProjectOptions), for: .touchUpInside)
        toolbar.addSubview(addButton)

        let reloadButton = UIButton(type: .system)
        reloadButton.translatesAutoresizingMaskIntoConstraints = false
        reloadButton.setTitle("Reload", for: .normal)
        reloadButton.setTitleColor(.white, for: .normal)
        reloadButton.backgroundColor = UIColor.systemGray
        reloadButton.layer.cornerRadius = 6
        reloadButton.contentEdgeInsets = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
        reloadButton.addTarget(self, action: #selector(reloadCurrentProject), for: .touchUpInside)
        toolbar.addSubview(reloadButton)

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
            addButton.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor)
        ])
    }

    func setupWebView() {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true
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
        webView.navigationDelegate = self

        // Enable Safari Web Inspector (iOS 16.4+)
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: toolbar.topAnchor)
        ])
    }

    // MARK: - Project loading

    @objc func showAddProjectOptions() {
        let alert = UIAlertController(title: "Open Project", message: "Choose how to load a game project", preferredStyle: .actionSheet)

        alert.addAction(UIAlertAction(title: "Browse Files", style: .default) { [weak self] _ in
            self?.presentFilePicker()
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

    func presentFilePicker() {
        let documentTypes = ["public.folder", "public.zip-archive", "com.pkware.zip-archive", "public.item"]
        let picker = UIDocumentPickerViewController(documentTypes: documentTypes, in: .open)
        picker.delegate = self
        picker.allowsMultipleSelection = false
        picker.shouldShowFileExtensions = true
        present(picker, animated: true)
    }

    @objc func reloadCurrentProject() {
        if let projectURL = currentProjectURL {
            loadProject(from: projectURL)
        } else {
            loadDefaultGame()
        }
    }

    func loadLastProject() {
        if let lastProject = UserDefaults.standard.string(forKey: "lastProjectPath"),
           let projectURL = URL(string: lastProject) {
            loadProject(from: projectURL)
        } else {
            loadDefaultGame()
        }
    }

    func loadDefaultGame() {
        if let gameURL = Bundle.main.url(forResource: "game/index", withExtension: "html") {
            currentProjectURL = gameURL.deletingLastPathComponent()
            loadProject(from: currentProjectURL!)
        } else {
            loadGameWithWrapper()
        }
    }

    /// Main entry point for loading any project folder.
    /// Looks for index.html → game.html → generates wrapper for game.js.
    /// All content is served through `game://localhost/` to avoid file:// restrictions.
    func loadProject(from url: URL) {
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
                webView.load(URLRequest(url: gameURL))
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
        webView.load(URLRequest(url: wrapperURL))
        print("Loading in-memory wrapper via game:// scheme")
    }

    // MARK: - WeChat mock injection

    func injectWeChatMock() {
        // Remove previously injected scripts to avoid duplicates on reload
        webView.configuration.userContentController.removeAllUserScripts()

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

        let shouldStopAccessing = selectedURL.startAccessingSecurityScopedResource()
        defer {
            if shouldStopAccessing { selectedURL.stopAccessingSecurityScopedResource() }
        }

        do {
            let isDirectory = (try? selectedURL.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
            let isZip = selectedURL.pathExtension == "zip"

            guard isDirectory || isZip else {
                showError("Please select a folder or zip file containing the game.")
                return
            }

            let projectName = selectedURL.deletingPathExtension().lastPathComponent
            let destinationURL = projectManager.projectsDirectory.appendingPathComponent(projectName)

            if FileManager.default.fileExists(atPath: destinationURL.path) {
                try FileManager.default.removeItem(at: destinationURL)
            }

            if isZip {
                let zipCopy = projectManager.projectsDirectory.appendingPathComponent(selectedURL.lastPathComponent)
                try FileManager.default.copyItem(at: selectedURL, to: zipCopy)
                try projectManager.extractZip(at: zipCopy, to: destinationURL)
                try? FileManager.default.removeItem(at: zipCopy)
            } else {
                try FileManager.default.copyItem(at: selectedURL, to: destinationURL)
            }

            loadProject(from: destinationURL)
            print("Imported project to: \(destinationURL.path)")

        } catch {
            print("Import error: \(error)")
            showError("Failed to import project: \(error.localizedDescription)")
        }
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        print("File picker cancelled")
    }
}
