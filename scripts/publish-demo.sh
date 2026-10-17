#!/usr/bin/env bash
# One-time publish, DEMO ONLY. Run only after explicit review/approval of public visibility.
set -euo pipefail
cd "$(dirname "$0")/.."

repo_name="${1:-family-bank-monitor}"
if [[ ! "$repo_name" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo 'PUBLISH_READY=0 REASON=INVALID_REPOSITORY_NAME' >&2
  exit 1
fi

if [[ "$(git branch --show-current)" != main ]]; then
  echo 'PUBLISH_READY=0 REASON=NOT_ON_MAIN' >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo 'PUBLISH_READY=0 REASON=WORKTREE_NOT_CLEAN' >&2
  exit 1
fi

if [[ -n "$(git ls-files 'private/**' 'private/*' '.env' '.env.*')" ]]; then
  echo 'PUBLISH_READY=0 REASON=PRIVATE_FILES_TRACKED' >&2
  exit 1
fi

if [[ -n "$(git remote)" ]]; then
  echo 'PUBLISH_READY=0 REASON=GIT_REMOTE_ALREADY_CONFIGURED' >&2
  exit 1
fi

node scripts/public-audit.mjs
npm test
if ! command -v gh >/dev/null 2>&1 || ! gh auth status >/dev/null 2>&1; then
  echo 'PUBLISH_READY=0 REASON=GITHUB_CLI_LOGIN_REQUIRED' >&2
  exit 1
fi

printf 'PUBLISH_READY=1 VISIBILITY=PUBLIC REPOSITORY=%s\n' "$repo_name"
echo 'PUBLISH_NOTICE=The next command creates a public GitHub repo and pushes the audited demo commit.'

gh repo create "$repo_name" --public --source=. --remote=origin --push
printf 'PUBLISH_OK=1\n'
# Print safe repo URL, but do not print tokens or GitHub auth status details.
gh repo view --json url --jq '.url'
