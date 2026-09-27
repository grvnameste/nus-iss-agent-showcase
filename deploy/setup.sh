#!/usr/bin/env bash
#
# EduAgent Connect — one-shot provisioning for a fresh AWS Lightsail (Ubuntu) box.
#
# Installs everything the app needs and builds it, so a single run leaves the
# instance ready to serve. Idempotent: safe to re-run (it checks before it acts).
#
# What it does:
#   1. System packages + build tooling (build-essential, python3 — needed to
#      compile better-sqlite3's native binding), curl, git, nginx, certbot.
#   2. Node.js 20 LTS (via NodeSource) if a suitable Node is not already present.
#   3. `npm ci` + `npm run build` (server + client) + the mcp-server build.
#   4. A durable data directory for the SQLite enquiry store.
#   5. A server/.env from the example (only if absent — never overwrites).
#
# What it does NOT do (deliberately — needs your input):
#   - Enable/replace systemd services (use deploy/install-services.sh with your
#     paths, or the templates in deploy/systemd/).
#   - Configure Nginx vhost / obtain TLS (see deploy/nginx.conf.example + the
#     certbot command printed at the end).
#
# Usage (from the repo root on the instance):
#   sudo bash deploy/setup.sh
#   # or, if you cloned as the 'ubuntu' user:
#   sudo bash deploy/setup.sh --app-user ubuntu
#
set -euo pipefail

# ── Config (override via flags/env) ──────────────────────────────────────────
NODE_MAJOR="${NODE_MAJOR:-20}"
APP_USER="${APP_USER:-${SUDO_USER:-$(whoami)}}"
# Repo root = the directory this script lives in, one level up.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${DATA_DIR:-$REPO_ROOT/server/data}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-user) APP_USER="$2"; shift 2 ;;
    --node-major) NODE_MAJOR="$2"; shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }

require_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "This script installs system packages; run it with sudo:" >&2
    echo "  sudo bash deploy/setup.sh" >&2
    exit 1
  fi
}

# ── 1. System packages + build tooling ───────────────────────────────────────
install_system_packages() {
  log "Installing system packages (build tooling for better-sqlite3, nginx, certbot)"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  # build-essential + python3 + python3-dev: required to compile better-sqlite3's native addon.
  apt-get install -y --no-install-recommends \
    ca-certificates curl git build-essential python3 python3-dev \
    nginx certbot python3-certbot-nginx
  ok "System packages present"
}

# ── 2. Node.js 20 LTS ─────────────────────────────────────────────────────────
node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  local major
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  [[ "$major" -ge "$NODE_MAJOR" ]]
}

install_node() {
  if node_ok; then
    ok "Node $(node -v) already satisfies >= ${NODE_MAJOR}"
    return
  fi
  log "Installing Node.js ${NODE_MAJOR} LTS (NodeSource)"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh
  apt-get install -y nodejs
  rm -f /tmp/nodesource_setup.sh
  ok "Node $(node -v), npm $(npm -v)"
}

# ── 3. Install workspace deps + build ─────────────────────────────────────────
build_app() {
  log "Installing workspace dependencies (npm ci) and building"
  # Run as the app user so node_modules / build output aren't root-owned.
  run_as() { sudo -u "$APP_USER" --preserve-env=PATH bash -lc "cd '$REPO_ROOT' && $*"; }

  if [[ -f "$REPO_ROOT/package-lock.json" ]]; then
    run_as "npm ci"
  else
    warn "No package-lock.json found; falling back to npm install"
    run_as "npm install"
  fi
  # Recompile better-sqlite3's native addon for this machine's Node version/arch.
  # Must run after npm ci so node_modules exists, and before the app build so the
  # addon is present when the server starts.
  run_as "npm rebuild better-sqlite3 --build-from-source"
  run_as "npm run build"                       # server + client
  run_as "npm run build --workspace mcp-server" || warn "mcp-server build skipped/failed (optional)"
  ok "Build complete"
}

# ── 4. Durable data directory (SQLite enquiry store) ─────────────────────────
prepare_data_dir() {
  log "Preparing durable data directory: $DATA_DIR"
  mkdir -p "$DATA_DIR"
  chown -R "$APP_USER":"$APP_USER" "$DATA_DIR"
  ok "Data dir ready (set ENQUIRY_DB_PATH to a file inside it)"
}

# ── 5. server/.env from example (never overwrite) ─────────────────────────────
prepare_env() {
  local env_file="$REPO_ROOT/server/.env"
  local example="$REPO_ROOT/deploy/server.env.example"
  if [[ -f "$env_file" ]]; then
    ok "server/.env already exists — left untouched"
    return
  fi
  if [[ -f "$example" ]]; then
    cp "$example" "$env_file"
    chown "$APP_USER":"$APP_USER" "$env_file"
    warn "Created server/.env from deploy/server.env.example — EDIT IT (CORS_ORIGIN, ENQUIRY_DB_PATH)"
  else
    warn "deploy/server.env.example missing; create server/.env manually"
  fi

  # MCP server env (Spec 17) — only needed if you expose the MCP HTTP transport.
  local mcp_env="$REPO_ROOT/mcp-server/.env"
  local mcp_example="$REPO_ROOT/deploy/mcp.env.example"
  if [[ -f "$mcp_env" ]]; then
    ok "mcp-server/.env already exists — left untouched"
  elif [[ -f "$mcp_example" ]]; then
    cp "$mcp_example" "$mcp_env"
    chown "$APP_USER":"$APP_USER" "$mcp_env"
    warn "Created mcp-server/.env from deploy/mcp.env.example — EDIT IT (MCP_ALLOWED_HOSTS/ORIGINS)"
  fi
}

next_steps() {
  cat <<EOF

$(printf '\033[1;32m✓ Base setup complete.\033[0m')

Next steps (see deploy/README.md for detail):

  1. Edit server/.env  → NODE_ENV=production, CORS_ORIGIN=https://<domain>,
                          ENQUIRY_DB_PATH=$DATA_DIR/enquiries.db
  2. Install services : sudo bash deploy/install-services.sh --app-user $APP_USER
                        # add --with-mcp to also expose the MCP HTTP transport
                        # (edit mcp-server/.env first: MCP_ALLOWED_HOSTS/ORIGINS)
  3. Configure Nginx  : copy deploy/nginx.conf.example → /etc/nginx/sites-available/eduagent
                        set your domain, enable it, then:
                          sudo ln -s /etc/nginx/sites-available/eduagent /etc/nginx/sites-enabled/
                          sudo nginx -t && sudo systemctl reload nginx
  4. TLS (Let's Encrypt):
                          sudo certbot --nginx -d <domain>
  5. Verify           : curl http://127.0.0.1:4000/api/health   # → {"status":"ok"}

EOF
}

main() {
  require_root
  log "EduAgent Connect setup — repo: $REPO_ROOT | app user: $APP_USER | Node: >=${NODE_MAJOR}"
  install_system_packages
  install_node
  prepare_data_dir
  prepare_env
  build_app
  next_steps
}

main "$@"
