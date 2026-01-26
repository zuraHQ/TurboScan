import fs from "fs";
import path from "path";
import { minimatch } from "minimatch";

export function glob(
  pattern: string,
  dir: string
): string[] {
  const exclude = ["node_modules", ".git", "dist", "build", ".next", "coverage", ".cursor", ".bun"];
  const results: string[] = [];
  
  function scan(currentDir: string): void {
    if (!fs.existsSync(currentDir)) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);
      
      if (entry.isDirectory()) {
        scan(fullPath);
      } else {
        if (minimatch(relativePath, pattern)) {
          results.push(fullPath);
        }
      }
    }
  }
  scan(dir);
  return results;
}