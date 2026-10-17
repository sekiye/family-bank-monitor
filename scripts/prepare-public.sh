#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .github/workflows/daily-check.yml || ! -f config/example.plan.json || ! -f private/plan.draft.json ]]; then
  echo 'PUBLIC_PREPARE_OK=0 REASON=WRONG_PROJECT_OR_MISSING_FILES' >&2
  exit 1
fi

if [[ -e .git ]]; then
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    echo 'PUBLIC_PREPARE_OK=0 REASON=EXISTING_HISTORY_NEEDS_MANUAL_REVIEW' >&2
    exit 1
  fi
else
  git init -b main >/dev/null
fi

# Explicit allowlist. Never run "git add ." when a family's bank data is nearby.
git add -- .github/workflows/daily-check.yml .gitignore README.md PUBLIC_RELEASE.md \
  config/example.plan.json fixtures/demo-balances.json package.json src/ tests/ scripts/
node scripts/public-audit.mjs

# Generic commit identity prevents publishing the user's private email address.
git -c user.name='Bank Monitor Demo' \
  -c user.email='bank-monitor-demo@users.noreply.github.com' \
  commit -m 'Initial public demo monitor' --quiet

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  ready=1
else
  ready=0
fi
printf 'GIT_COMMIT_CREATED=1\nGH_AUTH_READY=%s\nPUBLIC_PREPARE_OK=1\n' "$ready"
