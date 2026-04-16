# MarkFlow

A minimalist markdown publishing platform built on Cloudflare Workers and Durable Objects.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/AshishKumar4/Markflow/actions/workflows/ci.yml/badge.svg)](https://github.com/AshishKumar4/Markflow/actions/workflows/ci.yml)

---

## About

MarkFlow is a full-stack markdown publishing platform where you can write, preview, and publish documents -- all from the browser. It runs entirely on Cloudflare's edge network with zero traditional servers: the backend is a Cloudflare Worker with Durable Objects for persistent storage, and the frontend is a React SPA served from Cloudflare's asset network.

## Features

- **Live markdown editor** with split-pane preview, draft auto-save, and keyboard shortcuts (`Ctrl+S` to save)
- **Mermaid diagram support** -- write `mermaid` code blocks and see flowcharts, sequence diagrams, ER diagrams, and more rendered inline
- **Clickable image & diagram lightbox** -- click any image or diagram to open a full-screen viewer with zoom (scroll wheel), pan (drag), and fit-to-screen
- **Image upload** -- upload images via toolbar button, drag-and-drop onto the editor, or paste from clipboard (`Cmd+V`); served directly from Durable Object SQLite storage with chunked binary encoding
- **Media library** -- browse, search, and manage all uploaded images in a gallery dialog
- **Threaded comments** -- highlight text to annotate; comments appear in a resizable sidebar with reply threading
- **Focus mode** -- distraction-free reading with a single click
- **Print / PDF export** -- browser-native `window.print()` with a comprehensive print stylesheet that handles scroll containers, dark mode neutralization, page breaks, and diagram rendering
- **Dark mode** -- system-aware theme toggle that persists across sessions
- **Document directory** -- paginated list of all published documents with search

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Cloudflare Workers, Hono, Durable Objects (SQLite) |
| Markdown | react-markdown, remark-gfm, Mermaid |
| Storage | Durable Objects KV (documents, comments) + SQLite (images with 1.8 MB chunking) |
| Deployment | Wrangler CLI, Cloudflare Assets (SPA routing) |

## Architecture

```
Browser (React SPA)
    |
    v
Cloudflare Worker (Hono router)
    |
    +-- /api/v1/documents/*  -->  GlobalDurableObject (KV-style entity storage)
    +-- /api/v1/comments/*   -->  GlobalDurableObject
    +-- /api/v1/images/*     -->  ImageStoreDO (SQLite chunked binary storage)
    |
    +-- /* (static assets)   -->  Cloudflare Assets (SPA fallback)
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) 1.0+ (`curl -fsSL https://bun.sh/install | bash`)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`bunx wrangler@latest login`)

### Install & Run

```bash
git clone https://github.com/AshishKumar4/Markflow.git
cd Markflow
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy to Cloudflare Workers in one command:

```bash
bun run deploy
```

This builds the frontend with Vite and deploys the Worker + assets via Wrangler. Configuration lives in `wrangler.jsonc`.

## Project Structure

```
markflow/
├── src/                    # React frontend
│   ├── components/         # UI components (shadcn/ui, markdown preview, media library, etc.)
│   ├── pages/              # Route pages (Home, Editor, View, Docs)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and API client
│   └── index.css           # Global styles + print stylesheet
├── worker/                 # Cloudflare Worker backend
│   ├── index.ts            # Hono app entrypoint, middleware, exports
│   ├── user-routes.ts      # API route handlers (documents, comments, images)
│   ├── entities.ts         # Entity definitions (DocEntity, CommentEntity)
│   ├── image-store.ts      # ImageStoreDO - Durable Object for binary image storage
│   └── core-utils.ts       # Durable Object abstraction layer (entity framework)
├── shared/                 # Shared TypeScript types
│   └── types.ts            # API response, document, comment, image types
├── wrangler.jsonc          # Cloudflare Worker configuration
├── vite.config.ts          # Vite build configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start local development server |
| `bun run build` | Production build (frontend + worker) |
| `bun run preview` | Preview production build locally |
| `bun run lint` | Lint with ESLint |
| `bun run typecheck` | Type-check with TypeScript |
| `bun run deploy` | Build and deploy to Cloudflare Workers |
| `bun run cf-typegen` | Generate Cloudflare binding types |

## Configuration

All infrastructure configuration lives in `wrangler.jsonc`:

- **Durable Object bindings**: `GlobalDurableObject` (documents + comments) and `ImageStoreDO` (image storage)
- **Asset routing**: SPA fallback for client-side routing; `/api/*` requests hit the Worker
- **Migrations**: SQLite-backed DO classes with versioned migrations

No environment variables are required for local development. For production secrets, use `wrangler secret put KEY_NAME`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR guidelines.

## License

[MIT](LICENSE) -- Ashish Kumar Singh
