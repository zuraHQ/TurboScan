import fs from "fs";

export function readFile(filepath: string): string {
  try {
    return fs.readFileSync(filepath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read file ${filepath}: ${err}`);
  }
}