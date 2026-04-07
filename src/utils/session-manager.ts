/**
 * Session Manager Module
 * Manages session lifecycle, timing, and statistics
 */

export interface SessionInfo {
  id: string;
  model: string;
  startedAt: Date;
  duration: number;
  tokenEstimate: number;
  messageCount: number;
}

export interface SessionTimer {
  startTime: Date;
  elapsed: () => number;
  formatted: () => string;
  reset: () => void;
}

export interface SessionStats {
  duration: { minutes: number; seconds: number };
  tokenEstimate: number;
  messageCount: number;
}

/**
 * Create a session timer
 */
export function createSessionTimer(): SessionTimer {
  const startTime = new Date();

  return {
    startTime,
    elapsed: () => Date.now() - startTime.getTime(),
    formatted: () => {
      const ms = Date.now() - startTime.getTime();
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    },
    reset: () => {
      // Create new timer
      return;
    },
  };
}

/**
 * Estimate token count from text
 * Rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Create session info object
 */
export function createSessionInfo(
  id: string,
  model: string,
  timer: SessionTimer,
  tokenEstimate: number,
  messageCount: number
): SessionInfo {
  return {
    id,
    model,
    startedAt: timer.startTime,
    duration: timer.elapsed(),
    tokenEstimate,
    messageCount,
  };
}

/**
 * Format session duration for display
 */
export function formatDuration(ms: number): { minutes: number; seconds: number } {
  return {
    minutes: Math.floor(ms / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
}

/**
 * Get session summary text
 */
export function getSessionSummary(info: SessionInfo): string {
  const { minutes, seconds } = formatDuration(info.duration);
  return `Duration: ${minutes}m ${seconds}s · Est. Tokens: ~${info.tokenEstimate}`;
}
