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
| `ENQUIRY_STORE` | `sqlite` | Enquiry store (Spec 16). `sqlite` persists to disk; `memory` is ephemeral. Tests always use in-memory. |
| `ENQUIRY_DB_PATH` | `./data/enquiries.db` | SQLite file path (Spec 16). Point at a **durable** path on the instance so enquiries survive restarts. |

**Wiring:** set the client's `NEXT_PUBLIC_API_BASE_URL` to this service's public
URL, and add the client's Vercel domain to the server's `CORS_ORIGIN`.

---

## 3. MCP server (`mcp-server/`, Phase 2 — Specs 12 & 17)

The MCP server is a **third, separate service** and is never bundled into the
`client` Vercel build. As implemented (Spec 12, Option B) it **reuses the backend
services in-process** by importing them directly from `server/src`, so it needs no
API base URL. It speaks two transports (Spec 17), selected by `MCP_TRANSPORT`:

```bash
npm run build --workspace mcp-server
npm run start --workspace mcp-server   # MCP_TRANSPORT=stdio (default), launched by a client

# Network transport (Streamable HTTP) for remote testing:
MCP_TRANSPORT=http MCP_HTTP_PORT=4100 \
  npm run start --workspace mcp-server # POST/GET/DELETE /mcp + GET /healthz
```

> Build note (Option B): because the MCP server imports the backend services from
> `server/src`, `tsc` roots the output across both trees, so the compiled entry is
> `dist/mcp-server/src/index.js` (the `start` script points there).

- **stdio** — local MCP clients launch it as a subprocess (no port).
- **http** — a network-connectable Streamable HTTP endpoint (Node built-in `http`,
  no new dependency), bound to loopback behind Nginx/TLS so remote clients can
  test the tools. On Lightsail: `deploy/install-services.sh --with-mcp`, Nginx
  proxies `/mcp` → `:4100`, and remote clients connect to
  `https://<domain>/mcp`. DNS-rebinding protection turns on when
  `MCP_ALLOWED_HOSTS`/`MCP_ALLOWED_ORIGINS` are set. There is no auth in front of
  `/mcp` (demo); keep it TLS-only over synthetic data.

`submit_enquiry` is **fail-closed on both transports**: it refuses to write unless
a human-approval channel is wired. See `mcp-server/README.md`, `deploy/README.md`,
and `.kiro/specs/12-mcp-server/` + `.kiro/specs/17-mcp-http-transport/`.

---

## 4. Enquiry persistence — SQLite (Spec 16)

Submitted enquiries are stored in **SQLite** (a single file on the instance disk —
the cheapest durable option; no managed database). The same stored data is read
back by `GET /api/enquiries`, the `list_enquiries` MCP tool, and the `/dashboard`
page.

- Set **`ENQUIRY_DB_PATH`** to a **durable** path on the host (not a temp dir), so
  enquiries survive server restarts. Ensure the process user can create/write that
  directory (the server creates parent dirs automatically).
- Leave **`ENQUIRY_STORE=sqlite`** (the default) in production. `memory` is
  ephemeral; tests use in-memory automatically.
- The DB file is **gitignored** (`server/data/`, `*.db`) — it is instance-local
  state, never committed.
- **Caveat (demo scope):** the DB is tied to the **single instance** (no
  replication/backup). Snapshots/backups are out of scope for the demo. Also, the
  dashboard and read API expose **synthetic** enquiry data **unmasked** and with
  **no auth** — acceptable only because all data is synthetic.

```bash
# On the instance, e.g.
export ENQUIRY_DB_PATH=/home/ubuntu/eduagent/data/enquiries.db
```

---

## 5. Hosting on AWS Lightsail (single instance)

For a self-hosted demo, one Lightsail instance can run **client + server** behind
Nginx, optionally with the **MCP server over HTTP** (Nginx proxies `/mcp` → `:4100`)
so remote clients can test the tools. This keeps everything same-origin (no CORS)
and needs one TLS certificate. If you don't expose MCP over the network, it still
works over stdio (not web-exposed).

> **One-shot setup:** `deploy/setup.sh` provisions a fresh Ubuntu instance in a
> single run (system deps + build tooling for `better-sqlite3`, Node 20, Nginx,
> Certbot, `npm ci` + build, data dir). Then `deploy/install-services.sh` installs
> the systemd services and `deploy/nginx.conf.example` is the reverse-proxy vhost.
> See `deploy/README.md` for the full runbook.

**Provision (ref: reuse the ShowMeYourAgent Lightsail flow)**

- Instance: **Ubuntu 24.04 LTS**, region to match any Bedrock use (e.g.
  `ap-southeast-1`), **4 GB / 2 vCPU** (comfortable for build + three Node
  processes; 2 GB is tight during `next build`).
- Attach a **static IP**; open **80/443** in the Lightsail firewall (keep
  3000/4000 internal). Point a domain at the static IP for TLS.
- Install **Node 20 LTS** (via `nvm`) — matches `engines`.

**Deploy**

```bash
git clone <repo> && cd nus-iss-agent-showcase
npm ci
npm run build                         # server + client
npm run build --workspace mcp-server  # stdio (local clients) or HTTP (remote, MCP_TRANSPORT=http)

# server/.env (not committed):
#   NODE_ENV=production
#   CORS_ORIGIN=https://<your-domain>            # or omit if same-origin via Nginx
#   ENQUIRY_STORE=sqlite
#   ENQUIRY_DB_PATH=/home/ubuntu/eduagent/data/enquiries.db
# client env:
#   NEXT_PUBLIC_API_BASE_URL=""                  # same-origin (Nginx routes /api) or the domain
```

Run **`client` (:3000)** and **`server` (:4000)** as **systemd services**
(auto-restart, survive reboot). Front them with **Nginx**:

- TLS via Let's Encrypt (Certbot).
- `location /api/ → http://127.0.0.1:4000` ; `location / → http://127.0.0.1:3000`.
- Raise `client_max_body_size` / proxy buffers so large agent request bodies are
  not rejected (a known gotcha behind proxies/WAFs).

**Persistence:** point `ENQUIRY_DB_PATH` at a durable path (e.g.
`/home/ubuntu/eduagent/data/`) — enquiries then survive restarts. Back up that
file if the demo needs to retain data across instance replacement.

**Bedrock (optional):** if wiring a live LLM planner, call Bedrock **server-side
only** (scoped IAM `bedrock:InvokeModel`, credentials in the server env — never in
`NEXT_PUBLIC_*`). See the hosting plan for details.

---

## 6. Local development (reference)

From the repository root:

```bash
npm install        # installs all workspaces
npm run dev        # client on :3000, server on :4000 (parallel)
curl http://localhost:4000/api/health   # → { "status": "ok" }
```

---

## 7. Checklist

- [ ] Vercel `client` project **Root Directory = `client`** (or client behind Nginx on Lightsail).
- [ ] `NEXT_PUBLIC_API_BASE_URL` set (or empty for same-origin via Nginx).
- [ ] `server` deployed as its own service; `CORS_ORIGIN` includes the client domain; `NODE_ENV=production`.
- [ ] `ENQUIRY_DB_PATH` points at a **durable** path so enquiries persist across restarts; DB file gitignored.
- [ ] Do **not** deploy the repo root as a single Next project.
- [ ] (Phase 2) `mcp-server` deployed/launched as its own service (stdio, or HTTP via `--with-mcp` + Nginx `/mcp`), not part of the client build.
- [ ] (MCP HTTP, Spec 17) `MCP_ALLOWED_HOSTS`/`MCP_ALLOWED_ORIGINS` set (DNS-rebinding protection on); `/mcp` served TLS-only; `submit_enquiry` stays fail-closed.
- [ ] (Lightsail) static IP + firewall 80/443 only; Nginx TLS + `/api` proxy; systemd services; raise proxy body-size limit.
