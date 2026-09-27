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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-user) APP_USER="$2"; shift 2 ;;
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

echo "==> Reloading systemd and enabling services"
systemctl daemon-reload
systemctl enable --now eduagent-server.service
systemctl enable --now eduagent-client.service

echo "==> Status"
systemctl --no-pager --lines=0 status eduagent-server.service || true
systemctl --no-pager --lines=0 status eduagent-client.service || true

cat <<EOF

✓ Services installed and started.
  Logs:   journalctl -u eduagent-server -f
          journalctl -u eduagent-client -f
  Health: curl http://127.0.0.1:4000/api/health
EOF
