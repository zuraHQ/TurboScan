# Reposcope

AI-powered codebase intelligence. Clone any repo, analyze it with AI agents, and chat about the code — with a live file tree that shows exactly where the AI is looking.

## What makes it different

Most code AI tools are black boxes. Reposcope shows you the AI's thinking in real-time: the file tree lights up as the agent scans through files, highlighting what it's reading and where it found the answer.

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Fastify 5 + Bun
- **Code parsing**: Tree-sitter (10 languages)
- **Storage**: Cloudflare R2 (planned)
- **Monorepo**: Turborepo + Bun workspaces

## Getting started

```bash
bun install
bun run dev
```

Web: `http://localhost:5173` | Server: `http://localhost:4000`

## License

MIT
