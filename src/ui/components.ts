/**
 * Chat UI Components - Visual Elements Only
 * Message formatting moved to utils/message-formatter.ts
 */

import chalk from 'chalk';
import boxen from 'boxen';
import cfonts from 'cfonts';
import terminalImage from 'terminal-image';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory for asset paths
const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Brand colors (purple/indigo theme)
  primary: chalk.hex('#8B5CF6'),
  secondary: chalk.hex('#A78BFA'),
  accent: chalk.hex('#C4B5FD'),
  deep: chalk.hex('#1E1B4B'),
  
  // User colors (cyan/teal)
  user: chalk.hex('#06B6D4'),
  userBg: '#0C4A55',
  userBorder: '#164E63',
  
  // AI colors (purple)
  ai: chalk.hex('#8B5CF6'),
  
  // Status colors
  success: chalk.hex('#10B981'),
  error: chalk.hex('#EF4444'),
  warning: chalk.hex('#F59E0B'),
  info: chalk.hex('#3B82F6'),
  
  // Additional chalk colors
  green: chalk.green,
  red: chalk.red,
  yellow: chalk.yellow,
  cyan: chalk.cyan,
  blue: chalk.blue,
  
  // Text colors
  white: chalk.white,
  gray: chalk.hex('#6B7280'),
  dim: chalk.hex('#4B5563'),
  muted: chalk.hex('#9CA3AF'),
  
  // Styles
  bold: chalk.bold,
  italic: chalk.italic,
  underline: chalk.underline,
  dimText: chalk.dim,
  
  // Aliases
  goodbye: chalk.dim,
};

// ============================================================================
// HEADER & BANNER
// ============================================================================

/**
 * Create dithered gradient bar for header decoration
 */
function createDitheredBar(
  colorStops: string[], 
  length: number = 60, 
  reverse: boolean = false
): string {
  const blocks = ['█', '▓', '', '░'];
  const palette = reverse ? [...colorStops].reverse() : colorStops;
  let bar = '';
  const charsPerColor = Math.ceil(length / palette.length);
  
  for (let i = 0; i < palette.length; i++) {
    const colorHex = palette[i];
    if (!colorHex) continue;
    const colorFn = chalk.hex(colorHex);
    for (let j = 0; j < charsPerColor; j++) {
      const blockIndex = Math.floor((j / charsPerColor) * blocks.length);
      bar += colorFn(blocks[Math.min(blockIndex, blocks.length - 1)]);
    }
  }
  
  return bar.slice(0, length);
}

/**
 * Print header with logo and branding
 */
export async function printHeaderWithLogo(version: string): Promise<void> {
  const possiblePaths = [
    path.join(_dirname, '..', 'assets', 'Luxyie_AI-Logo.png'),
    path.join(_dirname, '..', '..', '..', 'assets', 'Luxyie_AI-Logo.png'),
    path.join(_dirname, '..', '..', 'assets', 'Luxyie_AI-Logo.png'),
    path.join(process.cwd(), 'assets', 'Luxyie_AI-Logo.png'),
  ];

  let logoString = '';
  for (const logoPath of possiblePaths) {
    if (await fs.pathExists(logoPath)) {
      logoString = await terminalImage.file(logoPath, { width: 14 });
      break;
    }
  }

  const titleResult = cfonts.render('Luxyie AI', {
    font: 'simple3d',
    colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
    background: 'transparent',
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
    maxLength: '0',
  });

  const titleString = typeof titleResult === 'object' && titleResult !== null && 'string' in titleResult
    ? (titleResult as any).string
    : '';
    
  const titleLines = titleString.split('\n').filter((l: string) => l.trim() !== '');
  const logoLines = logoString.split('\n');
  const maxHeight = Math.max(titleLines.length, logoLines.length);
  const combined: string[] = [];

  for (let i = 0; i < maxHeight; i++) {
    const logoPart = logoLines[i] || ' '.repeat(20);
    const titlePart = titleLines[i] || '';
    combined.push(`${logoPart}  ${titlePart}`);
  }

  const gradientColors = [
    '#1E1B4B', '#2E1065', '#6D28D9', '#8B5CF6',
    '#A78BFA', '#C4B5FD', '#DDD6FE', '#F3E8FF',
  ];

  const topBar = createDitheredBar(gradientColors, 60);
  const bottomBar = createDitheredBar(gradientColors, 60, true);
  const diamond = chalk.hex('#8B5CF6')('◆');
  const tagline = chalk.hex('#A78BFA').dim(
    'Terminal · Agent CLI · powered by NVIDIA Builds · by ShindoZk'
  );
  const ver = chalk.hex('#8B5CF6').dim(`v${version}`);

  const content = `
${diamond} ${topBar}
${combined.join('\n')}

  ${tagline}
  ${ver}
${diamond} ${bottomBar}`;

  console.log(boxen(content, {
    padding: { top: 1, bottom: 1, left: 3, right: 3 },
    borderStyle: 'round',
    borderColor: '#8B5CF6',
    dimBorder: true,
  }));
}

// ============================================================================
// STATUS & INFO - Minimalist Style
// ============================================================================

/**
 * Create minimal status line (no box, just text)
 */
export function createStatusBar(config: {
  workspace?: string;
}): string {
  const parts: string[] = [];

  if (config.workspace) {
    parts.push(`${colors.dim('workspace')} ${colors.dim(config.workspace)}`);
  }

  return `  ${parts.join(colors.dim(' · '))}`;
}

/**
 * Create compact welcome message (minimalist, no box)
 */
export function createWelcomeMessage(): string {
  const koFiUrl = 'https://ko-fi.com/shindozk';

  const lines = [
    `${colors.accent('☕ Support:')} ${colors.accent.underline(koFiUrl)}`,
  ];

  return `\n${colors.dim('─'.repeat(50))}\n${lines.join('\n')}\n${colors.dim('─'.repeat(50))}\n`;
}

/**
 * Create minimal session info (no box, just formatted text)
 */
export function createSessionInfoDisplay(config: {
  id: string;
  model: string;
  startTime: string;
}): string {
  return [
    `${colors.dim('Session')} ${colors.info(config.id)}`,
    `${colors.dim('Model')} ${colors.secondary(config.model)}`,
    `${colors.dim('Started')} ${colors.dim(config.startTime)}`,
    `${colors.dim('Type')} ${colors.primary('/help')} ${colors.dim('for commands')}`,
  ].map((line) => `  ${line}`).join('\n');
}

// ============================================================================
// CHAT MESSAGES - Re-exported from utils/message-formatter.ts
// ============================================================================
// Import these from utils/message-formatter.ts instead:
// - formatUserMessage
// - formatAIMessage

// ============================================================================
// TOOL EXECUTION UI
// ============================================================================

/**
 * Format tool execution status
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
    output += ` ${colors.dim(message)}`;
  }

  return output;
}

/**
 * Format security check prompt for tool approval
 */
export function formatSecurityPrompt(toolName: string, args: any): string {
  const border = chalk.hex('#F59E0B');
  const warning = border('⚠ SECURITY CHECK');
  
  let output = `\n${border('┌')} ${warning} ${border('─'.repeat(25))}\n`;
  output += `${border('│')} ${colors.dim('AI wants to use:')} ${chalk.bold.yellow(toolName)}\n`;
  output += `${border('│')}\n`;
  
  // Format arguments
  const argsStr = JSON.stringify(args, null, 2);
  const argsLines = argsStr.split('\n');
  for (const line of argsLines) {
    output += `${border('│')} ${chalk.dim(line)}\n`;
  }
  
  output += `${border('└')}${border('─'.repeat(50))}\n`;
  
  return output;
}

// ============================================================================
// THINKING/REASONING UI
// ============================================================================

/**
 * Format thinking process indicator
 */
export function formatThinkingStart(): string {
  return `\n${colors.dim('💭 Thinking...')}\n`;
}

/**
 * Format thinking complete indicator
 */
export function formatThinkingComplete(): string {
  return colors.dim('');
}

/**
 * Format reasoning text
 */
export function formatReasoning(text: string): string {
  return chalk.italic.hex('#6B7280')(text);
}

// ============================================================================
// FEEDBACK MESSAGES
// ============================================================================

export function success(message: string): string {
  return `${colors.success('✓ ')}${message}`;
}

export function error(message: string): string {
  return `${colors.error('✗ ')}${message}`;
}

export function warning(message: string): string {
  return `${colors.warning('⚠ ')}${message}`;
}

export function info(message: string): string {
  return `${colors.info('ℹ ')}${message}`;
}

/**
 * Create minimal input prompt
 */
export function createInputPrompt(): string {
  return `\n${colors.user('●')} ${colors.primary('❯ ')} `;
}

// ============================================================================
// UTILITY FUNCTIONS (exported for compatibility)
// ============================================================================

export function formatBox(title: string, content: string): string {
  const lines = content.split('\n');
  const maxWidth = Math.max(title.length, ...lines.map((line) => line.length));
  const top = '┌' + '─'.repeat(maxWidth + 2) + '┐';
  const titleLine = `│ ${colors.bold(title).padEnd(maxWidth)} │`;
  const separator = '├' + '─'.repeat(maxWidth + 2) + '┤';
  const contentLines = lines.map((line) => `│ ${line.padEnd(maxWidth)} │`);
  const bottom = '└' + '─'.repeat(maxWidth + 2) + '┘';

  return [
    colors.dim(top),
    titleLine,
    colors.dim(separator),
    ...contentLines,
    colors.dim(bottom),
  ].join('\n');
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
