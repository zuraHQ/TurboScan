import Fastify from "fastify";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const app = Fastify({ logger: true });

// Persistent repo folder (Railway: /app/repositories)
const REPO_FOLDER = path.join(process.cwd(), "downloads"); // change to /app/repositories on Railway
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
    console.log(`Cloning ${repoUrl} into {downloadPath}`);
    execSync(`git clone ${repoUrl} ${downloadPath}`, { stdio: "inherit" });
    return reply.send({ message: "Repo downloaded successfully", path: downloadPath });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: "Failed to download repo" });
  }
});

// --------------------
// POST /query
// Placeholder endpoint for AI tools (listFiles, readFile, grep, glob)
// --------------------
app.post("/query", async (req, reply) => {
  const { repoName, tool, args } = req.body as {
    repoName: string;
    tool: string;
    args?: any;
  };


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

await app.listen({ port: 4000 });
console.log("Server running on http://localhost:4000");
