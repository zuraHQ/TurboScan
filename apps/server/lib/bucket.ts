import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import path from "path";
import fs from "fs";

const s3 = new S3Client({
  endpoint: process.env.BUCKET_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY!,
    secretAccessKey: process.env.BUCKET_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.BUCKET_NAME!;

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".bun",
  ".cursor",
]);

/**
 * Recursively walk a directory, yielding relative file paths.
 * Skips directories in the SKIP_DIRS set.
 */
function* walkDir(dir: string, base: string = dir): Generator<string> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath, base);
    } else if (entry.isFile()) {
      yield path.relative(base, fullPath);
    }
  }
}

/**
 * Upload an entire local directory to the bucket under the given prefix.
 * Uses Bun.file() to read file contents.
 */
export async function uploadDirectory(
  localDir: string,
  prefix: string
): Promise<void> {
  const files: string[] = [...walkDir(localDir)];

  // Upload in batches of 25 for concurrency without overwhelming the connection
  const BATCH_SIZE = 25;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (relativePath) => {
        const fullPath = path.join(localDir, relativePath);
        const body = await Bun.file(fullPath).arrayBuffer();
        const key = `${prefix}/${relativePath}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: Buffer.from(body),
          })
        );
      })
    );
  }
}

/**
 * Download a single file from the bucket by key.
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );

  const stream = response.Body;
  if (!stream) throw new Error(`Empty response for key: ${key}`);

  const bytes = await stream.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Download all files under a prefix to a local directory,
 * recreating the directory structure.
 */
export async function downloadDirectory(
  prefix: string,
  localDir: string
): Promise<void> {
  const keys = await listObjects(prefix);

  // Download in batches of 25
  const BATCH_SIZE = 25;
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (key) => {
        const relativePath = key.slice(prefix.length + 1); // strip "prefix/"
        if (!relativePath) return;

        const localPath = path.join(localDir, relativePath);
        fs.mkdirSync(path.dirname(localPath), { recursive: true });

        const data = await downloadFile(key);
        await Bun.write(localPath, data);
      })
    );
  }
}

/**
 * List all object keys under a given prefix.
 * Handles pagination for large result sets.
 */
export async function listObjects(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) keys.push(obj.Key);
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

/**
 * Check if a repo exists in the bucket by listing objects under its prefix.
 */
export async function bucketRepoExists(repoName: string): Promise<boolean> {
  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: repoName,
      MaxKeys: 1,
    })
  );

  return (response.Contents?.length ?? 0) > 0;
}
