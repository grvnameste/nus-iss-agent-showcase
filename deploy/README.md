# Deploy — AWS Lightsail one-shot setup

Provision a fresh **Ubuntu** Lightsail instance to run EduAgent Connect
(Next.js `client` + Express `server`, with the `mcp-server` available over stdio
and, optionally, over a network **Streamable HTTP** transport — Spec 17).
See the repo-root `DEPLOYMENT.md` for the broader hosting model; this folder is the
runnable scripting for a single instance.

## Files

| File | Purpose |
| ---- | ------- |
| `setup.sh` | **One-shot** provisioning: system deps + build tooling, Node 20, Nginx, Certbot, `npm ci` + build, data dir, `server/.env` from example. Idempotent. |
| `install-services.sh` | Installs + enables the systemd services (client + server; `--with-mcp` adds the MCP HTTP unit) with your repo path / user substituted. |
| `systemd/eduagent-server.service` | Server unit template (`%REPO_ROOT%`, `%APP_USER%` placeholders). |
| `systemd/eduagent-client.service` | Client unit template. |
| `systemd/eduagent-mcp.service` | MCP server unit template — HTTP transport, loopback bind (Spec 17). |
| `nginx.conf.example` | Reverse-proxy vhost: `/api` → :4000, `/mcp` → :4100 (SSE, no buffering), `/` → :3000, larger body limit. |
| `server.env.example` | Server env template (copied to `server/.env` if absent). |
| `mcp.env.example` | MCP server env template (copied to `mcp-server/.env` if absent). |

## Quick start (on the instance)

```bash
# 1. Get the code
git clone <your-repo-url> ~/eduagent && cd ~/eduagent

# 2. One-shot setup (installs system deps + Node, builds the app)
sudo bash deploy/setup.sh --app-user "$USER"

# 3. Configure the backend env (durable DB path + your domain)
nano server/.env
#   NODE_ENV=production
#   CORS_ORIGIN=https://your-domain.example
#   ENQUIRY_STORE=sqlite
#   ENQUIRY_DB_PATH=/home/ubuntu/eduagent/server/data/enquiries.db

# 4. Install + start the services (client :3000, server :4000)
sudo bash deploy/install-services.sh --app-user "$USER"

# 5. Reverse proxy + TLS
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/eduagent
sudo nano /etc/nginx/sites-available/eduagent          # set server_name
sudo ln -s /etc/nginx/sites-available/eduagent /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.example            # Let's Encrypt TLS

# 6. Verify
curl http://127.0.0.1:4000/api/health                  # {"status":"ok"}
#   then open https://your-domain.example  and  /dashboard
```

## Why the build tooling?

`better-sqlite3` (the enquiry store, Spec 16) ships a **native addon** that is
compiled on install, so the box needs `build-essential` + `python3`. `setup.sh`
installs these before `npm ci`.

## Persistence

Enquiries persist to the SQLite file at `ENQUIRY_DB_PATH`. Point it at a **durable**
path (e.g. under `~/eduagent/server/data/`); it survives restarts. The DB is
**gitignored** and **instance-local** (no replication/backup) — snapshot the
instance or copy the file if you need to retain data. Data is **synthetic**; the
dashboard/read API are unmasked and unauthenticated (demo).

## MCP server

`setup.sh` builds `mcp-server`, which speaks two transports (selected by
`MCP_TRANSPORT`):

- **stdio** (default) — launched as a subprocess by a local MCP client, no port:

  ```bash
  npm run start --workspace mcp-server        # MCP_TRANSPORT=stdio (default)
  ```

- **http** (Spec 17) — a network-connectable **Streamable HTTP** endpoint so
  remote clients can test the tools over the internet. Bound to loopback and
  fronted by Nginx/TLS.

`submit_enquiry` is **fail-closed on both transports** (refuses to write without
a wired human-approval channel). See `mcp-server/README.md`.

### Expose the MCP HTTP transport (optional)

```bash
# 1. Env (created by setup.sh from mcp.env.example if absent)
nano mcp-server/.env
#   MCP_TRANSPORT=http
#   MCP_HTTP_HOST=127.0.0.1
#   MCP_HTTP_PORT=4100
#   MCP_ALLOWED_HOSTS=your-domain.example         # enables DNS-rebinding protection
#   MCP_ALLOWED_ORIGINS=https://your-domain.example

# 2. Install + start the MCP unit alongside client/server
sudo bash deploy/install-services.sh --app-user "$USER" --with-mcp

# 3. The Nginx example already proxies /mcp → :4100 (SSE, no buffering).
#    Reload after copying it, then verify locally:
curl http://127.0.0.1:4100/healthz              # {"ok":true}
```

### Connect a remote MCP client

Point any Streamable-HTTP MCP client at the public endpoint:

```
https://your-domain.example/mcp
```

- **MCP Inspector**: `npx @modelcontextprotocol/inspector`, choose transport
  **Streamable HTTP**, URL `https://your-domain.example/mcp`, then
  Connect → List Tools (seven tools) → call a READ (e.g. `find_courses`).
- Calling `submit_enquiry` returns an error result (fail-closed) — this is
  expected until a remote human-approval channel (MCP elicitation) is wired.

> **Security.** There is no authentication in front of `/mcp` (demo). Keep
> `MCP_ALLOWED_HOSTS`/`MCP_ALLOWED_ORIGINS` set so DNS-rebinding protection is on,
> serve only over TLS, and treat the endpoint as a public read surface over
> synthetic data. Writes stay refused.

## Re-running

`setup.sh` is idempotent — re-run it to pull new deps / rebuild after `git pull`.
To redeploy code:

```bash
cd ~/eduagent && git pull
sudo bash deploy/setup.sh --app-user "$USER"     # reinstall deps + rebuild
sudo systemctl restart eduagent-server eduagent-client
```

## Sizing

Lightsail **4 GB / 2 vCPU** is the safe floor (the `next build` step is
memory-hungry; 2 GB can OOM). Firewall: expose only **80/443**; keep 3000/4000
internal.
