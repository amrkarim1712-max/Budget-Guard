# NeuralChat

A production-quality AI assistant platform — streaming chat, multiple AI models via OpenRouter, web search mode, vision (image upload), conversation history, and Replit Auth. Designed to feel like Linear meets Claude: precise, fast, and genuinely beautiful.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/neural-chat run dev` — run the frontend (port 18937)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Required secret: `OPENROUTER_API_KEY` — user's own OpenRouter API key (sk-or-...)
- Required env: `SESSION_SECRET` — session signing secret (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Framer Motion
- API: Express 5 (shared `artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM
- AI: OpenRouter via user-provided OPENROUTER_API_KEY
- Auth: Replit Auth (OIDC/PKCE via `openid-client`)
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM tables: auth.ts, conversations.ts, messages.ts
- `lib/integrations-openrouter-ai/` — OpenRouter SDK client wrapper
- `lib/replit-auth-web/` — browser auth hook (`useAuth`)
- `artifacts/api-server/src/routes/openrouter/` — AI chat routes (models, conversations, messages/SSE)
- `artifacts/api-server/src/routes/auth.ts` — OIDC auth routes
- `artifacts/neural-chat/src/` — React frontend

## Architecture decisions

- OpenAPI-first: all types flow from `lib/api-spec/openapi.yaml` → Orval → React Query hooks + Zod schemas
- SSE streaming for AI responses — Orval can't generate typed hooks for SSE; frontend uses raw `fetch` + `ReadableStream`
- Auth is Replit OIDC. Sessions stored in PostgreSQL `sessions` table. Cookie-based for web.
- Conversations are user-scoped when authenticated; open to all in unauthenticated (demo) mode
- Auto-title generation: after first message exchange, OpenRouter generates a short conversation title in the background
- OpenRouter client uses user's own `OPENROUTER_API_KEY` (no Replit AI Integration billing)

## Product

- **Chat**: Streaming AI chat with markdown + syntax-highlighted code blocks, copy/edit/regenerate message actions
- **Models**: 10 curated OpenRouter models (Llama, Gemini, Claude, GPT-4, DeepSeek, Mistral, Qwen)
- **Vision**: Image upload (file/drag-drop/paste) for models that support it — sent as base64 to OpenRouter
- **Web Search Mode**: Toggle in composer; adds date context and instructs model to use latest knowledge
- **Conversations**: Full history with rename, pin, delete, search, auto-generated titles
- **Auth**: Replit SSO login — no passwords, no sign-up forms
- **Themes**: Dark mode and light mode with toggle

## User preferences

_Populate as you build._

## Gotchas

- After any OpenAPI spec change, run codegen before building: `pnpm --filter @workspace/api-spec run codegen`
- The SSE streaming endpoint `/api/openrouter/conversations/:id/messages` must be consumed with raw `fetch`, NOT the generated `useSendOpenrouterMessage` hook (Orval can't type SSE responses)
- `pnpm --filter @workspace/db run push` — use this to apply schema changes; for production use the Replit Publish flow
- Do NOT run `pnpm run dev` at workspace root — use workflow tools to start/stop services

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `replit-auth` skill for adding mobile auth or customizing login flow
