#!/usr/bin/env bash
# Type-check the library and fail if its committed lib/types/ is stale.
# Takes an optional copy of lib/ to check instead (the pre-commit hook passes the index).
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
lib=${1:-$root/lib}

out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT

"$root/lib/node_modules/.bin/tsc" -p "$lib" --declarationDir "$out"
if ! diff -ru "$lib/types" "$out"; then
  echo "lib/types/ is out of date: run 'mise run types' and commit the result" >&2
  exit 1
fi
