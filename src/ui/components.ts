import chalk from 'chalk';
import boxen from 'boxen';
import cfonts from 'cfonts';
import termImg from 'term-img';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory - works in both ESM and CJS
const _dirname = typeof __dirname !== 'undefined' 
  ? __dirname 
  : path.dirname(fileURLToPath(import.meta.url));

// Type declaration for cfonts
declare module 'cfonts' {
  export interface CFontsOptions {
    font?: string;
    colors?: string[];
    background?: string;
    letterSpacing?: number;
    lineHeight?: number;
    space?: boolean;
    maxLength?: string;
  }
  export interface CFontsResult {
    string: string;
    array: string[];
    lines: number;
  }
  export function render(text: string, options?: CFontsOptions): CFontsResult;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Brand Colors - Luxyie AI Theme (Purple/Indigo gradient spectrum) */
const BRAND = {
  deep: '#1E1B4B',
  dark: '#2E1065',
  primary: '#6D28D9',
  secondary: '#8B5CF6',
  accent: '#A78BFA',
  light: '#C4B5FD',
  lighter: '#DDD6FE',
  pale: '#F3E8FF',
  bright: '#E9D5FF',
} as const;

/** Semantic colors */
const SEMANTIC = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const;

/** UI colors */
const UI = {
  dim: '#6B7280',
  muted: '#9CA3AF',
  border: '#4B5563',
  background: '#0A0A0F',
} as const;

/** Block characters for dithered gradients */
const BLOCKS = {
  solid: '█',
  dark: '▓',
  medium: '▒',
  light: '░',
  diamond: '◆',
  dot: '●',
  arrow: '▸',
} as const;

// ============================================================================
// COLOR HELPERS
// ============================================================================

/** Brand gradient color functions */
const c = {
  deep: chalk.hex(BRAND.deep),
  dark: chalk.hex(BRAND.dark),
  primary: chalk.hex(BRAND.primary),
  secondary: chalk.hex(BRAND.secondary),
  accent: chalk.hex(BRAND.accent),
  light: chalk.hex(BRAND.light),
  lighter: chalk.hex(BRAND.lighter),
  pale: chalk.hex(BRAND.pale),
  bright: chalk.hex(BRAND.bright),
};

/** Exported color palette */
export const colors = {
  deep: c.deep,
  dark: c.dark,
  primary: c.primary,
  secondary: c.secondary,
  accent: c.accent,
  light: c.light,
  lighter: c.lighter,
  pale: c.pale,
  bright: c.bright,
  success: chalk.hex(SEMANTIC.success),
  error: chalk.hex(SEMANTIC.error),
  warning: chalk.hex(SEMANTIC.warning),
  info: chalk.hex(SEMANTIC.info),
  dim: chalk.hex(UI.dim),
  muted: chalk.hex(UI.muted),
  white: chalk.white,
  bold: chalk.bold,
  italic: chalk.italic,
  underline: chalk.underline,
  user: chalk.cyan,
  assistant: c.secondary,
  system: chalk.hex(UI.dim),
  border: chalk.hex(UI.border),
  highlight: chalk.white.bold,
};

// ============================================================================
// HEADER FUNCTIONS
// ============================================================================

import terminalImage from 'terminal-image';

// ... (previous type declarations and constants remain)

// ============================================================================
// HEADER FUNCTIONS
// ============================================================================

function createDitheredBar(colors: string[], length: number = 32, reverse: boolean = false): string {
  const ditherPattern = [BLOCKS.solid, BLOCKS.dark, BLOCKS.medium, BLOCKS.light];
  const palette = reverse ? [...colors].reverse() : colors;
  let bar = '';
  const charsPerColor = Math.ceil(length / palette.length);
  for (let i = 0; i < palette.length; i++) {
    const colorHex = palette[i];
    if (!colorHex) continue;
    const colorFn = chalk.hex(colorHex);
    for (let j = 0; j < charsPerColor; j++) {
      const ditherIndex = Math.floor((j / charsPerColor) * ditherPattern.length);
      bar += colorFn(ditherPattern[ditherIndex]);
    }
  }
  return bar.slice(0, length);
}

function createReadableTitle(): string {
  const result = cfonts.render('Luxyie AI', {
    font: 'simple3d',
    colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
    background: 'transparent',
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
    maxLength: '0',
  });
  return result.string;
}

export function createHeader(version: string, logoString: string = ''): string {
  const gradientColors = [
    BRAND.deep, BRAND.dark, BRAND.primary, BRAND.secondary,
    BRAND.accent, BRAND.light, BRAND.lighter, BRAND.pale,
  ];

  const topBar = createDitheredBar(gradientColors, 60);
  const bottomBar = createDitheredBar(gradientColors, 60, true);
  const diamond = c.secondary('◆');
  const title = createReadableTitle();
  const tagline = c.accent.dim('Terminal · Agent CLI · powered by NVIDIA Builds · Development by: ShindoZk');
  const ver = c.secondary.dim('v' + version);

  // Split both into lines for side-by-side display
  const titleLines = title.split('\n').filter(l => l.trim() !== '');
  const logoLines = logoString.split('\n');

  // Find the maximum height to align them
  const maxHeight = Math.max(titleLines.length, logoLines.length);
  const combinedBody: string[] = [];

  for (let i = 0; i < maxHeight; i++) {
    const logoPart = logoLines[i] || ' '.repeat(20); // Fallback for empty logo space
    const titlePart = titleLines[i] || '';
    combinedBody.push(`${logoPart}  ${titlePart}`);
  }

  const content = `
${diamond} ${topBar}
${combinedBody.join('\n')}

  ${tagline}
  ${ver}
${diamond} ${bottomBar}`;

  return boxen(content, {
    padding: { top: 1, bottom: 1, left: 3, right: 3 },
    borderStyle: 'round',
    borderColor: BRAND.secondary,
    dimBorder: true,
  });
}

// ... (createCleanHeader remains same)

export async function printBanner(): Promise<void> {
  // Placeholder implementation for printBanner
}

// Async function to display header with logo image
export async function printHeaderWithLogo(version: string): Promise<void> {
  let logoString = '';
  try {
    // Try multiple possible paths for the logo (development vs installed)
    const possiblePaths = [
      path.join(_dirname, '..', '..', '..', 'assets', 'Luxyie_AI-Logo.png'), // Installed: dist/ui/components.js -> ../../../assets/
      path.join(_dirname, '..', '..', 'assets', 'Luxyie_AI-Logo.png'),       // Dev: src/ui/components.ts -> ../../assets/
      path.join(process.cwd(), 'assets', 'Luxyie_AI-Logo.png'),                // Fallback to cwd
    ];
    
    for (const logoPath of possiblePaths) {
      if (await fs.pathExists(logoPath)) {
        // Use terminal-image to render the logo as ASCII blocks
        logoString = await terminalImage.file(logoPath, {
          width: 14,
        });
        break;
      }
    }
  } catch (error) {
    // If image fails to load, logoString stays empty (clean fallback)
  }
  
  // Print the header with logo integrated
  console.log(createHeader(version, logoString));
}

export function createGeometricHeader(version: string): string {
  const purple = c.secondary;
  const violet = c.primary;
  const light = c.light;
  const dark = c.deep;
  const gray = colors.dim;

  const pattern =
    dark('┌') + purple('───') + violet(BLOCKS.diamond) + purple('───') + dark('┐') + '\n' +
    purple('│') + light('  L U X Y I E  ') + purple('│') + '\n' +
    dark('└') + purple('───') + violet(BLOCKS.diamond) + purple('───') + dark('┘');

  const tagline = gray('intelligent assistant ') + violet(BLOCKS.dot) + gray(' v') + version;

  return boxen(pattern + '\n  ' + tagline, {
    padding: 1,
    margin: 1,
    borderStyle: 'single',
    borderColor: BRAND.secondary,
  });
}

// ============================================================================
// STATUS & INFO COMPONENTS
// ============================================================================

export function createStatusBar(config: {
  model?: string;
  session?: string;
  workspace?: string;
}): string {
  const parts: string[] = [];
  if (config.model) parts.push(`${colors.muted('model')} ${colors.secondary(config.model)}`);
  if (config.session) parts.push(`${colors.muted('session')} ${colors.info(config.session)}`);
  if (config.workspace) parts.push(`${colors.muted('workspace')} ${colors.dim(config.workspace)}`);

  const content = '  ' + parts.join(colors.dim(' · '));

  return boxen(content, {
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
    margin: { top: 0, bottom: 1 },
    borderStyle: 'single',
    borderColor: '#374151',
    dimBorder: true,
  });
}

export function createInfoBox(type: 'info' | 'warning' | 'success' | 'error', title: string, message: string): string {
  const colorMap = {
    info: { border: SEMANTIC.info, icon: 'ℹ' },
    warning: { border: SEMANTIC.warning, icon: '⚠' },
    success: { border: SEMANTIC.success, icon: '✓' },
    error: { border: SEMANTIC.error, icon: '✗' },
  };
  const { border, icon } = colorMap[type];
  const coloredIcon = type === 'info' ? colors.info(icon) : type === 'warning' ? colors.warning(icon) : type === 'success' ? colors.success(icon) : colors.error(icon);

  return boxen(
    `${coloredIcon} ${colors.bold(title)}\n\n${colors.white(message)}`,
    {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: border,
      backgroundColor: '#111827',
    }
  );
}

export function createWelcomeMessage(): string {
  const koFiUrl = 'https://ko-fi.com/shindozk';
  const lines = [
    colors.bold('💬 Welcome to Luxyie AI CLI'),
    '',
    colors.dim('Commands:'),
    `  ${colors.primary('/quit')} ${colors.dim('· Exit chat')}`,
    `  ${colors.primary('/clear')} ${colors.dim('· Clear history')}`,
    `  ${colors.primary('/copy')}  ${colors.dim('· Copy last response')}`,
    `  ${colors.primary('/help')}  ${colors.dim('· Show all commands')}`,
    '',
    colors.accent('☕ Support the project on Ko-fi:'),
    colors.accent.underline(koFiUrl),
    colors.dim('Press [Ctrl+Click] to open the link.'),
  ];

  return boxen(lines.join('\n'), {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor: BRAND.primary, // Use primary brand color for border
    backgroundColor: BRAND.dark, // Use dark brand color for background
  });
}

// ============================================================================
// DISCORD-STYLE CHAT COMPONENTS
// ============================================================================

// Discord color scheme
const DISCORD = {
  userName: '#06B6D4',      // Cyan for user
  aiName: '#8B5CF6',        // Purple for Luxyie AI
  timestamp: '#6B7280',     // Gray for timestamp
  text: '#E5E7EB',          // Light gray for text
  code: '#FCD34D',          // Yellow for code
  blockquote: '#9CA3AF',    // Gray for quotes
};

// Format timestamp like Discord (Today at 12:30)
function formatDiscordTime(date: Date = new Date()): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) {
    return `Hoje às ${time}`;
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ` às ${time}`;
}

// Create Discord-style message for User
export function createChatUserMessage(content: string): string {
  const timestamp = chalk.hex(DISCORD.timestamp)(formatDiscordTime());
  const username = chalk.bold.hex(DISCORD.userName)('ShindoZk');
  const avatar = chalk.hex(DISCORD.userName)('●');
  
  // Render markdown content
  const renderedContent = marked.parse(content) as string;
  
  // Build message layout
  const lines = renderedContent.split('\n');
  const firstLine = lines[0];
  const restLines = lines.slice(1);
  
  let output = `${avatar} ${username} ${chalk.dim(timestamp)}\n`;
  output += `   ${firstLine}`;
  
  if (restLines.length > 0) {
    output += '\n   ' + restLines.join('\n   ');
  }
  
  return output;
}

// Create Discord-style message for AI (Luxyie)
export function createChatAIMessage(content: string): string {
  const timestamp = chalk.hex(DISCORD.timestamp)(formatDiscordTime());
  const username = chalk.bold.hex(DISCORD.aiName)('Luxyie AI');
  const avatar = chalk.hex(DISCORD.aiName)('✨');
  
  // Render markdown content
  const renderedContent = marked.parse(content) as string;
  
  // Build message layout
  const header = `${avatar} ${username} ${chalk.dim(timestamp)}`;
  
  return `${header}\n${renderedContent}`;
}

// Helper to strip background ANSI codes
function stripBackgroundColors(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, (match) => {
    const codes = match.slice(2, -1).split(';');
    const filtered = codes.filter(code => {
      const num = parseInt(code, 10);
      return !(num >= 40 && num <= 49) && !(num >= 100 && num <= 107);
    });
    return filtered.length ? `\x1b[${filtered.join(';')}m` : '';
  });
}

// Legacy functions kept for compatibility
export function createInputPrompt(): string {
  return colors.primary('❯ ') + ' ';
}

import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure Markdown Renderer with setOptions
marked.setOptions({
  renderer: new TerminalRenderer({
    codespan: chalk.yellow,
    code: chalk.hex('#FCD34D'),
    heading: chalk.bold.hex('#8B5CF6'),
    strong: chalk.bold.hex('#EC4899'),
    em: chalk.italic.cyan,
    listitem: chalk.white,
    blockquote: chalk.gray.italic,
    table: chalk.hex('#6366F1'),
    firstHeading: chalk.bold.hex('#A78BFA'),
    codeSyntaxHighlighting: false,
    tab: 2,
  })
});

export function createChatBubble(role: 'user' | 'assistant', content: string): string {
  const isUser = role === 'user';
  // Minimalist border color - using a muted gray for both
  const borderColor = UI.border; // '#4B5563'
  const label = isUser ? 'You' : 'Luxyie AI'; // Updated label for AI
  const icon = isUser ? '👤' : '✨';
  const header = `${icon} ${colors.bold(label)}`;

  // Render Markdown content
  let renderedContent = marked.parse(content) as string;
  
  // Strip ANSI background color codes to prevent conflicts with boxen
  renderedContent = renderedContent.replace(/\x1b\[[0-9;]*m/g, (match) => {
    const codes = match.slice(2, -1).split(';');
    const filtered = codes.filter(code => {
      const num = parseInt(code, 10);
      return !(num >= 40 && num <= 49) && !(num >= 100 && num <= 107);
    });
    return filtered.length ? `\x1b[${filtered.join(';')}m` : '';
  });

  const boxenOptions: any = {
    padding: { top: 1, bottom: 1, left: 2, right: 2 },
    margin: { top: 1, bottom: 0 }, // Keep original margin
    borderStyle: 'single', // Minimalist border style
    borderColor: borderColor,
    title: header,
    // No backgroundColor for minimalism
  };

  return boxen(renderedContent.trim(), boxenOptions);
}

export function createAgentLog(actions: string[]): string {
  const content = actions.map(a => `${colors.accent('⚙')} ${colors.dim(a)}`).join('\n');
  
  return boxen(content, {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    margin: { top: 0, bottom: 0 },
    borderStyle: 'none',
    borderColor: BRAND.accent,
    title: colors.accent(' Agent Logs '),
    titleAlignment: 'left',
  });
}

export function createToolBox(title: string, content: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): string {
  const colorsMap = {
    info: BRAND.secondary,
    success: SEMANTIC.success,
    warning: SEMANTIC.warning,
    error: SEMANTIC.error,
  };

  return boxen(content, {
    title: ` ${title} `,
    titleAlignment: 'left',
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor: colorsMap[type],
    backgroundColor: '#111827',
  });
}

export function createDiffBox(filename: string, content: string): string {
  return boxen(colors.white(content), {
    title: ` 📝 Writing to: ${filename} `,
    titleAlignment: 'left',
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor: SEMANTIC.info,
    backgroundColor: '#0F172A',
  });
}

export function createCommandBox(command: string, output?: string): string {
  let body = colors.bright(`$ ${command}`);
  if (output) {
    body += `\n\n${colors.dim('--- Output ---')}\n${colors.white(output)}`;
  }
  
  return boxen(body, {
    title: ' 💻 Terminal ',
    titleAlignment: 'left',
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor: '#4B5563',
    backgroundColor: '#000000',
  });
}

// New function to display user message in a styled box like AI
export function createUserChatBubble(content: string): string {
  const header = `👤 ${colors.bold('You')}`;
  
  return boxen(colors.white(content), {
    padding: { top: 1, bottom: 1, left: 2, right: 2 },
    margin: { top: 1, bottom: 0 },
    borderStyle: 'round',
    borderColor: '#06B6D4', // Cyan color for user
    backgroundColor: '#0E7490', // Dark cyan background
    title: header,
  });
}

export function formatRole(role: 'user' | 'assistant' | 'system', content: string): string {
  const styles = {
    user: { icon: '👤', color: colors.user },
    assistant: { icon: '✨', color: colors.assistant },
    system: { icon: '⚙', color: colors.system },
  };
  const { icon, color } = styles[role];
  const prefix = color(`${icon} ${role.charAt(0).toUpperCase() + role.slice(1)}`);
  return `${prefix}\n${content}`;
}

export function formatMessage(role: 'user' | 'assistant' | 'system', content: string): string {
  const prefix = {
    user: colors.user('You:'),
    assistant: colors.assistant('Luxyie:'),
    system: colors.system('System:'),
  };
  return `${prefix[role]} ${content}`;
}

// ============================================================================
// DIVIDERS & FEEDBACK
// ============================================================================

export function createDivider(text?: string): string {
  if (text) {
    const left = '─'.repeat(3);
    const right = '─'.repeat(40 - text.length - 5);
    return colors.dim(`${left} ${text} ${right}`);
  }
  return colors.dim('─'.repeat(50));
}

export function createLoadingState(text: string): string {
  return colors.dim(`⏳ ${text}...`);
}

export function divider(char = '─', length = 40): string {
  return colors.dim(char.repeat(length));
}

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

// ============================================================================
// UTILITY FUNCTIONS
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
    colors.border(top),
    titleLine,
    colors.border(separator),
    ...contentLines,
    colors.border(bottom),
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

// ============================================================================
// MODERN MINIMALIST CHAT COMPONENTS
// ============================================================================

/** Minimal user prompt with elegant styling */
export function createMinimalUserPrompt(): string {
  const dot = colors.primary('●');
  const arrow = colors.secondary('❯');
  return `\n${dot} ${arrow} `;
}

/** Modern AI message box - elegant and spacious with Discord-like formatting */
export function createAIMessageBox(content: string, isStreaming: boolean = false): string {
  const aiLabel = colors.secondary.bold('Luxyie AI');
  const icon = '✨';
  
  // Render Markdown for rich formatting
  let renderedContent = (marked.parse(content) as string);
  
  // Strip background colors to avoid issues with boxen
  renderedContent = renderedContent.replace(/\x1b\[[0-9;]*m/g, (match) => {
    const codes = match.slice(2, -1).split(';');
    const filtered = codes.filter(code => {
      const num = parseInt(code, 10);
      return !(num >= 40 && num <= 49) && !(num >= 100 && num <= 107);
    });
    return filtered.length ? `\x1b[${filtered.join(';')}m` : '';
  });

  if (!isStreaming) {
    return boxen(renderedContent.trim(), {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: '#8B5CF6', // Purple/Violet
      title: ` ${icon} ${aiLabel} `,
      titleAlignment: 'left',
    });
  }
  
  return `\n${colors.secondary('─')} ${aiLabel} ${colors.dim('is thinking...')}\n${renderedContent}`;
}

/** Elegant chat separator - modern subtle Discord style */
export function createChatSeparator(): string {
  const line = colors.border('─'.repeat(50));
  return `\n${line}\n`;
}

/** Streaming message start indicator */
export function createStreamingIndicator(): string {
  return colors.primary('✨ ');
}

/** Modern minimalist input box for user prompts */
export function createInputPromptBox(): string {
  const dot = colors.secondary('●');
  const arrow = colors.primary('❯');
  return `\n${dot} ${arrow} `;
}
