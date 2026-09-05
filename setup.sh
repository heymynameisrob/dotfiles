#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

printf 'setup.sh is retained for compatibility. Running dot init.\n'
exec "$SCRIPT_DIR/dot" init
