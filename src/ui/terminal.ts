/**
 * Modern Terminal UI
 * Clean input handling with paste detection
 */

import readline from 'node:readline';
import chalk from 'chalk';
import { detectPastedText } from '../utils/index.js';

export class TerminalUI {
  private rl: readline.Interface;

  constructor() {
    this.rl = this.createInterface();
  }

  /**
   * Create a fresh readline interface
   */
  private createInterface(): readline.Interface {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
  }

  /**
   * Restore stdin and recreate readline interface
   * Call this after inquirer prompts to fix input blocking
   */
  restore(): void {
    // Close old interface
    try {
      this.rl.close();
    } catch {
      // Ignore errors if already closed
    }

    // Resume stdin if paused
    if (process.stdin.isPaused()) {
      process.stdin.resume();
    }

    // Ensure stdin is not in raw mode (inquirer might leave it in raw mode)
    if (process.stdin.isTTY && process.stdin.isRaw) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        // Ignore errors
      }
    }

    process.stdin.setEncoding('utf8');

    // Recreate interface with fresh state
    this.rl = this.createInterface();

    // Ensure stdin is ready
    if (process.stdin.isPaused()) {
      process.stdin.resume();
    }
  }

  /**
   * Restore stdin asynchronously with delay to ensure readiness
   * Use this after inquirer prompts
   */
  async restoreAsync(): Promise<void> {
    this.restore();
    // Small delay to ensure stdin is fully ready
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Ask user for input with a prompt
   */
  async ask(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        const trimmed = answer.trim();
        const pasteInfo = detectPastedText(trimmed);

        // Clear the prompt line
        readline.moveCursor(process.stdout, 0, -1);
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        if (pasteInfo.isPasted) {
          process.stdout.write(chalk.dim(pasteInfo.formattedMessage) + '\n');
        }

        resolve(trimmed);
      });
    });
  }

  /**
   * Log text directly to stdout
   */
  log(text: string): void {
    process.stdout.write(text);
  }

  /**
   * Clear current line
   */
  clearLine(): void {
    readline.moveCursor(process.stdout, 0, -1);
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }

  /**
   * Close readline interface
   */
  close(): void {
    this.rl.close();
  }
}
