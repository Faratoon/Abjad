#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
REPO="${1:-abjad}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI ma jiro. Rakib: https://cli.github.com/" >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "Lama xirmin GitHub. Ku bilow: gh auth login" >&2
  exit 1
fi

USER="$(gh api user --jq .login)"
if ! git remote get-url origin >/dev/null 2>&1; then
  if gh repo view "$USER/$REPO" >/dev/null 2>&1; then
    git remote add origin "https://github.com/$USER/$REPO.git"
  else
    gh repo create "$USER/$REPO" --public --source=. --remote=origin \
      --description "ABJAD - Arabic learning PWA (English + Somali)"
  fi
fi

git push -u origin main

if ! gh api "repos/$USER/$REPO/pages" >/dev/null 2>&1; then
  gh api -X POST "repos/$USER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || true
fi

echo
echo "Repo:  https://github.com/$USER/$REPO"
echo "Pages: https://$USER.github.io/$REPO/"
