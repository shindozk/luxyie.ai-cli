/**
 * Update Service
 * Handles checking for updates and auto-updating the CLI
 * Checks directly from npm registry API on startup and every 5 minutes
 */

import { execSync } from 'child_process';
import axios from 'axios';
import chalk from 'chalk';
import boxen from 'boxen';

export interface UpdateInfo {
  updateAvailable: boolean;
  latest?: string | undefined;
  current?: string | undefined;
  latestTag?: string | undefined;
  publishedAt?: string | undefined;
}

export class UpdateService {
  private packageName: string;
  private currentVersion: string;
  private updateCheckInterval: number = 1000 * 60 * 5; // 5 minutes
  private lastCheckTime: number = 0;
  private cachedUpdateInfo: UpdateInfo | null = null;
  private hasShownNotification: boolean = false;

  constructor() {
    this.currentVersion = process.env.APP_VERSION || '1.7.5';
    this.packageName = process.env.APP_NAME || 'luxyie.ai-cli';
  }

  /**
   * Fetch latest version directly from npm registry
   */
  private async fetchLatestFromRegistry(): Promise<{ version: string; publishedAt: string } | null> {
    try {
      // Fetch the package info to get the latest dist-tag
      const response = await axios.get(`https://registry.npmjs.org/${this.packageName}`, {
        timeout: 5000,
      });

      const latestVersion = response.data['dist-tags']?.latest;
      if (!latestVersion) {
        return null;
      }

      const publishedAt = response.data.time?.[latestVersion] || '';

      return {
        version: latestVersion,
        publishedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check for updates on startup (called once when CLI starts)
   */
  async checkOnStartup(): Promise<void> {
    if (this.hasShownNotification) return;

    const info = await this.getUpdateInfo();
    if (info.updateAvailable && info.latest) {
      this.showUpdateNotification(info.latest, info.current || this.currentVersion, info.publishedAt);
      this.hasShownNotification = true;
    }
  }

  /**
   * Check for updates periodically during chat
   * Only checks if 5 minutes have passed since last check
   */
  async checkPeriodically(): Promise<UpdateInfo | null> {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastCheckTime;

    // Skip if we checked recently
    if (timeSinceLastCheck < this.updateCheckInterval && this.cachedUpdateInfo) {
      // Only show notification if we haven't already
      if (!this.hasShownNotification && this.cachedUpdateInfo.updateAvailable && this.cachedUpdateInfo.latest) {
        this.showUpdateNotification(
          this.cachedUpdateInfo.latest,
          this.cachedUpdateInfo.current || this.currentVersion,
          this.cachedUpdateInfo.publishedAt
        );
        this.hasShownNotification = true;
      }
      return null;
    }

    this.lastCheckTime = now;
    const info = await this.getUpdateInfo();
    this.cachedUpdateInfo = info;

    // Show notification if update available and we haven't shown it yet
    if (info.updateAvailable && info.latest) {
      this.showUpdateNotification(info.latest, info.current || this.currentVersion, info.publishedAt);
      this.hasShownNotification = true;
    }

    return info;
  }

  /**
   * Get update info by fetching from npm registry
   */
  async getUpdateInfo(): Promise<UpdateInfo> {
    try {
      const latest = await this.fetchLatestFromRegistry();
      if (!latest) {
        return { updateAvailable: false };
      }

      const current = this.currentVersion;
      // Only show update if latest is GREATER than current
      const hasUpdate = this.isVersionGreaterThan(latest.version, current);

      // Debug logging (can be removed in production)
      if (process.env.DEBUG) {
        console.error(`[Update] Current: ${current}, Latest: ${latest.version}, HasUpdate: ${hasUpdate}`);
      }

      return {
        updateAvailable: hasUpdate,
        latest: latest.version,
        current: current,
        publishedAt: latest.publishedAt,
      };
    } catch (error) {
      // Silently fail if npm registry is unreachable
      return { updateAvailable: false };
    }
  }

  /**
   * Compare two semver versions
   * Returns: 1 if a > b, -1 if a < b, 0 if equal
   */
  private compareVersions(a: string, b: string): number {
    // Strip any pre-release or build metadata
    const cleanA = (a.split('-')[0]) || '';
    const cleanB = (b.split('-')[0]) || '';

    const partsA = cleanA.split('.').map(Number);
    const partsB = cleanB.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;

      if (numA > numB) return 1;
      if (numA < numB) return -1;
    }

    return 0;
  }

  /**
   * Check if version a is greater than version b
   */
  private isVersionGreaterThan(a: string, b: string): boolean {
    return this.compareVersions(a, b) > 0;
  }

  /**
   * Perform auto-update by running npm install
   */
  async performUpdate(): Promise<boolean> {
    console.log(chalk.blue('🔄 Checking for updates...'));

    try {
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
  createUpdateBox(latest: string, current: string, publishedAt?: string): string {
    const dateInfo = publishedAt ? `\n${chalk.dim('Published:')} ${chalk.dim(new Date(publishedAt).toLocaleDateString())}` : '';

    const message = [
      chalk.yellow.bold('⚡ Update available!'),
      '',
      `${chalk.dim('Current:')} ${chalk.red(current)}`,
      `${chalk.dim('Latest:')}  ${chalk.green(latest)}${dateInfo}`,
      '',
      chalk.dim('Run ') + chalk.cyan.bold('luxyie update install') + chalk.dim(' to update'),
      chalk.dim('Or: ') + chalk.cyan(`npm update -g ${this.packageName}`),
    ].join('\n');

    return boxen(message, {
      padding: 1,
      borderColor: 'yellow',
      borderStyle: 'round',
      title: ` ${this.packageName} `,
      titleAlignment: 'center',
    });
  }

  /**
   * Show update notification in CLI
   */
  showUpdateNotification(latest: string, current: string, publishedAt?: string): void {
    console.log('');
    console.log(this.createUpdateBox(latest, current, publishedAt));
    console.log('');
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

  /**
   * Reset the notification flag
   */
  resetNotificationFlag(): void {
    this.hasShownNotification = false;
  }
}

// Singleton instance
export const updateService = new UpdateService();
