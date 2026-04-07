/**
 * Modern History Command - Gemini CLI Style
 * Clean session management with export and resume features
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import type { HistoryManager } from '../services/history.service.js';
import { colors, formatDate, truncate } from '../ui/components.js';

export class HistoryCommand {
  private historyManager: HistoryManager;

  constructor(historyManager: HistoryManager) {
    this.historyManager = historyManager;
  }

  async execute(subcommand?: string, sessionId?: string): Promise<void> {
    switch (subcommand) {
      case 'list':
      case 'ls':
        await this.listSessions();
        break;
      case 'show':
      case 'view':
        if (sessionId) {
          await this.showSession(sessionId);
        } else {
          await this.selectAndShowSession();
        }
        break;
      case 'delete':
      case 'rm':
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
      case 'resume':
        if (sessionId) {
          await this.resumeSession(sessionId);
        } else {
          await this.selectAndResumeSession();
        }
        break;
      default:
        await this.interactiveMenu();
    }
  }

  // ============================================================================
  // LIST SESSIONS
  // ============================================================================

  private async listSessions(): Promise<void> {
    const sessions = await this.historyManager.loadAllSessions();

    if (sessions.length === 0) {
      console.log(`\n${colors.warning('⚠')} ${colors.yellow('No sessions found.')}\n`);
      return;
    }

    console.log(`\n${colors.bold(`📚 ${sessions.length} Session(s)`)}\n`);
    console.log(`${colors.dim('─'.repeat(60))}`);

    sessions.forEach((session, index) => {
      const messageCount = session.messages.length;
      const date = formatDate(session.updatedAt);
      const num = colors.dim(`${index + 1}.`);
      const title = truncate(session.title, 35);
      const meta = colors.dim(`${messageCount} msgs • ${date}`);
      const id = colors.dim(session.id);

      console.log(`\n  ${num} ${colors.bold(title)}`);
      console.log(`     ${meta}`);
      console.log(`     ${colors.dim('ID:')} ${id}`);
    });

    console.log(`\n${colors.dim('─'.repeat(60))}\n`);
    console.log(`${colors.dim('Use luxyie history show <id> to view a session')}\n`);
  }

  // ============================================================================
  // SHOW SESSION
  // ============================================================================

  private async showSession(sessionId: string): Promise<void> {
    const session = await this.historyManager.loadSession(sessionId);

    if (!session) {
      console.log(`\n${colors.error('✗')} ${colors.red('Session not found.')}\n`);
      return;
    }

    console.log(`\n${colors.bold(`💬 ${session.title}`)}\n`);
    console.log(`${colors.dim('─'.repeat(50))}`);
    console.log(`${colors.dim('Created:')} ${formatDate(session.createdAt)}`);
    console.log(`${colors.dim('Updated:')} ${formatDate(session.updatedAt)}`);
    console.log(`${colors.dim('Messages:')} ${session.messages.length}`);
    console.log(`${colors.dim('─'.repeat(50))}\n`);

    for (const message of session.messages) {
      if (message.role === 'system') continue;

      const prefix: Record<string, string> = {
        user: colors.user('You'),
        assistant: colors.primary('Luxyie'),
        tool: colors.accent('Tool'),
      };

      console.log(`\n${prefix[message.role] || message.role}:`);
      console.log(message.content || colors.dim('(No content)'));
    }

    console.log(`\n${colors.dim('─'.repeat(50))}\n`);
  }

  // ============================================================================
  // DELETE SESSION
  // ============================================================================

  private async deleteSession(sessionId: string): Promise<void> {
    const deleted = await this.historyManager.deleteSession(sessionId);

    if (deleted) {
      console.log(`\n${colors.success('✓')} ${colors.green('Session deleted.')}\n`);
    } else {
      console.log(`\n${colors.error('✗')} ${colors.red('Session not found.')}\n`);
    }
  }

  // ============================================================================
  // CLEAR ALL SESSIONS
  // ============================================================================

  private async clearAllSessions(): Promise<void> {
    const count = await this.historyManager.getSessionCount();

    if (count === 0) {
      console.log(`\n${colors.warning('⚠')} ${colors.yellow('No sessions to clear.')}\n`);
      return;
    }

    console.log(`\n${colors.warning('⚠')} ${colors.yellow(`This will delete ${count} session(s).`)}\n`);
    
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure?',
        default: false,
      },
    ]);

    if (confirm) {
      await this.historyManager.clearAllSessions();
      console.log(`\n${colors.success('✓')} ${colors.green(`${count} session(s) deleted.`)}\n`);
    } else {
      console.log(`\n${colors.dim('Operation cancelled.')}\n`);
    }
  }

  // ============================================================================
  // EXPORT SESSION
  // ============================================================================

  private async exportSession(sessionId?: string): Promise<void> {
    let targetId = sessionId;

    if (!targetId) {
      const sessions = await this.historyManager.loadAllSessions();
      
      if (sessions.length === 0) {
        console.log(`\n${colors.warning('⚠')} ${colors.yellow('No sessions to export.')}\n`);
        return;
      }

      const { selected } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selected',
          message: 'Select session to export:',
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
      console.log(`\n${colors.error('✗')} ${colors.red('Session not found.')}\n`);
      return;
    }

    const { format } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: [
          { name: '📄 Markdown', value: 'md' },
          { name: '📋 JSON', value: 'json' },
          { name: '📝 Text', value: 'txt' },
        ],
      },
    ]);

    const fs = await import('fs-extra');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `luxyie-export-${timestamp}.${format}`;

    if (format === 'json') {
      await fs.writeJson(filename, session, { spaces: 2 });
    } else if (format === 'md') {
      await fs.writeFile(filename, this.toMarkdown(session));
    } else {
      await fs.writeFile(filename, this.toText(session));
    }

    console.log(`\n${colors.success('✓')} ${colors.green(`Exported to: ${filename}`)}\n`);
  }

  // ============================================================================
  // RESUME SESSION
  // ============================================================================

  private async resumeSession(sessionId: string): Promise<void> {
    const session = await this.historyManager.loadSession(sessionId);

    if (!session) {
      console.log(`\n${colors.error('✗')} ${colors.red('Session not found.')}\n`);
      return;
    }

    console.log(`\n${colors.success('✓')} ${colors.green(`Session ready to resume: ${session.title}`)}\n`);
    console.log(`${colors.dim('Messages:')} ${session.messages.length}\n`);
  }

  // ============================================================================
  // SELECTION HELPERS
  // ============================================================================

  private async selectAndShowSession(): Promise<void> {
    const sessions = await this.historyManager.loadAllSessions();
    
    if (sessions.length === 0) {
      console.log(`\n${colors.warning('⚠')} ${colors.yellow('No sessions found.')}\n`);
      return;
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select session:',
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
      console.log(`\n${colors.warning('⚠')} ${colors.yellow('No sessions found.')}\n`);
      return;
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select session to delete:',
        choices: sessions.map(s => ({
          name: `${truncate(s.title, 35)} (${s.messages.length} msgs)`,
          value: s.id,
        })),
      },
    ]);

    await this.deleteSession(selected);
  }

  private async selectAndResumeSession(): Promise<void> {
    const sessions = await this.historyManager.loadAllSessions();
    
    if (sessions.length === 0) {
      console.log(`\n${colors.warning('⚠')} ${colors.yellow('No sessions found.')}\n`);
      return;
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select session to resume:',
        choices: sessions.map(s => ({
          name: `${truncate(s.title, 35)} (${s.messages.length} msgs)`,
          value: s.id,
        })),
      },
    ]);

    await this.resumeSession(selected);
  }

  // ============================================================================
  // EXPORT FORMATS
  // ============================================================================

  private toMarkdown(session: any): string {
    let md = `# ${session.title}\n\n`;
    md += `> Created: ${session.createdAt.toISOString()}\n\n`;
    md += `---\n\n`;

    for (const msg of session.messages) {
      if (msg.role === 'user') {
        md += `## 👤 You\n\n${msg.content || ''}\n\n`;
      } else if (msg.role === 'assistant') {
        md += `## 🤖 Luxyie\n\n${msg.content || '(Tool usage)'}\n\n`;
      } else if (msg.role === 'tool') {
        md += `### 🔧 Tool: ${msg.name}\n\n\`\`\`\n${msg.content || ''}\n\`\`\`\n\n`;
      }
    }

    return md;
  }

  private toText(session: any): string {
    let text = `Session: ${session.title}\n`;
    text += `Created: ${session.createdAt.toISOString()}\n`;
    text += `${'='.repeat(50)}\n\n`;

    for (const msg of session.messages) {
      const label = msg.role.toUpperCase();
      text += `[${label}]\n${msg.content || ''}\n\n`;
    }

    return text;
  }

  // ============================================================================
  // INTERACTIVE MENU
  // ============================================================================

  private async interactiveMenu(): Promise<void> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'History',
        choices: [
          { name: '📋 List all sessions', value: 'list' },
          { name: '👀 View a session', value: 'show' },
          { name: ' Resume a session', value: 'resume' },
          { name: '📤 Export a session', value: 'export' },
          { name: '🗑️  Delete a session', value: 'delete' },
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
