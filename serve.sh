#!/usr/bin/env bash
# ABJAD local launcher — idempotent static server + deep links.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${ABJAD_PORT:-8090}"
URL="http://localhost:${PORT}"
LOG="${TMPDIR:-/tmp}/abjad-server.log"

if ! curl -sf -o /dev/null "${URL}/"; then
  cd "$ROOT"
  setsid nohup python3 -m http.server "$PORT" --bind 0.0.0.0 >"$LOG" 2>&1 < /dev/null &
  for _ in $(seq 1 40); do
    curl -sf -o /dev/null "${URL}/" && break
    sleep 0.15
  done
  echo "ABJAD: server started (log: $LOG)"
else
  echo "ABJAD: already running"
fi

cat <<LINKS

  Home        ${URL}/
  Learn       ${URL}/#/learn
  Alphabet    ${URL}/#/lesson/letters-1/0
  Writing     ${URL}/#/lesson/letters-1/2
  Dialogue    ${URL}/#/lesson/food/3
  Link hub    ${URL}/links.html

LINKS

if [[ "${1:-}" == "--open" ]]; then
  powershell.exe -NoProfile -Command "Start-Process '${URL}/'" >/dev/null 2>&1 || true
fi
