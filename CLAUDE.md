# Reposcope

AI-powered codebase intelligence platform. Clone repos, analyze them with AI agents, and chat about the code. The key differentiator is a **live file tree visualization** — users watch the AI scan through files in real-time, seeing exactly where the agent is looking.

## Monorepo Structure

- **Turborepo + Bun workspace monorepo** — `apps/web` and `apps/server`
- Use `bun install` at root, not npm/yarn/pnpm
- Use `bun run dev` to start both apps via Turborepo

## Apps

### `apps/server` — Hono API (Bun runtime)
- Hono on Bun (not Express, not Fastify, not Node)
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
- React 19, Vite 8, Tailwind CSS 4, DaisyUI 5
- TanStack Query installed and wired up (QueryClientProvider in main.tsx), not yet used
- Clerk auth integrated (lazy-loaded, works without key in dev mode)
- No SSR needed — this is a dashboard app behind auth

#### UI Stack & Theming
- **DaisyUI 5** — class-based components (btn, input, textarea, menu, chat, etc.)
- **No shadcn/ui** — fully migrated away, no @base-ui, no CVA, no clsx/tailwind-merge
- **Themes configured in `index.css`** via `@plugin "daisyui"` and `@plugin "daisyui/theme"`:
  - **Light**: `nord` (default) — with orange primary `#e87a2d`
  - **Dark**: `synthwave` (prefers-dark) — neutral dark grays (`#1e1e1e` / `#181818` / `#121212`), orange primary, white text
- Theme switching via `data-theme` attribute on `<html>`, managed by `useTheme` hook
- `cn()` utility in `src/lib/utils.ts` — simple class joiner, no tailwind-merge

#### Layout (implemented)
- **Three-panel layout** with card-style panels on `bg-base-200` background:
  1. **Left sidebar** (`app-sidebar.tsx`) — chat history list, "New Chat" button, theme toggle, Clerk user button
  2. **File tree sidebar** (`file-explorer.tsx`) — expandable file tree with AI scan animations
  3. **Main area** — repo URL input, chat messages (DaisyUI chat bubbles), chat input
- Panels have `border border-base-content/10`, `rounded-lg`, `bg-base-100`
- Sidebar and file tree are toggleable

#### AI Scan Animation System
- File tree supports per-file scan states: `idle` | `queued` | `scanning` | `done`
- `scanMap` prop on `FileTree` — `Record<string, ScanStatus>`
- **Scanning**: radar animation (CSS `scan-radar` keyframes) — soft white pulse expanding left-to-right
- **Done**: `ScanLine` icon from lucide-react appears next to file
- **Queued**: dimmed at 50% opacity
- Demo scan loop in `dashboard.tsx` (`useDemoScan` hook) — scans 5 files at 0.5s each, resets after 1s
- **To wire up real scanning**: replace `useDemoScan` with WebSocket events, update `scanMap` state as agent hits each file

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

## Planned Features

### Next up
- [ ] WebSocket streaming — agent scan state + file tree updates to frontend
- [ ] Claude agent (Sonnet/Haiku) for codebase Q&A
- [ ] R2 integration for repo storage (replace disk cloning)
- [ ] Redis for symbol cache persistence
- [ ] Wire real scan events to file tree animation (replace demo loop)

### Later
- [ ] Semantic search with Redis embeddings
- [ ] Per-user repo folders (user ID named)
- [ ] Stripe payments
- [ ] Slack bot integration
- [ ] CLI for local use with Claude
- [ ] MCP server — expose repo context to any AI agent
