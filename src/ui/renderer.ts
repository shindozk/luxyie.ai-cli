/**
 * Modern Markdown Renderer for Terminal
 * Supports bold, italic, code blocks, lists, tables, and more
 * Compatible with marked v15 + marked-terminal v7
 */

import chalk from 'chalk';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// ============================================================================
// MARKDOWN CONFIGURATION
// ============================================================================

// Create terminal renderer with proper configuration
const terminalRenderer = new TerminalRenderer({
  // Code formatting
  codespan: chalk.hex('#FBBF24').bold,
  code: chalk.hex('#FDE68A'),

  // Text formatting
  heading: chalk.bold.hex('#A78BFA'),
  strong: chalk.bold.white,
  em: chalk.italic.hex('#67E8F9'),
  del: chalk.strikethrough.gray,

  // Lists and structure
  listitem: chalk.white,
  checkbox: chalk.hex('#A78BFA'),

  // Quotes and tables
  blockquote: chalk.gray.italic,
  table: chalk.hex('#8B5CF6'),

  // Rendering options - MUST be false to prevent garbled/duplicated text on Android/Termux
  codeSyntaxHighlighting: false,
  tab: 2,
  reflowText: false, // CRITICAL: false prevents text garbling on all platforms
  width: 120, // Fixed width to avoid terminal detection issues
  firstHeading: chalk.bold.hex('#A78BFA'),
});

// Configure marked with our custom renderer using setOptions
marked.setOptions({
  renderer: terminalRenderer,
  gfm: true, // Enable GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
});

// ============================================================================
// MARKDOWN RENDERING
// ============================================================================

/**
 * Render markdown content to terminal-friendly format
 */
export function renderMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  try {
    // Parse markdown using marked with our terminal renderer
    const rendered = marked.parse(content);

    // marked.parse returns string when renderer is set
    if (typeof rendered !== 'string') {
      return content;
    }

    // Strip background colors that conflict with terminal
    const cleaned = stripBackgroundColors(rendered);

    // Remove any trailing whitespace/newlines
    return cleaned.trim();
  } catch (error) {
    // Return original content if rendering fails
    return content;
  }
}

/**
 * Strip ANSI background color codes to prevent visual conflicts
 */
function stripBackgroundColors(text: string): string {
  // Remove background color codes only (40-49, 100-107)
  return text.replace(/\x1b\[[0-9;]*m/g, (match) => {
    const codes = match.slice(2, -1).split(';');
    const filtered = codes.filter(code => {
      const num = parseInt(code, 10);
      return !(num >= 40 && num <= 49) && !(num >= 100 && num <= 107);
    });
    return filtered.length ? `\x1b[${filtered.join(';')}m` : '';
  });
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format timestamp in HH:MM format
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format reasoning/thinking text
 */
export function formatReasoning(text: string): string {
  return chalk.italic.hex('#6B7280')(text);
}

/**
 * Format tool execution log
 */
export function formatToolLog(
  name: string,
  status: 'running' | 'completed' | 'failed' | 'denied'
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

  return `${icons[status]} Tool: ${chalk.bold(name)} - ${statusText[status]}`;
}

/**
 * Format security check message for tool approval
 */
export function formatSecurityCheck(toolName: string, args: any): string {
  const border = chalk.hex('#F59E0B');
  const warning = border('⚠ SECURITY CHECK');

  let output = `\n${border('┌')} ${warning} ${border('─'.repeat(30))}\n`;
  output += `${border('│')} ${chalk.gray('AI wants to use:')} ${chalk.bold.yellow(toolName)}\n`;
  output += `${border('│')}\n`;
  output += `${border('│')} ${chalk.gray('Arguments:')}\n`;

  const argsStr = JSON.stringify(args, null, 2);
  const argsLines = argsStr.split('\n');
  for (const line of argsLines) {
    output += `${border('│')} ${chalk.dim(line)}\n`;
  }

  output += `${border('└')}${border('─'.repeat(50))}\n`;

  return output;
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
export function formatError(error: string): string {
  return `\n${chalk.red('✗')} ${chalk.red.bold('Error:')} ${error}\n`;
}
