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
        
        // Use SSZipArchive if available, otherwise use system unzip
        // For now, we'll use a simple implementation with FileManager
        try FileManager.default.createDirectory(at: destinationURL, withIntermediateDirectories: true)
        
        // Use system unzip command (works on iOS simulator and device)
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
        process.arguments = ["-o", sourceURL.path, "-d", destinationURL.path]
        
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        
        try process.run()
        process.waitUntilExit()
        
        if process.terminationStatus != 0 {
            throw NSError(domain: "ProjectManager", code: Int(process.terminationStatus), userInfo: [NSLocalizedDescriptionKey: "Failed to extract zip file"])
        }
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
