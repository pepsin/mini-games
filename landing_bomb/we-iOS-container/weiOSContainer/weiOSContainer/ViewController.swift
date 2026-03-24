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
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        projectManager = ProjectManager()
        setupUI()
        setupWebView()
        
        // Load last project or default
        loadLastProject()
    }
    
    func setupUI() {
        // Create toolbar
        toolbar = UIView()
        toolbar.translatesAutoresizingMaskIntoConstraints = false
        toolbar.backgroundColor = UIColor(white: 0.1, alpha: 0.9)
        toolbar.layer.cornerRadius = 8
        toolbar.layer.masksToBounds = true
        view.addSubview(toolbar)
        
        // Project name label
        projectNameLabel = UILabel()
        projectNameLabel.translatesAutoresizingMaskIntoConstraints = false
        projectNameLabel.textColor = .white
        projectNameLabel.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        projectNameLabel.text = "No Project Loaded"
        toolbar.addSubview(projectNameLabel)
        
        // Add Project button
        let addButton = UIButton(type: .system)
        addButton.translatesAutoresizingMaskIntoConstraints = false
        addButton.setTitle("Add Project", for: .normal)
        addButton.setTitleColor(.white, for: .normal)
        addButton.backgroundColor = UIColor.systemBlue
        addButton.layer.cornerRadius = 6
        addButton.contentEdgeInsets = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
        addButton.addTarget(self, action: #selector(showAddProjectOptions), for: .touchUpInside)
        toolbar.addSubview(addButton)
        
        // Reload button
        let reloadButton = UIButton(type: .system)
        reloadButton.translatesAutoresizingMaskIntoConstraints = false
        reloadButton.setTitle("Reload", for: .normal)
        reloadButton.setTitleColor(.white, for: .normal)
        reloadButton.backgroundColor = UIColor.systemGray
        reloadButton.layer.cornerRadius = 6
        reloadButton.contentEdgeInsets = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
        reloadButton.addTarget(self, action: #selector(reloadCurrentProject), for: .touchUpInside)
        toolbar.addSubview(reloadButton)
        
        // Setup constraints
        NSLayoutConstraint.activate([
            // Toolbar
            toolbar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            toolbar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            toolbar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            toolbar.heightAnchor.constraint(equalToConstant: 44),
            
            // Project name
            projectNameLabel.leadingAnchor.constraint(equalTo: toolbar.leadingAnchor, constant: 12),
            projectNameLabel.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor),
            
            // Reload button
            reloadButton.trailingAnchor.constraint(equalTo: toolbar.trailingAnchor, constant: -12),
            reloadButton.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor),
            
            // Add button
            addButton.trailingAnchor.constraint(equalTo: reloadButton.leadingAnchor, constant: -8),
            addButton.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor)
        ])
    }
    
    func setupWebView() {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true
        config.allowsInlineMediaPlayback = true
        
        // Add message handler for JS to native communication
        webViewBridge = WebViewBridge(viewController: self)
        config.userContentController.add(webViewBridge, name: "wechatBridge")
        
        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        webView.navigationDelegate = self
        
        view.addSubview(webView)
        
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: toolbar.bottomAnchor, constant: 8),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    @objc func showAddProjectOptions() {
        let alert = UIAlertController(title: "Add Project", message: "Choose how to add a game project", preferredStyle: .actionSheet)
        
        alert.addAction(UIAlertAction(title: "Browse Files", style: .default) { [weak self] _ in
            self?.presentFilePicker()
        })
        
        alert.addAction(UIAlertAction(title: "Load from Default", style: .default) { [weak self] _ in
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
        // Support for folders and zip files
        var documentTypes: [UTType] = [.folder]
        
        // Add zip support if available
        if let zipType = UTType(filenameExtension: "zip") {
            documentTypes.append(zipType)
        }
        
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: documentTypes, asCopy: true)
        picker.delegate = self
        picker.allowsMultipleSelection = false
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
    
    func loadProject(from url: URL) {
        injectWeChatMock()
        currentProjectURL = url
        
        // Save last project path
        UserDefaults.standard.set(url.absoluteString, forKey: "lastProjectPath")
        
        // Update UI
        projectNameLabel.text = url.lastPathComponent
        
        // Look for index.html or game.js
        let fileManager = FileManager.default
        var indexURL = url.appendingPathComponent("index.html")
        
        if !fileManager.fileExists(atPath: indexURL.path) {
            // Try game.html or check if url itself is an HTML file
            indexURL = url.appendingPathComponent("game.html")
            
            if !fileManager.fileExists(atPath: indexURL.path) {
                // Check if the URL itself points to an HTML file
                if url.pathExtension == "html" {
                    indexURL = url
                } else {
                    // Create wrapper
                    loadGameWithWrapper(baseURL: url)
                    return
                }
            }
        }
        
        // Allow read access to parent directory for resources
        let accessURL = url.deletingLastPathComponent()
        webView.loadFileURL(indexURL, allowingReadAccessTo: accessURL)
        
        print("Loading project from: \(indexURL.path)")
    }
    
    func importProject(from sourceURL: URL) {
        do {
            let projectName = sourceURL.lastPathComponent
            let destinationURL = projectManager.projectsDirectory.appendingPathComponent(projectName)
            
            // Remove existing if present
            if FileManager.default.fileExists(atPath: destinationURL.path) {
                try FileManager.default.removeItem(at: destinationURL)
            }
            
            if sourceURL.pathExtension == "zip" {
                // Extract zip file
                try projectManager.extractZip(at: sourceURL, to: destinationURL.deletingPathExtension())
                loadProject(from: destinationURL.deletingPathExtension())
            } else {
                // Copy folder
                try FileManager.default.copyItem(at: sourceURL, to: destinationURL)
                loadProject(from: destinationURL)
            }
            
        } catch {
            showError("Failed to import project: \(error.localizedDescription)")
        }
    }
    
    func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    func loadGame() {
        // Inject WeChat mock SDK before loading the game
        injectWeChatMock()
        
        // Load the game HTML
        if let gameURL = Bundle.main.url(forResource: "game/index", withExtension: "html") {
            webView.loadFileURL(gameURL, allowingReadAccessTo: gameURL.deletingLastPathComponent())
        } else {
            // Fallback: create a simple HTML wrapper
            loadGameWithWrapper()
        }
    }
    
    func injectWeChatMock() {
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
    
    func loadGameWithWrapper(baseURL: URL? = nil) {
        let htmlContent = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <title>Bob-omb Squad</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    overflow: hidden; 
                    background: #000;
                    touch-action: none;
                }
                canvas { 
                    display: block; 
                    width: 100vw; 
                    height: 100vh;
                }
            </style>
        </head>
        <body>
            <script src="game.js"></script>
        </body>
        </html>
        """
        
        let base = baseURL ?? Bundle.main.bundleURL
        webView.loadHTMLString(htmlContent, baseURL: base)
    }
    
    override var prefersStatusBarHidden: Bool {
        return true
    }
    
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .portrait
    }
}

extension ViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("Game loaded successfully")
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("Failed to load game: \(error)")
    }
}

extension ViewController: UIDocumentPickerDelegate {
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let selectedURL = urls.first else { return }
        
        // Import the selected project
        importProject(from: selectedURL)
    }
    
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        print("File picker cancelled")
    }
}
