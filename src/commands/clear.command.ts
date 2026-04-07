/**
 * Modern Clear Command - Simplified
 * Clean session cleanup with confirmation
 */

import inquirer from 'inquirer';
import type { HistoryManager } from '../services/history.service.js';
import { colors } from '../ui/components.js';

export class ClearCommand {
  private historyManager: HistoryManager;

  constructor(historyManager: HistoryManager) {
    this.historyManager = historyManager;
  }

  async execute(force: boolean = false): Promise<void> {
    const count = await this.historyManager.getSessionCount();

    if (count === 0) {
      console.log(`\n${colors.warning('⚠')} ${colors.yellow('No sessions to clear.')}\n`);
      return;
    }

    if (!force) {
      console.log(`\n${colors.warning('⚠')} ${colors.yellow(`This will delete ${count} session(s).`)}\n`);
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(`\n${colors.dim('Operation cancelled.')}\n`);
        return;
      }
    }

    await this.historyManager.clearAllSessions();
    console.log(`\n${colors.success('✓')} ${colors.green(`${count} session(s) cleared.`)}\n`);
  }
}
