import type { ChatMessage, ToolDefinition } from '../../types/index.js';

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onData?: (chunk: string) => void;
  onReasoning?: (reasoning: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export interface SendMessageOptions {
  callbacks?: StreamCallbacks;
  tools?: ToolDefinition[];
  hasImage?: boolean;
  abortSignal?: AbortSignal;
}

export interface ILLMProvider {
  sendMessage(messages: ChatMessage[], options?: SendMessageOptions, stream?: boolean): Promise<any>;
}
