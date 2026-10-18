# v1.9 public connectivity comparison

The v1.8 HTTP comparison found HTTP 200 from Node fetch, Node https and curl, while earlier v1.6/v1.7 found Chromium failures (and, in v1.7, curl timeouts). Those workflows ran at different times and potentially with different outbound addresses. v1.7 curl also used the default curl request headers, whereas v1.8 specified a User-Agent and Accept header.

This workflow tests on **one runner at one moment**:

* Control navigation to example.com in fresh headless Chromium.
* A fixed public Rakuten Money Support information URL (`/money/`) via Node fetch, curl defaults, curl with the same headers used in v1.8, and Chromium.

It never logs in, sends account credentials, changes bank data, bypasses certificate checks, saves HTML, screenshots, browser cookies, traces or authentication state. All logged results are closed enumerations or HTTP status codes. Run it manually via `workflow_dispatch`. If Chromium cannot obtain HTTP 200, the workflow returns failure after printing the comparison.

A single successful public navigation **does not** demonstrate that the authenticated Money Support service is usable from GitHub-hosted runners, that user account MFA can be automated, that data is fresh, that banking terms allow the use, or that all future GitHub-hosted runners will have the same network behavior.

This is a final, narrow public access check. If Chrome still fails but fetch/curl succeeds, do not keep adjusting browser identity to evade bank controls; favor a domestic execution environment or an officially supported data access channel. Do not put real credentials or family financial data in this public repository.
