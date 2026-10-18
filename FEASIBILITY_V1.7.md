# Public-only runner investigation v1.7

This is a supplemental, **unauthenticated** transport diagnostic for existing GitHub Actions feasibility checks. It does not perform login, save cookies, scrape balances, or attempt to bypass access restrictions.

## Findings from v1.6

- The Chromium launcher and `example.com` are working.
- The bank's public pages did not respond before the 12-second deadline.
- The logged `ERR_ABORTED` can be a result of cancelling navigation on timeout; it is not proof of server-side blocking.
- A real logic bug caused `FAIL_CONTROL`: the `outcome` helper referenced `.status` but the probe writes `.http`. This version fixes it.

## New diagnostics

`V17_*` reports the furthest stage reached with standard curl on fixed public HTTPS URLs: DNS_RESOLVED, TCP_CONNECTED, TLS_ESTABLISHED, HTTP_RECEIVED. Run as a separate step with `if: always()`, even if the Chromium check fails. Do not equate curl success with Chromium success.

## Security

Logs contain only fixed labels, numeric exit codes, phase categories, and public HTTP status codes. No response bodies, IP addresses, cookies, HTML, credentials, or personal financial data are exported.

## Apply

Run `node scripts/apply-v17.mjs` after extracting the ZIP to the project root. Then `node --test tests/feasibility-transport-v17.test.mjs` and explicitly stage only the five new files plus the two patched existing files.
