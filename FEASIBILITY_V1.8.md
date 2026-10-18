# v1.8 – Public HTTP client comparison

This is a **manual-only, unauthenticated, public-web-page diagnostic**. It does not attempt to connect to the Rakuten Money Support user dashboard, use account credentials, reuse cookies, or access family banking data.

Earlier workflows showed that Node `fetch()` returned HTTP 200 while curl and Chromium timed out. HTTP 200 alone does not prove an HTML document body was successfully received.

v1.8 compares three standard HTTP clients on the same GitHub-hosted runner:

- Node `fetch()`: HTTP headers, HTML content type, and an in-memory capped prefix (never printed).
- Node `https`: IPv4 HTTP/1.1 with certificate verification enabled, capped HTML prefix (never printed).
- curl: IPv4 HTTP/1.1 with matched basic Accept and User-Agent headers. Reports only phase and numeric code.

Fixed allowed URLs: example.com and two public pages on www.rakuten-bank.co.jp.
All network calls are read-only GETs and have an 11-second deadline. Responses, tokens, cookies, headers, IPs, and URLs are not printed. No artifacts or external uploads are produced.

## Interpretation

- FETCH_ONLY_HTTP: the native fetch mechanism got HTTP headers; inspect FETCH_READ/FETCH_PREFIX to see whether a document prefix was actually retrieved.
- BOTH_NODE_HTTP_ONLY: Node native fetch and native HTTPS succeeded but curl did not; per-client networking/TLS behavior is a likely factor.
- ALL_THREE_HTTP: all three clients got a 2xx–3xx response; the problem is likely related to Chromium or varies over time.

**None** of these proves automated login is allowed, supported, or reliable. The standard free runner cannot be pinned to Japan. Treat it as a diagnostic only.
