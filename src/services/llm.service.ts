// Define StreamCallbacks interface locally since llamaindex doesn't export it
interface StreamCallbacks {
  onToken?: (token: string) => void;
  onData?: (chunk: string) => void;
  onReasoning?: (reasoning: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

import { ToolDefinition, Config, ChatMessage } from '../types/index.js';
import axios from 'axios';
import OpenAI from 'openai';
import { getModelConfig, ModelConfig } from './models.js';
import { configManager } from './config.service.js';

// Define the expected structure for sendMessage options
interface SendMessageOptions {
  callbacks?: StreamCallbacks;
  tools?: ToolDefinition[];
  hasImage?: boolean;
  abortSignal?: AbortSignal;
}

export class APIClient {
  private apiKey: string;
  private apiUrl: string;
  private modelId: string;
  private openai: OpenAI;
  public modelConfig: ModelConfig;

  constructor(apiKey: string, apiUrl: string, model: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.modelId = model;
    this.openai = new OpenAI({ apiKey: this.apiKey, baseURL: this.apiUrl });
    this.modelConfig = getModelConfig(this.modelId);
  }

  setModel(modelId: string) {
    this.modelId = modelId;
    this.modelConfig = getModelConfig(this.modelId);
  }

  async sendMessage(messages: ChatMessage[], options?: SendMessageOptions, stream?: boolean): Promise<any> {
    if (this.modelConfig.provider === 'openai') {
      return this.sendWithOpenAI(messages, options, stream);
    } else {
      return this.sendWithAxios(messages, options, stream);
    }
  }

  private async sendWithOpenAI(messages: ChatMessage[], options?: SendMessageOptions, stream?: boolean): Promise<any> {
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

      // Pass abort signal to OpenAI SDK
      const requestOptions: any = {};
      if (options?.abortSignal) {
        requestOptions.signal = options.abortSignal;
      }

      const completion = await this.openai.chat.completions.create(payload as any, requestOptions);

      if (stream) {
        let fullContent = '';
        let toolCalls: any[] = [];

        // Simple streaming with abort check
        for await (const chunk of completion as unknown as AsyncIterable<any>) {
          // Check if aborted
          if (options?.abortSignal?.aborted) {
            throw new Error('AbortError');
          }

          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          // Handle reasoning content
          if (delta.reasoning_content && options?.callbacks?.onReasoning) {
            options.callbacks.onReasoning(delta.reasoning_content);
          }

          // Handle content - write directly
          if (delta.content) {
            fullContent += delta.content;
            if (options?.callbacks?.onData) {
              options.callbacks.onData(delta.content);
            }
          }

          // Handle tool calls
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

        // Build final message object
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
      // Re-throw abort errors
      if (error.name === 'AbortError' || options?.abortSignal?.aborted) {
        throw error;
      }

      // Handle specific error codes
      if (error.status === 403 || error.message?.includes('403')) {
        const errorMessage = `
🔑 API Authentication Error (403)

The NVIDIA API key is invalid or missing. To fix this:

1. Get a free API key from: https://build.nvidia.com
2. Set it as environment variable:
   export NVIDIA_API_KEY="your-api-key-here"

   Or on Windows:
   set NVIDIA_API_KEY=your-api-key-here

3. Or configure it in the CLI:
   luxyie config set

The API key should start with "nvapi-".
`;
        console.error(errorMessage);
        return {
          error: 'API Authentication Failed (403)',
          details: 'Invalid or missing NVIDIA_API_KEY',
          help: 'Get your API key at https://build.nvidia.com'
        };
      }

      console.error(`OpenAI API Error: ${error.message}`);
      return { error: error.message };
    }
  }

  private async sendWithAxios(messages: ChatMessage[], options?: SendMessageOptions, stream?: boolean): Promise<any> {
    const config = configManager.get();
    const payload: any = {
      model: this.modelConfig.id,
      messages: messages,
      temperature: this.modelConfig.temperature,
      top_p: this.modelConfig.top_p,
      max_tokens: config.maxTokens || this.modelConfig.max_tokens,
    };

    if (this.modelConfig.chat_template_kwargs) {
      payload.chat_template_kwargs = this.modelConfig.chat_template_kwargs;
    }

    if (options?.tools) {
      payload.tools = options.tools;
      payload.tool_choice = 'auto';
    }

    if (stream !== undefined) {
      payload.stream = stream;
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (stream) {
      headers['Accept'] = 'text/event-stream';
    }

    try {
      // Prepare axios config with abort signal
      const axiosConfig: any = {
        headers: headers,
        responseType: stream ? 'stream' : 'json',
      };

      // Pass abort signal to Axios
      if (options?.abortSignal) {
        axiosConfig.signal = options.abortSignal;
      }

      const response = await axios.post(`${this.apiUrl}/chat/completions`, payload, axiosConfig);

      if (!stream) {
        return response.data?.choices?.[0]?.message;
      }

      // Streaming logic with abort check
      let fullContent = '';
      let toolCalls: any[] = [];

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          // Check if aborted
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

              // Handle reasoning content
              if (delta.reasoning_content && options?.callbacks?.onReasoning) {
                options.callbacks.onReasoning(delta.reasoning_content);
              }

              // Handle content - write directly
              if (delta.content) {
                fullContent += delta.content;
                if (options?.callbacks?.onData) {
                  options.callbacks.onData(delta.content);
                }
              }

              // Handle tool calls
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
      // Re-throw abort errors
      if (error.name === 'AbortError' || options?.abortSignal?.aborted) {
        throw error;
      }

      // Handle specific error codes
      if (error.response?.status === 403 || error.message?.includes('403')) {
        const errorMessage = `
🔑 API Authentication Error (403)

The NVIDIA API key is invalid or missing. To fix this:

1. Get a free API key from: https://build.nvidia.com
2. Set it as environment variable:
   export NVIDIA_API_KEY="your-api-key-here"

   Or on Windows:
   set NVIDIA_API_KEY=your-api-key-here

3. Or configure it in the CLI:
   luxyie config set

The API key should start with "nvapi-".
`;
        console.error(errorMessage);
        return {
          error: 'API Authentication Failed (403)',
          details: 'Invalid or missing NVIDIA_API_KEY',
          help: 'Get your API key at https://build.nvidia.com'
        };
      }

      console.error(`API Error: ${error.message}`);
      return { error: error.message };
    }
  }
}
