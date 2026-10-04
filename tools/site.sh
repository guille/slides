#!/usr/bin/env bash
# Assemble the GitHub Pages site into _site/: the vanilla deck at the root,
# with its lib/ symlink resolved into a real copy of the library.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf _site
cp -rL demos/vanilla _site
rm -f _site/lib/package.json
