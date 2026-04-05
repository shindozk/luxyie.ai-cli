import { Command } from 'commander';
import chalk from 'chalk';
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

async function printBanner(): Promise<void> {
  const config = configManager.get();
  await printHeaderWithLogo(config.version || '1.0.0');
}

async function checkSetup(): Promise<boolean> {
  await configManager.init();
  return true;
}

async function getHistoryManager() {
  await configManager.init();
  const historyManager = new HistoryManager(configManager.getHistoryDir());
  await historyManager.init();
  return historyManager;
}

async function startChat(options: any) {
  await printBanner();
  const { createStatusBar, createWelcomeMessage } = await import('../ui/components.js');
  const config = configManager.get();
  const historyManager = await getHistoryManager();
  const apiClient = new APIClient(config.apiKey, config.apiUrl, config.model);
  const chat = new ChatCommand(apiClient, historyManager, config);

  // Sessão: carrega ou cria
  let sessionId = options.session;
  let session;
  if (sessionId) {
    session = await historyManager.loadSession(sessionId);
    if (!session) {
      // Se não existe, cria nova
      sessionId = await historyManager.createSession(config.systemPrompt);
      session = await historyManager.loadSession(sessionId);
    }
  } else {
    sessionId = await historyManager.createSession(config.systemPrompt);
    session = await historyManager.loadSession(sessionId);
  }

  // Exibe barra de status
  const workspace = process.cwd();
  console.log(createStatusBar({
    model: config.model,
    session: sessionId,
    workspace
  }));
  // Exibe mensagem de comandos ao iniciar o chat
  console.log(createWelcomeMessage());

  // Inicializa o histórico
  const messages = session?.messages?.length ? [...session.messages] : [{ role: 'system', content: config.systemPrompt }];
  const keepAlive = setInterval(() => {}, 1000);

  try {
    await chat.runChatLoop(messages, sessionId, options);
  } finally {
    clearInterval(keepAlive);
  }
}

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

  // Check for updates on startup (non-blocking, silent)
  updateService.checkForUpdates().catch(() => {});

  // Command: chat
  program
    .command('chat')
    .description('Start an interactive chat session')
    .option('-s, --session <id>', 'Load a specific session ID')
    .option('-f, --file <path>', 'Attach a file to the conversation')
    .option('--no-history', 'Disable history for this session')
    .option('--no-stream', 'Disable response streaming')
    .action(async (options) => {
      if (!(await checkSetup())) return;
      await startChat(options);
    });

  // Command: ask
  program
    .command('ask')
    .description('Ask a quick question to the AI without starting a chat session')
    .argument('<question>', 'The question to ask')
    .option('--no-stream', 'Disable response streaming')
    .action(async (question, options) => {
      if (!(await checkSetup())) return;
      const config = configManager.get();
      const apiClient = new APIClient(config.apiKey, config.apiUrl, config.model);
      const ask = new AskCommand(apiClient, config);
      await ask.execute(question, options);
    });

  // Command: config
  const configCmd = program.command('config').description('Manage CLI settings');

  configCmd.command('show').description('Display current configuration').action(async () => {
    await configManager.init();
    new ConfigCommand(configManager).execute('show');
  });

  configCmd.command('set').description('Update configuration interactively').action(async () => {
    await configManager.init();
    new ConfigCommand(configManager).execute('set');
  });

  configCmd.command('reset').description('Reset configuration to defaults').action(async () => {
    await configManager.init();
    new ConfigCommand(configManager).execute('reset');
  });

  // Command: history
  const historyCmd = program.command('history').description('Manage and view conversation history');

  historyCmd.command('list').description('List all previous sessions').action(async () => {
    const historyManager = await getHistoryManager();
    new HistoryCommand(historyManager).execute('list');
  });

  historyCmd.command('show <id>').description('Show details of a specific session').action(async (id) => {
    const historyManager = await getHistoryManager();
    new HistoryCommand(historyManager).execute('show', id);
  });

  historyCmd.command('clear').description('Remove all session history').option('-f, --force', 'Skip confirmation').action(async (options) => {
    const historyManager = await getHistoryManager();
    new ClearCommand(historyManager).execute(options.force);
  });

  // Command: update
  program
    .command('update')
    .description('Check for and install updates')
    .argument('[action]', 'Action to perform: check, install, or status', 'check')
    .action(async (action) => {
      const updateCmd = new UpdateCommand();
      await updateCmd.execute(action);
    });

  return program;
}

export { startChat };
