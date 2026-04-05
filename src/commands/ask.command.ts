import { APIClient } from '../services/llm.service.js';
import { Config, ChatMessage } from '../types/index.js';
import { spinner } from '../ui/spinner.js';
import { colors, warning, createAIMessageBox } from '../ui/components.js';
import { ToolExecutor } from '../tools/executor.js';
import boxen from 'boxen';
import inquirer from 'inquirer';
import chalk from 'chalk';

interface AskCommandOptions {
  stream?: boolean;
}

export class AskCommand {
  private apiClient: APIClient;
  private config: Config;
  private toolExecutor: ToolExecutor;

  constructor(apiClient: APIClient, config: Config) {
    this.apiClient = apiClient;
    this.config = config;
    this.toolExecutor = new ToolExecutor({ config });
  }

  async execute(question: string, options: AskCommandOptions): Promise<void> {
    const streamEnabled = options.stream !== false && this.config.streamEnabled;
    const messages: ChatMessage[] = [
      { role: 'system', content: this.config.systemPrompt },
      { role: 'user', content: question },
    ];
    
    spinner.start('Thinking...');
    
    try {
      const { TOOL_DEFINITIONS } = await import('../tools/executor.js');

      if (streamEnabled) {
         spinner.stop();
         
         let fullResponse = '';
         const response = await this.apiClient.sendMessage(
          messages,
          {
            callbacks: {
              onData: (chunk: string) => {
                fullResponse += chunk;
                process.stdout.write(chunk);
              },
              onDone: () => console.log('\n'),
              onError: (err: Error) => console.error('\n' + colors.error(err.message)),
            },
            tools: TOOL_DEFINITIONS
          },
          true
        );

        if (response?.tool_calls && response.tool_calls.length > 0) {
          await this.handleToolCalls(response.tool_calls, messages, fullResponse);
        }
      } else {
        const response = await this.apiClient.sendMessage(messages, { tools: TOOL_DEFINITIONS }, false);
        spinner.stop();

        if (response?.tool_calls && response.tool_calls.length > 0) {
          if (response.content) {
            console.log(boxen(response.content, { title: 'Luxyie Thinking', padding: 1, borderColor: '#6366f1' }));
          }
          await this.handleToolCalls(response.tool_calls, messages, response.content || '');
        } else if (response?.content) {
          console.log(boxen(response.content, { title: 'Luxyie Response', padding: 1, borderColor: '#6366f1' }));
        }
      }
    } catch (err: any) {
      spinner.stop();
      console.error(colors.error(err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  private async handleToolCalls(toolCalls: any[], messages: ChatMessage[], assistantContent: string): Promise<void> {
    try {
      // Add assistant message with tool calls to history
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCalls,
      };
      messages.push(assistantMessage);

      console.log(colors.primary('\n⚙️ Executing tools...\n'));

      // Execute each tool call
      for (const toolCall of toolCalls) {
        try {
          const toolName = toolCall.function?.name;
          const args = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
          
          if (!toolName) continue;

          // User confirmation for run_command
          if (toolName === 'run_command') {
            console.log(boxen(chalk.white(args.command), {
              title: chalk.yellow(' ⚠️ SECURITY CHECK: AI wants to run this command '),
              padding: 1,
              borderColor: 'yellow',
              borderStyle: 'round'
            }));

            const { confirm } = await inquirer.prompt([{
              type: 'confirm',
              name: 'confirm',
              message: 'Do you want to allow this command to run?',
              default: true
            }]);

            if (!confirm) {
              console.log(colors.error('✗ Execution cancelled by user.\n'));
              const toolMessage: ChatMessage = {
                role: 'tool',
                content: 'Error: Execution cancelled by user. The user did not grant permission to run this command.',
                tool_call_id: toolCall.id,
                name: toolName,
              };
              messages.push(toolMessage);
              continue;
            }
          }

          console.log(colors.secondary(`→ Running: ${toolName}`));
          const result = await this.toolExecutor.execute(toolName, args);
          
          // Add tool result to messages
          const toolMessage: ChatMessage = {
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id,
            name: toolName,
          };
          messages.push(toolMessage);
          
          console.log(colors.success(`✓ ${toolName} completed\n`));
        } catch (error: any) {
          console.error(colors.error(`✗ Tool execution failed: ${error.message}\n`));
        }
      }

      // Get follow-up response from model with tool results
      spinner.start('Processing results...');
      const { TOOL_DEFINITIONS } = await import('../tools/executor.js');
      const followUpResponse = await this.apiClient.sendMessage(messages, { tools: TOOL_DEFINITIONS }, false);
      spinner.stop();

      if (followUpResponse?.tool_calls && followUpResponse.tool_calls.length > 0) {
        if (followUpResponse.content) {
          console.log(createAIMessageBox(followUpResponse.content));
        }
        await this.handleToolCalls(followUpResponse.tool_calls, messages, followUpResponse.content || '');
      } else if (followUpResponse?.content) {
        console.log(createAIMessageBox(followUpResponse.content));
      }
    } catch (error: any) {
      console.error(colors.error(`Error in tool handling: ${error.message}`));
    }
  }
}
