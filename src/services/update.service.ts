import updateNotifier from 'update-notifier';
import { execSync } from 'child_process';
import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Update Service
 * Handles checking for updates and auto-updating the CLI
 * Similar to Gemini CLI's auto-update functionality
 */
export class UpdateService {
  private packageName: string;
  private currentVersion: string;
  private updateCheckInterval: number = 1000 * 60 * 60; // 1 hour (in ms)

  constructor() {
    this.currentVersion = process.env.APP_VERSION || '1.0.0';
    this.packageName = process.env.APP_NAME || 'luxyie.ai-cli';
  }

  /**
   * Check for updates and notify user if available
   * Uses update-notifier for smart caching
   */
  async checkForUpdates(): Promise<{ updateAvailable: boolean; latest?: string | undefined; current?: string | undefined }> {
    const notifier = updateNotifier({
      pkg: {
        name: this.packageName,
        version: this.currentVersion,
      },
      updateCheckInterval: this.updateCheckInterval,
      shouldNotifyInNpmScript: true,
    });

    // Notify user about update
    notifier.notify({
      defer: false,
      isGlobal: true,
    });

    return {
      updateAvailable: !!notifier.update,
      latest: notifier.update?.latest,
      current: notifier.update?.current,
    };
  }

  /**
   * Get update info without showing notification
   */
  async getUpdateInfo(): Promise<{ updateAvailable: boolean; latest?: string | undefined; current?: string | undefined }> {
    const notifier = updateNotifier({
      pkg: {
        name: this.packageName,
        version: this.currentVersion,
      },
      updateCheckInterval: 0, // Check immediately
      shouldNotifyInNpmScript: true,
    });

    return {
      updateAvailable: !!notifier.update,
      latest: notifier.update?.latest,
      current: notifier.update?.current,
    };
  }

  /**
   * Perform auto-update by running npm install
   */
  async performUpdate(): Promise<boolean> {
    console.log(chalk.blue('🔄 Checking for updates...'));
    
    try {
      // Run npm update -g for global installation
      execSync(`npm update -g ${this.packageName}`, {
        stdio: ['inherit', 'inherit', 'inherit'] as const,
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
      });
      
      console.log(chalk.green('\n✅ Update completed successfully!'));
      console.log(chalk.dim('Run `luxyie --version` to verify the new version.'));
      return true;
    } catch (error) {
      console.error(chalk.red('\n❌ Update failed:'), error);
      console.log(chalk.yellow('\nTry updating manually:'));
      console.log(chalk.white(`  npm update -g ${this.packageName}`));
      return false;
    }
  }

  /**
   * Create styled update notification box
   */
  createUpdateBox(latest: string, current: string): string {
    const message = [
      chalk.yellow('Update available!'),
      '',
      `${chalk.dim('Current:')} ${chalk.red(current)}`,
      `${chalk.dim('Latest:')}  ${chalk.green(latest)}`,
      '',
      `Run ${chalk.cyan('luxyie update')} to update`,
      `Or: ${chalk.cyan(`npm update -g ${this.packageName}`)}`,
    ].join('\n');

    return boxen(message, {
      padding: 1,
      borderColor: 'yellow',
      borderStyle: 'round',
      title: '⚡ Luxyie AI CLI',
      titleAlignment: 'center',
    });
  }

  /**
   * Show update notification in CLI
   */
  showUpdateNotification(latest: string, current: string): void {
    console.log(this.createUpdateBox(latest, current));
  }

  /**
   * Get current version
   */
  getVersion(): string {
    return this.currentVersion;
  }

  /**
   * Get package name
   */
  getPackageName(): string {
    return this.packageName;
  }
}

// Singleton instance
export const updateService = new UpdateService();
