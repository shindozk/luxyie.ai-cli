/**
 * Terminal Input Handler Module
 * Manages readline input with paste detection and queue handling
 */

import readline from 'node:readline';
import chalk from 'chalk';
import { detectPastedText } from './paste-detector.js';

export interface TerminalInputOptions {
  onInput?: (input: string) => void;
  onPaste?: (info: { length: number; lineCount: number }) => void;
  prompt?: string;
}

export interface TerminalInputResult {
  input: string;
  wasPasted: boolean;
  stats: { chars: number; lines: number };
}

/**
 * Create a readline interface
 */
export function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
}

/**
 * Process input with paste detection
 */
export function processInput(
  input: string,
  prompt: string = ''
): TerminalInputResult {
  const pasteInfo = detectPastedText(input);

  return {
    input: input.trim(),
    wasPasted: pasteInfo.isPasted,
    stats: {
      chars: pasteInfo.length,
      lines: pasteInfo.lineCount,
    },
  };
}

/**
 * Display paste info message
 */
export function displayPasteInfo(
  prompt: string,
  length: number,
  lineCount: number
): void {
  console.log(`${prompt}${chalk.dim(`[Pasted ${length} chars · ${lineCount} lines]`)}`);
}

/**
 * Clean up readline interface
 */
export function closeReadline(rl: readline.Interface): void {
  rl.close();
}

/**
 * Clear current line and reset cursor
 */
export function clearCurrentLine(): void {
  readline.moveCursor(process.stdout, 0, -1);
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}

/**
 * Handle input with queue support
 * Returns promise that resolves when input is available
 */
export function handleQueuedInput(
  rl: readline.Interface,
  prompt: string,
  isGenerating: boolean,
  pendingResolve: ((value: string) => void) | null
): { newPending: ((value: string) => void) | null } {
  if (isGenerating) {
    // Queue the prompt for later
    return { newPending: pendingResolve };
  }

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      clearCurrentLine();

      const result = processInput(answer, prompt);

      if (result.wasPasted) {
        displayPasteInfo(prompt, result.stats.chars, result.stats.lines);
      }

      resolve(result.input);
    });
  }) as any;
}
