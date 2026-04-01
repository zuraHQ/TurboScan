import Fastify from "fastify";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { getCodeStructure, findSymbol, getDependencyGraph, parseFile, parseDirectory } from "./tools/index.ts";

const app = Fastify({ logger: true })

// Persistent repo folder (Railway: /app/repositories) change to /app/repositories on Railway
const REPO_FOLDER = path.join(process.cwd(), "downloads");
fs.mkdirSync(REPO_FOLDER, { recursive: true });

app.post("/download", async (req, reply) => {
  const { repoUrl } = req.body as { repoUrl: string };
  if (!repoUrl) return reply.status(400).send({ error: "repoUrl is required" });

  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "repo";
  const downloadPath = path.join(REPO_FOLDER, repoName);

  if (fs.existsSync(downloadPath)) {
    return reply.send({ message: "Repo already exists", path: downloadPath });
  }

  try {
    console.log(`Cloning ${repoUrl} into ${downloadPath}`);
    execSync(`git clone --depth 1 ${repoUrl} ${downloadPath}`, { stdio: "inherit" });
    // Pre-warm the tree-sitter cache so first query is instant
    parseDirectory(downloadPath);
    return reply.send({ message: "Repo downloaded successfully", path: downloadPath });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: "Failed to download repo" });
  }
});


app.post("/query", async (req, reply) => {
  const { repoName, tool, args } = req.body as { repoName: string; tool: string; args?: any };

  const repoPath = path.join(REPO_FOLDER, repoName);
  if (!fs.existsSync(repoPath)) {
    return reply.status(400).send({ error: "Repo not found" });
  }

 
  return reply.send({
    message: "Tool query received",
    repoPath,
    tool,
    args,
  });
});

// Get full code structure of a repo (classes, functions, interfaces, imports)
app.post("/structure", async (req, reply) => {
  const { repoName } = req.body as { repoName: string };

  const repoPath = path.join(REPO_FOLDER, repoName);
  if (!fs.existsSync(repoPath)) {
    return reply.status(400).send({ error: "Repo not found" });
  }

  const structure = getCodeStructure(repoPath);
  return reply.send(structure);
});

// Find symbols by name across a repo
app.post("/symbols", async (req, reply) => {
  const { repoName, query } = req.body as { repoName: string; query: string };

  const repoPath = path.join(REPO_FOLDER, repoName);
  if (!fs.existsSync(repoPath)) {
    return reply.status(400).send({ error: "Repo not found" });
  }

  const symbols = findSymbol(repoPath, query);
  return reply.send({ symbols, count: symbols.length });
});

// Parse a single file for its symbols
app.post("/parse", async (req, reply) => {
  const { repoName, filePath } = req.body as { repoName: string; filePath: string };

  const repoPath = path.join(REPO_FOLDER, repoName);
  const fullPath = path.join(repoPath, filePath);

  if (!fullPath.startsWith(repoPath) || !fs.existsSync(fullPath)) {
    return reply.status(400).send({ error: "File not found or invalid path" });
  }

  const symbols = parseFile(fullPath);
  return reply.send({ file: filePath, symbols });
});

// Get dependency graph (which files import what)
app.post("/dependencies", async (req, reply) => {
  const { repoName } = req.body as { repoName: string };

  const repoPath = path.join(REPO_FOLDER, repoName);
  if (!fs.existsSync(repoPath)) {
    return reply.status(400).send({ error: "Repo not found" });
  }

  const graph = getDependencyGraph(repoPath);
  return reply.send(graph);
});

await app.listen({ port: 4000 });
console.log("Server running on http://localhost:4000");
