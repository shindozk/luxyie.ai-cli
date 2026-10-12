import {
  getBinDir,
  getPlatformLabel,
  getPlatformInfo,
  isAndroid,
  isTermux,
  isWindows,
  resetPlatformCache,
  supportsUnicode,
  getTerminalWidth,
} from '../../src/utils/platform.js';

const TERMUX_ENV = ['TERMUX_VERSION', 'PREFIX', 'TERMUX_APP__PACKAGE_NAME'];

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const original = new Map<string, string | undefined>();
  for (const key of TERMUX_ENV) {
    original.set(key, process.env[key]);
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  resetPlatformCache();
  try {
    fn();
  } finally {
    for (const [key, value] of original) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    resetPlatformCache();
  }
}

describe('platform detection', () => {
  afterEach(() => {
    resetPlatformCache();
  });

  it('does not report Termux without any Termux environment variable', () => {
    withEnv({}, () => {
      expect(isTermux()).toBe(false);
      expect(isAndroid()).toBe(false);
    });
  });

  it('detects Termux via TERMUX_VERSION', () => {
    withEnv({ TERMUX_VERSION: '0.119.0' }, () => {
      expect(isTermux()).toBe(true);
    });
  });

  it('detects Termux via the com.termux PREFIX', () => {
    withEnv({ PREFIX: '/data/data/com.termux/files/usr' }, () => {
      expect(isTermux()).toBe(true);
    });
  });

  it('treats Termux on Linux as Android', () => {
    withEnv({ TERMUX_VERSION: '0.119.0' }, () => {
      expect(isAndroid()).toBe(process.platform === 'android' || process.platform === 'linux');
    });
  });

  it('reports Termux in the platform label', () => {
    withEnv({ TERMUX_VERSION: '0.119.0', PREFIX: '/data/data/com.termux/files/usr' }, () => {
      expect(getPlatformLabel()).toContain('Termux');
    });
  });

  it('resolves the Termux bin directory from PREFIX', () => {
    withEnv({ TERMUX_VERSION: '0.119.0', PREFIX: '/data/data/com.termux/files/usr' }, () => {
      expect(getBinDir()).toBe('/data/data/com.termux/files/usr/bin');
    });
  });

  it('caches platform info until reset', () => {
    withEnv({ TERMUX_VERSION: '0.119.0' }, () => {
      const first = getPlatformInfo();
      expect(first.isTermux).toBe(true);
      expect(getPlatformInfo()).toBe(first);

      resetPlatformCache();
      withEnv({}, () => {
        expect(getPlatformInfo().isTermux).toBe(false);
      });
    });
  });

  it('exposes stable terminal helpers', () => {
    expect(getTerminalWidth(80)).toBeGreaterThan(0);
    expect(typeof supportsUnicode()).toBe('boolean');
    expect(typeof isWindows()).toBe('boolean');
  });
});
