import readline from 'node:readline';
import chalk from 'chalk';
import { colors } from './components.js';

/**
 * TerminalUI Manager
 * Handles persistent bottom input and scrollable message area above it.
 */
export class TerminalUI {
  private rl: readline.Interface;
  private promptString: string;
  private isGenerating: boolean = false;
  private currentInput: string = '';

  constructor(prompt: string = `${colors.user('●')} ${colors.user.bold('You')} ${colors.primary.bold('❯')} `) {
    this.promptString = prompt;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 100,
      prompt: prompt
    });

    // Handle terminal resize to keep input at bottom
    process.stdout.on('resize', () => {
      this.render();
    });
  }

  /**
   * Set the prompt string
   */
  setPrompt(prompt: string) {
    this.promptString = prompt;
    this.rl.setPrompt(prompt);
  }

  /**
   * Start generation mode (hides prompt and pauses input to prevent typing during AI response)
   */
  setGenerating(generating: boolean) {
    this.isGenerating = generating;
    if (generating) {
      this.rl.pause(); // Pause input to prevent user typing during AI response
      this.clearInputLine();
    } else {
      this.rl.resume();
      this.render();
    }
  }

  /**
   * Clear the line where input is
   */
  private clearInputLine() {
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
  }

  /**
   * Render the input area at the bottom
   */
  render() {
    if (this.isGenerating) return;
    
    this.clearInputLine();
    this.rl.prompt(true);
  }

  /**
   * Log text above the input area
   */
  log(text: string) {
    this.clearInputLine();
    process.stdout.write(text + '\n');
    this.render();
  }

  /**
   * Ask a question (wrapper for rl.question) - clears echoed input to prevent duplication
   */
  async ask(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(this.promptString, (answer) => {
        // Move cursor up to the echoed line and clear it to prevent duplication
        process.stdout.write('\x1b[1A'); // Move cursor up one line
        readline.clearLine(process.stdout, 0); // Clear the entire line
        process.stdout.write('\n'); // Move to next line
        resolve(answer);
      });
    });
  }

  /**
   * Pause input for tools or other interactive prompts
   */
  pause() {
    this.rl.pause();
    this.clearInputLine();
  }

  /**
   * Resume input
   */
  resume() {
    this.rl.resume();
    this.render();
  }

  /**
   * Close the interface
   */
  close() {
    this.rl.close();
  }

  getInterface() {
    return this.rl;
  }
}
