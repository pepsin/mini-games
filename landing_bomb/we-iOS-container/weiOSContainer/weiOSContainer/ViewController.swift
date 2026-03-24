import UIKit
import WebKit

class ViewController: UIViewController {
    
    var webView: WKWebView!
    var webViewBridge: WebViewBridge!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupWebView()
        loadGame()
    }
    
    func setupWebView() {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true
        config.allowsInlineMediaPlayback = true
        
        // Add message handler for JS to native communication
        webViewBridge = WebViewBridge(viewController: self)
        config.userContentController.add(webViewBridge, name: "wechatBridge")
        
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        webView.navigationDelegate = self
        
        view.addSubview(webView)
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
    
    func loadGameWithWrapper() {
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
            <script src="game/game.js"></script>
        </body>
        </html>
        """
        
        webView.loadHTMLString(htmlContent, baseURL: Bundle.main.bundleURL)
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
