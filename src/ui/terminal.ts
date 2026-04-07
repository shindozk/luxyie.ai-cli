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
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
  }

  /**
   * Ask user for input with a prompt
   * Simple and reliable using rl.question
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
