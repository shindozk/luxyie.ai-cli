/**
 * Modern Chat Command - Gemini CLI Style
 * Refactored with modular utilities for robust, clean code
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { ToolExecutor } from '../tools/executor.js';
import { TerminalUI } from '../ui/terminal.js';
import { ChatMessage } from '../types/index.js';
import {
  // Session management
  createSessionTimer,
  estimateTokens,
  getSessionSummary,
  // Tool execution
  parseToolArgs,
  executeToolCall,
  formatToolMessage,
  type ToolCall,
  // Message formatting
  formatUserMessage,
  formatAIMessage,
  formatSystemMessage,
  formatErrorMessage,
  formatSeparator,
  formatToolStatus,
  formatReasoning,
  // Components
  colors,
  createInputPrompt,
  createStatusBar,
  createWelcomeMessage,
  createSessionInfoDisplay,
} from '../utils/index.js';
import { AVAILABLE_MODELS, getModelConfig } from '../services/models.js';

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

      // Trim and handle input
      const trimmed = input.trim();

      // Skip empty input
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

      // Add user message to history and display it
      messages.push({ role: 'user', content: trimmed });
      this.ui.log(formatUserMessage(trimmed) + '\n');

      // Process AI response
      try {
        await this.processAIResponse(messages, sessionId);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        // Ignore abort errors silently
        if (err instanceof Error && err.name !== 'AbortError') {
          this.ui.log(formatErrorMessage(errorMessage));
        }
      }
    }

    this.displaySessionSummary();
    this.ui.close();
  }

  // ============================================================================
  // SESSION DISPLAY - Minimalist Style
  // ============================================================================

  private displaySessionInfo(sessionId: string): void {
    const startTime = this.sessionTimer.startTime.toLocaleTimeString();

    // Status bar (no box)
    this.ui.log(createStatusBar({
      workspace: process.cwd(),
    }));

    // Welcome message (compact, no box)
    this.ui.log(createWelcomeMessage());

    // Session info (minimalist, no box)
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
        await this.handleModelCommand(args);
        break;

      case 'models':
        await this.listModelsMenu();
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
      { cmd: '/model <id>', desc: 'Switch to a specific model directly' },
      { cmd: '/models', desc: 'List all available models with selection menu' },
      { cmd: '/settings, /cfg', desc: 'Show current settings' },
      { cmd: '/stats, /usage', desc: 'Show session statistics' },
      { cmd: '/session <id>', desc: 'Switch to a session' },
      { cmd: '/share', desc: 'Export conversation as markdown' },
      { cmd: '/tools', desc: 'List available AI tools' },
      { cmd: '/reset', desc: 'Reset conversation with system prompt' },
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

  // ============================================================================
  // MODEL COMMANDS - Interactive Menu
  // ============================================================================

  private async handleModelCommand(args: string): Promise<void> {
    if (!args) {
      // If no argument, show interactive menu
      await this.listModelsMenu();
      return;
    }

    // Direct model switch: /model select <id>
    const parts = args.split(' ');
    if (parts[0] === 'select' && parts[1]) {
      await this.switchModel(parts[1]);
      return;
    }

    // Try direct switch with model ID
    await this.switchModel(args.trim());
  }

  private async switchModel(modelId: string): Promise<void> {
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);

    if (!modelConfig) {
      this.ui.log(formatErrorMessage(`Model not found: ${modelId}`));
      this.ui.log(formatSystemMessage('Use /models to see available models'));
      return;
    }

    this.config.model = modelId;
    this.apiClient.setModel(modelId);

    this.ui.log(formatSystemMessage(`✓ Model switched to: ${colors.secondary(modelId)}`));
    this.ui.log(formatSystemMessage(`Temperature: ${modelConfig.temperature} | Max tokens: ${modelConfig.max_tokens}`));
  }

  private async listModelsMenu(): Promise<void> {
    this.ui.log(`\n${colors.bold('🤖 Available Models')}\n`);
    this.ui.log(`${formatSeparator(60)}\n`);

    const choices: { name: string; value: string | null }[] = AVAILABLE_MODELS.map((model) => {
      const isCurrent = model.id === this.config.model;
      const reasoning = model.supportsReasoning ? colors.info(' [thinking]') : '';
      const marker = isCurrent ? colors.green('●') : colors.dim('○');

      return {
        name: `${marker} ${isCurrent ? colors.bold(model.id) : model.id}${reasoning} ${colors.dim(`(temp: ${model.temperature})`)}`,
        value: model.id,
      };
    });

    choices.push(new (inquirer as any).Separator('─'.repeat(50)));
    choices.push({ name: '❌ Cancel', value: null });

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select a model:',
        choices,
        pageSize: 15,
      },
    ]);

    if (selected) {
      await this.switchModel(selected);
    } else {
      this.ui.log(formatSystemMessage('Model selection cancelled'));
    }
  }

  private async showSettings(): Promise<void> {
    const config = this.config;

    this.ui.log(`\n${colors.bold('⚙️  Current Settings')}\n`);
    this.ui.log(`${formatSeparator()}\n`);
    this.ui.log(`  ${colors.dim('Model:')} ${colors.secondary(config.model)}\n`);
    this.ui.log(`  ${colors.dim('Max Tokens:')} ${colors.white(config.maxTokens)}\n`);
    this.ui.log(`  ${colors.dim('Temperature:')} ${colors.white(config.temperature)}\n`);
    this.ui.log(`  ${colors.dim('Top P:')} ${colors.white(config.topP)}\n`);
    this.ui.log(`  ${colors.dim('Thinking:')} ${config.enableThinking ? colors.green('Enabled') : colors.dim('Disabled')}\n`);
    this.ui.log(`  ${colors.dim('History:')} ${config.historyEnabled ? colors.green('Enabled') : colors.dim('Disabled')}\n`);
    this.ui.log(`  ${colors.dim('Streaming:')} ${config.streamEnabled ? colors.green('Enabled') : colors.dim('Disabled')}\n`);
    this.ui.log(`${formatSeparator()}\n`);
  }

  private showStats(): void {
    const info = {
      id: '',
      model: this.config.model,
      startedAt: this.sessionTimer.startTime,
      duration: this.sessionTimer.elapsed(),
      tokenEstimate: this.tokenCount,
      messageCount: 0,
    };

    this.ui.log(`\n${colors.bold('📊 Session Statistics')}\n`);
    this.ui.log(`${formatSeparator()}\n`);
    this.ui.log(`  ${colors.dim('Duration:')} ${colors.white(info.duration)}\n`);
    this.ui.log(`  ${colors.dim('Est. Tokens:')} ${colors.white(`~${this.tokenCount}`)}\n`);
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

      // Store last response and estimate tokens
      this.lastResponse = assistantContent;
      this.tokenCount += estimateTokens(assistantContent);

      // Handle tool calls
      if (toolCalls.length > 0) {
        const toolResults = await this.handleToolCalls(
          toolCalls,
          currentMessages,
          assistantContent,
          sessionId
        );
        currentMessages = toolResults.messages;
        needsMoreTools = toolResults.needsMoreTools;
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

    // Display streaming header
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

    // Get final content and tool calls from response
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
    // Save assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: assistantContent || null,
      tool_calls: toolCalls,
    });
    await this.historyManager.addMessage(sessionId, messages[messages.length - 1]);

    // Limit tool calls per cycle to prevent infinite loops
    const MAX_TOOL_CALLS = 5;
    let callsThisCycle = 0;

    for (const toolCall of toolCalls) {
      // Check if we've exceeded the limit
      if (callsThisCycle >= MAX_TOOL_CALLS) {
        this.ui.log(formatSystemMessage('⚠️ Tool call limit reached for this turn. Please respond to the user.'));
        return { messages, needsMoreTools: false };
      }

      const name = toolCall.function.name;
      const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};

      // 1. Display what the AI is ABOUT to do (like Gemini CLI)
      const intentMessage = this.generateIntentMessage(name, args);
      if (intentMessage) {
        this.ui.log(formatAIMessage(intentMessage) + '\n');
      }

      // 2. Execute the tool with approval
      const result = await executeToolCall(
        toolCall as ToolCall,
        this.toolExecutor,
        {
          allowedTools: this.allowedTools,
        }
      );

      // 3. Display what the AI JUST did (like Gemini CLI)
      const reflectionMessage = this.generateReflectionMessage(name, args, result);
      if (reflectionMessage) {
        this.ui.log(formatAIMessage(reflectionMessage) + '\n');
      }

      // 4. Add tool result to messages
      messages.push(formatToolMessage(result));
      await this.historyManager.addMessage(sessionId, messages[messages.length - 1]);

      callsThisCycle++;
    }

    // If we used tools, we need another turn to process results
    return { messages, needsMoreTools: callsThisCycle > 0 };
  }

  /**
   * Generate an intent message explaining what the AI is about to do
   */
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

  /**
   * Generate a reflection message explaining what the AI just did
   */
  private generateReflectionMessage(toolName: string, args: any, result: any): string | null {
    const success = result.success !== false;
    const prefix = success ? '✓' : '✗';

    switch (toolName) {
      case 'read_file':
        return success
          ? `${prefix} File \`${args.path}\` read successfully.`
          : `${prefix} Could not read file \`${args.path}\`.`;
      case 'write_file':
        return success
          ? `${prefix} File \`${args.path}\` saved successfully.`
          : `${prefix} Failed to save file \`${args.path}\`.`;
      case 'list_directory':
        return success
          ? `${prefix} Directory \`${args.path || '.'}\` listed successfully.`
          : `${prefix} Failed to list directory.`;
      case 'run_command':
        return success
          ? `${prefix} Command executed successfully.`
          : `${prefix} Command failed.`;
      case 'web_search':
        return success
          ? `${prefix} Search completed. Found relevant results.`
          : `${prefix} Search returned no results.`;
      case 'web_fetch':
        return success
          ? `${prefix} URL content fetched successfully.`
          : `${prefix} Failed to fetch content.`;
      case 'web_viewer':
        return success
          ? `${prefix} Navigation completed.`
          : `${prefix} Navigation failed.`;
      case 'read_image':
        return success
          ? `${prefix} Image analyzed successfully.`
          : `${prefix} Failed to analyze image.`;
      default:
        return success
          ? `${prefix} Tool ${toolName} executed successfully.`
          : `${prefix} Tool ${toolName} failed.`;
    }
  }
}
