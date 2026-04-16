# Contributing to MarkFlow

Thanks for your interest in contributing! This document covers the development setup, code conventions, and pull request process.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) 1.0+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for Cloudflare Workers)
- Node.js 18+ (Bun handles most things, but some tools may need Node)

### Getting started

```bash
git clone https://github.com/AshishKumar4/Markflow.git
cd Markflow
bun install
bun run dev
```

The dev server starts at `http://localhost:3000` with hot reload for both frontend and worker changes.

### Useful commands

```bash
bun run lint        # Run ESLint
bun run typecheck   # Run TypeScript type checker
bun run build       # Production build
bun run preview     # Preview production build locally
```

## Code Style

- **TypeScript** is required for all source files. Enable strict mode.
- **ESLint** is configured with React hooks and refresh plugins. Run `bun run lint` before committing.
- **Tailwind CSS** for styling. Use shadcn/ui components from `src/components/ui/` instead of writing custom UI primitives.
- **Icons** come from `lucide-react`. Import them directly.
- **Framer Motion** for animations -- use sparingly for micro-interactions.

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add image drag-and-drop support
fix: correct cursor position after image insertion
chore: update dependencies
docs: add deployment guide to README
refactor: extract lightbox zoom logic into hook
```

Prefix types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`.

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`.
2. **Make your changes** with clear, focused commits.
3. **Ensure all checks pass** locally:
   ```bash
   bun run lint && bun run typecheck && bun run build
   ```
4. **Open a PR** against `main` with a clear description of what changed and why.
5. **Link any related issues** (e.g., "Fixes #42").

### PR checklist

- [ ] Code compiles without errors (`bun run typecheck`)
- [ ] Linting passes (`bun run lint`)
- [ ] Build succeeds (`bun run build`)
- [ ] Changes are tested locally in the dev server
- [ ] Commit messages follow Conventional Commits

## Project Architecture

- **Frontend** (`src/`): React 18 SPA with Vite. Pages in `src/pages/`, components in `src/components/`, API client in `src/lib/api-client.ts`.
- **Backend** (`worker/`): Cloudflare Worker with Hono router. Routes in `worker/user-routes.ts`, entity definitions in `worker/entities.ts`.
- **Shared types** (`shared/types.ts`): TypeScript interfaces shared between frontend and worker.
- **Durable Objects**: `GlobalDurableObject` (KV-style entity storage for docs/comments) and `ImageStoreDO` (SQLite-based chunked binary image storage).

## Questions?

Open an issue or start a discussion. We're happy to help!
