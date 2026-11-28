import type { TFunction } from 'i18next';

/**
 * Strips ANSI escape sequences and Playwright Call log telemetry so users never see raw traces.
 */
function stripTechnicalNoise(raw: string): string {
  return raw
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(/\r?\nCall log:/i)[0]
    .trim();
}

/**
 * Translates raw Rust/Node/Playwright errors into clear, actionable user-facing messages.
 */
export function formatUserFriendlyError(err: unknown, t: TFunction): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const cleaned = stripTechnicalNoise(raw);

  if (!cleaned) {
    return t('applyErrors.fallback');
  }

  if (/ERR_NAME_NOT_RESOLVED|domain could not be resolved|ENOTFOUND/i.test(cleaned)) {
    return t('applyErrors.dnsFailed');
  }
  if (/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|connection.*refused/i.test(cleaned)) {
    return t('applyErrors.connectionRefused');
  }
  if (/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|No active internet/i.test(cleaned)) {
    return t('applyErrors.noInternet');
  }
  if (/ERR_TIMED_OUT|Timeout\s+\d+ms\s+exceeded|took too long to load|timed out/i.test(cleaned)) {
    return t('applyErrors.timeout');
  }
  if (/Target page, context or browser has been closed|browser window was closed/i.test(cleaned)) {
    return t('applyErrors.browserClosed');
  }
  if (/No system browser|Chrome\/Edge/i.test(cleaned)) {
    return t('applyErrors.noBrowser');
  }
  if (/Max concurrent browser contexts/i.test(cleaned)) {
    return t('applyErrors.maxContexts');
  }
  if (/Form session expired|was refilled/i.test(cleaned)) {
    return t('applyErrors.sessionExpired');
  }
  if (/No active browser session/i.test(cleaned)) {
    return t('applyErrors.noActiveSession');
  }
  if (/already submitted/i.test(cleaned)) {
    return t('applyErrors.alreadySubmitted');
  }
  if (/missing required fields/i.test(cleaned)) {
    return t('applyErrors.missingRequired');
  }
  if (/Engine Unavailable|Failed to spawn node|sidecar.*not running/i.test(cleaned)) {
    return t('applyErrors.engineUnavailable');
  }
  if (/Invalid parameters|Required/i.test(cleaned)) {
    return t('applyErrors.invalidParams');
  }

  return cleaned;
}

/**
 * Translates an application's stopReason + stopMessage into a clean user-facing explanation.
 */
export function formatStopReason(
  stopReason: string | undefined,
  stopMessage: string | undefined,
  t: TFunction
): string {
  if (stopReason === 'captcha_detected') {
    return t('queue.stopReasons.captcha_detected');
  }
  if (stopReason === 'login_wall') {
    return t('queue.stopReasons.login_wall');
  }
  if (stopReason === 'unknown_required_field') {
    return t('queue.stopReasons.unknown_required_field');
  }
  if (stopMessage) {
    const friendly = formatUserFriendlyError(stopMessage, t);
    if (friendly !== stripTechnicalNoise(stopMessage)) {
      return friendly;
    }
  }
  if (stopReason === 'unrecognized_page') {
    return t('queue.stopReasons.unrecognized_page');
  }
  return stopMessage ? stripTechnicalNoise(stopMessage) : t('queue.stopReasons.default');
}
