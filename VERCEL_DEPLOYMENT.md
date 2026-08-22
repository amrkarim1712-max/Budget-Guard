# Vercel Deployment Guide for Budget-Guard

## Overview
Budget-Guard is a pnpm monorepo with multiple deployable artifacts:
- **Backend API**: `artifacts/api-server` (Express.js server)
- **Frontend**: `artifacts/neural-chat` (Vite + React)
- **Shared Libraries**: `lib/*` (Database, API client, auth, integrations)

## Deployment Setup

### 1. Connect Repository to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Select "Import Git Repository"
4. Choose `amrkarim1712-max/Budget-Guard`

### 2. Configure Environment Variables (if needed)
Add the following in Vercel Project Settings → Environment Variables:
- `NODE_ENV` = `production` (optional, already set in vercel.json)
- Any database credentials or API keys your app requires

### 3. Deployment Strategy

#### Option A: Deploy Backend API Only
- Root Directory: `artifacts/api-server`
- Framework Preset: Node.js
- Build Command: `cd ../.. && pnpm run build`
- Output Directory: `dist`
- Start Command: `node --enable-source-maps ./dist/index.mjs`

#### Option B: Deploy Frontend Only
- Root Directory: `artifacts/neural-chat`
- Framework Preset: Other (Vite)
- Build Command: `cd ../.. && pnpm run build`
- Output Directory: `dist`

#### Option C: Deploy Both (Recommended)
Create TWO separate Vercel projects:

**Project 1: API Server**
- Name: `budget-guard-api`
- Root Directory: `artifacts/api-server`
- Connected to the same GitHub repo

**Project 2: Frontend**
- Name: `budget-guard-web`
- Root Directory: `artifacts/neural-chat`
- Connected to the same GitHub repo
- Add Environment Variable: `VITE_API_URL` = `https://budget-guard-api.vercel.app` (your API URL)

### 4. Build Process
The `vercel.json` files are configured to:
1. Run `pnpm install` (monorepo-aware)
2. Execute `pnpm run build` (builds all workspaces)
3. Serve the appropriate output directory

**Build Flow:**
```
vercel.json (root)
  ↓
pnpm install (installs entire monorepo)
  ↓
pnpm run build (builds all packages including dependencies)
  ↓
Output directory (api-server/dist or neural-chat/dist)
```

### 5. Environment Configuration

#### For API Server
- Ensure all database connection strings are set in Vercel environment variables
- Set any OpenRouter AI API keys or other service credentials

#### For Frontend
- If connecting to the API, ensure `VITE_API_URL` is set correctly
- Vercel automatically injects environment variables prefixed with `VITE_` into build

### 6. Monitoring & Logs
After deployment:
1. Check Vercel Dashboard for build logs
2. View deployment logs in real-time
3. Monitor function invocations and errors
4. Set up alerts for failed deployments

## Troubleshooting

### Build Fails - "pnpm not found"
- Vercel should auto-detect pnpm from `pnpm-lock.yaml`
- If not, add environment variable: `ENABLE_PNPM=true`

### Monorepo Dependencies Not Resolved
- Ensure `pnpm-workspace.yaml` and monorepo structure is correct
- The root `vercel.json` already handles this

### Build Timeout
- Increase `maxDuration` in api-server/vercel.json if needed
- Split frontend and backend into separate projects

### Frontend Can't Connect to API
- Verify `VITE_API_URL` environment variable is set
- Check CORS settings in backend
- Ensure frontend makes API calls to the correct URL

## Local Testing Before Deployment

```bash
# Install dependencies
pnpm install

# Build entire monorepo
pnpm run build

# Test API server locally
cd artifacts/api-server
pnpm run dev

# In another terminal, test frontend
cd artifacts/neural-chat
pnpm run dev
```

## Deployment Commands Used

```bash
# Vercel uses these commands (from vercel.json):
pnpm install                    # Install monorepo dependencies
pnpm run build                  # Build all workspaces
node --enable-source-maps ./dist/index.mjs  # Start API server (if deployed)
```

## Documentation Links
- [Vercel Monorepo Support](https://vercel.com/docs/projects/config/monorepos)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Node.js Runtime](https://vercel.com/docs/runtimes/nodejs)
- [pnpm with Vercel](https://pnpm.io/deployment/vercel)

## Next Steps
1. Push this configuration to GitHub
2. Go to vercel.com and import your project
3. Configure environment variables in Vercel dashboard
4. Deploy! 🚀

For more details, check the individual `vercel.json` files in:
- `./vercel.json` (root configuration)
- `./artifacts/api-server/vercel.json`
- `./artifacts/neural-chat/vercel.json`
