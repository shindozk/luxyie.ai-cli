/**
 * Validation utilities
 */

/**
 * Check if a string is a valid file path
 */
export function isValidFilePath(path: string): boolean {
  // Basic validation - no null bytes, reasonable length
  return path.length > 0 && path.length < 4096 && !path.includes('\0');
}

/**
 * Check if a string is a valid session ID (UUID format)
 */
export function isValidSessionId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Check if a string is a valid command (starts with /)
 */
export function isCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

/**
 * Sanitize user input for display
 */
export function sanitizeInput(input: string): string {
  // Remove control characters except newlines and tabs
  return input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Check if temperature value is valid
 */
export function isValidTemperature(temp: number): boolean {
  return temp >= 0 && temp <= 2;
}

/**
 * Check if max tokens value is valid
 */
export function isValidMaxTokens(tokens: number): boolean {
  return tokens > 0 && tokens <= 100000;
}

/**
 * Validate API key format (basic check)
 */
export function isValidApiKey(key: string): boolean {
  return key.length > 10 && /^[a-zA-Z0-9_-]+$/.test(key);
}

/**
 * Check if a string contains code blocks
 */
export function hasCodeBlocks(text: string): boolean {
  return /```[\s\S]*?```/.test(text);
}

/**
 * Extract command and arguments from input
 */
export function parseCommand(input: string): { command: string; args: string[] } {
  const parts = input.trim().split(/\s+/);
  const command = parts[0] || '';
  const args = parts.slice(1);
  return { command, args };
}
