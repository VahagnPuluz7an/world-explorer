#!/bin/sh
# Build and publish to GitHub Pages. Only changed files are pushed (tiles are uploaded once).
set -e
cd "$(dirname "$0")"
BASE_PATH=/world-explorer/ npx vite build
touch dist/.nojekyll
REPO=https://github.com/VahagnPuluz7an/world-explorer.git
if [ ! -d .deploy/.git ]; then
  mkdir -p .deploy && git -C .deploy init -q -b gh-pages && git -C .deploy remote add origin "$REPO"
  for i in 1 2 3 4 5; do git -C .deploy -c http.version=HTTP/1.1 fetch -q --depth 1 origin gh-pages && break || sleep 5; done
  git -C .deploy reset -q --hard origin/gh-pages
fi
cd .deploy
[ "$(git rev-parse --show-toplevel)" = "$(pwd -P)" ] || { echo "deploy dir is not its own repo"; exit 1; }
rsync -a --delete --exclude .git ../dist/ ./
git add -A
git -c user.name="VahagnPuluz7an" -c user.email="VahagnPuluz7an@users.noreply.github.com" commit -qm "Deploy site" || echo "nothing to deploy"
for i in 1 2 3; do git -c http.version=HTTP/1.1 push -q origin gh-pages && break || sleep 5; done
