/**
 * Platform Detection Utilities
 * Centralized environment detection for Termux (Android) support
 */

import os from 'node:os';

export type PlatformName = 'windows' | 'macos' | 'linux' | 'android' | 'unknown';

export interface PlatformInfo {
  name: PlatformName;
  isTermux: boolean;
  isAndroid: boolean;
  arch: string;
  homeDir: string;
  binDir: string;
  hasChromium: boolean | null;
  supportsUnicode: boolean;
  terminalWidth: number;
}

let cachedInfo: PlatformInfo | null = null;

export function isTermux(): boolean {
  return (
    process.env.TERMUX_VERSION !== undefined ||
    (typeof process.env.PREFIX === 'string' && process.env.PREFIX.includes('com.termux')) ||
    process.env.TERMUX_APP__PACKAGE_NAME !== undefined
  );
}

export function isAndroid(): boolean {
  if (process.platform === 'android') {
    return true;
  }
  return process.platform === 'linux' && isTermux();
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function getBinDir(): string {
  if (isTermux() && typeof process.env.PREFIX === 'string') {
    return `${process.env.PREFIX}/bin`;
  }
  return '/usr/local/bin';
}

export function supportsUnicode(): boolean {
  const lang = process.env.LANG ?? process.env.LC_ALL ?? '';
  if (/utf-?8/i.test(lang)) {
    return true;
  }
  if (process.env.TERM_PROGRAM === 'Apple_Terminal') {
    return false;
  }
  return Boolean(process.stdout.isTTY);
}

export function getTerminalWidth(fallback = 80): number {
  const width = process.stdout.columns;
  if (typeof width === 'number' && width > 0) {
    return width;
  }
  return fallback;
}

export function getPlatformInfo(): PlatformInfo {
  if (cachedInfo) {
    return cachedInfo;
  }

  const termux = isTermux();
  const android = isAndroid();

  let name: PlatformName = 'unknown';
  if (isWindows()) {
    name = 'windows';
  } else if (process.platform === 'darwin') {
    name = 'macos';
  } else if (android) {
    name = 'android';
  } else if (process.platform === 'linux') {
    name = 'linux';
  }

  cachedInfo = {
    name,
    isTermux: termux,
    isAndroid: android,
    arch: process.arch,
    homeDir: os.homedir(),
    binDir: getBinDir(),
    hasChromium: null,
    supportsUnicode: supportsUnicode(),
    terminalWidth: getTerminalWidth(),
  };

  return cachedInfo;
}

export function getPlatformLabel(): string {
  const info = getPlatformInfo();
  if (info.isTermux) {
    return `Termux (${info.arch})`;
  }
  if (info.name === 'linux') {
    return `Linux (${info.arch})`;
  }
  return `${info.name} (${info.arch})`;
}

export function resetPlatformCache(): void {
  cachedInfo = null;
}
