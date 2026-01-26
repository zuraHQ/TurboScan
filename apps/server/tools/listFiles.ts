import fs from "fs";
import path from "path";

export function listFiles(dir: string): string[] {
  const exclude = ["node_modules", ".git", "dist", "build", ".next", "coverage", ".cursor"];
  let results: string[] = [];
  
  if (!fs.existsSync(dir)) return results;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  
  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      results = results.concat(listFiles(fullPath));
    } else {
      results.push(fullPath)
    }
  }
  
  return results;
}