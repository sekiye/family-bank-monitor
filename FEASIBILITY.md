# Free GitHub-hosted runner feasibility preflight (v1.3)

Run only on demand. This workflow checks **public, unauthenticated information pages** of Rakuten Bank, and the approximate egress country from two third-party geo-IP providers. It starts Chromium with Playwright for a public informational page. It does not test the authenticated Money Support application, log in, send credentials, access cookies or balances, capture screenshots, or persist bank page content. The IP-location providers will see the runner's public IP; the workflow prints only country codes.

## Reading the result

- `EGRESS_COUNTRY=US` or other non-`JP`: the measured origin is outside Japan, so do **not** attempt to use the authenticated service on that runner.
- `EGRESS_COUNTRY=JP`: only means this particular job may be originating from Japan; the free standard runner cannot be pinned to Japan. **Not** authorization to use the service.
- `EGRESS_COUNTRY=UNKNOWN` or `CONFLICT`: insufficient proof; do not proceed.
- `MONEY_SUPPORT_PUBLIC_RESULT=REACHABLE`: the public *information page* was reachable, **not** the authenticated service.
- `CHROMIUM_LAUNCH=OK` and `PUBLIC_MONEY_BROWSER_NAVIGATION=REACHABLE`: Playwright can navigate the public information page; does not show that automated login works.

## Constraints

- Rakuten Bank's current Money Support terms, Article 2, restrict use of the service to Japan: https://www.rakuten-bank.co.jp/rules/money.html
- GitHub's normal hosted runners are geographically dynamic: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- Standard runners on public repositories are free: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job

**Do not attach passwords, Cookie headers, browser profiles, OTPs, banking HTML or balance files to Actions.** This preflight is not an endorsement of automation under the terms. Do not interpret a one-time public probe as permission for automated authenticated access.
