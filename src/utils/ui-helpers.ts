/**
 * Shared UI helper functions
 * Consolidates duplicate formatting functions used across the application
 */

/**
 * Truncates a string to a specified length
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

/**
 * Formats a date to a human-readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Formats a message with role-based prefix
 * Single consolidated implementation used across the app
 */
export function formatMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  options?: { userName?: string; aiName?: string }
): string {
  const labels = {
    user: options?.userName || 'You',
    assistant: options?.aiName || 'Luxyie',
    system: 'System',
  };

  return `${labels[role]}: ${content}`;
}

/**
 * Creates a simple ASCII box around content
 * Consolidated implementation
 */
export function formatBox(title: string, content: string): string {
  const lines = content.split('\n');
  const maxWidth = Math.max(title.length, ...lines.map((line) => line.length));
  const top = '┌' + '─'.repeat(maxWidth + 2) + '┐';
  const titleLine = `│ ${title.padEnd(maxWidth)} │`;
  const separator = '├' + '─'.repeat(maxWidth + 2) + '┤';
  const contentLines = lines.map((line) => `│ ${line.padEnd(maxWidth)} │`);
  const bottom = '└' + '─'.repeat(maxWidth + 2) + '┘';

  return [top, titleLine, separator, ...contentLines, bottom].join('\n');
}
