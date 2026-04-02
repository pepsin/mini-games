import WebKit

/// Serves mini-game project files under the custom `game://` URL scheme.
///
/// Why a custom scheme?
/// WKWebView blocks XHR / fetch to `file://` URLs even when the page itself was
/// loaded from `file://`.  A custom scheme lives on its own origin so same-origin
/// checks pass, and every sub-resource (JS modules, images, audio …) can be
/// requested freely via XHR — which is required by the synchronous CommonJS
/// require() polyfill.
///
/// Usage
/// -----
///   1. Register once at WKWebView creation time:
///        config.setURLSchemeHandler(schemeHandler, forURLScheme: "game")
///   2. Before each project load set `projectURL` to the project folder:
///        schemeHandler.projectURL = projectFolderURL
///   3. To serve a generated / in-memory HTML file, insert it before loading:
///        schemeHandler.inMemoryFiles["/wrapper.html"] = html.data(using: .utf8)!
///        webView.load(URLRequest(url: URL(string: "game://localhost/wrapper.html")!))
///   4. Any path not in `inMemoryFiles` is served straight from `projectURL`.
///
class GameSchemeHandler: NSObject, WKURLSchemeHandler {

    /// Root folder of the currently loaded project.
    var projectURL: URL?

    /// Virtual files served from memory (key = URL path, e.g. "/_wrapper.html").
    var inMemoryFiles: [String: Data] = [:]

    // MARK: - WKURLSchemeHandler

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else {
            fail(urlSchemeTask, message: "Missing URL")
            return
        }

        let path = requestURL.path   // e.g. "/_wrapper.html", "/js/config.js", "/_ls"

        // 1. In-memory files (highest priority — wrapper HTML etc.)
        if let data = inMemoryFiles[path] {
            respond(urlSchemeTask, url: requestURL, data: data, mimeType: mimeType(for: path))
            return
        }

        // 2. Directory listing endpoint — game://localhost/_ls?path=assets/
        //    Returns a JSON array of filenames (not full paths) in the given directory.
        //    Used by the fs.readdirSync() mock in WeChatMock.js.
        if path == "/_ls" {
            handleDirectoryListing(urlSchemeTask, requestURL: requestURL)
            return
        }

        // 3. Project files served from disk
        guard let projectURL = projectURL else {
            fail(urlSchemeTask, message: "No project loaded")
            return
        }

        // Strip the leading "/" so we get a relative path component
        let relative = path.hasPrefix("/") ? String(path.dropFirst()) : path
        let fileURL  = projectURL.appendingPathComponent(relative)

        guard FileManager.default.fileExists(atPath: fileURL.path),
              let data = try? Data(contentsOf: fileURL) else {
            fail(urlSchemeTask, message: "File not found: \(fileURL.path)")
            return
        }

        respond(urlSchemeTask, url: requestURL, data: data, mimeType: mimeType(for: path))
    }

    // MARK: - Directory listing

    /// Handles `game://localhost/_ls?path=<relative-dir>`.
    /// Returns a JSON array of entry names (files + subdirs) inside that directory,
    /// which backs the `fs.readdirSync()` mock used by some WeChat mini-games.
    private func handleDirectoryListing(_ task: WKURLSchemeTask, requestURL: URL) {
        guard let projectURL = projectURL else {
            fail(task, message: "No project loaded")
            return
        }

        // Parse the `path` query parameter
        var dirRelative = ""
        if let components = URLComponents(url: requestURL, resolvingAgainstBaseURL: false),
           let pathParam = components.queryItems?.first(where: { $0.name == "path" })?.value {
            // Strip leading "./" or "/" to get a clean relative path
            dirRelative = pathParam
                .trimmingCharacters(in: .whitespaces)
                .replacingOccurrences(of: "^(\\.?/)+", with: "", options: .regularExpression)
        }

        let dirURL = projectURL.appendingPathComponent(dirRelative)
        let fileManager = FileManager.default

        var entries: [String] = []
        if let contents = try? fileManager.contentsOfDirectory(atPath: dirURL.path) {
            entries = contents.sorted()
        }

        guard let data = try? JSONSerialization.data(withJSONObject: entries) else {
            fail(task, message: "JSON serialization failed")
            return
        }

        respond(task, url: requestURL, data: data, mimeType: "application/json")
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Nothing async in flight, nothing to cancel.
    }

    // MARK: - Helpers

    private func respond(_ task: WKURLSchemeTask, url: URL, data: Data, mimeType: String) {
        // WKWebView requires HTTPURLResponse (with a 200 status) for media resources
        // such as images and audio. A plain URLResponse causes WKWebView to silently
        // discard the body for those resource types, so images never decode and
        // img.width / img.height stay 0.
        let headers: [String: String] = [
            "Content-Type":   mimeType,
            "Content-Length": String(data.count),
            "Cache-Control":  "no-cache",
            "Access-Control-Allow-Origin": "*"
        ]
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: headers
        )!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    private func fail(_ task: WKURLSchemeTask, message: String) {
        let error = NSError(
            domain: "GameSchemeHandler",
            code: 404,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
        task.didFailWithError(error)
    }

    private func mimeType(for path: String) -> String {
        switch (path as NSString).pathExtension.lowercased() {
        case "html", "htm": return "text/html"
        case "js":          return "application/javascript"
        case "json":        return "application/json"
        case "css":         return "text/css"
        case "png":         return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif":         return "image/gif"
        case "webp":        return "image/webp"
        case "svg":         return "image/svg+xml"
        case "mp3":         return "audio/mpeg"
        case "ogg":         return "audio/ogg"
        case "wav":         return "audio/wav"
        case "mp4":         return "video/mp4"
        case "ttf":         return "font/ttf"
        case "otf":         return "font/otf"
        case "woff":        return "font/woff"
        case "woff2":       return "font/woff2"
        default:            return "application/octet-stream"
        }
    }
}
