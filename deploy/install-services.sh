#!/usr/bin/env bash
#
# Install & enable the EduAgent Connect systemd services (client + server).
# Substitutes the repo path and app user into the unit templates, installs them
# to /etc/systemd/system, then enables and starts them. Idempotent.
#
# Usage (from the repo root, on the instance):
#   sudo bash deploy/install-services.sh [--app-user ubuntu]
#
set -euo pipefail

APP_USER="${APP_USER:-${SUDO_USER:-ubuntu}}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPM_BIN="$(command -v npm || echo /usr/bin/npm)"
WITH_MCP=0   # Install the MCP HTTP server unit too (Spec 17). Opt-in.

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-user) APP_USER="$2"; shift 2 ;;
    --with-mcp) WITH_MCP=1; shift ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run with sudo: sudo bash deploy/install-services.sh" >&2
  exit 1
fi

install_unit() {
  local name="$1"
  local src="$REPO_ROOT/deploy/systemd/$name"
  local dest="/etc/systemd/system/$name"
  echo "==> Installing $name"
  sed \
    -e "s#%REPO_ROOT%#$REPO_ROOT#g" \
    -e "s#%APP_USER%#$APP_USER#g" \
    -e "s#/usr/bin/npm#$NPM_BIN#g" \
    "$src" > "$dest"
}

install_unit eduagent-server.service
install_unit eduagent-client.service
if [[ "$WITH_MCP" -eq 1 ]]; then
  install_unit eduagent-mcp.service
fi

echo "==> Reloading systemd and enabling services"
systemctl daemon-reload
systemctl enable --now eduagent-server.service
systemctl enable --now eduagent-client.service
if [[ "$WITH_MCP" -eq 1 ]]; then
  systemctl enable --now eduagent-mcp.service
fi

echo "==> Status"
systemctl --no-pager --lines=0 status eduagent-server.service || true
systemctl --no-pager --lines=0 status eduagent-client.service || true
if [[ "$WITH_MCP" -eq 1 ]]; then
  systemctl --no-pager --lines=0 status eduagent-mcp.service || true
fi

cat <<EOF

✓ Services installed and started.
  Logs:   journalctl -u eduagent-server -f
          journalctl -u eduagent-client -f
$([[ "$WITH_MCP" -eq 1 ]] && echo '          journalctl -u eduagent-mcp -f')
  Health: curl http://127.0.0.1:4000/api/health
$([[ "$WITH_MCP" -eq 1 ]] && echo '          curl http://127.0.0.1:4100/healthz')
EOF
