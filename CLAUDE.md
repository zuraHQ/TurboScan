# Reposcope

AI-powered codebase intelligence platform. Clone repos, analyze them with AI agents, and chat about the code. The key differentiator is a **live file tree visualization** — users watch the AI scan through files in real-time, seeing exactly where the agent is looking.

## Monorepo Structure

- **Turborepo + Bun workspace monorepo** — `apps/web` and `apps/server`
- Use `bun install` at root, not npm/yarn/pnpm
- Use `bun run dev` to start both apps via Turborepo

## Apps

### `apps/server` — Fastify API (Bun runtime)
- Fastify 5 on Bun (not Express, not Node)
- Endpoints:
  - `POST /download` — shallow clone repos to disk (will migrate to R2)
  - `POST /query` — run tools on cloned repos
  - `POST /structure` — get full codebase skeleton via tree-sitter (classes, functions, interfaces, imports)
  - `POST /symbols` — find symbols by name across a repo
  - `POST /parse` — parse a single file into structured symbols
  - `POST /dependencies` — file-level import graph
- Tools in `tools/`: glob, grep, readFiles, listFiles, treeSitter
- Tree-sitter: parses ASTs for 10 languages (JS, TS, Python, Go, Rust, Java, C#, Ruby, C++)
- In-memory symbol cache with 5min TTL — parses once, subsequent queries are instant
- Pre-warms cache on clone so first query is fast
- See `apps/server/CLAUDE.md` for Bun-specific conventions

### `apps/web` — Vite + React frontend
- React 19, Vite 8, Tailwind CSS 4, shadcn/ui
- Currently minimal — three-panel layout not yet built
- No SSR needed — this is a dashboard app behind auth

## Architecture Decisions

### Storage: Cloudflare R2 (planned, not yet implemented)
- Clone repos → upload to R2 → delete from disk → zero server disk pressure
- Free egress, ~$0.015/GB/mo storage
- Parse with tree-sitter → store symbol index in Redis
- Most queries hit Redis (instant), only file reads pull from R2

### Why not GitHub API?
- Rate limited (5k/hr), requires fetch requests for every operation
- R2 gives us our own persistent copy with no limits

### Why tree-sitter?
- Other tools (grep, glob) treat code as text — tree-sitter understands structure
- Extracts functions, classes, methods, interfaces, imports with line numbers and signatures
- Makes the AI agent dramatically smarter — it can query structure instead of blindly searching

## UI Concept

Three-panel layout:
1. **Left sidebar** — chat history list + "New chat" button
2. **Middle sidebar** — file tree with live scanning visualization
   - Files glow/highlight as AI scans them in real-time
   - Tree stops and highlights the file the AI is referencing
   - User can click highlighted files to view source
3. **Main area** — chat interface + code viewer, input bar at bottom

This is the differentiator: making the AI's thinking process visible instead of being a black box.

## Conventions

- TypeScript strict mode everywhere
- Bun-first: prefer Bun APIs over Node.js equivalents (see `apps/server/CLAUDE.md`)
- Excluded from tool scans: node_modules, .git, dist, build, .next, coverage
- No .env files committed — Bun auto-loads `.env`

## Deployment Plan

| Component | Where |
|-----------|-------|
| `apps/web` | Vercel (static SPA) |
| `apps/server` | Railway (persistent server, needs long-running processes) |
| Redis | Railway addon or Upstash (symbol cache + embeddings) |
| File storage | Cloudflare R2 (cloned repos) |

## Planned Features (not yet implemented)

### Next up
- [ ] Three-panel UI layout (chat sidebar, file tree sidebar, main area)
- [ ] R2 integration for repo storage (replace disk cloning)
- [ ] Redis for symbol cache persistence
- [ ] Claude agent (Sonnet/Haiku) for codebase Q&A
- [ ] WebSocket streaming — agent state + file tree updates to frontend
- [ ] Clerk auth + Convex backend

### Later
- [ ] Semantic search with Redis embeddings
- [ ] Per-user repo folders (user ID named)
- [ ] Stripe payments
- [ ] Slack bot integration
- [ ] CLI for local use with Claude
- [ ] MCP server — expose repo context to any AI agent
