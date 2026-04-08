import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { getCodeStructure, findSymbol, getDependencyGraph, parseFile, parseDirectory } from "./tools/index.ts";
import { uploadDirectory } from "./lib/bucket.ts";
import { ensureLocalRepo } from "./lib/repo.ts";
import { authMiddleware } from "./middleware/auth.ts";
import { clerkWebhook } from "./routes/webhooks/clerk.ts";
import { stripeWebhook } from "./routes/webhooks/stripe.ts";
import { chatApp } from "./routes/chat.ts";

const app = new Hono();

// Middleware
app.use(logger());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(authMiddleware);

// Webhook routes
app.route("/webhooks", clerkWebhook);
app.route("/webhooks", stripeWebhook);

// Chat routes
app.route("/", chatApp);

// Persistent repo folder
const REPO_FOLDER = path.join(process.cwd(), "downloads");
fs.mkdirSync(REPO_FOLDER, { recursive: true });

app.post("/download", async (c) => {
  const { repoUrl } = await c.req.json<{ repoUrl: string }>();
  if (!repoUrl) return c.json({ error: "repoUrl is required" }, 400);

  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "repo";
  const downloadPath = path.join(REPO_FOLDER, repoName);

  if (fs.existsSync(downloadPath)) {
    return c.json({ message: "Repo already exists", repoName });
  }

  try {
    console.log(`Cloning ${repoUrl} into ${downloadPath}`);
    execSync(`git clone --depth 1 ${repoUrl} ${downloadPath}`, { stdio: "inherit" });
    parseDirectory(downloadPath);
    console.log(`Uploading ${repoName} to bucket...`);
    await uploadDirectory(downloadPath, repoName);
    fs.rmSync(downloadPath, { recursive: true, force: true });
    console.log(`Uploaded ${repoName} to bucket and removed local clone`);
    return c.json({ message: "Repo cloned and uploaded to bucket", repoName });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to download repo" }, 500);
  }
});

app.post("/query", async (c) => {
  const { repoName, tool, args } = await c.req.json<{ repoName: string; tool: string; args?: any }>();

  try {
    const repoPath = await ensureLocalRepo(repoName);
    return c.json({ message: "Tool query received", repoPath, tool, args });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post("/structure", async (c) => {
  const { repoName } = await c.req.json<{ repoName: string }>();

  try {
    const repoPath = await ensureLocalRepo(repoName);
    return c.json(getCodeStructure(repoPath));
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post("/symbols", async (c) => {
  const { repoName, query } = await c.req.json<{ repoName: string; query: string }>();

  try {
    const repoPath = await ensureLocalRepo(repoName);
    const symbols = findSymbol(repoPath, query);
    return c.json({ symbols, count: symbols.length });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post("/parse", async (c) => {
  const { repoName, filePath } = await c.req.json<{ repoName: string; filePath: string }>();

  try {
    const repoPath = await ensureLocalRepo(repoName);
    const fullPath = path.join(repoPath, filePath);

    if (!fullPath.startsWith(repoPath) || !fs.existsSync(fullPath)) {
      return c.json({ error: "File not found or invalid path" }, 400);
    }

    const symbols = parseFile(fullPath);
    return c.json({ file: filePath, symbols });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post("/dependencies", async (c) => {
  const { repoName } = await c.req.json<{ repoName: string }>();

  try {
    const repoPath = await ensureLocalRepo(repoName);
    return c.json(getDependencyGraph(repoPath));
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

export default {
  port: 4000,
  fetch: app.fetch,
};
