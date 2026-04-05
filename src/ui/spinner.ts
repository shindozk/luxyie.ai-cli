import ora, { Ora } from 'ora';
import { colors } from './theme.js';

export class Spinner {
  private spinner: Ora | null = null;

  start(text: string): void {
    if (this.spinner) {
      this.spinner.text = colors.dim(text);
      this.spinner.start();
    } else {
      this.spinner = ora({
        text: colors.dim(text),
        color: 'cyan',
        spinner: 'dots',
      }).start();
    }
  }

  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  succeed(text: string): void {
    if (this.spinner) {
      this.spinner.succeed(colors.success(text));
    }
  }

  fail(text: string): void {
    if (this.spinner) {
      this.spinner.fail(colors.error(text));
    }
  }

  warn(text: string): void {
    if (this.spinner) {
      this.spinner.warn(colors.warning(text));
    }
  }

  info(text: string): void {
    if (this.spinner) {
      this.spinner.info(colors.info(text));
    }
  }

  updateText(text: string): void {
    if (this.spinner) {
      this.spinner.text = colors.dim(text);
    }
  }
}

export const spinner = new Spinner();
