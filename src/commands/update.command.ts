/**
 * Modern Update Command - Gemini CLI Style
 * Clean update management with status display
 */

import chalk from 'chalk';
import { updateService } from '../services/update.service.js';
import { colors } from '../ui/components.js';

export class UpdateCommand {
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
      case 'info':
        this.showStatus();
        break;
      default:
        this.showHelp();
    }
  }

  // ============================================================================
  // CHECK FOR UPDATES
  // ============================================================================

  private async checkForUpdates(): Promise<void> {
    console.log(`\n${colors.info('🔍')} ${colors.bold('Checking for updates...')}\n`);

    const { updateAvailable, latest, current } = await updateService.getUpdateInfo();

    if (updateAvailable && latest && current) {
      console.log(updateService.createUpdateBox(latest, current));
      console.log(`\n${colors.dim('Run luxyie update install to upgrade')}\n`);
    } else {
      console.log(`${colors.success('✓')} ${colors.green('You are using the latest version!')}`);
      console.log(`${colors.dim('Current version:')} ${colors.white(updateService.getVersion())}\n`);
    }
  }

  // ============================================================================
  // PERFORM UPDATE
  // ============================================================================

  private async performUpdate(): Promise<void> {
    const { updateAvailable } = await updateService.getUpdateInfo();

    if (!updateAvailable) {
      console.log(`\n${colors.success('✓')} ${colors.green('Already on the latest version!')}\n`);
      return;
    }

    console.log(`\n${colors.info('⬇')} ${colors.bold('Downloading update...')}\n`);

    const success = await updateService.performUpdate();

    if (success) {
      console.log(`\n${colors.success('🎉')} ${colors.green('Luxyie AI CLI updated successfully!')}`);
      console.log(`${colors.dim('Restart your terminal for changes to take effect.')}\n`);
    } else {
      console.log(`\n${colors.error('✗')} ${colors.red('Update failed.')}`);
      console.log(`${colors.dim('Try manually:')} ${colors.cyan(`npm update -g ${updateService.getPackageName()}`)}\n`);
    }
  }

  // ============================================================================
  // SHOW STATUS
  // ============================================================================

  private showStatus(): void {
    const version = updateService.getVersion();
    const packageName = updateService.getPackageName();

    console.log(`\n${colors.bold('📦 Luxyie AI CLI')}\n`);
    console.log(`${colors.dim('─'.repeat(50))}`);
    console.log(`  ${colors.dim('Package:')} ${colors.white(packageName)}`);
    console.log(`  ${colors.dim('Version:')} ${colors.secondary(version)}`);
    console.log(`${colors.dim('─'.repeat(50))}\n`);
    console.log(`${colors.dim('Commands:')}\n`);
    console.log(`  ${colors.primary('luxyie update check')}   ${colors.dim('- Check for updates')}`);
    console.log(`  ${colors.primary('luxyie update install')} ${colors.dim('- Install latest version')}`);
    console.log(`  ${colors.primary('luxyie update status')}  ${colors.dim('- Show version info')}\n`);
  }

  // ============================================================================
  // HELP
  // ============================================================================

  private showHelp(): void {
    console.log(`\n${colors.bold('📦 Update Commands')}\n`);
    console.log(`${colors.dim('─'.repeat(50))}`);
    console.log(`  ${colors.primary('check')}   ${colors.dim('- Check for available updates')}`);
    console.log(`  ${colors.primary('install')} ${colors.dim('- Install the latest update')}`);
    console.log(`  ${colors.primary('status')}  ${colors.dim('- Show current version info')}`);
    console.log(`${colors.dim('─'.repeat(50))}\n`);
  }
}
