import boxen from 'boxen';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import readline from 'node:readline';
import { ToolExecutor } from '../tools/executor.js';
import { TerminalUI } from '../ui/terminal.js';
import { colors, createInfoBox, createAIMessageBox } from '../ui/components.js';
import clipboardy from 'clipboardy';
import inquirer from 'inquirer';
import { marked } from 'marked';
import { ChatMessage } from '../types/index.js';

export class ChatCommand {
  private historyManager: any;
  private config: any;
  private toolExecutor: any;
  private ui: any;
  private apiClient: any;
  private abortController: AbortController = new AbortController();
  private escHandler: ((ch: any, key: any) => void) | null = null;
  private escActive: boolean = false;

  constructor(apiClient: any, historyManager: any, config: any) {
    this.apiClient = apiClient;
    this.historyManager = historyManager;
    this.config = config;
    this.toolExecutor = new ToolExecutor({ config });
    this.ui = new TerminalUI();
  }

  public async runChatLoop(messages: any[], sessionId: string, options: any = {}) {
    let waitingForInput = true;
    const permissions: Record<string, 'allow' | 'deny' | 'always-allow'> = {};

    // Setup global Esc handler at the START of the chat loop
    this.setupGlobalEscHandler();

    this.ui.render();

    while (waitingForInput) {
      // Disable raw mode for user input to prevent echo duplication
      this.disableRawModeForInput();
      
      const input = await this.ui.ask();
      const trimmedInput = input.trim();
      const lowerInput = trimmedInput.toLowerCase();
      
      // Re-enable raw mode after input for Esc key handling
      this.enableRawModeForEsc();

      if (!trimmedInput) {
        this.ui.render();
        continue;
      }

      if (lowerInput === '/quit' || lowerInput === '/exit' || lowerInput === 'exit') {
        waitingForInput = false;
        break;
      }

      if (lowerInput === '/clear' || lowerInput === 'clear') {
        messages = [{ role: 'system', content: this.config.systemPrompt }];
        this.ui.log(createInfoBox('info', 'Chat cleared', 'Session history has been reset.'));
        continue;
      }

      if (lowerInput === '/help') {
        this.ui.log(boxen(`\n${chalk.hex('#a855f7')('/quit')}    - Exit chat\n${chalk.hex('#a855f7')('/clear')}   - Clear history\n${chalk.hex('#a855f7')('/copy')}    - Copy last response\n${chalk.hex('#a855f7')('/model')}   - Manage models (list/select)\n${chalk.hex('#a855f7')('/history')} - Show current session ID`, { title: 'Available Commands', padding: 1, borderColor: '#6366f1' }));
        continue;
      }

      if (lowerInput === '/copy') {
        const lastAssistantMessage = messages.slice().reverse().find(m => m.role === 'assistant');
        if (lastAssistantMessage && lastAssistantMessage.content) {
          const contentToCopy = typeof lastAssistantMessage.content === 'string' 
            ? lastAssistantMessage.content 
            : JSON.stringify(lastAssistantMessage.content);
          try {
            clipboardy.writeSync(contentToCopy);
            this.ui.log(chalk.green('✓ Copied last response to clipboard!'));
          } catch (err) {
            this.ui.log(chalk.yellow('⚠ Clipboard not available on this platform. Please install xclip/xsel (Linux/Android) or pbcopy (macOS) if needed.'));
          }
        } else {
          this.ui.log(chalk.yellow('⚠ No response available to copy.'));
        }
        continue;
      }

      if (lowerInput === '/history') {
        this.ui.log(createInfoBox('info', 'Current Session', `ID: ${sessionId}`));
        continue;
      }

      if (lowerInput === '/model list') {
        const { AVAILABLE_MODELS } = await import('../services/models.js');
        const modelList = AVAILABLE_MODELS.map(m => 
          m.id === this.apiClient.modelConfig.id 
            ? `${chalk.green('➜')} ${chalk.bold(m.id)} ${chalk.dim('(current)')}`
            : `  ${m.id}`
        ).join('\n');
        this.ui.log(boxen(modelList, { title: 'Available Models', padding: 1, borderColor: '#6366f1' }));
        continue;
      }

      if (lowerInput.startsWith('/model select ')) {
        const targetModel = trimmedInput.replace('/model select ', '').trim();
        const { AVAILABLE_MODELS } = await import('../services/models.js');
        const found = AVAILABLE_MODELS.find(m => m.id === targetModel);
        if (found) {
          this.apiClient.setModel(found.id);
          this.ui.log(chalk.green(`✓ Model changed to ${chalk.bold(found.id)} for this session.`));
        } else {
          this.ui.log(chalk.red(`✗ Model '${targetModel}' not found. Use /model list to see available models.`));
        }
        continue;
      }


      messages.push({ role: 'user', content: trimmedInput });
      
      // Reset abort controller for new message
      this.resetAbortController();

      this.ui.setGenerating(true);

      try {
        const streamEnabled = options.stream !== false && this.config.streamEnabled;
        const { TOOL_DEFINITIONS } = await import('../tools/executor.js');

        if (streamEnabled) {
          let fullResponse = '';
          let wasAborted = false;
          process.stdout.write(`\n${colors.assistant('●')} ${colors.assistant.bold('Luxyie AI')} ${colors.dim('is typing...')}\n   `);

          const response = await this.apiClient.sendMessage(
            messages,
            {
              callbacks: {
                onData: (chunk: string) => {
                  if (this.abortController.signal.aborted) {
                    wasAborted = true;
                    return;
                  }
                  fullResponse += chunk;
                  process.stdout.write(chunk);
                },
                onError: (err: Error) => {
                  if (!this.abortController.signal.aborted) console.error('\n' + colors.error(err.message));
                }
              },
              tools: TOOL_DEFINITIONS
            },
            true
          );

          process.stdout.write('\n');

          if (wasAborted || this.abortController.signal.aborted) {
            this.ui.setGenerating(false);
            process.stdout.write(chalk.yellow('\n⚠️  Interrupted by user (Esc).\n\n'));
            continue;
          }

          if (response?.tool_calls && response.tool_calls.length > 0) {
            await this.handleToolCalls(response.tool_calls, messages, fullResponse, sessionId, permissions, 0);
          } else if (fullResponse.trim()) {
            await this.historyManager.addMessage(sessionId, { role: 'assistant', content: fullResponse });
          }

        } else {
          const response = await this.apiClient.sendMessage(messages, { tools: TOOL_DEFINITIONS }, false);

          if (this.abortController.signal.aborted) {
            this.ui.setGenerating(false);
            process.stdout.write(chalk.yellow('\n⚠️  Interrupted by user (Esc).\n\n'));
            continue;
          }

          if (response?.tool_calls && response.tool_calls.length > 0) {
            await this.handleToolCalls(response.tool_calls, messages, response.content || '', sessionId, permissions, 0);
          } else if (response?.content) {
            console.log(createAIMessageBox(response.content));
            await this.historyManager.addMessage(sessionId, { role: 'assistant', content: response.content });
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && !this.abortController.signal.aborted) {
          console.error(colors.error(`\nError: ${err.message}`));
        }
      } finally {
        this.ui.setGenerating(false);
      }
    }
    this.cleanupEscHandler();
    this.ui.close();
    process.exit(0);
  }

  private setupGlobalEscHandler(): void {
    if (!process.stdin.isTTY || this.escActive) return;

    readline.emitKeypressEvents(process.stdin);
    
    this.escHandler = (ch: any, key: any) => {
      if (key && key.name === 'escape') {
        this.abortController.abort();
        process.stdout.write(chalk.yellow('\n\n⚠️  Interrupted by user (Esc).\n'));
      }
    };

    this.escActive = true;
  }

  private enableRawModeForEsc(): void {
    if (this.escActive && process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.on('keypress', this.escHandler!);
    }
  }

  private disableRawModeForInput(): void {
    if (this.escActive && process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      if (this.escHandler) {
        process.stdin.removeListener('keypress', this.escHandler);
      }
    }
  }

  private cleanupEscHandler(): void {
    if (this.escHandler && process.stdin.isTTY) {
      process.stdin.removeListener('keypress', this.escHandler);
      try {
        process.stdin.setRawMode(false);
      } catch (e) {
        // Ignore if already not in raw mode
      }
      this.escActive = false;
      this.escHandler = null;
    }
  }

  private resetAbortController(): void {
    // Create new abort controller for each message
    this.abortController = new AbortController();
  }

  private async handleToolCalls(
    toolCalls: any[], 
    messages: ChatMessage[], 
    assistantContent: string, 
    sessionId: string, 
    permissions: Record<string, 'allow' | 'deny' | 'always-allow'>,
    depth: number = 0
  ): Promise<void> {
    try {
      if (depth === 0 && assistantContent && assistantContent.trim()) {
        console.log(createAIMessageBox(assistantContent.trim()));
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCalls,
      };
      messages.push(assistantMessage);
      await this.historyManager.addMessage(sessionId, assistantMessage);

      // Pause UI for inquirer prompts
      this.ui.pause();

      for (const toolCall of toolCalls) {
        try {
          const toolName = toolCall.function?.name;
          const args = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
          if (!toolName) continue;

          const permissionKey = `${toolName}`;
          let currentPermission = permissions[permissionKey];

          if (currentPermission !== 'always-allow') {
            console.log(boxen(chalk.white(JSON.stringify(args, null, 2)), {
              title: chalk.yellow(` ⚠️ SECURITY CHECK: AI wants to use ${toolName} `),
              padding: 1,
              borderColor: 'yellow',
              borderStyle: 'round'
            }));

            const { choice } = await inquirer.prompt([{
              type: 'list',
              name: 'choice',
              message: `Allow ${toolName}?`,
              choices: [
                { name: 'Allow once', value: 'allow' },
                { name: 'Always allow in this session', value: 'always-allow' },
                { name: 'Deny', value: 'deny' }
              ]
            }]);
            
            currentPermission = choice;
            if (choice === 'always-allow') permissions[permissionKey] = 'always-allow';
          }

          if (currentPermission === 'deny') {
            const toolMessage: ChatMessage = {
              role: 'tool',
              content: 'Error: Execution cancelled by user.',
              tool_call_id: toolCall.id,
              name: toolName,
            };
            messages.push(toolMessage);
            await this.historyManager.addMessage(sessionId, toolMessage);
            continue;
          }

          console.log(colors.secondary(`→ Running: ${toolName}`));
          const result = await this.toolExecutor.execute(toolName, args);
          
          const toolMessage: ChatMessage = {
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id,
            name: toolName,
          };
          messages.push(toolMessage);
          await this.historyManager.addMessage(sessionId, toolMessage);
          
          const resultPreview = result.length > 200 ? result.substring(0, 200) + '...' : result;
          console.log(colors.success(`✓ ${toolName} completed`));
          console.log(colors.dim(`  Result: ${resultPreview}\n`));

        } catch (error: any) {
          console.error(colors.error(`✗ Tool execution failed: ${error.message}\n`));
        }
      }

      this.ui.resume();
      this.ui.setGenerating(true);

      const { TOOL_DEFINITIONS } = await import('../tools/executor.js');
      const followUpResponse = await this.apiClient.sendMessage(messages, { tools: TOOL_DEFINITIONS }, false);
      
      if (!followUpResponse) return;

      if (followUpResponse?.tool_calls && followUpResponse.tool_calls.length > 0) {
        if (followUpResponse.content && followUpResponse.content.trim()) {
          console.log(createAIMessageBox(followUpResponse.content));
          await this.historyManager.addMessage(sessionId, { role: 'assistant', content: followUpResponse.content });
        }
        await this.handleToolCalls(followUpResponse.tool_calls, messages, followUpResponse.content || '', sessionId, permissions, depth + 1);
      } else if (followUpResponse?.content) {
        console.log(createAIMessageBox(followUpResponse.content));
        await this.historyManager.addMessage(sessionId, { role: 'assistant', content: followUpResponse.content });
      }
    } catch (error: any) {
      console.error(colors.error(`Error in tool handling: ${error.message}`));
    } finally {
      this.ui.setGenerating(false);
    }
  }
}
