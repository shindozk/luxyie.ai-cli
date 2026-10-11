export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null | ChatContent[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  metadata?: MessageMetadata;
}

export interface ChatContent {
  type: 'text' | 'image_url' | 'file' | 'tool_result';
  text?: string;
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' };
  file?: { path: string; content: string };
  tool_result?: { name: string; result: string; success: boolean };
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
    parameters: JSONSchema;
  };
  requiresConfirmation?: boolean;
  permissions?: ToolPermissions;
  category?: ToolCategory;
}

export interface ToolPermissions {
  requiresConfirmation: boolean;
  allowedPaths?: string[];
  deniedPaths?: string[];
  maxExecutionTime?: number;
}

export type ToolCategory = 'file' | 'shell' | 'web' | 'code' | 'context' | 'system';

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface MessageMetadata {
  timestamp: number;
  model?: string;
  tokensUsed?: number;
  reasoning?: string;
  pinned?: boolean;
}

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  metadata: SessionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionMetadata {
  model: string;
  agentMode: AgentMode;
  contextPins: ContextPin[];
  tokenUsage: TokenUsage;
  settings: SessionSettings;
}

export interface SessionSettings {
  maxTokens: number;
  temperature: number;
  topP: number;
  enableThinking: boolean;
  autoCompact: boolean;
  compactThreshold: number;
}

export interface TokenUsage {
  total: number;
  prompt: number;
  completion: number;
  byModel: Record<string, number>;
}

export type AgentMode = 'code' | 'plan' | 'ask' | 'debug' | 'review';

export interface AgentDefinition {
  mode: AgentMode;
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: string[];
  allowedToolCategories: ToolCategory[];
  maxTurns?: number;
  capabilities: AgentCapability[];
}

export interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
}

export interface ContextPin {
  id: string;
  type: 'file' | 'directory' | 'url' | 'text' | 'summary';
  path?: string;
  url?: string;
  content?: string;
  label: string;
  createdAt: number;
  size: number;
  hash: string;
  metadata?: Record<string, unknown>;
}

export interface CompactedContext {
  summary: string;
  originalMessages: number;
  tokensSaved: number;
  compactedAt: number;
  preservedPins: string[];
}

export interface LLMRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  stream?: boolean;
  abortSignal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface LLMResponse {
  id: string;
  model: string;
  choices: LLMResponseChoice[];
  usage?: LLMUsage;
  metadata?: Record<string, unknown>;
}

export interface LLMResponseChoice {
  index: number;
  message?: ChatMessage;
  delta?: Partial<ChatMessage>;
  finish_reason: string | null;
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cached_tokens?: number;
}

export interface LLMStreamChunk {
  id: string;
  model: string;
  choices: LLMStreamChoice[];
  usage?: LLMUsage;
}

export interface LLMStreamChoice {
  index: number;
  delta: Partial<ChatMessage>;
  finish_reason: string | null;
}
