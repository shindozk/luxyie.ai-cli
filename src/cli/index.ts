/**
 * Modern CLI Setup - Gemini CLI Style
 * Clean command registration with new features
 */

import { Command } from 'commander';
import { configManager } from '../services/config.service.js';
import { APIClient } from '../services/llm.service.js';
import { HistoryManager } from '../services/history.service.js';
import { ChatCommand } from '../commands/chat.command.js';
import { AskCommand } from '../commands/ask.command.js';
import { ConfigCommand } from '../commands/config.command.js';
import { HistoryCommand } from '../commands/history.command.js';
import { ClearCommand } from '../commands/clear.command.js';
import { UpdateCommand } from '../commands/update.command.js';
import { updateService } from '../services/update.service.js';
import { colors, printHeaderWithLogo } from '../ui/components.js';
import { ChatMessage } from '../types/index.js';

// ============================================================================
// BANNER & SETUP
// ============================================================================

async function printBanner(): Promise<void> {
  const config = configManager.get();
  await printHeaderWithLogo(config.version || '1.6.0');
}

async function checkSetup(): Promise<boolean> {
  await configManager.init();
  return true;
}

// ============================================================================
// GLOBAL SIGNALS
// ============================================================================

process.on('SIGINT', () => {
  console.log(`\n\n${colors.dim('👋 Goodbye! Gracefully shutting down...')}`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// ============================================================================
// HISTORY MANAGER
// ============================================================================

async function getHistoryManager(): Promise<HistoryManager> {
  await configManager.init();
  const historyManager = new HistoryManager(configManager.getHistoryDir());
  await historyManager.init();
  return historyManager;
}

// ============================================================================
// START CHAT
// ============================================================================

async function startChat(options: any): Promise<void> {
  await printBanner();
  
  const config = configManager.get();
  const historyManager = await getHistoryManager();
  const apiClient = new APIClient(config.apiKey, config.apiUrl, config.model);
  const chat = new ChatCommand(apiClient, historyManager, config);

  let sessionId = options.session;
  let session;

  if (sessionId) {
    session = await historyManager.loadSession(sessionId);
    if (!session) {
      sessionId = await historyManager.createSession(config.systemPrompt);
      session = await historyManager.loadSession(sessionId);
    }
  } else {
    sessionId = await historyManager.createSession(config.systemPrompt);
    session = await historyManager.loadSession(sessionId);
  }

  const messages: ChatMessage[] = session?.messages?.length
    ? [...session.messages]
    : [{ role: 'system' as const, content: config.systemPrompt }];

  const keepAlive = setInterval(() => {}, 1000);

  try {
    await chat.runChatLoop(messages, sessionId, options);
  } finally {
    clearInterval(keepAlive);
  }
}

// ============================================================================
// CLI SETUP
// ============================================================================

export function setupCLI(): Command {
  const program = new Command();

  program
    .name('luxyie')
    .description('Luxyie AI CLI - Your personal terminal assistant')
    .version(updateService.getVersion(), '-v, --version', 'Show version')
    .helpOption('-h, --help', 'Show help')
    .configureOutput({
      writeOut: (str) => console.log(colors.dim(str)),
      writeErr: (str) => console.error(colors.error(str)),
    });

  // Check for updates on startup (non-blocking)
  updateService.checkForUpdates().catch(() => {});

  // ========================================================================
  // COMMAND: chat
  // ========================================================================
  program
    .command('chat')
    .alias('c')
    .description('Start an interactive chat session')
    .option('-s, --session <id>', 'Load a specific session ID')
    .option('-f, --file <path>', 'Attach a file to the conversation')
    .option('--no-history', 'Disable history for this session')
    .option('--no-stream', 'Disable response streaming')
    .action(async (options) => {
      if (!(await checkSetup())) return;
      await startChat(options);
    });

  // ========================================================================
  // COMMAND: ask
  // ========================================================================
  program
    .command('ask')
    .alias('a')
    .description('Ask a quick question without starting a chat session')
    .argument('<question>', 'The question to ask')
    .option('--no-stream', 'Disable response streaming')
    .action(async (question, options) => {
      if (!(await checkSetup())) return;
      const config = configManager.get();
      const apiClient = new APIClient(config.apiKey, config.apiUrl, config.model);
      const ask = new AskCommand(apiClient, config);
      await ask.execute(question, options);
    });

  // ========================================================================
  // COMMAND: config
  // ========================================================================
  const configCmd = program
    .command('config')
    .alias('cfg')
    .description('Manage CLI settings');

  configCmd
    .command('show')
    .alias('list')
    .description('Display current configuration')
    .action(async () => {
      await configManager.init();
      new ConfigCommand(configManager).execute('show');
    });

  configCmd
    .command('set')
    .alias('edit')
    .description('Update configuration interactively')
    .action(async () => {
      await configManager.init();
      new ConfigCommand(configManager).execute('set');
    });

  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .action(async () => {
      await configManager.init();
      new ConfigCommand(configManager).execute('reset');
    });

  configCmd
    .command('model')
    .description('Show model information')
    .action(async () => {
      await configManager.init();
      new ConfigCommand(configManager).execute('model');
    });

  // ========================================================================
  // COMMAND: history
  // ========================================================================
  const historyCmd = program
    .command('history')
    .alias('h')
    .description('Manage and view conversation history');

  historyCmd
    .command('list')
    .alias('ls')
    .description('List all previous sessions')
    .action(async () => {
      const historyManager = await getHistoryManager();
      new HistoryCommand(historyManager).execute('list');
    });

  historyCmd
    .command('show')
    .alias('view')
    .description('Show details of a specific session')
    .argument('[id]', 'Session ID')
    .action(async (id) => {
      const historyManager = await getHistoryManager();
      new HistoryCommand(historyManager).execute('show', id);
    });

  historyCmd
    .command('resume')
    .description('Resume a previous session')
    .argument('[id]', 'Session ID')
    .action(async (id) => {
      const historyManager = await getHistoryManager();
      new HistoryCommand(historyManager).execute('resume', id);
    });

  historyCmd
    .command('delete')
    .alias('rm')
    .description('Delete a session')
    .argument('[id]', 'Session ID')
    .action(async (id) => {
      const historyManager = await getHistoryManager();
      new HistoryCommand(historyManager).execute('delete', id);
    });

  historyCmd
    .command('clear')
    .description('Remove all session history')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      const historyManager = await getHistoryManager();
      new ClearCommand(historyManager).execute(options.force);
    });

  historyCmd
    .command('export')
    .description('Export a session to file')
    .argument('[id]', 'Session ID')
    .action(async (id) => {
      const historyManager = await getHistoryManager();
      new HistoryCommand(historyManager).execute('export', id);
    });

  // ========================================================================
  // COMMAND: models
  // ========================================================================
  program
    .command('models')
    .alias('m')
    .description('List all available AI models')
    .action(async () => {
      await configManager.init();
      new ConfigCommand(configManager).execute('model');
    });

  // ========================================================================
  // COMMAND: update
  // ========================================================================
  program
    .command('update')
    .alias('up')
    .description('Check for and install updates')
    .argument('[action]', 'Action: check, install, or status', 'check')
    .action(async (action) => {
      const updateCmd = new UpdateCommand();
      await updateCmd.execute(action);
    });

  // ========================================================================
  // COMMAND: clear (shortcut)
  // ========================================================================
  program
    .command('clear')
    .description('Clear all conversation history')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      const historyManager = await getHistoryManager();
      new ClearCommand(historyManager).execute(options.force);
    });

  return program;
}

export { startChat, checkSetup };
