/**
 * Abort Handler Module
 * Manages ESC and Ctrl+C keyboard handlers for graceful interruption
 * Used across chat and other interactive features
 */

export interface AbortHandlerOptions {
  onAbort?: () => void;
  onExit?: () => void;
  enabled?: boolean;
}

export interface AbortHandlerResult {
  controller: AbortController;
  cleanup: () => void;
  isActive: () => boolean;
  abort: () => void;
  setup: () => void;
}

/**
 * Create an abort controller with ESC/Ctrl+C handlers
 * Returns controller, cleanup function, and status checkers
 */
export function createAbortHandler(
  options: AbortHandlerOptions = {}
): AbortHandlerResult {
  const {
    onAbort = () => {},
    onExit = () => process.exit(0),
    enabled = true,
  } = options;

  const controller = new AbortController();
  let isActive = false;
  let handler: ((data: Buffer) => void) | null = null;

  const setup = (): void => {
    if (!enabled || !process.stdin.isTTY || isActive) return;

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    handler = (data: Buffer) => {
      for (let i = 0; i < data.length; i++) {
        const byte = data[i];

        // ESC key (27) - abort current operation
        if (byte === 27) {
          controller.abort();
          onAbort();
          return;
        }

        // Ctrl+C (3) - exit application
        if (byte === 3) {
          onExit();
        }
      }
    };

    process.stdin.on('data', handler);
    isActive = true;
  };

  const cleanup = (): void => {
    if (!isActive || !process.stdin.isTTY) return;

    if (handler) {
      process.stdin.removeListener('data', handler);
    }

    process.stdin.setRawMode(false);
    process.stdin.pause();

    // Drain any pending input
    try {
      process.stdin.read();
    } catch {
      // Ignore read errors during cleanup
    }

    handler = null;
    isActive = false;
  };

  const abort = (): void => {
    controller.abort();
    onAbort();
  };

  return {
    controller,
    cleanup,
    isActive: () => isActive,
    abort,
    setup,
  };
}

/**
 * Create a simple abort controller without stdin handlers
 * For cases where you just need an AbortController
 */
export function createSimpleAbortHandler(): AbortController {
  return new AbortController();
}

/**
 * Check if an error is an abort error
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Safely handle abort errors in try-catch blocks
 */
export function handleAbortError(error: unknown, options?: { onError?: (err: Error) => void }): void {
  if (isAbortError(error)) {
    // Silently ignore abort errors
    return;
  }

  if (options?.onError && error instanceof Error) {
    options.onError(error);
  }
}
