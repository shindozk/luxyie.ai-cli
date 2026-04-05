import type { HistoryManager } from '../services/history.service.js';
import { colors, success, warning } from '../ui/theme.js';

export class ClearCommand {
  private historyManager: HistoryManager;

  constructor(historyManager: HistoryManager) {
    this.historyManager = historyManager;
  }

  async execute(force: boolean = false): Promise<void> {
    const count = await this.historyManager.getSessionCount();

    if (count === 0) {
      console.log(warning('No sessions to clear.'));
      return;
    }

    if (!force) {
      const { confirm } = await import('inquirer').then(m => 
        m.default.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete ${count} session(s)?`,
            default: false,
          },
        ])
      );

      if (!confirm) {
        console.log(colors.dim('Operation cancelled.'));
        return;
      }
    }

    await this.historyManager.clearAllSessions();
    console.log(success(`${count} session(s) deleted successfully!`));
  }
}
