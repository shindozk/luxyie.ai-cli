import chalk, { ChalkInstance } from 'chalk';

export const colors = {
  // Brand colors
  primary: chalk.hex('#6366f1'),
  secondary: chalk.hex('#a855f7'),
  accent: chalk.hex('#ec4899'),
  
  // Semantic colors
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  
  // Text colors
  dim: chalk.gray,
  bold: chalk.bold,
  italic: chalk.italic,
  
  // Role colors
  user: chalk.cyan,
  assistant: chalk.hex('#6366f1'),
  system: chalk.gray,
  
  // UI colors
  border: chalk.gray,
  highlight: chalk.white.bold,
};

export function success(message: string): string {
  return colors.success('✓ ') + message;
}

export function error(message: string): string {
  return colors.error('✗ ') + message;
}

export function warning(message: string): string {
  return colors.warning('⚠ ') + message;
}

export function info(message: string): string {
  return colors.info('ℹ ') + message;
}

export function prompt(message: string): string {
  return colors.primary('❯ ') + message;
}

export function divider(char = '─', length = 40): string {
  return colors.border(char.repeat(length));
}

export function formatBox(title: string, content: string): string {
  const lines = content.split('\n');
  const maxWidth = Math.max(
    title.length,
    ...lines.map(line => line.length)
  );
  
  const top = '┌' + '─'.repeat(maxWidth + 2) + '┐';
  const titleLine = `│ ${colors.bold(title).padEnd(maxWidth)} │`;
  const separator = '├' + '─'.repeat(maxWidth + 2) + '┤';
  const contentLines = lines.map(line => `│ ${line.padEnd(maxWidth)} │`);
  const bottom = '└' + '─'.repeat(maxWidth + 2) + '┘';
  
  return [
    colors.border(top),
    titleLine,
    colors.border(separator),
    ...contentLines,
    colors.border(bottom),
  ].join('\n');
}

export function formatMessage(role: 'user' | 'assistant' | 'system', content: string): string {
  const prefix = {
    user: colors.user('You:'),
    assistant: colors.assistant('Luxyie:'),
    system: colors.system('System:'),
  };

  return `${prefix[role]} ${content}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
