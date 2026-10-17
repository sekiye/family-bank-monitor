# Public demo release guide

The public GitHub workflow runs **only a synthetic balance demo** with no actual bank connection or secrets. It does not verify any transfer or real balance. In particular, the GitHub-hosted runner is **not** assumed to satisfy Rakuten Money Support's Japan-only use restriction.

## Local fish commands

Preparation (creates the local Git repository, audits the explicitly allowlisted files in the Git index, and commits the demo code; does not upload anything):

```fish
cd ~/Projects/bank-monitor-starter; and bash scripts/prepare-public.sh
```

Review what would be uploaded:

```fish
cd ~/Projects/bank-monitor-starter; and git ls-tree -r --name-only HEAD; and git status --short
```

Only after reviewing the file list and deciding to make this demo repository publicly accessible:

```fish
cd ~/Projects/bank-monitor-starter; and gh repo create family-bank-monitor --public --source=. --remote=origin --push
```

If GitHub CLI is not logged in, authenticate separately with `gh auth login` (never paste tokens into chat). If the repository name is already taken, choose another name or follow the existing-repository migration procedure.

**Do not upload `bank-monitor-starter.zip`, `private/`, bank credentials, screenshots, or saved browser sessions to the public repository.** Do not paste `gh auth` token output, real balances, or personal account names into chat.

Scheduled GitHub runs are not guaranteed to happen exactly on time, and public repo schedules can be disabled after prolonged repository inactivity. Real financial monitoring requires independent liveness monitoring and a verified compliant execution environment.
