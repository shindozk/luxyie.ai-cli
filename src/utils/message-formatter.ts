/**
 * Message Formatter Module
 * Formats chat messages for display with consistent styling
 */

import chalk from 'chalk';
import boxen from 'boxen';
import { renderMarkdown, formatTimestamp } from '../ui/renderer.js';

export interface MessageFormatOptions {
  userName?: string;
  aiName?: string;
  userColor?: string;
  aiColor?: string;
}

const DEFAULT_OPTIONS: MessageFormatOptions = {
  userName: 'You',
  aiName: 'Luxyie AI',
  userColor: '#06B6D4',
  aiColor: '#8B5CF6',
};

/**
 * Format user message in a dark box (Gemini CLI style)
 */
export function formatUserMessage(
  content: string,
  options: MessageFormatOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const timestamp = formatTimestamp();
  const label = chalk.hex(opts.userColor!).bold(opts.userName!);

  // Render markdown and strip ALL ANSI codes for clean display in box
  const rendered = stripAllAnsiCodes(renderMarkdown(content));

  const boxed = boxen(rendered, {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    margin: { top: 1, bottom: 0 },
    borderColor: '#164E63',
    borderStyle: 'round',
    dimBorder: true,
  });

  return `${label} ${chalk.dim(timestamp)}\n${boxed}`;
}

/**
 * Strip ALL ANSI escape codes (foreground and background)
 */
function stripAllAnsiCodes(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Format AI message with clean text and markdown
 * No box - just formatted content with sparkle icon
 */
export function formatAIMessage(
  content: string,
  isStreaming: boolean = false,
  options: MessageFormatOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const timestamp = formatTimestamp();
  const header = `${chalk.hex(opts.aiColor!)('✨')} ${chalk.hex(opts.aiColor!).bold(opts.aiName!)} ${chalk.dim(timestamp)}`;

  if (isStreaming) {
    return `\n${header}\n   `;
  }

  const rendered = renderMarkdown(content);
  const lines = rendered.split('\n');
  const indented = lines.map((line) => `   ${line}`).join('\n');

  return `\n${header}\n${indented}\n`;
}

/**
 * Format system message
 */
export function formatSystemMessage(text: string): string {
  return `\n${chalk.gray.dim(`── ${text} ──`)}\n`;
}

/**
 * Format error message
 */
export function formatErrorMessage(error: string): string {
  return `\n${chalk.red('✗')} ${chalk.red.bold('Error:')} ${error}\n`;
}

/**
 * Format separator line
 */
export function formatSeparator(length: number = 50): string {
  return chalk.dim('─'.repeat(length));
}

/**
 * Format tool status message
 */
export function formatToolStatus(
  name: string,
  status: 'running' | 'completed' | 'failed' | 'denied',
  message?: string
): string {
  const icons = {
    running: chalk.yellow('⚙'),
    completed: chalk.green('✓'),
    failed: chalk.red('✗'),
    denied: chalk.gray('⊘'),
  };

  const statusText = {
    running: chalk.yellow('Running'),
    completed: chalk.green('Completed'),
    failed: chalk.red('Failed'),
    denied: chalk.gray('Denied'),
  };

  let output = `${icons[status]} ${chalk.bold(name)} - ${statusText[status]}`;
  if (message) {
    output += ` ${chalk.dim(message)}`;
  }

  return output;
}

/**
 * Format security prompt for tool approval
 */
export function formatSecurityPrompt(toolName: string, args: any): string {
  const border = chalk.hex('#F59E0B');
  const warning = border('⚠ SECURITY CHECK');

  let output = `\n${border('┌')} ${warning} ${border('─'.repeat(25))}\n`;
  output += `${border('│')} ${chalk.dim('AI wants to use:')} ${chalk.bold.yellow(toolName)}\n`;
  output += `${border('│')}\n`;

  const argsStr = JSON.stringify(args, null, 2);
  const argsLines = argsStr.split('\n');
  for (const line of argsLines) {
    output += `${border('│')} ${chalk.dim(line)}\n`;
  }

  output += `${border('└')}${border('─'.repeat(50))}\n`;

  return output;
}
