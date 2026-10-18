# Public-only Chrome network diagnosis v1.6

This changes the **manual-only** GitHub Actions `feasibility-check.yml` to diagnose why Chromium cannot reach a Rakuten Bank *public* information page when Node.js fetch can.

- Uses Playwright Chromium Headless Shell installed with `--only-shell`.
- Checks `example.com`, Rakuten Bank's public homepage, and its public Money Support information page.
- Separately compares strict request routing, no routing (JavaScript disabled), and Chromium with HTTP/2 disabled. The latter experiments only run if necessary.
- Logs a strict allowlist of Chromium's network error codes, and only whether proxy environment variables are present. No proxy URLs or credentials are logged.
- Does not attempt login or navigate directly to private, authenticated Money Support pages.
- No cookies are imported, no bank credentials, no screenshots, no raw HTML or headers, no state files.
- The "no route" test permits normal page subresource fetching, but runs in a fresh unauthenticated context with JavaScript disabled. Only public URLs are intentionally navigated.
- The browser's SSL certificate checks remain enabled.
- A connection success is **not** a permission-to-automate determination or a confirmation that account data can be accessed.
- GitHub-hosted runners' geographic origin is not guaranteed to be in Japan; the banking service's domestic-use restrictions remain unresolved.

## Key fields

`V16_RAKUTEN_HOME_STRICT_*`, `V16_RAKUTEN_MONEY_STRICT_*`, `V16_RAKUTEN_MONEY_NATIVE_*`, `V16_RAKUTEN_MONEY_NO_HTTP2_*`, `V16_DIAGNOSTIC_RESULT`.

A `*_NET_CODE` value is only an enumerated Chromium error code, never an unfiltered error string. `*_ERROR_KIND` is also a fixed code.

**Do not** put real credentials, HTML captures, family account information, browser session files or private configuration in the public repository.
