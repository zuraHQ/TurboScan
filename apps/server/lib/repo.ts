import path from "path";
import fs from "fs";
import { downloadDirectory, bucketRepoExists } from "./bucket.ts";

const REPO_FOLDER = path.join(process.cwd(), "downloads");

/**
 * Ensure a repo is available on the local filesystem.
 * If it doesn't exist locally, download it from the bucket.
 * Returns the local path to the repo.
 */
export async function ensureLocalRepo(repoName: string): Promise<string> {
  const localPath = path.join(REPO_FOLDER, repoName);

  if (fs.existsSync(localPath)) return localPath;

  const exists = await bucketRepoExists(repoName);
  if (!exists) throw new Error(`Repo "${repoName}" not found`);

  fs.mkdirSync(localPath, { recursive: true });
  await downloadDirectory(repoName, localPath);

  return localPath;
}
