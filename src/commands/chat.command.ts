/**
 * Modern Chat Command - Gemini CLI Style
 * Refactored with modular utilities for robust, clean code
 */

import inquirer from 'inquirer';
import { configManager } from '../services/config.service.js';
import { ToolExecutor, TOOL_DEFINITIONS } from '../tools/executor.js';
import { TerminalUI } from '../ui/terminal.js';
import { ChatMessage } from '../types/index.js';
import {
  createSessionTimer,
  estimateTokens,
  getSessionSummary,
  executeToolCall,
  formatToolMessage,
  type ToolCall,
  formatUserMessage,
  formatAIMessage,
  formatSystemMessage,
  formatErrorMessage,
  formatSeparator,
  formatReasoning,
  colors,
  createInputPrompt,
  createStatusBar,
  createWelcomeMessage,
  createSessionInfoDisplay,
  isGitRepo,
  getGitStatus,
  getGitLog,
  getGitBranches,
  getGitDiff,
  gitAdd,
  gitCommit,
  generateCommitMessage,
  formatGitStatus,
  formatGitLog,
} from '../utils/index.js';
import { listAllModels, showModelSelectionMenu, switchModel, getCurrentModelMaxTokens } from './model.command.js';
import {
  isTokenLimitApproaching,
  isTokenLimitExceeded,
  getTokenLimitInfo,
  showTokenLimitWarning,
  showTokenLimitError,
  handleTokenLimitReached,
  formatTokenUsage,
} from './token-limit.command.js';

// ============================================================================
// CHAT COMMAND CLASS
// ============================================================================

export class ChatCommand {
  private apiClient: any;
  private historyManager: any;
  private config: any;
  private toolExecutor: ToolExecutor;
  private ui: TerminalUI;
  private allowedTools: Set<string> = new Set();
  private lastResponse: string = '';
  private sessionTimer: ReturnType<typeof createSessionTimer>;
  private tokenCount: number = 0;

  constructor(apiClient: any, historyManager: any, config: any) {
    this.apiClient = apiClient;
    this.historyManager = historyManager;
    this.config = config;
    this.toolExecutor = new ToolExecutor({ config });
    this.ui = new TerminalUI();
    this.sessionTimer = createSessionTimer();
  }

  // ============================================================================
  // MAIN CHAT LOOP
  // ============================================================================

  public async runChatLoop(
    messages: ChatMessage[],
    sessionId: string,
    options: any = {}
  ): Promise<void> {
    this.displaySessionInfo(sessionId);

    while (true) {
      const input = await this.ui.ask(createInputPrompt());
      const trimmed = input.trim();

      if (!trimmed) continue;

      // Handle exit commands anywhere
      if (['/quit', '/exit', 'quit', 'exit'].includes(trimmed.toLowerCase())) {
        break;
      }

      // Handle internal commands
      if (trimmed.startsWith('/')) {
        const shouldExit = await this.handleInternalCommand(trimmed, messages, sessionId);
        if (shouldExit) break;
        continue;
      }

      // Add user message to history
      messages.push({ role: 'user', content: trimmed });
      this.ui.log(formatUserMessage(trimmed) + '\n');

      // Check token limit
      const maxTokens = getCurrentModelMaxTokens(this.config.model);
      if (isTokenLimitExceeded(this.tokenCount, maxTokens)) {
        const info = getTokenLimitInfo(this.config.model, maxTokens, this.tokenCount);
        this.ui.log(showTokenLimitError(info));

        const action = await handleTokenLimitReached(info, this.historyManager, sessionId);
        if (action === 'exit') break;
        if (action === 'switch-model') {
          await showModelSelectionMenu({
            config: this.config,
            apiClient: this.apiClient,
            ui: this.ui,
          });
          this.tokenCount = 0;
        }
        continue;
      }

      // Show warning if approaching limit
      if (isTokenLimitApproaching(this.tokenCount, maxTokens, 0.8)) {
        const info = getTokenLimitInfo(this.config.model, maxTokens, this.tokenCount);
        this.ui.log(showTokenLimitWarning(info) + '\n');
      }

      // Process AI response
      try {
        await this.processAIResponse(messages, sessionId);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (err instanceof Error && err.name !== 'AbortError') {
          this.ui.log(formatErrorMessage(errorMessage));
        }
      }
    }

    this.displaySessionSummary();
    this.ui.close();
  }

  // ============================================================================
  // SESSION DISPLAY
  // ============================================================================

  private displaySessionInfo(sessionId: string): void {
    const startTime = this.sessionTimer.startTime.toLocaleTimeString();

    this.ui.log(createStatusBar({ workspace: process.cwd() }));
    this.ui.log(createWelcomeMessage());
    this.ui.log(createSessionInfoDisplay({
      id: sessionId,
      model: this.config.model,
      startTime,
    }));
    this.ui.log('\n');
  }

  private displaySessionSummary(): void {
    const info = {
      id: '',
      model: this.config.model,
      startedAt: this.sessionTimer.startTime,
      duration: this.sessionTimer.elapsed(),
      tokenEstimate: this.tokenCount,
      messageCount: 0,
    };

    this.ui.log(`\n${colors.dim('┌' + '─'.repeat(50))}\n`);
    this.ui.log(`${colors.dim('│')} ${colors.bold('Session Summary')}\n`);
    this.ui.log(`${colors.dim('│')} ${colors.dim(getSessionSummary(info))}\n`);
    this.ui.log(`${colors.dim('│')} ${colors.dim('👋 Goodbye!')}\n`);
    this.ui.log(`${colors.dim('└' + '─'.repeat(50))}\n`);
  }

  // ============================================================================
  // INTERNAL COMMANDS
  // ============================================================================

  private async handleInternalCommand(
    input: string,
    messages: ChatMessage[],
    sessionId: string
  ): Promise<boolean> {
    const parts = input.slice(1).split(' ');
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (command) {
      case 'quit':
      case 'exit':
        return true;
      case 'clear':
      case 'cls':
        messages.length = 0;
        messages.push({ role: 'system', content: this.config.systemPrompt });
        this.ui.log(formatSystemMessage('Conversation history cleared'));
        break;
      case 'help':
      case '?':
        this.displayHelp();
        break;
      case 'copy':
      case 'cp':
        this.copyLastResponse();
        break;
      case 'model':
        if (args.trim() === 'select') {
          await showModelSelectionMenu({
            config: this.config,
            apiClient: this.apiClient,
            ui: this.ui,
          });
          // Restore stdin after inquirer prompt steals it
          await this.ui.restoreAsync();
        } else {
          this.ui.log(formatSystemMessage('Usage: /model select (opens interactive menu)'));
        }
        break;
      case 'models':
        await listAllModels({
          config: this.config,
          apiClient: this.apiClient,
          ui: this.ui,
        });
        break;
      case 'settings':
      case 'config':
      case 'cfg':
        await this.showSettings();
        break;
      case 'stats':
      case 'usage':
        this.showStats();
        break;
      case 'session':
        await this.handleSessionCommand(args, sessionId);
        break;
      case 'share':
        this.shareConversation();
        break;
      case 'tools':
        this.listTools();
        break;
      case 'reset':
        await this.resetConversation(messages);
        break;
      case 'about':
        this.showAbout();
        break;
      case 'theme':
        await this.cycleTheme();
        break;
      case 'init':
        await this.initProjectContext();
        break;
      case 'git':
        await this.handleGitCommand(args);
        break;
      default:
        this.ui.log(formatSystemMessage(`Unknown command: /${command}. Type /help for available commands`));
    }

    return false;
  }

  private displayHelp(): void {
    const commands = [
      { cmd: '/quit, /exit', desc: 'Exit the chat session' },
      { cmd: '/clear, /cls', desc: 'Clear conversation history' },
      { cmd: '/copy, /cp', desc: 'Copy last AI response' },
      { cmd: '/help, /?', desc: 'Show this help message' },
      { cmd: '/model select', desc: 'Open interactive model selection menu' },
      { cmd: '/models', desc: 'List all available models with details' },
      { cmd: '/settings, /cfg', desc: 'Show current settings' },
      { cmd: '/stats, /usage', desc: 'Show session statistics' },
      { cmd: '/session <id>', desc: 'Switch to a session' },
      { cmd: '/share', desc: 'Export conversation as markdown' },
      { cmd: '/tools', desc: 'List available AI tools' },
      { cmd: '/reset', desc: 'Reset conversation with system prompt' },
      { cmd: '/about', desc: 'Show version and build info' },
      { cmd: '/theme', desc: 'Cycle through visual themes' },
      { cmd: '/init', desc: 'Analyze project and generate context file' },
      { cmd: '/git <sub>', desc: 'Git integration (status, log, diff, commit)' },
    ];

    this.ui.log(`\n${colors.bold('📚 Available Commands')}\n`);
    this.ui.log(`${formatSeparator()}\n`);

    for (const { cmd, desc } of commands) {
      this.ui.log(`  ${colors.primary(cmd.padEnd(18))} ${colors.dim(desc)}\n`);
    }

    this.ui.log(`${formatSeparator()}\n`);
  }

  private copyLastResponse(): void {
    if (!this.lastResponse) {
      this.ui.log(formatSystemMessage('No response to copy'));
      return;
    }

    try {
      const clipboardy = require('clipboardy');
      clipboardy.writeSync(this.lastResponse);
      this.ui.log(formatSystemMessage('✓ Last response copied to clipboard'));
    } catch {
      this.ui.log(formatSystemMessage(`Clipboard not available. Response: ${this.lastResponse.length} chars`));
    }
  }

  private async showSettings(): Promise<void> {
    let exitSettings = false;

    while (!exitSettings) {
      const config = this.config;

      // Display current settings in header
      this.ui.log(`\n${colors.bold('⚙️  CLI Settings')}\n`);
      this.ui.log(`${formatSeparator()}\n`);
      this.ui.log(`  ${colors.dim('Model:')} ${colors.secondary(config.model)}\n`);
      this.ui.log(`  ${colors.dim('Max Tokens:')} ${colors.white(config.maxTokens)}\n`);
      this.ui.log(`  ${colors.dim('Temperature:')} ${colors.white(config.temperature)}\n`);
      this.ui.log(`  ${colors.dim('Top P:')} ${colors.white(config.topP)}\n`);
      this.ui.log(`  ${colors.dim('Thinking:')} ${config.enableThinking ? colors.green('Enabled') : colors.dim('Disabled')}\n`);
      this.ui.log(`  ${colors.dim('History:')} ${config.historyEnabled ? colors.green('Enabled') : colors.dim('Disabled')}\n`);
      this.ui.log(`  ${colors.dim('Streaming:')} ${config.streamEnabled ? colors.green('Enabled') : colors.dim('Disabled')}\n`);
      this.ui.log(`${formatSeparator()}\n`);

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to change?',
          choices: [
            { name: '🤖 Change Model', value: 'model' },
            { name: '📊 Max Tokens', value: 'maxTokens' },
            { name: '🌡️  Temperature', value: 'temperature' },
            { name: '🎯 Top P', value: 'topP' },
            { name: '🧠 Toggle Thinking Mode', value: 'enableThinking' },
            { name: '💾 Toggle History', value: 'historyEnabled' },
            { name: '🔄 Toggle Streaming', value: 'streamEnabled' },
            new inquirer.Separator(),
            { name: '✅ Done', value: 'exit' },
          ],
        },
      ]);

      switch (action) {
        case 'model':
          await showModelSelectionMenu({
            config: this.config,
            apiClient: this.apiClient,
            ui: this.ui,
          });
          await this.ui.restoreAsync();
          break;

        case 'maxTokens': {
          const { value } = await inquirer.prompt([
            {
              type: 'number',
              name: 'value',
              message: 'Enter new Max Tokens:',
              default: this.config.maxTokens,
              validate: (v: number) => (v > 0 && v <= 100000 ? true : 'Must be between 1 and 100,000'),
            },
          ]);
          await this.ui.restoreAsync();
          await configManager.update({ maxTokens: value });
          this.ui.log(formatSystemMessage(`✓ Max Tokens set to: ${value}`));
          break;
        }

        case 'temperature': {
          const { value } = await inquirer.prompt([
            {
              type: 'number',
              name: 'value',
              message: 'Enter new Temperature (0-2):',
              default: this.config.temperature,
              validate: (v: number) => (v >= 0 && v <= 2 ? true : 'Must be between 0 and 2'),
            },
          ]);
          await this.ui.restoreAsync();
          await configManager.update({ temperature: value });
          this.ui.log(formatSystemMessage(`✓ Temperature set to: ${value}`));
          break;
        }

        case 'topP': {
          const { value } = await inquirer.prompt([
            {
              type: 'number',
              name: 'value',
              message: 'Enter new Top P (0-1):',
              default: this.config.topP,
              validate: (v: number) => (v >= 0 && v <= 1 ? true : 'Must be between 0 and 1'),
            },
          ]);
          await this.ui.restoreAsync();
          await configManager.update({ topP: value });
          this.ui.log(formatSystemMessage(`✓ Top P set to: ${value}`));
          break;
        }

        case 'enableThinking': {
          await configManager.update({ enableThinking: !this.config.enableThinking });
          this.ui.log(
            formatSystemMessage(
              `✓ Thinking mode ${this.config.enableThinking ? 'disabled' : 'enabled'}`
            )
          );
          break;
        }

        case 'historyEnabled': {
          await configManager.update({ historyEnabled: !this.config.historyEnabled });
          this.ui.log(
            formatSystemMessage(
              `✓ History ${this.config.historyEnabled ? 'disabled' : 'enabled'}`
            )
          );
          break;
        }

        case 'streamEnabled': {
          await configManager.update({ streamEnabled: !this.config.streamEnabled });
          this.ui.log(
            formatSystemMessage(
              `✓ Streaming ${this.config.streamEnabled ? 'disabled' : 'enabled'}`
            )
          );
          break;
        }

        case 'exit':
          exitSettings = true;
          this.ui.log(formatSystemMessage('Settings saved.'));
          break;
      }
    }
  }

  private showStats(): void {
    const maxTokens = getCurrentModelMaxTokens(this.config.model);

    this.ui.log(`\n${colors.bold('📊 Session Statistics')}\n`);
    this.ui.log(`${formatSeparator()}\n`);
    this.ui.log(`  ${colors.dim('Duration:')} ${colors.white(this.sessionTimer.elapsed())}\n`);
    this.ui.log(`  ${colors.dim('Tokens:')} ${formatTokenUsage(this.tokenCount, maxTokens)}\n`);
    this.ui.log(`  ${colors.dim('Model:')} ${colors.secondary(this.config.model)}\n`);
    this.ui.log(`${formatSeparator()}\n`);
  }

  private async handleSessionCommand(args: string, sessionId: string): Promise<void> {
    if (!args) {
      this.ui.log(formatSystemMessage('Usage: /session <session-id>'));
      this.ui.log(formatSystemMessage('Use luxyie history list to see sessions'));
      return;
    }

    const targetSession = await this.historyManager.loadSession(args.trim());
    if (!targetSession) {
      this.ui.log(formatErrorMessage(`Session not found: ${args.trim()}`));
      return;
    }

    this.ui.log(formatSystemMessage(`Switched to session: ${colors.info(args.trim())}`));
  }

  private shareConversation(): void {
    this.ui.log(formatSystemMessage('Share feature coming soon!'));
  }

  private listTools(): void {
    const tools = [
      { name: 'write_file', desc: 'Create or update files' },
      { name: 'run_command', desc: 'Execute shell commands' },
      { name: 'read_file', desc: 'Read file contents' },
      { name: 'list_directory', desc: 'Explore directory structure' },
      { name: 'web_search', desc: 'Search the web via DuckDuckGo' },
      { name: 'web_fetch', desc: 'Fetch content from URLs' },
      { name: 'web_viewer', desc: 'Browser automation' },
      { name: 'read_image', desc: 'Analyze images with vision AI' },
    ];

    this.ui.log(`\n${colors.bold('🛠️  Available Tools')}\n`);
    this.ui.log(`${formatSeparator()}\n`);

    for (const tool of tools) {
      this.ui.log(`  ${colors.primary('•')} ${colors.bold(tool.name.padEnd(18))} ${colors.dim(tool.desc)}\n`);
    }

    this.ui.log(`${formatSeparator()}\n`);
  }

  private async resetConversation(messages: ChatMessage[]): Promise<void> {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Reset conversation? This will clear history and reload system prompt.',
        default: false,
      },
    ]);

    if (confirm) {
      messages.length = 0;
      messages.push({ role: 'system', content: this.config.systemPrompt });
      this.ui.log(formatSystemMessage('Conversation reset with fresh system prompt'));
    }
  }

  // ============================================================================
  // AI RESPONSE PROCESSING
  // ============================================================================

  private async processAIResponse(
    messages: ChatMessage[],
    sessionId: string
  ): Promise<void> {
    const { TOOL_DEFINITIONS } = await import('../tools/executor.js');
    let currentMessages = [...messages];
    let needsMoreTools = true;

    while (needsMoreTools) {
      needsMoreTools = false;
      let assistantContent = '';
      let toolCalls: any[] = [];

      if (this.config.streamEnabled) {
        const result = await this.streamResponse(currentMessages, TOOL_DEFINITIONS);
        assistantContent = result.content;
        toolCalls = result.toolCalls;
      } else {
        const result = await this.nonStreamResponse(currentMessages, TOOL_DEFINITIONS);
        assistantContent = result.content;
        toolCalls = result.toolCalls;

        if (assistantContent) {
          this.ui.log(formatAIMessage(assistantContent));
        }
      }

      this.lastResponse = assistantContent;
      this.tokenCount += estimateTokens(assistantContent);

      if (toolCalls.length > 0) {
        const toolResults = await this.handleToolCalls(
          toolCalls,
          currentMessages,
          assistantContent,
          sessionId
        );
        currentMessages = toolResults.messages;
        needsMoreTools = toolResults.needsMoreTools;
        this.ui.restore();
      } else if (assistantContent) {
        await this.historyManager.addMessage(sessionId, {
          role: 'assistant',
          content: assistantContent,
        });
      }
    }

    messages.splice(0, messages.length, ...currentMessages);
  }

  private async streamResponse(
    messages: ChatMessage[],
    tools: any[]
  ): Promise<{ content: string; toolCalls: any[] }> {
    let fullContent = '';
    let toolCalls: any[] = [];
    let hasStartedReasoning = false;

    this.ui.log(formatAIMessage('', true));

    const response = await this.apiClient.sendMessage(messages, {
      tools,
      callbacks: {
        onReasoning: (reasoning: string) => {
          if (!hasStartedReasoning) {
            this.ui.log(formatSystemMessage('💭 Thinking...'));
            hasStartedReasoning = true;
          }
          process.stdout.write(formatReasoning(reasoning));
        },
        onData: (chunk: string) => {
          if (hasStartedReasoning) {
            hasStartedReasoning = false;
            this.ui.log('\n');
          }
          process.stdout.write(chunk);
        },
        onDone: () => console.log('\n'),
      },
    }, true);

    fullContent = response?.content || '';
    toolCalls = response?.tool_calls || [];

    return { content: fullContent, toolCalls };
  }

  private async nonStreamResponse(
    messages: ChatMessage[],
    tools: any[]
  ): Promise<{ content: string; toolCalls: any[] }> {
    const response = await this.apiClient.sendMessage(messages, { tools }, false);

    return {
      content: response?.content || '',
      toolCalls: response?.tool_calls || [],
    };
  }

  // ============================================================================
  // TOOL EXECUTION
  // ============================================================================

  private async handleToolCalls(
    toolCalls: any[],
    messages: ChatMessage[],
    assistantContent: string,
    sessionId: string
  ): Promise<{ messages: ChatMessage[]; needsMoreTools: boolean }> {
    messages.push({
      role: 'assistant',
      content: assistantContent || null,
      tool_calls: toolCalls,
    });
    await this.historyManager.addMessage(sessionId, messages[messages.length - 1]);

    const MAX_TOOL_CALLS = 5;
    let callsThisCycle = 0;

    for (const toolCall of toolCalls) {
      if (callsThisCycle >= MAX_TOOL_CALLS) {
        this.ui.log(formatSystemMessage('⚠️ Tool call limit reached for this turn. Please respond to the user.'));
        return { messages, needsMoreTools: false };
      }

      const name = toolCall.function.name;
      const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};

      const intentMessage = this.generateIntentMessage(name, args);
      if (intentMessage) {
        this.ui.log(formatAIMessage(intentMessage) + '\n');
      }

      const toolDef = TOOL_DEFINITIONS.find(td => td.function.name === name);

      const result = await executeToolCall(
        toolCall as ToolCall,
        this.toolExecutor,
        { 
          allowedTools: this.allowedTools,
          requiresConfirmation: toolDef?.requiresConfirmation ?? false
        }
      );

      const reflectionMessage = this.generateReflectionMessage(name, args, result);
      if (reflectionMessage) {
        this.ui.log(formatAIMessage(reflectionMessage) + '\n');
      }

      messages.push(formatToolMessage(result));
      await this.historyManager.addMessage(sessionId, messages[messages.length - 1]);

      callsThisCycle++;
    }

    return { messages, needsMoreTools: callsThisCycle > 0 };
  }

  private generateIntentMessage(toolName: string, args: any): string | null {
    switch (toolName) {
      case 'read_file':
        return `I'm going to read the file \`${args.path || 'unspecified'}\` to analyze its content.`;
      case 'write_file':
        return `I'm going to create/update the file \`${args.path || 'unspecified'}\`.`;
      case 'list_directory':
        return `I'm going to list files in \`${args.path || '.'}\`.`;
      case 'run_command':
        return `I'm going to execute the command: \`${args.command || 'unspecified'}\`.`;
      case 'web_search':
        return `I'm going to search the web for: "${args.query || '...'}".`;
      case 'web_fetch':
        return `I'm going to fetch content from: \`${args.url || 'URL unspecified'}\`.`;
      case 'web_viewer':
        return `I'm going to open the browser to access \`${args.url || '...'}\`.`;
      case 'read_image':
        return `I'm going to analyze the image \`${args.path || 'unspecified'}\`.`;
      default:
        return `I'm going to execute the tool: ${toolName}.`;
    }
  }

  private generateReflectionMessage(toolName: string, args: any, result: any): string | null {
    const success = result.success !== false;
    const prefix = success ? '✓' : '✗';

    switch (toolName) {
      case 'read_file':
        return success ? `${prefix} File \`${args.path}\` read successfully.` : `${prefix} Could not read file \`${args.path}\`.`;
      case 'write_file':
        return success ? `${prefix} File \`${args.path}\` saved successfully.` : `${prefix} Failed to save file \`${args.path}\`.`;
      case 'list_directory':
        return success ? `${prefix} Directory \`${args.path || '.'}\` listed successfully.` : `${prefix} Failed to list directory.`;
      case 'run_command':
        return success ? `${prefix} Command executed successfully.` : `${prefix} Command failed.`;
      case 'web_search':
        return success ? `${prefix} Search completed. Found relevant results.` : `${prefix} Search returned no results.`;
      case 'web_fetch':
        return success ? `${prefix} URL content fetched successfully.` : `${prefix} Failed to fetch content.`;
      case 'web_viewer':
        return success ? `${prefix} Navigation completed.` : `${prefix} Navigation failed.`;
      case 'read_image':
        return success ? `${prefix} Image analyzed successfully.` : `${prefix} Failed to analyze image.`;
      default:
        return success ? `${prefix} Tool ${toolName} executed successfully.` : `${prefix} Tool ${toolName} failed.`;
    }
  }

  // ============================================================================
  // ADDITIONAL COMMANDS
  // ============================================================================

  private showAbout(): void {
    this.ui.log(`\n${colors.bold('🤖 Luxyie AI CLI')}\n`);
    this.ui.log(`${formatSeparator()}\n`);
    this.ui.log(`  ${colors.dim('Version:')} ${colors.secondary('1.7.5')}\n`);
    this.ui.log(`  ${colors.dim('Node.js:')} ${colors.white(process.version)}\n`);
    this.ui.log(`  ${colors.dim('Platform:')} ${colors.white(process.platform)} ${colors.white(process.arch)}\n`);
    this.ui.log(`  ${colors.dim('Repository:')} ${colors.accent.underline('https://github.com/shindozk/luxyie.ai-cli')}\n`);
    this.ui.log(`${formatSeparator()}\n`);
  }

  private async cycleTheme(): Promise<void> {
    const themes = ['Purple (default)', 'Blue', 'Green', 'Orange'];

    this.ui.log(`\n${colors.bold('🎨 Visual Themes')}\n`);
    this.ui.log(`${formatSeparator()}\n`);

    for (const theme of themes) {
      const isCurrent = theme === 'Purple (default)';
      const marker = isCurrent ? '●' : '○';
      this.ui.log(`  ${colors.dim(marker)} ${isCurrent ? colors.bold(theme) : theme}\n`);
    }

    this.ui.log(`${formatSeparator()}\n`);
    this.ui.log(formatSystemMessage('Theme customization coming in a future update!'));
  }

  private async initProjectContext(): Promise<void> {
    this.ui.log(formatSystemMessage('🔍 Analyzing project structure...'));

    try {
      const fs = await import('fs-extra');
      const path = await import('node:path');

      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const hasPackageJson = await fs.pathExists(packageJsonPath);
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      const hasGitignore = await fs.pathExists(gitignorePath);
      const files = await fs.readdir(process.cwd());
      const dirs = files.filter((f: string) => {
        try { return fs.statSync(path.join(process.cwd(), f)).isDirectory(); } catch { return false; }
      });

      this.ui.log(formatSystemMessage(`✓ Project analyzed:`));
      this.ui.log(`  ${colors.dim('Root:')} ${colors.white(process.cwd())}\n`);
      this.ui.log(`  ${colors.dim('Directories:')} ${colors.white(dirs.slice(0, 10).join(', '))}${dirs.length > 10 ? '...' : ''}\n`);
      this.ui.log(`  ${colors.dim('package.json:')} ${hasPackageJson ? colors.green('Yes') : colors.dim('No')}\n`);
      this.ui.log(`  ${colors.dim('.gitignore:')} ${hasGitignore ? colors.green('Yes') : colors.dim('No')}\n`);
      this.ui.log(formatSystemMessage('Use /tools to explore files or ask questions about the project.'));
    } catch (error: any) {
      this.ui.log(formatErrorMessage(`Failed to analyze project: ${error.message}`));
    }
  }

  // ============================================================================
  // GIT COMMANDS
  // ============================================================================

  private async handleGitCommand(args: string): Promise<void> {
    if (!isGitRepo()) {
      this.ui.log(formatSystemMessage('Not a git repository. Initialize with `git init` first.'));
      return;
    }

    const parts = args.trim().split(' ');
    const subcommand = parts[0]?.toLowerCase();
    const extraArgs = parts.slice(1).join(' ');

    switch (subcommand) {
      case 'status':
      case 'st':
        await this.gitStatus();
        break;
      case 'log':
        await this.gitLog(extraArgs);
        break;
      case 'diff':
        await this.gitDiff(extraArgs);
        break;
      case 'branch':
      case 'branches':
        await this.gitBranch();
        break;
      case 'add':
        await this.gitAdd(extraArgs);
        break;
      case 'commit':
        await this.gitCommit(extraArgs);
        break;
      case 'ai-commit':
      case 'aic':
        await this.gitAICommit();
        break;
      case 'help':
      case '':
        this.gitHelp();
        break;
      default:
        this.ui.log(formatSystemMessage(`Unknown git subcommand: ${subcommand}. Type /git help for usage.`));
    }
  }

  private async gitStatus(): Promise<void> {
    const status = getGitStatus();
    if (!status) {
      this.ui.log(formatSystemMessage('Failed to get git status.'));
      return;
    }

    this.ui.log(`\n${colors.bold('📂 Git Status')}\n`);
    this.ui.log(`${formatSeparator()}\n`);
    this.ui.log(formatGitStatus(status) + '\n');
    this.ui.log(`${formatSeparator()}\n`);
  }

  private async gitLog(args: string): Promise<void> {
    const count = parseInt(args, 10) || 10;
    const commits = getGitLog(Math.min(count, 50));

    if (commits.length === 0) {
      this.ui.log(formatSystemMessage('No commits found.'));
      return;
    }

    this.ui.log(`\n${colors.bold('📝 Recent Commits')}\n`);
    this.ui.log(`${formatSeparator()}\n`);
    this.ui.log(formatGitLog(commits) + '\n');
    this.ui.log(`${formatSeparator()}\n`);
  }

  private async gitDiff(args: string): Promise<void> {
    const diff = getGitDiff(1000);
    if (!diff) {
      this.ui.log(formatSystemMessage('No changes to show or not a git repo.'));
      return;
    }
    if (!diff.trim()) {
      this.ui.log(formatSystemMessage('No unstaged changes.'));
      return;
    }

    this.ui.log(`\n${colors.bold('📄 Git Diff')}\n`);
    this.ui.log(`${formatSeparator()}\n`);
    this.ui.log(`${colors.dim(diff)}\n`);
    this.ui.log(`${formatSeparator()}\n`);
  }

  private async gitBranch(): Promise<void> {
    const branches = getGitBranches();
    if (branches.length === 0) {
      this.ui.log(formatSystemMessage('No branches found.'));
      return;
    }

    this.ui.log(`\n${colors.bold('🌿 Branches')}\n`);
    this.ui.log(`${formatSeparator()}\n`);

    for (const branch of branches) {
      const marker = branch.current ? colors.green('●') : colors.dim('○');
      const name = branch.current ? colors.bold(branch.name) : branch.name;
      this.ui.log(`  ${marker} ${name}\n`);
    }

    this.ui.log(`${formatSeparator()}\n`);
  }

  private async gitAdd(args: string): Promise<void> {
    const files = args || '.';
    const result = gitAdd(files);

    if (result.success) {
      this.ui.log(formatSystemMessage(`✓ Staged: ${files}`));
    } else {
      this.ui.log(formatErrorMessage(`Failed to stage: ${result.output}`));
    }
  }

  private async gitCommit(message: string): Promise<void> {
    if (!message) {
      this.ui.log(formatSystemMessage('Usage: /git commit <message> or /git ai-commit'));
      return;
    }

    const result = gitCommit(message);
    if (result.success) {
      this.ui.log(formatSystemMessage(`✓ Committed: ${message}`));
    } else {
      this.ui.log(formatErrorMessage(`Failed to commit: ${result.output}`));
    }
  }

  private async gitAICommit(): Promise<void> {
    const status = getGitStatus();
    if (!status) {
      this.ui.log(formatSystemMessage('Failed to get git status.'));
      return;
    }

    const totalChanges = status.staged.length + status.modified.length + status.untracked.length;
    if (totalChanges === 0) {
      this.ui.log(formatSystemMessage('No changes to commit. Stage files first with /git add.'));
      return;
    }

    this.ui.log(formatSystemMessage('🤖 Generating AI commit message...'));
    gitAdd('.');

    const updatedStatus = getGitStatus();
    if (!updatedStatus) return;

    const commitMessage = await generateCommitMessage(this.apiClient, updatedStatus);
    this.ui.log(formatSystemMessage(`Suggested commit message: ${colors.bold(commitMessage)}`));

    const result = gitCommit(commitMessage);
    if (result.success) {
      this.ui.log(formatSystemMessage(`✓ Committed: ${commitMessage}`));
    } else {
      this.ui.log(formatErrorMessage(`Failed to commit: ${result.output}`));
    }
  }

  private gitHelp(): void {
    const commands = [
      { cmd: '/git status', desc: 'Show current git status' },
      { cmd: '/git log [n]', desc: 'Show recent commits (default 10)' },
      { cmd: '/git diff', desc: 'Show unstaged changes' },
      { cmd: '/git branch', desc: 'List branches' },
      { cmd: '/git add [files]', desc: 'Stage files (default: all)' },
      { cmd: '/git commit <msg>', desc: 'Create commit with message' },
      { cmd: '/git ai-commit', desc: 'Generate AI commit message and commit' },
    ];

    this.ui.log(`\n${colors.bold('🔧 Git Commands')}\n`);
    this.ui.log(`${formatSeparator()}\n`);

    for (const { cmd, desc } of commands) {
      this.ui.log(`  ${colors.primary(cmd.padEnd(22))} ${colors.dim(desc)}\n`);
    }

    this.ui.log(`${formatSeparator()}\n`);
  }
}
