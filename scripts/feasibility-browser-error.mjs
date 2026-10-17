// Diagnostic categories only: intentionally never print arbitrary exception text
// into logs of a public GitHub repository.
export function classifyBrowserError(error, phase) {
  const message = String(error?.message || '');
  if (/Executable doesn.t exist|browserType\.launch:.*Executable|Please run the following command to download/i.test(message)) return 'BROWSER_BINARY_MISSING';
  if (/Cannot find package ['"]playwright|Cannot find module ['"]playwright|ERR_MODULE_NOT_FOUND/i.test(message)) return 'PLAYWRIGHT_PACKAGE_MISSING';
  if (/error while loading shared libraries|Host system is missing dependencies|libnss3|libatk|libX11/i.test(message)) return 'OS_LIBRARY_MISSING';
  if (/sandbox|No usable sandbox/i.test(message)) return 'SANDBOX_FAILURE';
  if (error?.name === 'TimeoutError' || /Timeout.*exceeded/i.test(message)) return 'TIMEOUT';
  if (/net::ERR_|NS_ERROR_|Navigation to .* interrupted/i.test(message)) return 'NETWORK_OR_NAVIGATION';
  if (/Target page, context or browser has been closed|Browser closed|Failed to launch/i.test(message)) return 'BROWSER_EXITED';
  if (phase === 'IMPORT') return 'PLAYWRIGHT_IMPORT_FAILED';
  if (phase === 'LAUNCH') return 'CHROMIUM_LAUNCH_FAILED';
  if (phase === 'PUBLIC_PAGE') return 'PUBLIC_PAGE_NAVIGATION_FAILED';
  return 'UNCLASSIFIED';
}

export function safeDiagnosticHint(kind) {
  const hints = {
    BROWSER_BINARY_MISSING: 'CHECK_PLAYWRIGHT_INSTALL_MODE',
    PLAYWRIGHT_PACKAGE_MISSING: 'CHECK_NPM_INSTALL',
    OS_LIBRARY_MISSING: 'CHECK_LINUX_DEPS',
    SANDBOX_FAILURE: 'CHECK_RUNNER_SANDBOX',
    TIMEOUT: 'CHECK_NETWORK_TIMEOUT',
    NETWORK_OR_NAVIGATION: 'CHECK_PUBLIC_HTTPS_OR_REDIRECT',
    BROWSER_EXITED: 'CHECK_BROWSER_PROCESS',
    PLAYWRIGHT_IMPORT_FAILED: 'CHECK_PACKAGE_IMPORT',
    CHROMIUM_LAUNCH_FAILED: 'CHECK_BROWSER_LAUNCH_LOG',
    PUBLIC_PAGE_NAVIGATION_FAILED: 'CHECK_PUBLIC_PAGE',
    UNCLASSIFIED: 'INSPECT_SAFE_DIAGNOSTIC'
  };
  return hints[kind] || hints.UNCLASSIFIED;
}
