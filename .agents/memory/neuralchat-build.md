---
name: AI build decisions
description: Key decisions and gotchas from building the AI AI platform
---

## OpenRouter integration
- User declined Replit AI Integration upgrade — using `OPENROUTER_API_KEY` secret directly
- Client is at `lib/integrations-openrouter-ai/src/client.ts` — points to `https://openrouter.ai/api/v1`
- Default model: `meta-llama/llama-3.3-70b-instruct` (free tier)

## SSE Streaming
- The `sendOpenrouterMessage` endpoint returns SSE (`text/event-stream`)
- Orval cannot type SSE — frontend uses raw `fetch` + `ReadableStream`
- Stream sends: `{ userMessage }` first, then `{ content }` chunks, then `{ done, assistantMessage }`
- DO NOT use the generated `useSendOpenrouterMessage` hook for the chat stream

## Codegen / Zod
- Orval v8 generates `z.email()` and `z.url()` for OpenAPI format annotations
- These are zod v4 calls — if the spec has `format: email` or `format: uri`, TypeScript errors occur because the generated file imports from `zod` root (v3)
- **Fix**: Remove `format: email` and `format: uri` from the OpenAPI spec

**Why:** The workspace uses `zod: ^3.25.76` with v4 API at `zod/v4` subpath, but Orval imports from the root `zod` package.

## Auth
- `replit-auth-web` lib: `import.meta.env.BASE_URL` doesn't work in composite libs built by tsc
- Fix: Replace with hardcoded `'/'` or use `window.location.pathname`

## DB Schema
- conversations: id, title, model, pinned, userId, createdAt, updatedAt
- messages: id, conversationId, role, content, model, webSearch, images (text array), createdAt
- auth: sessions table + users table (from replit-auth skill templates)
