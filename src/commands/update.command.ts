import chalk from 'chalk';
import { updateService } from '../services/update.service.js';

/**
 * Update Command
 * Handles manual update checks and auto-updates
 * Similar to `gemini update` command
 */
export class UpdateCommand {
  /**
   * Execute update command
   * @param action - 'check' | 'install' | 'status'
   */
  async execute(action: string = 'check'): Promise<void> {
    switch (action) {
      case 'check':
        await this.checkForUpdates();
        break;
      case 'install':
      case 'update':
        await this.performUpdate();
        break;
      case 'status':
        this.showStatus();
        break;
      default:
        console.log(chalk.yellow('Usage: luxyie update [check|install|status]'));
        console.log(chalk.dim('  check   - Check for available updates'));
        console.log(chalk.dim('  install - Install the latest update'));
        console.log(chalk.dim('  status  - Show current version info'));
    }
  }

  /**
   * Check for updates and display result
   */
  private async checkForUpdates(): Promise<void> {
    console.log(chalk.blue('🔍 Checking for updates...\n'));
    
    const { updateAvailable, latest, current } = await updateService.getUpdateInfo();
    
    if (updateAvailable && latest && current) {
      console.log(updateService.createUpdateBox(latest, current));
    } else {
      console.log(chalk.green('✅ You are using the latest version!'));
      console.log(chalk.dim(`Current version: ${updateService.getVersion()}`));
    }
  }

  /**
   * Perform auto-update
   */
  private async performUpdate(): Promise<void> {
    const { updateAvailable } = await updateService.getUpdateInfo();
    
    if (!updateAvailable) {
      console.log(chalk.green('✅ Already on the latest version!'));
      return;
    }
    
    const success = await updateService.performUpdate();
    
    if (success) {
      console.log(chalk.green('\n🎉 Luxyie AI CLI has been updated!'));
      console.log(chalk.dim('Please restart your terminal for changes to take effect.'));
    } else {
      console.log(chalk.red('\n❌ Update failed. Please try manually:'));
      console.log(chalk.cyan(`   npm update -g ${updateService.getPackageName()}`));
    }
  }

  /**
   * Show current version status
   */
  private showStatus(): void {
    console.log(chalk.bold('📦 Luxyie AI CLI'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log(`Current version: ${chalk.cyan(updateService.getVersion())}`);
    console.log(`Package:         ${chalk.cyan(updateService.getPackageName())}`);
    console.log(chalk.dim('─'.repeat(40)));
    console.log(chalk.dim('Run "luxyie update check" to check for updates'));
  }
}
