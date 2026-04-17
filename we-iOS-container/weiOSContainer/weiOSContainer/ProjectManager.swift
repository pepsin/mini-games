import Foundation

class ProjectManager {
    
    let projectsDirectory: URL
    
    init() {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        projectsDirectory = documentsPath.appendingPathComponent("Projects", isDirectory: true)
        
        try? FileManager.default.createDirectory(at: projectsDirectory, withIntermediateDirectories: true)
    }
}
