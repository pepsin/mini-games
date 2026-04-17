import Foundation

enum LanguageOption: String, CaseIterable {
    case system = "system"
    case english = "english"
    case chinese = "chinese"
    
    var displayName: String {
        switch self {
        case .system:
            return "System"
        case .english:
            return "English"
        case .chinese:
            return "中文"
        }
    }
    
    var wechatLanguageCode: String {
        switch self {
        case .system:
            let preferred = Locale.preferredLanguages.first ?? "en"
            if preferred.hasPrefix("zh") {
                return "zh_CN"
            }
            return "en"
        case .english:
            return "en"
        case .chinese:
            return "zh_CN"
        }
    }
}

class LanguageManager {
    static let shared = LanguageManager()
    private let languageKey = "app_language_option"
    
    var currentOption: LanguageOption {
        get {
            if let raw = UserDefaults.standard.string(forKey: languageKey),
               let option = LanguageOption(rawValue: raw) {
                return option
            }
            return .system
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: languageKey)
            NotificationCenter.default.post(name: .languageDidChange, object: nil)
        }
    }
    
    var wechatLanguage: String {
        return currentOption.wechatLanguageCode
    }
}

extension Notification.Name {
    static let languageDidChange = Notification.Name("languageDidChange")
}
