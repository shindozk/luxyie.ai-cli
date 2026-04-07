/**
 * Paste Detector Module
 * Detects and handles pasted text in terminal input
 * Provides info about pasted content length and line count
 */

export interface PasteInfo {
  isPasted: boolean;
  length: number;
  lineCount: number;
  formattedMessage: string;
}

/**
 * Threshold for detecting pasted content
 * Text longer than this is considered pasted
 */
const PASTE_THRESHOLD = 500;

/**
 * Detect if text was pasted and return info
 */
export function detectPastedText(text: string): PasteInfo {
  const length = text.length;
  const lineCount = text.split('\n').length;
  const isPasted = length > PASTE_THRESHOLD;

  return {
    isPasted,
    length,
    lineCount,
    formattedMessage: formatPasteMessage(length, lineCount),
  };
}

/**
 * Format a message about pasted content
 */
function formatPasteMessage(length: number, lineCount: number): string {
  return `[Pasted ${length} chars · ${lineCount} line${lineCount > 1 ? 's' : ''}]`;
}

/**
 * Get summary of content statistics
 */
export function getContentStats(text: string): {
  chars: number;
  words: number;
  lines: number;
} {
  return {
    chars: text.length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    lines: text.split('\n').length,
  };
}

/**
 * Truncate text for display with ellipsis
 */
export function truncateForDisplay(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Sanitize input by removing control characters
 */
export function sanitizeInput(text: string): string {
  return text.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Check if input is empty or whitespace only
 */
export function isEmptyInput(text: string): boolean {
  return !text || text.trim().length === 0;
}

/**
 * Check if input is a command (starts with /)
 */
export function isCommand(text: string): boolean {
  return text.startsWith('/');
}
