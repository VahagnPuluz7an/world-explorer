#!/bin/sh
# Build and publish to GitHub Pages (gh-pages branch). Needs .env and public/tiles locally.
set -e
cd "$(dirname "$0")"
BASE_PATH=/world-explorer/ npx vite build
touch dist/.nojekyll
cd dist && rm -rf .git && git init -q -b gh-pages && git add -A && git commit -qm "Deploy site" \
  && git push -f https://github.com/VahagnPuluz7an/world-explorer.git gh-pages && rm -rf .git
