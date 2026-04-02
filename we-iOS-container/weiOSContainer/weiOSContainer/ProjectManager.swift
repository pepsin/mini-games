import Foundation

class ProjectManager {
    
    let projectsDirectory: URL
    
    init() {
        // Create projects directory in app's documents
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        projectsDirectory = documentsPath.appendingPathComponent("Projects", isDirectory: true)
        
        try? FileManager.default.createDirectory(at: projectsDirectory, withIntermediateDirectories: true)
    }
    
    func extractZip(at sourceURL: URL, to destinationURL: URL) throws {
        guard FileManager.default.fileExists(atPath: sourceURL.path) else {
            throw NSError(domain: "ProjectManager", code: 404, userInfo: [NSLocalizedDescriptionKey: "Zip file not found"])
        }
        
        // Remove existing destination if present
        if FileManager.default.fileExists(atPath: destinationURL.path) {
            try FileManager.default.removeItem(at: destinationURL)
        }
        
        // Create destination directory
        try FileManager.default.createDirectory(at: destinationURL, withIntermediateDirectories: true)
        
        // Note: ZIP extraction requires a third-party library like ZIPFoundation or SSZipArchive
        // For now, just copy the zip file as placeholder
        // In a production app, you would use: https://github.com/weichsel/ZIPFoundation
        let destZip = destinationURL.appendingPathComponent(sourceURL.lastPathComponent)
        try FileManager.default.copyItem(at: sourceURL, to: destZip)
        
        // Alternative: Use FileManager to copy directory contents if already unzipped
        // For now, this is a placeholder that allows the app to compile on iOS
        // where Process class is not available
    }
    
    func listProjects() -> [URL] {
        do {
            let contents = try FileManager.default.contentsOfDirectory(at: projectsDirectory, includingPropertiesForKeys: nil)
            return contents.filter { $0.hasDirectoryPath }
        } catch {
            print("Error listing projects: \(error)")
            return []
        }
    }
    
    func deleteProject(at url: URL) throws {
        try FileManager.default.removeItem(at: url)
    }
}
