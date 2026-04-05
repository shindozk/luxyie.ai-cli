// Define StreamCallbacks interface locally since llamaindex doesn't export it
interface StreamCallbacks {
  onToken?: (token: string) => void;
  onData?: (chunk: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

import { ToolDefinition, Config, ChatMessage } from '../types/index.js';
import axios from 'axios';
import OpenAI from 'openai';
import { getModelConfig, ModelConfig } from './models.js';

// Define the expected structure for sendMessage options
interface SendMessageOptions {
  callbacks?: StreamCallbacks;
  tools?: ToolDefinition[];
  hasImage?: boolean;
  // other options...
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
    try {
      const payload: any = {
        model: this.modelConfig.id,
        messages: messages,
        temperature: this.modelConfig.temperature,
        top_p: this.modelConfig.top_p,
        max_tokens: this.modelConfig.max_tokens,
        stream: stream,
      };

      if (this.modelConfig.chat_template_kwargs) {
        payload.chat_template_kwargs = this.modelConfig.chat_template_kwargs;
      }

      if (options?.tools) {
        payload.tools = options.tools;
        payload.tool_choice = 'auto'; // Allow model to choose when to use tools
      }

      const completion = await this.openai.chat.completions.create(payload as any);

      if (stream) {
        let fullContent = '';
        let toolCalls: any[] = [];
        
        for await (const chunk of completion as unknown as AsyncIterable<any>) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          // Handle reasoning content (thinking)
          const reasoning = delta.reasoning_content;
          if (reasoning && options?.callbacks?.onData) {
             options.callbacks.onData(reasoning);
          }

          // Handle actual content
          if (delta.content) {
            fullContent += delta.content;
            if (options?.callbacks?.onData) {
              options.callbacks.onData(delta.content);
            }
          }

          // Handle tool calls accumulation
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
              
              if (toolCallDelta.id) {
                toolCalls[index].id = toolCallDelta.id;
              }
              
              if (toolCallDelta.function?.name) {
                toolCalls[index].function.name = toolCallDelta.function.name;
              }
              
              if (toolCallDelta.function?.arguments) {
                toolCalls[index].function.arguments += toolCallDelta.function.arguments;
              }
            }
          }

          // Get finish reason for tool calls
          const finishReason = chunk.choices[0]?.finish_reason;
          if (finishReason === 'tool_calls') {
            // Tool calls detected
            const finalToolCalls = toolCalls.filter(Boolean);
            if (options?.callbacks?.onData) {
              options.callbacks.onData(`\n\n[Calling tools: ${finalToolCalls.map((tc: any) => tc.function?.name).join(', ')}]`);
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
    const payload: any = {
      model: this.modelConfig.id,
      messages: messages,
      temperature: this.modelConfig.temperature,
      top_p: this.modelConfig.top_p,
      max_tokens: this.modelConfig.max_tokens,
    };

    if (this.modelConfig.chat_template_kwargs) {
      payload.chat_template_kwargs = this.modelConfig.chat_template_kwargs;
    }

    if (options) {
      if (options.callbacks) payload.callbacks = options.callbacks;
      if (options.tools) {
        payload.tools = options.tools;
        payload.tool_choice = 'auto'; // Allow model to choose when to use tools
      }
      if (options.hasImage) payload.hasImage = options.hasImage;
    }

    // Handle stream parameter. If it's a separate boolean argument, it might be passed directly.
    // If the API expects 'stream: true' in the payload, it should be added here.
    if (stream !== undefined) {
      payload.stream = stream; // Assuming the API payload expects 'stream'
    }
    
    // The 'Accept' header might be crucial for streaming responses.
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (stream) {
      headers['Accept'] = 'text/event-stream'; // Standard for Server-Sent Events
    }

    try {
      const response = await axios.post(`${this.apiUrl}/chat/completions`, payload, {
        headers: headers,
        responseType: stream ? 'stream' : 'json', // Adjust responseType for streaming
      });

      if (stream) {
        if (response.data && typeof response.data === 'object' && response.data.on) {
          let fullContent = '';
          let toolCalls: any[] = [];
          
          return new Promise((resolve, reject) => {
            response.data.on('data', (chunk: Buffer) => {
              const lines = chunk.toString().split('\n');
              for (const line of lines) {
                if (line.startsWith(':') || !line.trim()) continue;
                const message = line.replace(/^data: /, '').trim();
                
                if (message === '[DONE]') {
                  return;
                }
                
                try {
                  const parsed = JSON.parse(message);
                  const delta = parsed.choices?.[0]?.delta;
                  if (!delta) continue;

                  // Handle reasoning content (thinking)
                  const reasoning = delta.reasoning_content;
                  if (reasoning && options?.callbacks?.onData) {
                    options.callbacks.onData(reasoning);
                  }

                  // Handle content
                  const content = delta.content;
                  if (content) {
                    fullContent += content;
                    if (options?.callbacks?.onData) {
                      options.callbacks.onData(content);
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
                      
                      if (toolCallDelta.id) {
                        toolCalls[index].id = toolCallDelta.id;
                      }
                      
                      if (toolCallDelta.function?.name) {
                        toolCalls[index].function.name = toolCallDelta.function.name;
                      }
                      
                      if (toolCallDelta.function?.arguments) {
                        toolCalls[index].function.arguments += toolCallDelta.function.arguments;
                      }
                    }
                  }

                  // Get finish reason for tool calls notification
                  const finishReason = parsed.choices?.[0]?.finish_reason;
                  if (finishReason === 'tool_calls') {
                    const finalToolCalls = toolCalls.filter(Boolean);
                    if (options?.callbacks?.onData) {
                      options.callbacks.onData(`\n\n[Calling tools: ${finalToolCalls.map((tc: any) => tc.function?.name).join(', ')}]`);
                    }
                  }
                } catch (e) {
                  // Ignore partial JSON
                }
              }
            });
            
            response.data.on('error', (err: Error) => {
              if (options?.callbacks?.onError) options.callbacks.onError(err);
              reject(err);
            });
            
            response.data.on('end', () => {
              if (options?.callbacks?.onDone) options.callbacks.onDone();
              
              const finalToolCalls = toolCalls.filter(Boolean);
              const finalMessage: any = {
                role: 'assistant',
                content: fullContent || null,
              };
              if (finalToolCalls.length > 0) {
                finalMessage.tool_calls = finalToolCalls;
              }
              resolve(finalMessage);
            });
            
            response.data.on('close', () => {
              // Same as end if not already resolved
              const finalToolCalls = toolCalls.filter(Boolean);
              const finalMessage: any = {
                role: 'assistant',
                content: fullContent || null,
              };
              if (finalToolCalls.length > 0) {
                finalMessage.tool_calls = finalToolCalls;
              }
              resolve(finalMessage);
            });
          });
        } else {
          return { content: `Error: Unexpected streaming response` };
        }
      } else {
        // Handle non-streaming response
        return response.data?.choices?.[0]?.message;
      }
    } catch (error: any) {
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
      if (error.response) {
        console.error('API Response Error:', error.response.data);
        return { error: error.response.data };
      }
      return { error: error.message };
    }
  }
}