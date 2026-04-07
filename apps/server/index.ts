import Fastify from "fastify";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { getCodeStructure, findSymbol, getDependencyGraph, parseFile, parseDirectory } from "./tools/index.ts";
import { uploadDirectory } from "./lib/bucket.ts";
import { ensureLocalRepo } from "./lib/repo.ts";
import { authMiddleware } from "./middleware/auth.ts";
import { clerkWebhookRoute } from "./routes/webhooks/clerk.ts";
import { stripeWebhookRoute } from "./routes/webhooks/stripe.ts";
import { chatRoute } from "./routes/chat.ts";

const app = Fastify({ logger: true });

// Register CORS
app.register(import("@fastify/cors"), {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
});

// Global auth hook — skip webhooks
app.addHook("onRequest", async (req, reply) => {
  if (req.url.startsWith("/webhooks/")) return;
  await authMiddleware(req, reply);
});

// Register plugins
app.register(clerkWebhookRoute);
app.register(stripeWebhookRoute);
app.register(chatRoute);

// Persistent repo folder
const REPO_FOLDER = path.join(process.cwd(), "downloads");
fs.mkdirSync(REPO_FOLDER, { recursive: true });

app.post("/download", async (req, reply) => {
  const { repoUrl } = req.body as { repoUrl: string };
  if (!repoUrl) return reply.status(400).send({ error: "repoUrl is required" });

  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "repo";
  const downloadPath = path.join(REPO_FOLDER, repoName);

  if (fs.existsSync(downloadPath)) {
    return reply.send({ message: "Repo already exists", repoName });
  }

  try {
    console.log(`Cloning ${repoUrl} into ${downloadPath}`);
    execSync(`git clone --depth 1 ${repoUrl} ${downloadPath}`, { stdio: "inherit" });
    // Pre-warm the tree-sitter cache so first query is instant
    parseDirectory(downloadPath);
    // Upload to bucket and clean up local clone
    console.log(`Uploading ${repoName} to bucket...`);
    await uploadDirectory(downloadPath, repoName);
    fs.rmSync(downloadPath, { recursive: true, force: true });
    console.log(`Uploaded ${repoName} to bucket and removed local clone`);
    return reply.send({ message: "Repo cloned and uploaded to bucket", repoName });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: "Failed to download repo" });
  }
});

app.post("/query", async (req, reply) => {
  const { repoName, tool, args } = req.body as { repoName: string; tool: string; args?: any };

  try {
    const repoPath = await ensureLocalRepo(repoName);
    return reply.send({
      message: "Tool query received",
      repoPath,
      tool,
      args,
    });
  } catch (err: any) {
    return reply.status(400).send({ error: err.message });
  }
});

// Get full code structure of a repo (classes, functions, interfaces, imports)
app.post("/structure", async (req, reply) => {
  const { repoName } = req.body as { repoName: string };

  try {
    const repoPath = await ensureLocalRepo(repoName);
    const structure = getCodeStructure(repoPath);
    return reply.send(structure);
  } catch (err: any) {
    return reply.status(400).send({ error: err.message });
  }
});

// Find symbols by name across a repo
app.post("/symbols", async (req, reply) => {
  const { repoName, query } = req.body as { repoName: string; query: string };

  try {
    const repoPath = await ensureLocalRepo(repoName);
    const symbols = findSymbol(repoPath, query);
    return reply.send({ symbols, count: symbols.length });
  } catch (err: any) {
    return reply.status(400).send({ error: err.message });
  }
});

// Parse a single file for its symbols
app.post("/parse", async (req, reply) => {
  const { repoName, filePath } = req.body as { repoName: string; filePath: string };

  try {
    const repoPath = await ensureLocalRepo(repoName);
    const fullPath = path.join(repoPath, filePath);

    if (!fullPath.startsWith(repoPath) || !fs.existsSync(fullPath)) {
      return reply.status(400).send({ error: "File not found or invalid path" });
    }

    const symbols = parseFile(fullPath);
    return reply.send({ file: filePath, symbols });
  } catch (err: any) {
    return reply.status(400).send({ error: err.message });
  }
});

// Get dependency graph (which files import what)
app.post("/dependencies", async (req, reply) => {
  const { repoName } = req.body as { repoName: string };

  try {
    const repoPath = await ensureLocalRepo(repoName);
    const graph = getDependencyGraph(repoPath);
    return reply.send(graph);
  } catch (err: any) {
    return reply.status(400).send({ error: err.message });
  }
});

await app.listen({ port: 4000 });
console.log("Server running on http://localhost:4000");
