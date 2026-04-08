import { Hono } from "hono";
import { generateText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { moonshotai } from "@ai-sdk/moonshotai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { getCodeStructure, findSymbol, getDependencyGraph } from "../tools/index.ts";
import { grep } from "../tools/grep.ts";
import { readFile } from "../tools/readFiles.ts";
import { listFiles } from "../tools/listFiles.ts";
import { glob } from "../tools/glob.ts";

const REPO_FOLDER = path.join(process.cwd(), "downloads");

// Zhipu GLM via OpenAI-compatible provider
const zhipu = createOpenAICompatible({
  name: "zhipu",
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
  headers: { Authorization: `Bearer ${process.env.ZHIPU_API_KEY}` },
});

// Model registry
const MODELS: Record<string, () => ReturnType<typeof google>> = {
  "gemini-2.0-flash": () => google("gemini-2.0-flash"),
  "gemini-2.5-pro": () => google("gemini-2.5-pro-preview-06-05"),
  "moonshot-v1-128k": () => moonshotai("moonshot-v1-128k"),
  "kimi-latest": () => moonshotai("kimi-latest"),
  "glm-4-plus": () => zhipu.chatModel("glm-4-plus") as any,
  "glm-4-flash": () => zhipu.chatModel("glm-4-flash") as any,
};

const DEFAULT_MODEL = "gemini-2.0-flash";

const SYSTEM_PROMPT = `You are a codebase assistant with access to tools that let you explore and understand a code repository. You can search for patterns, read files, list files, find symbols, and analyze code structure.

When answering questions about the codebase:
1. Use tools to gather information before answering — do not guess.
2. Start with broad tools (list_files, get_code_structure) to orient yourself, then drill into specifics.
3. When referencing code, cite the file path and line numbers when possible.
4. Provide clear, concise explanations grounded in what you find in the code.
5. If you cannot find the answer, say so rather than speculating.`;

interface ChatRequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  repoName: string;
  model?: string;
}

function createTools(repoPath: string) {
  return {
    grep: tool({
      description: "Search for a regex pattern across all files in the repository. Returns matching lines with file paths and line numbers.",
      parameters: z.object({
        pattern: z.string().describe("Regex pattern to search for"),
        fileExtensions: z.array(z.string()).optional().describe('File extensions to filter by, e.g. [".ts", ".js"]'),
      }),
      execute: async ({ pattern, fileExtensions }) => {
        const results = grep(pattern, repoPath, { fileExtensions });
        return results.slice(0, 200).map((r) => ({
          ...r,
          file: path.relative(repoPath, r.file),
        }));
      },
    }),
    read_file: tool({
      description: "Read the full contents of a file. Path should be relative to the repository root.",
      parameters: z.object({
        filePath: z.string().describe("File path relative to repo root"),
      }),
      execute: async ({ filePath }) => {
        const fullPath = path.join(repoPath, filePath);
        if (!fullPath.startsWith(repoPath)) {
          return { error: "Invalid file path — path traversal detected" };
        }
        try {
          return readFile(fullPath);
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    }),
    list_files: tool({
      description: "List all files in the repository, excluding node_modules, .git, dist, etc.",
      parameters: z.object({}),
      execute: async () => {
        return listFiles(repoPath).map((f) => path.relative(repoPath, f));
      },
    }),
    glob: tool({
      description: 'Find files matching a glob pattern (e.g. "**/*.ts").',
      parameters: z.object({
        pattern: z.string().describe("Glob pattern to match files against"),
      }),
      execute: async ({ pattern }) => {
        return glob(pattern, repoPath).map((f) => path.relative(repoPath, f));
      },
    }),
    get_code_structure: tool({
      description: "Get the full code structure of the repository including classes, functions, interfaces, and imports.",
      parameters: z.object({}),
      execute: async () => {
        return getCodeStructure(repoPath);
      },
    }),
    find_symbol: tool({
      description: "Find symbols (functions, classes, interfaces, methods) by name across the repository.",
      parameters: z.object({
        query: z.string().describe("Symbol name or partial name to search for"),
      }),
      execute: async ({ query }) => {
        return findSymbol(repoPath, query);
      },
    }),
    get_dependency_graph: tool({
      description: "Get the import/dependency graph of the repository.",
      parameters: z.object({}),
      execute: async () => {
        return getDependencyGraph(repoPath);
      },
    }),
  };
}

const chatApp = new Hono();

chatApp.get("/models", (c) => {
  return c.json({ models: Object.keys(MODELS), default: DEFAULT_MODEL });
});

chatApp.post("/chat", async (c) => {
  const { messages, repoName, model: modelId } = await c.req.json<ChatRequestBody>();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: "messages array is required and must not be empty" }, 400);
  }
  if (!repoName) {
    return c.json({ error: "repoName is required" }, 400);
  }

  const repoPath = path.join(REPO_FOLDER, repoName);
  if (!fs.existsSync(repoPath)) {
    return c.json({ error: `Repository "${repoName}" not found. Clone it first via POST /download.` }, 404);
  }

  const selectedModel = modelId && MODELS[modelId] ? modelId : DEFAULT_MODEL;
  const model = MODELS[selectedModel]();

  try {
    const result = await generateText({
      model,
      maxSteps: 20,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: createTools(repoPath),
    });

    return c.json({
      response: result.text,
      model: selectedModel,
      steps: result.steps.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Chat error: ${message}`);
    return c.json({ error: `Chat failed: ${message}` }, 500);
  }
});

export { chatApp };
