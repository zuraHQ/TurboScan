import type { FastifyInstance } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlockParam, ToolResultBlockParam, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import path from "path";
import fs from "fs";
import { getCodeStructure, findSymbol, getDependencyGraph } from "../tools/index.ts";
import { grep } from "../tools/grep.ts";
import { readFile } from "../tools/readFiles.ts";
import { listFiles } from "../tools/listFiles.ts";
import { glob } from "../tools/glob.ts";

const REPO_FOLDER = path.join(process.cwd(), "downloads");

const anthropic = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "grep",
    description:
      "Search for a regex pattern across all files in the repository. Returns matching lines with file paths and line numbers. Useful for finding usages, references, or specific code patterns.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "Regex pattern to search for",
        },
        fileExtensions: {
          type: "array",
          items: { type: "string" },
          description:
            'Optional file extensions to filter by, e.g. [".ts", ".js"]',
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "read_file",
    description:
      "Read the full contents of a file. The path should be relative to the repository root.",
    input_schema: {
      type: "object" as const,
      properties: {
        filePath: {
          type: "string",
          description: "File path relative to the repo root",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "list_files",
    description:
      "List all files in the repository, excluding common directories like node_modules, .git, dist, etc. Returns absolute file paths.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "glob",
    description:
      'Find files matching a glob pattern (e.g. "**/*.ts", "src/**/*.test.js"). Returns matching file paths.',
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "Glob pattern to match files against",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "get_code_structure",
    description:
      "Get the full code structure of the repository including all classes, functions, interfaces, and imports parsed via tree-sitter. Returns counts and detailed symbol information.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "find_symbol",
    description:
      "Find symbols (functions, classes, interfaces, methods) by name across the repository. Supports partial matching.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Symbol name or partial name to search for",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_dependency_graph",
    description:
      "Get the import/dependency graph of the repository. Returns a mapping of each file to the files it imports.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

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
}

function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  repoPath: string
): string {
  try {
    switch (toolName) {
      case "grep": {
        const results = grep(input.pattern as string, repoPath, {
          fileExtensions: input.fileExtensions as string[] | undefined,
        });
        // Make file paths relative to repo root for readability
        const relative = results.map((r) => ({
          ...r,
          file: path.relative(repoPath, r.file),
        }));
        return JSON.stringify(relative.slice(0, 200));
      }
      case "read_file": {
        const filePath = path.join(repoPath, input.filePath as string);
        // Prevent path traversal
        if (!filePath.startsWith(repoPath)) {
          return JSON.stringify({ error: "Invalid file path — path traversal detected" });
        }
        const content = readFile(filePath);
        return content;
      }
      case "list_files": {
        const files = listFiles(repoPath);
        const relative = files.map((f) => path.relative(repoPath, f));
        return JSON.stringify(relative);
      }
      case "glob": {
        const files = glob(input.pattern as string, repoPath);
        const relative = files.map((f) => path.relative(repoPath, f));
        return JSON.stringify(relative);
      }
      case "get_code_structure": {
        const structure = getCodeStructure(repoPath);
        return JSON.stringify(structure);
      }
      case "find_symbol": {
        const symbols = findSymbol(repoPath, input.query as string);
        return JSON.stringify(symbols);
      }
      case "get_dependency_graph": {
        const graph = getDependencyGraph(repoPath);
        return JSON.stringify(graph);
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: message });
  }
}

export async function chatRoute(app: FastifyInstance) {
  app.post("/chat", async (req, reply) => {
    const { messages, repoName } = req.body as ChatRequestBody;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return reply.status(400).send({ error: "messages array is required and must not be empty" });
    }
    if (!repoName) {
      return reply.status(400).send({ error: "repoName is required" });
    }

    const repoPath = path.join(REPO_FOLDER, repoName);
    if (!fs.existsSync(repoPath)) {
      return reply.status(404).send({ error: `Repository "${repoName}" not found. Clone it first via POST /download.` });
    }

    // Convert incoming messages to Anthropic format
    const conversationMessages: MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const MAX_TOOL_ROUNDS = 20;
    let round = 0;

    try {
      while (round < MAX_TOOL_ROUNDS) {
        round++;

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8192,
          system: SYSTEM_PROMPT,
          tools,
          messages: conversationMessages,
        });

        // If the model finished (no more tool calls), extract text and return
        if (response.stop_reason === "end_turn") {
          const textBlocks = response.content.filter(
            (block) => block.type === "text"
          );
          const text = textBlocks.map((b) => ("text" in b ? b.text : "")).join("\n");
          return reply.send({ response: text });
        }

        // If the model wants to use tools, execute them
        if (response.stop_reason === "tool_use") {
          // Add the assistant's full message (including tool_use blocks) to conversation
          conversationMessages.push({
            role: "assistant",
            content: response.content,
          });

          // Execute each tool call and build tool results
          const toolResults: ToolResultBlockParam[] = [];
          for (const block of response.content) {
            if (block.type === "tool_use") {
              const toolBlock = block as ToolUseBlock;
              const result = executeTool(
                toolBlock.name,
                toolBlock.input as Record<string, unknown>,
                repoPath
              );
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolBlock.id,
                content: result,
              });
            }
          }

          // Add tool results as a user message
          conversationMessages.push({
            role: "user",
            content: toolResults,
          });

          continue;
        }

        // Unexpected stop reason — return whatever we have
        const fallbackText = response.content
          .filter((block) => block.type === "text")
          .map((b) => ("text" in b ? b.text : ""))
          .join("\n");
        return reply.send({ response: fallbackText || "No response generated." });
      }

      // If we hit the max rounds, return what we have so far
      return reply.send({
        response:
          "I explored the codebase extensively but reached the maximum number of tool calls. Please try a more specific question.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      app.log.error(`Chat error: ${message}`);
      return reply.status(500).send({ error: `Chat failed: ${message}` });
    }
  });
}
