#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Push ApplyPilot to GitHub.
#
#   1. create an EMPTY repo on github.com (no README, no .gitignore)
#   2. run:  ./scripts/push-github.sh git@github.com:<you>/applypilot.git
#      or:   ./scripts/push-github.sh https://github.com/<you>/applypilot.git
#
# The script refuses to push if any secret file (like .env) became tracked.
# ---------------------------------------------------------------------------
set -euo pipefail

REPO="${1:-}"
BRANCH="${2:-main}"

if [ -z "$REPO" ]; then
  echo "usage: $0 <repo-url> [branch]" >&2
  echo "example: $0 git@github.com:saad/applypilot.git" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

# --- secret safety net ------------------------------------------------------
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo "REFUSING TO PUSH: .env is tracked by git. Run: git rm --cached .env" >&2
  exit 1
fi

if git status --porcelain | grep -q .; then
  echo "Note: you have uncommitted changes — pushing committed history only."
fi

git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"

echo "Pushing $(git rev-list --count HEAD) commits to $REPO ($BRANCH)…"
git push -u origin "$BRANCH"
echo "Done → $(git remote get-url origin)"
