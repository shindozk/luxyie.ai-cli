import inquirer from 'inquirer';
import type { HistoryManager } from '../services/history.service.js';
import { colors, success, error, warning, formatDate, truncate } from '../ui/theme.js';

export class HistoryCommand {
  private historyManager: HistoryManager;

  constructor(historyManager: HistoryManager) {
    this.historyManager = historyManager;
  }

  async execute(subcommand?: string, sessionId?: string): Promise<void> {
    switch (subcommand) {
      case 'list':
        await this.listSessions();
        break;
      case 'show':
        if (sessionId) {
          await this.showSession(sessionId);
        } else {
          await this.selectAndShowSession();
        }
        break;
      case 'delete':
        if (sessionId) {
          await this.deleteSession(sessionId);
        } else {
          await this.selectAndDeleteSession();
        }
        break;
      case 'clear':
        await this.clearAllSessions();
        break;
      case 'export':
        await this.exportSession(sessionId);
        break;
      default:
        await this.interactiveMenu();
    }
  }

  private async listSessions(): Promise<void> {
    const sessions = await this.historyManager.loadAllSessions();
    
    if (sessions.length === 0) {
      console.log(warning('No sessions found.'));
      return;
    }

    console.log(colors.bold(`\n📚 Total of ${sessions.length} session(s):\n`));
    
    sessions.forEach((session, index) => {
      const messageCount = session.messages.length;
      const date = formatDate(session.updatedAt);
      console.log(`  ${colors.dim(`${index + 1}.`)} ${truncate(session.title, 40)}`);
      console.log(`     ${colors.dim(`${messageCount} messages • ${date}`)}`);
      console.log(`     ${colors.dim('ID:')} ${session.id}`);
      console.log('');
    });
  }

  private async showSession(sessionId: string): Promise<void> {
    const session = await this.historyManager.loadSession(sessionId);
    
    if (!session) {
      console.log(error('Session not found.'));
      return;
    }

    console.log(colors.bold(`\n💬 ${session.title}\n`));
    console.log(colors.dim(`Created: ${formatDate(session.createdAt)}`));
    console.log(colors.dim(`Updated: ${formatDate(session.updatedAt)}`));
    console.log(colors.dim(`Messages: ${session.messages.length}`));
    console.log('');
    console.log(divider());

    for (const message of session.messages) {
      const prefix: Record<string, string> = {
        system: colors.dim('System'),
        user: colors.user('You'),
        assistant: colors.primary('Luxyie'),
        tool: colors.accent('Tool'),
      };

      if (message.role !== 'system') {
        console.log(`\n${prefix[message.role] || message.role}:`);
        console.log(message.content || colors.dim('(No text content)'));
      }
    }

    console.log('\n' + divider());
  }

  private async deleteSession(sessionId: string): Promise<void> {
    const success_delete = await this.historyManager.deleteSession(sessionId);
    
    if (success_delete) {
      console.log(success('Session deleted successfully!'));
    } else {
      console.log(error('Session not found.'));
    }
  }

  private async clearAllSessions(): Promise<void> {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to delete ALL sessions?',
        default: false,
      },
    ]);

    if (confirm) {
      await this.historyManager.clearAllSessions();
      console.log(success('All sessions have been deleted!'));
    }
  }

  private async exportSession(sessionId?: string): Promise<void> {
    let targetId = sessionId;
    
    if (!targetId) {
      const sessions = await this.historyManager.loadAllSessions();
      if (sessions.length === 0) {
        console.log(error('No sessions to export.'));
        return;
      }

      const { selected } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selected',
          message: 'Select a session to export:',
          choices: sessions.map(s => ({
            name: `${truncate(s.title, 35)} (${s.messages.length} msgs)`,
            value: s.id,
          })),
        },
      ]);
      targetId = selected;
    }

    const session = await this.historyManager.loadSession(targetId!);
    if (!session) {
      console.log(error('Session not found.'));
      return;
    }

    const { format } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: [
          { name: 'JSON', value: 'json' },
          { name: 'Markdown', value: 'md' },
          { name: 'Text', value: 'txt' },
        ],
      },
    ]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `luxyie-export-${timestamp}.${format}`;

    const fs = await import('fs-extra');
    
    if (format === 'json') {
      await fs.writeJson(filename, session, { spaces: 2 });
    } else if (format === 'md') {
      const content = this.toMarkdown(session as any);
      await fs.writeFile(filename, content);
    } else {
      const content = this.toText(session as any);
      await fs.writeFile(filename, content);
    }

    console.log(success(`Session exported to: ${filename}`));
  }

  private toMarkdown(session: { title: string; createdAt: Date; messages: Array<{ role: string; content: string | null }> }): string {
    let md = `# ${session.title}\n\n`;
    md += `> Created: ${session.createdAt.toISOString()}\n\n`;
    
    for (const msg of session.messages) {
      if (msg.role === 'user') {
        md += `## 👤 You\n\n${msg.content || ''}\n\n`;
      } else if (msg.role === 'assistant') {
        md += `## 🤖 Luxyie\n\n${msg.content || '(Tool usage)'}\n\n`;
      } else if (msg.role === 'tool') {
        md += `### 🔧 Tool Result\n\n\`\`\`\n${msg.content || ''}\n\`\`\`\n\n`;
      }
    }
    
    return md;
  }

  private toText(session: { title: string; createdAt: Date; messages: Array<{ role: string; content: string | null }> }): string {
    let text = `Session: ${session.title}\n`;
    text += `Created: ${session.createdAt.toISOString()}\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    for (const msg of session.messages) {
      const label = msg.role.toUpperCase();
      text += `[${label}]\n${msg.content || ''}\n\n`;
    }
    
    return text;
  }

  private async selectAndShowSession(): Promise<void> {
    const sessions = await this.historyManager.loadAllSessions();
    if (sessions.length === 0) {
      console.log(warning('No sessions found.'));
      return;
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select a session:',
        choices: sessions.map(s => ({
          name: `${truncate(s.title, 35)} (${s.messages.length} msgs)`,
          value: s.id,
        })),
      },
    ]);

    await this.showSession(selected);
  }

  private async selectAndDeleteSession(): Promise<void> {
    const sessions = await this.historyManager.loadAllSessions();
    if (sessions.length === 0) {
      console.log(warning('No sessions found.'));
      return;
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select a session to delete:',
        choices: sessions.map(s => ({
          name: `${truncate(s.title, 35)} (${s.messages.length} msgs)`,
          value: s.id,
        })),
      },
    ]);

    await this.deleteSession(selected);
  }

  private async interactiveMenu(): Promise<void> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { name: '📋 List all sessions', value: 'list' },
          { name: '👀 View a session', value: 'show' },
          { name: '🗑️  Delete a session', value: 'delete' },
          { name: '📤 Export a session', value: 'export' },
          { name: '💥 Clear all sessions', value: 'clear' },
          new inquirer.Separator(),
          { name: '❌ Exit', value: 'exit' },
        ],
      },
    ]);

    if (action !== 'exit') {
      await this.execute(action);
    }
  }
}

function divider(): string {
  return '─'.repeat(50);
}
