/**
 * Modern Ask Command - Single Question Interface
 * Refactored with modular utilities for clean, robust code
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { APIClient } from '../services/llm.service.js';
import { Config, ChatMessage } from '../types/index.js';
import { spinner } from '../ui/spinner.js';
import { ToolExecutor } from '../tools/executor.js';
import {
  // Tool execution
  parseToolArgs,
  executeToolCall,
  formatToolMessage,
  type ToolCall,
  // Message formatting
  formatAIMessage,
  formatSecurityPrompt,
  formatToolStatus,
  // Abort handling
  isAbortError,
  // Components
  colors,
} from '../utils/index.js';

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
        await this.streamResponse(messages, TOOL_DEFINITIONS);
      } else {
        const response = await this.apiClient.sendMessage(messages, { tools: TOOL_DEFINITIONS }, false);
        spinner.stop();

        if (response?.tool_calls && response.tool_calls.length > 0) {
          if (response.content) {
            process.stdout.write(formatAIMessage(response.content));
          }
          await this.handleToolCalls(response.tool_calls, messages, response.content || '');
        } else if (response?.content) {
          process.stdout.write(formatAIMessage(response.content));
        }
      }
    } catch (err: unknown) {
      spinner.stop();
      if (!isAbortError(err)) {
        console.error(`\n${colors.error('✗')} ${colors.red(err instanceof Error ? err.message : 'Unknown error')}\n`);
      }
    }
  }

  // ============================================================================
  // STREAM RESPONSE
  // ============================================================================

  private async streamResponse(messages: ChatMessage[], tools: any[]): Promise<void> {
    let fullResponse = '';

    process.stdout.write(formatAIMessage('', true));

    const response = await this.apiClient.sendMessage(
      messages,
      {
        callbacks: {
          onData: (chunk: string) => {
            fullResponse += chunk;
            process.stdout.write(chunk);
          },
          onDone: () => console.log('\n'),
          onError: (err: Error) => console.error(`\n${colors.error('✗')} ${err.message}\n`),
        },
        tools,
      },
      true
    );

    if (response?.tool_calls && response.tool_calls.length > 0) {
      await this.handleToolCalls(response.tool_calls, messages, response.content || fullResponse);
    }
  }

  // ============================================================================
  // TOOL HANDLING
  // ============================================================================

  private async handleToolCalls(
    toolCalls: any[],
    messages: ChatMessage[],
    assistantContent: string
  ): Promise<void> {
    try {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCalls,
      };
      messages.push(assistantMessage);

      console.log(`\n${colors.primary('⚙️  Executing tools...')}\n`);

      for (const toolCall of toolCalls) {
        const result = await executeToolCall(
          toolCall as ToolCall,
          this.toolExecutor,
          {
            allowedTools: new Set(),
          }
        );

        messages.push(formatToolMessage(result));
      }

      // Get follow-up response with tool results
      spinner.start('Processing results...');
      const { TOOL_DEFINITIONS } = await import('../tools/executor.js');
      const followUpResponse = await this.apiClient.sendMessage(
        messages,
        { tools: TOOL_DEFINITIONS },
        false
      );
      spinner.stop();

      if (followUpResponse?.tool_calls && followUpResponse.tool_calls.length > 0) {
        if (followUpResponse.content) {
          process.stdout.write(formatAIMessage(followUpResponse.content));
        }
        await this.handleToolCalls(
          followUpResponse.tool_calls,
          messages,
          followUpResponse.content || ''
        );
      } else if (followUpResponse?.content) {
        process.stdout.write(formatAIMessage(followUpResponse.content));
      }
    } catch (error: unknown) {
      console.error(`\n${colors.error('✗')} Error in tool handling: ${error instanceof Error ? error.message : 'Unknown'}\n`);
    }
  }
}
