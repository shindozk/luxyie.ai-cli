import axios from 'axios';
import type { ChatMessage } from '../../types/index.js';
import { ILLMProvider, SendMessageOptions } from './provider.interface.js';
import type { ModelConfig } from '../models.js';
import { configManager } from '../config.service.js';

export class AxiosProvider implements ILLMProvider {
  private apiKey: string;
  private apiUrl: string;
  private modelConfig: ModelConfig;

  constructor(apiKey: string, apiUrl: string, modelConfig: ModelConfig) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.modelConfig = modelConfig;
  }

  async sendMessage(messages: ChatMessage[], options?: SendMessageOptions, stream?: boolean): Promise<any> {
    const config = configManager.get();
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

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (stream) {
      headers['Accept'] = 'text/event-stream';
    }

    try {
      const axiosConfig: any = {
        headers: headers,
        responseType: stream ? 'stream' : 'json',
      };

      if (options?.abortSignal) {
        axiosConfig.signal = options.abortSignal;
      }

      const response = await axios.post(`${this.apiUrl}/chat/completions`, payload, axiosConfig);

      if (!stream) {
        return response.data?.choices?.[0]?.message;
      }

      let fullContent = '';
      let toolCalls: any[] = [];

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          if (options?.abortSignal?.aborted) {
            reject(new Error('AbortError'));
            return;
          }

          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith(':') || !line.trim()) continue;
            const message = line.replace(/^data: /, '').trim();
            if (message === '[DONE]') continue;

            try {
              const parsed = JSON.parse(message);
              const delta = parsed.choices?.[0]?.delta;
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
            } catch (e) {
              // Ignore partial JSON
            }
          }
        });

        response.data.on('end', () => {
          if (options?.abortSignal?.aborted) {
            reject(new Error('AbortError'));
            return;
          }
          if (options?.callbacks?.onDone) options.callbacks.onDone();

          const finalMessage: any = {
            role: 'assistant',
            content: fullContent || null,
          };

          const finalToolCalls = toolCalls.filter(Boolean);
          if (finalToolCalls.length > 0) {
            finalMessage.tool_calls = finalToolCalls;
          }

          resolve(finalMessage);
        });

        response.data.on('error', (err: Error) => {
          if (options?.callbacks?.onError) options.callbacks.onError(err);
          reject(err);
        });
      });
    } catch (error: any) {
      if (error.name === 'AbortError' || options?.abortSignal?.aborted) {
        throw error;
      }
      throw error;
    }
  }
}
