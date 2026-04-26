export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null | Array<{type: 'text'; text: string} | {type: 'image_url'; image_url: {url: string}}>;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
  requiresConfirmation?: boolean;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: ToolDefinition[] | undefined;
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } } | undefined;
  chat_template_kwargs?: {
    enable_thinking?: boolean;
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    delta?: {
      content?: string;
      role?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Config {
  apiKey: string;
  model: string;
  visionModel: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  enableThinking: boolean;
  systemPrompt: string;
  historyEnabled: boolean;
  streamEnabled: boolean;
  apiUrl: string;
  version?: string;
}

export interface FileAttachment {
  path: string;
  name: string;
  mimeType: string;
  content?: string;
}

export type Command = 
  | 'chat'
  | 'config'
  | 'history'
  | 'clear'
  | 'help'
  | 'version';
