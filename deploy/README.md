# Deploy — AWS Lightsail one-shot setup

Provision a fresh **Ubuntu** Lightsail instance to run EduAgent Connect
(Next.js `client` + Express `server`, with the `mcp-server` available over stdio
and, optionally, over a network **Streamable HTTP** transport — Spec 17).
See the repo-root `DEPLOYMENT.md` for the broader hosting model; this folder is the
runnable scripting for a single instance.

## No custom domain? Use a free DuckDNS subdomain

Let's Encrypt won't issue a certificate for a bare IP, so give your Lightsail
**static IP** a free hostname with [DuckDNS](https://www.duckdns.org) (sign in with
GitHub/Google, no cost):

> 1. At duckdns.org, create a subdomain — e.g. **`eduagent`** → `eduagent.duckdns.org`
>    (subdomains are lowercase; if `eduagent` is taken, use a variant like
>    `eduagent-demo`).
> 2. Set its **current ip** to your Lightsail **static IP** and Save.
> 3. Confirm it resolves: `dig +short eduagent.duckdns.org` → your IP.

Use that host everywhere a domain is expected below (`server_name`, `CORS_ORIGIN`,
`MCP_ALLOWED_HOSTS`/`MCP_ALLOWED_ORIGINS`, and `certbot -d`). End users then reach
`https://eduagent.duckdns.org` (WebMCP) and `https://eduagent.duckdns.org/mcp` (MCP).

> No-signup alternative: a nip.io host derived from the IP (dots → dashes),
> e.g. `13-250-1-2.nip.io`. DuckDNS is preferred here for a stable, named host.

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

## Full walkthrough (DuckDNS + Lightsail, end to end)

This runs **client + server + MCP HTTP** on one instance behind Nginx/TLS, so end
users can test **WebMCP** at `https://eduagent.duckdns.org` and **MCP** at
`https://eduagent.duckdns.org/mcp`. Replace `eduagent.duckdns.org` with your own
DuckDNS host (if `eduagent` is taken, use a variant), and `<STATIC_IP>` with your
instance's static IP.

### Step 1 — Create the Lightsail instance

1. Lightsail console → **Create instance** → Linux/Unix → **Ubuntu 24.04 LTS**.
2. Plan: **4 GB / 2 vCPU** (the `next build` needs the RAM; 2 GB can OOM).
3. Create it, then **Networking → Create static IP** and attach it. Note it as
   `<STATIC_IP>`.
4. **Networking → IPv4 Firewall**: open **HTTP (80)** and **HTTPS (443)**. Leave
   3000 / 4000 / 4100 closed — Nginx fronts them on loopback.

### Step 2 — Register the DuckDNS subdomain

1. Sign in at **https://www.duckdns.org** (GitHub/Google — free).
2. Type `eduagent` in the **sub domain** box → **add domain** → you own
   `eduagent.duckdns.org` (subdomains are lowercase).
3. In that row set **current ip** to `<STATIC_IP>` → **update ip** / save.
4. From your laptop, confirm it resolves before running certbot:

   ```bash
   dig +short eduagent.duckdns.org      # → <STATIC_IP>  (may take a couple of minutes)
   ```

> Static Lightsail IP → you set the DuckDNS IP **once**; no updater cron needed.

### Step 3 — SSH in and get the code

```bash
git clone <your-repo-url> ~/eduagent && cd ~/eduagent
```

### Step 4 — One-shot provisioning

```bash
sudo bash deploy/setup.sh --app-user "$USER"
```

Installs build tooling (for `better-sqlite3`), Node 20, Nginx, Certbot; runs
`npm ci` + builds all three workspaces; creates the durable data dir; and seeds
`server/.env` and `mcp-server/.env` from the examples.

### Step 5 — Configure the two env files

```bash
nano server/.env
```

```
NODE_ENV=production
CORS_ORIGIN=https://eduagent.duckdns.org
ENQUIRY_STORE=sqlite
ENQUIRY_DB_PATH=/home/ubuntu/eduagent/server/data/enquiries.db
```

(If your Linux user isn't `ubuntu`, adjust the DB path to
`/home/<user>/eduagent/server/data/enquiries.db`.)

```bash
nano mcp-server/.env
```

```
MCP_TRANSPORT=http
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_PORT=4100
MCP_ALLOWED_HOSTS=eduagent.duckdns.org
MCP_ALLOWED_ORIGINS=https://eduagent.duckdns.org
```

The allow-list **must** match the host clients connect through, or the MCP
DNS-rebinding check rejects the request.

### Step 6 — Install the services (including MCP)

```bash
sudo bash deploy/install-services.sh --app-user "$USER" --with-mcp
```

`--with-mcp` adds the MCP HTTP unit alongside client + server. Local check:

```bash
curl http://127.0.0.1:4000/api/health     # {"status":"ok"}
curl http://127.0.0.1:4100/healthz         # {"ok":true}
```

### Step 7 — Nginx + TLS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/eduagent
sudo nano /etc/nginx/sites-available/eduagent   # server_name eduagent.duckdns.org; (already set)
sudo ln -s /etc/nginx/sites-available/eduagent /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default     # stop the default vhost shadowing yours
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d eduagent.duckdns.org    # choose redirect-to-HTTPS when asked
```

Certbot rewrites the vhost for TLS and sets up auto-renewal.

### Step 8 — Verify end to end

- **WebMCP**: open `https://eduagent.duckdns.org` and `.../dashboard`.
- **MCP over the network** (from any machine):

  ```bash
  npx @modelcontextprotocol/inspector
  ```

  Transport **Streamable HTTP**, URL `https://eduagent.duckdns.org/mcp` →
  **Connect** → **List Tools** (expect 7) → call `find_courses`. Calling
  `submit_enquiry` returns an error result — intended fail-closed behaviour (no
  remote write-approval channel is wired).

## Why the build tooling?

`better-sqlite3` (the enquiry store, Spec 16) ships a **native addon** that is
compiled on install, so the box needs `build-essential`, `python3`, and
`python3-dev` (the headers node-gyp needs). `setup.sh` installs all three before
`npm ci`, then runs `npm rebuild better-sqlite3 --build-from-source` to compile
the addon for the exact Node version and architecture on the instance.

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

The HTTP transport is wired by the walkthrough above (Steps 5–7: `mcp-server/.env`,
`install-services.sh --with-mcp`, and the Nginx `/mcp` proxy). If you skipped it and
want to add it later, set `mcp-server/.env`, re-run
`install-services.sh --with-mcp`, reload Nginx, then `curl http://127.0.0.1:4100/healthz`.

### Connect a remote MCP client

Point any Streamable-HTTP MCP client at the public endpoint:

```
https://eduagent.duckdns.org/mcp
```

- **MCP Inspector**: `npx @modelcontextprotocol/inspector`, choose transport
  **Streamable HTTP**, URL `https://eduagent.duckdns.org/mcp`, then
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
sudo systemctl restart eduagent-server eduagent-client eduagent-mcp
```

(Drop `eduagent-mcp` from the restart if you did not install with `--with-mcp`.)

## Sizing

Lightsail **4 GB / 2 vCPU** is the safe floor (the `next build` step is
memory-hungry; 2 GB can OOM). Firewall: expose only **80/443**; keep 3000 / 4000 /
4100 internal (Nginx fronts them on loopback).
