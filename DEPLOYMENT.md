# Deployment — EduAgent Connect

EduAgent Connect is an **npm workspaces monorepo** at the repository root:

```
<repo root>/
├── client/   # Next.js app  → deploy to Vercel
├── server/   # Express REST API → deploy as a SEPARATE service
└── mcp-server/  # (Phase 2) MCP server → its own SEPARATE service
```

The most common deployment mistake is pointing Vercel at the **repository root**
and letting it try to build the whole monorepo as one Next.js project. That fails
because the repo root is not a Next app (it contains the Express `server`, which
Vercel cannot host as a Next build). The fix is to scope each deployable unit.

> Historical note: these workspaces previously lived under an `App/` folder and
> were moved to the repo root. The `App/` wrapper is gone; use the paths above.

---

## 1. Frontend (`client/`) → Vercel

Deploy the Next.js app as its own Vercel project.

**Vercel project settings**

| Setting | Value |
| ------- | ----- |
| **Root Directory** | `client` |
| Framework Preset | Next.js (auto-detected; pinned in `client/vercel.json`) |
| Build Command | `next build` (default) |
| Install Command | default (Vercel installs workspace deps) |
| Output | `.next` (default) |
| Node.js version | 20.x (matches `engines`) |

Setting **Root Directory = `client`** is the essential step: Vercel then treats
`client/` as the project root, detects Next.js, and ignores the Express server.

**Environment variables (Vercel → client project)**

| Variable | Example | Notes |
| -------- | ------- | ----- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<your-server-host>` | Public (browser-exposed). Points the client at the deployed backend. Must be the backend's public HTTPS URL in production. |

`client/vercel.json` pins the framework so detection is explicit:

```json
{ "$schema": "https://openapi.vercel.sh/vercel.json", "framework": "nextjs" }
```

---

## 2. Backend (`server/`) → separate service

`server/` is a standalone Express API — **not** a Next app — so it deploys
independently. It listens on `PORT` (default `4000`) and exposes `GET /api/health`.

Options:

- **A separate Vercel project** with Root Directory = `server`, adapted to
  serverless/Node functions (a later spec may formalise this), **or**
- **Any Node host** (Render, Railway, Fly.io, a container, etc.) running
  `npm run build --workspace server` then `npm run start --workspace server`.

**Environment variables (server)**

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `PORT` | `4000` | Listen port (host may inject its own). |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allow-list. In production set it to the deployed **client** origin(s). Avoid `*` outside local dev. |
| `LOG_LEVEL` | `info` | pino level. |
| `NODE_ENV` | `development` | Set `production` when deployed. |

**Wiring:** set the client's `NEXT_PUBLIC_API_BASE_URL` to this service's public
URL, and add the client's Vercel domain to the server's `CORS_ORIGIN`.

---

## 3. MCP server (`mcp-server/`, Phase 2)

When added (Spec 12), the MCP server is a **third, separate service**. It reuses
the existing backend (via HTTP to `server/`) and is configured through its own
validated env (e.g. an API base URL + transport mode). It is never bundled into
the `client` Vercel build. See `.kiro/specs/12-mcp-server/`.

---

## 4. Local development (reference)

From the repository root:

```bash
npm install        # installs all workspaces
npm run dev        # client on :3000, server on :4000 (parallel)
curl http://localhost:4000/api/health   # → { "status": "ok" }
```

---

## 5. Checklist

- [ ] Vercel `client` project **Root Directory = `client`**.
- [ ] `NEXT_PUBLIC_API_BASE_URL` set on the client project to the backend's public URL.
- [ ] `server` deployed as its own service; `CORS_ORIGIN` includes the client domain; `NODE_ENV=production`.
- [ ] Do **not** deploy the repo root as a single Next project.
- [ ] (Phase 2) `mcp-server` deployed as its own service, not part of the client build.
