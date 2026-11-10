/**
 * The single logging entry point for the app. Debug output is enabled in
 * dev builds, or in production when the page URL contains `?debug=1`.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[craftalator]';

function debugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').has('debug');
  } catch {
    return false;
  }
}

const DEBUG = debugEnabled();

export interface Logger {
  debug(message: string, ...data: unknown[]): void;
  info(message: string, ...data: unknown[]): void;
  warn(message: string, ...data: unknown[]): void;
  error(message: string, ...data: unknown[]): void;
}

export function createLogger(module: string): Logger {
  const emit = (level: Level, message: string, data: unknown[]): void => {
    if (level === 'debug' && !DEBUG) return;
    console[level](`${PREFIX} [${module}] ${message}`, ...data);
  };
  return {
    debug: (m, ...d) => emit('debug', m, d),
    info: (m, ...d) => emit('info', m, d),
    warn: (m, ...d) => emit('warn', m, d),
    error: (m, ...d) => emit('error', m, d),
  };
}
