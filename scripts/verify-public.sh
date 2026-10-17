#!/usr/bin/env bash
# Safe preflight only; never connects to banks or publishes to GitHub.
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/public-audit.mjs
if [[ -n "$(git ls-files 'private/**' 'private/*' '.env' '.env.*')" ]]; then
  echo 'PUBLIC_VERIFY_OK=0 PRIVATE_TRACKED=1' >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'PUBLIC_VERIFY_OK=0 WORKTREE_NOT_CLEAN=1' >&2
  exit 1
fi
printf 'PRIVATE_TRACKED=0\nWORKTREE_CLEAN=1\nPUBLIC_VERIFY_OK=1\n'
