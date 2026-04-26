import OpenAI from 'openai';
import type { ChatMessage } from '../../types/index.js';
import { ILLMProvider, SendMessageOptions } from './provider.interface.js';
import type { ModelConfig } from '../models.js';
import { configManager } from '../config.service.js';

export class OpenAIProvider implements ILLMProvider {
  private openai: OpenAI;
  private modelConfig: ModelConfig;

  constructor(apiKey: string, apiUrl: string, modelConfig: ModelConfig) {
    this.openai = new OpenAI({ apiKey, baseURL: apiUrl });
    this.modelConfig = modelConfig;
  }

  async sendMessage(messages: ChatMessage[], options?: SendMessageOptions, stream?: boolean): Promise<any> {
    const config = configManager.get();
    try {
      const payload: any = {
        model: this.modelConfig.id,
        messages: messages,
        temperature: this.modelConfig.temperature,
        top_p: this.modelConfig.top_p,
        max_tokens: config.maxTokens || this.modelConfig.max_tokens,
        stream: stream,
      };

      if (this.modelConfig.chat_template_kwargs) {
        payload.chat_template_kwargs = this.modelConfig.chat_template_kwargs;
      }

      if (options?.tools) {
        payload.tools = options.tools;
        payload.tool_choice = 'auto';
      }

      const requestOptions: any = {};
      if (options?.abortSignal) {
        requestOptions.signal = options.abortSignal;
      }

      const completion = await this.openai.chat.completions.create(payload as any, requestOptions);

      if (stream) {
        let fullContent = '';
        let toolCalls: any[] = [];

        for await (const chunk of completion as unknown as AsyncIterable<any>) {
          if (options?.abortSignal?.aborted) {
            throw new Error('AbortError');
          }

          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          if (delta.reasoning_content && options?.callbacks?.onReasoning) {
            options.callbacks.onReasoning(delta.reasoning_content);
          }

          if (delta.content) {
            fullContent += delta.content;
            if (options?.callbacks?.onData) {
              options.callbacks.onData(delta.content);
            }
          }

          if (delta.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              const index = toolCallDelta.index;
              if (!toolCalls[index]) {
                toolCalls[index] = {
                  id: toolCallDelta.id,
                  type: 'function',
                  function: { name: '', arguments: '' }
                };
              }
              if (toolCallDelta.id) toolCalls[index].id = toolCallDelta.id;
              if (toolCallDelta.function?.name) toolCalls[index].function.name = toolCallDelta.function.name;
              if (toolCallDelta.function?.arguments) toolCalls[index].function.arguments += toolCallDelta.function.arguments;
            }
          }
        }

        const finalMessage: any = {
          role: 'assistant',
          content: fullContent || null,
        };

        const finalToolCalls = toolCalls.filter(Boolean);
        if (finalToolCalls.length > 0) {
          finalMessage.tool_calls = finalToolCalls;
        }

        if (options?.callbacks?.onDone) options.callbacks.onDone();
        return finalMessage;
      } else {
        return (completion as any).choices[0]?.message;
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || options?.abortSignal?.aborted) {
        throw error;
      }
      throw error;
    }
  }
}
