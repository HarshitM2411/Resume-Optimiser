#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

cat > "$WORKDIR/minimal.tex" <<'EOF'
\documentclass{article}
\begin{document}
Hello, Tectonic!
\end{document}
EOF

docker compose -f "$INFRA_DIR/docker-compose.yml" run --rm \
  -v "$WORKDIR:/work" \
  --workdir /work \
  tectonic \
  /work/minimal.tex --outdir /work

if [[ ! -f "$WORKDIR/minimal.pdf" ]]; then
  echo "Expected PDF was not produced." >&2
  exit 1
fi

if ! head -c 5 "$WORKDIR/minimal.pdf" | grep -q '%PDF-'; then
  echo "Output file is not a valid PDF." >&2
  exit 1
fi

echo "Tectonic smoke test passed."
