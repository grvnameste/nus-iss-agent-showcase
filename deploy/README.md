# Deploy — AWS Lightsail one-shot setup

Provision a fresh **Ubuntu** Lightsail instance to run EduAgent Connect
(Next.js `client` + Express `server`, with the `mcp-server` available over stdio).
See the repo-root `DEPLOYMENT.md` for the broader hosting model; this folder is the
runnable scripting for a single instance.

## Files

| File | Purpose |
| ---- | ------- |
| `setup.sh` | **One-shot** provisioning: system deps + build tooling, Node 20, Nginx, Certbot, `npm ci` + build, data dir, `server/.env` from example. Idempotent. |
| `install-services.sh` | Installs + enables the systemd services (client + server) with your repo path / user substituted. |
| `systemd/eduagent-server.service` | Server unit template (`%REPO_ROOT%`, `%APP_USER%` placeholders). |
| `systemd/eduagent-client.service` | Client unit template. |
| `nginx.conf.example` | Reverse-proxy vhost: `/api` → :4000, `/` → :3000, larger body limit. |
| `server.env.example` | Server env template (copied to `server/.env` if absent). |

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

## MCP server (optional)

`setup.sh` also builds `mcp-server`. It is launched over **stdio by an MCP
client** (not web-exposed, no port). Run it with:

```bash
npm run start --workspace mcp-server   # node dist/mcp-server/src/index.js
```

`submit_enquiry` is fail-closed (refuses to write without a wired human-approval
channel). See `mcp-server/README.md`.

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
