# Markflow - Cloudflare Workers Chat Demo

[cloudflarebutton]

A production-ready full-stack chat application built with Cloudflare Workers, Durable Objects, and React. Demonstrates scalable entity storage, indexed listing, and real-time messaging using a single Global Durable Object for multiple entities.

## Features

- **Multi-Entity Durable Objects**: Users and ChatBoards stored as individual DO instances sharing a single Global DO for storage efficiency.
- **Indexed Listing**: Efficient pagination and listing of users and chats with cursor-based queries.
- **Chat Functionality**: Create chats, send messages, list messages per chat.
- **API-Driven**: RESTful endpoints for CRUD operations (`/api/users`, `/api/chats`, `/api/chats/:id/messages`).
- **React Frontend**: Modern UI with shadcn/ui components, Tailwind CSS, TanStack Query, and theme support.
- **Seed Data**: Mock users, chats, and messages auto-populate on first run.
- **Type-Safe**: Full TypeScript support across worker and frontend with shared types.
- **Production-Ready**: Error handling, CORS, logging, client error reporting.

## Tech Stack

- **Backend**: Cloudflare Workers, Hono, Durable Objects
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Router
- **State & Data**: Immer, Zustand (ready for use), shared types
- **UI Components**: Radix UI, Lucide React, Sonner (toasts)
- **Build Tools**: Bun, Wrangler, Vite
- **Dev Tools**: ESLint, TypeScript ESLint

## Quick Start

### Prerequisites

- Bun 1.0+ installed (`curl -fsSL https://bun.sh/install | bash`)
- Cloudflare account and Wrangler CLI (`bunx wrangler@latest login`)

### Installation

```bash
git clone <repo-url>
cd markflow-fbhj1yyxqquocpjwznjmz
bun install
```

### Local Development

```bash
# Run dev server (frontend + worker APIs)
bun run dev

# Open http://localhost:3000 (or $PORT)
```

The app auto-seeds mock data. Test APIs via browser devtools or tools like Thunder Client.

### Example API Usage

```bash
# List users (paginated)
curl "http://localhost:3000/api/users?limit=10"

# Create user
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'

# List chats
curl "http://localhost:3000/api/chats"

# Send message to chat
curl -X POST "http://localhost:3000/api/chats/c1/messages" \
  -H "Content-Type: application/json" \
  -d '{"userId": "u1", "text": "Hello!"}'
```

## Development

### Project Structure

```
├── src/              # React frontend
├── worker/           # Cloudflare Worker (APIs + DO logic)
├── shared/           # Shared types & mock data
├── tailwind.config.js # UI theming
└── wrangler.jsonc    # Worker config
```

### Adding New Entities

1. Extend `IndexedEntity` in `worker/entities.ts`:
   ```typescript
   export class NewEntity extends IndexedEntity<NewEntityState> {
     static readonly entityName = "newentity";
     static readonly indexName = "newentities";
     // methods...
   }
   ```

2. Add routes in `worker/user-routes.ts` using entity statics (`list`, `create`, `delete`).

3. Update `shared/types.ts` and use in frontend.

### Frontend Customization

- Pages in `src/pages/`
- Components: `src/components/` (shadcn/ui pre-installed)
- Hooks: `src/hooks/`
- API calls: Use `src/lib/api-client.ts`

### Type Generation

```bash
bunx wrangler types  # Update worker Env types
```

## Deployment

Deploy to Cloudflare Workers in one command:

```bash
bun run deploy  # Builds frontend + deploys worker
```

Or manually:

```bash
bun run build   # Build frontend assets
bunx wrangler deploy
```

Configuration in `wrangler.jsonc` handles Durable Objects and SPA routing.

[cloudflarebutton]

### Environment Variables

Set via Wrangler dashboard or CLI:
- No required vars for demo (all storage via DOs).

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run lint` | Lint codebase |
| `bun run deploy` | Deploy to Cloudflare |
| `bunx wrangler types` | Generate types |

## Architecture Notes

- **Global Durable Object**: Single DO instance acts as KV-like storage for all entities.
- **Entity Isolation**: Each entity (User, ChatBoard) gets its own DO stub by name.
- **CAS Operations**: Atomic updates prevent race conditions.
- **Indexes**: Prefix-based listing for pagination.

## Contributing

1. Fork and clone.
2. `bun install`
3. Make changes, `bun run lint`.
4. Test locally, `bun run deploy`.
5. PR with clear description.

## License

MIT - See [LICENSE](LICENSE) for details.