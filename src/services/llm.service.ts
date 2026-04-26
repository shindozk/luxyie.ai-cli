import type { ChatMessage } from '../types/index.js';
import { getModelConfig } from './models.js';
import type { ModelConfig } from './models.js';
import type { ILLMProvider, SendMessageOptions } from './llm/provider.interface.js';
import { OpenAIProvider } from './llm/openai-provider.js';
import { AxiosProvider } from './llm/axios-provider.js';

export class APIClient {
  private apiKey: string;
  private apiUrl: string;
  private modelId: string;
  private provider: ILLMProvider;
  public modelConfig: ModelConfig;

  constructor(apiKey: string, apiUrl: string, model: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.modelId = model;
    this.modelConfig = getModelConfig(this.modelId);
    this.provider = this.createProvider();
  }

  private createProvider(): ILLMProvider {
    if (this.modelConfig.provider === 'openai') {
      return new OpenAIProvider(this.apiKey, this.apiUrl, this.modelConfig);
    } else {
      return new AxiosProvider(this.apiKey, this.apiUrl, this.modelConfig);
    }
  }

  setModel(modelId: string) {
    this.modelId = modelId;
    this.modelConfig = getModelConfig(this.modelId);
    this.provider = this.createProvider();
  }

  async sendMessage(messages: ChatMessage[], options?: SendMessageOptions, stream?: boolean): Promise<any> {
    try {
      return await this.provider.sendMessage(messages, options, stream);
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

      console.error(`LLM Provider Error: ${error.message}`);
      return { error: error.message };
    }
  }
}

