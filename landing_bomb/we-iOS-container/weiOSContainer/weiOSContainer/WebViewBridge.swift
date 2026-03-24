import UIKit
import WebKit

class WebViewBridge: NSObject, WKScriptMessageHandler {
    
    weak var viewController: UIViewController?
    
    init(viewController: UIViewController) {
        self.viewController = viewController
        super.init()
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else {
            return
        }
        
        switch action {
        case "vibrate":
            handleVibrate(body)
        case "share":
            handleShare(body)
        case "getSystemInfo":
            handleGetSystemInfo(message.webView)
        case "saveStorage":
            handleSaveStorage(body)
        case "loadStorage":
            handleLoadStorage(body, webView: message.webView)
        case "log":
            handleLog(body)
        default:
            print("Unknown action: \(action)")
        }
    }
    
    func handleVibrate(_ body: [String: Any]) {
        let intensity = body["intensity"] as? String ?? "medium"
        
        DispatchQueue.main.async {
            let feedbackGenerator: UIImpactFeedbackGenerator
            switch intensity {
            case "light":
                feedbackGenerator = UIImpactFeedbackGenerator(style: .light)
            case "heavy":
                feedbackGenerator = UIImpactFeedbackGenerator(style: .heavy)
            default:
                feedbackGenerator = UIImpactFeedbackGenerator(style: .medium)
            }
            feedbackGenerator.prepare()
            feedbackGenerator.impactOccurred()
        }
    }
    
    func handleShare(_ body: [String: Any]) {
        let title = body["title"] as? String ?? "Check out this game!"
        let imageUrl = body["imageUrl"] as? String
        
        var items: [Any] = [title]
        if let imageUrl = imageUrl,
           let url = URL(string: imageUrl),
           let data = try? Data(contentsOf: url),
           let image = UIImage(data: data) {
            items.append(image)
        }
        
        DispatchQueue.main.async {
            let activityVC = UIActivityViewController(activityItems: items, applicationActivities: nil)
            self.viewController?.present(activityVC, animated: true)
        }
    }
    
    func handleGetSystemInfo(_ webView: WKWebView?) {
        let systemInfo: [String: Any] = [
            "brand": "Apple",
            "model": UIDevice.current.model,
            "system": UIDevice.current.systemName,
            "version": UIDevice.current.systemVersion,
            "platform": "ios",
            "windowWidth": UIScreen.main.bounds.width,
            "windowHeight": UIScreen.main.bounds.height,
            "pixelRatio": UIScreen.main.scale
        ]
        
        if let jsonData = try? JSONSerialization.data(withJSONObject: systemInfo),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            let script = "window.wx._onSystemInfoCallback(\(jsonString));"
            webView?.evaluateJavaScript(script, completionHandler: nil)
        }
    }
    
    func handleSaveStorage(_ body: [String: Any]) {
        guard let key = body["key"] as? String,
              let data = body["data"] as? String else {
            return
        }
        
        UserDefaults.standard.set(data, forKey: "wechat_\(key)")
    }
    
    func handleLoadStorage(_ body: [String: Any], webView: WKWebView?) {
        guard let key = body["key"] as? String else {
            return
        }
        
        let data = UserDefaults.standard.string(forKey: "wechat_\(key)") ?? ""
        let callbackId = body["callbackId"] as? String ?? ""
        
        let script = "window.wx._onStorageCallback('\(callbackId)', '\(data)');"
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }
    
    func handleLog(_ body: [String: Any]) {
        if let message = body["message"] as? String {
            print("[JS Log] \(message)")
        }
    }
}
