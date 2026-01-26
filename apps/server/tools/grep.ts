import fs from "fs";
import path from "path";

export function grep(
    pattern: string, 
    dir: string,
    options?: { 
      fileExtensions?: string[];
      caseSensitive?: boolean;
    }
  ): { file: string; line: number; content: string }[] {
    const { fileExtensions, caseSensitive = false } = options || {};
    const exclude = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
    const results: { file: string; line: number; content: string }[] = [];
    
    const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    
    function search(currentDir: string): void {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (exclude.includes(entry.name)) continue;
        
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          search(fullPath);
        } else {
          // Filter by extension if specified
          if (fileExtensions && !fileExtensions.some(ext => entry.name.endsWith(ext))) {
            continue;
          }
          
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            lines.forEach((line, idx) => {
              if (regex.test(line)) {
                results.push({
                  file: fullPath,
                  line: idx + 1,
                  content: line.trim()
                });
              }
            });
          } catch (err) {
            // Skip binary files or permission errors
          }
        }
      }
    }
    
    search(dir);
    return results;
  }