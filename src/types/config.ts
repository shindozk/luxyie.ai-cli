import type { AgentMode, ToolCategory, ToolDefinition, ToolPermissions } from './core.js';

export interface ModelSpec {
  id: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  temperature: number;
  top_p: number;
  max_tokens: number;
  supportsReasoning: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  contextWindow: number;
  pricing?: ModelPricing;
  chat_template_kwargs?: Record<string, unknown>;
}

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  currency: string;
}

export interface AppConfig {
  version: string;
  api: ApiConfig;
  models: ModelSelectionConfig;
  agents: AgentConfig;
  context: ContextConfig;
  tools: ToolConfig;
  ui: UIConfig;
  privacy: PrivacyConfig;
  experimental: ExperimentalConfig;
}

export interface ApiConfig {
  defaultProvider: string;
  providers: Record<string, ProviderConfig>;
  timeout: number;
  retries: number;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  headers?: Record<string, string>;
}

export interface ModelSelectionConfig {
  default: string;
  fallback: string;
  autoSelect: boolean;
  preferences: ModelPreference[];
}

export interface ModelPreference {
  task: string;
  model: string;
  reason: string;
}

export interface AgentConfig {
  defaultMode: AgentMode;
  modes: Record<AgentMode, AgentModeConfig>;
}

export interface AgentModeConfig {
  enabled: boolean;
  systemPromptAdditions?: string;
  toolOverrides?: Partial<ToolPermissions>;
}

export interface ContextConfig {
  maxTokens: number;
  autoCompact: boolean;
  compactThreshold: number;
  preserveSystemPrompt: boolean;
  preserveRecentMessages: number;
  pinnedFilesMaxSize: number;
  compactionModel?: string;
}

export interface ToolConfig {
  defaultPermissions: ToolPermissions;
  categoryPermissions: Record<ToolCategory, ToolPermissions>;
  customTools: ToolDefinition[];
  approvalMode: 'per-tool' | 'per-session' | 'never';
}

export interface UIConfig {
  theme: 'dark' | 'light' | 'auto';
  showReasoning: boolean;
  showTokenUsage: boolean;
  showTimestamps: boolean;
  compactMode: boolean;
  streamingIndicators: boolean;
  markdownRendering: boolean;
  colorOutput: boolean;
}

export interface PrivacyConfig {
  telemetry: boolean;
  sessionStorage: 'local' | 'memory' | 'encrypted';
  dataRetentionDays: number;
  shareUsageStats: boolean;
}

export interface ExperimentalConfig {
  features: Record<string, boolean>;
  maxParallelTools: number;
  enableMCP: boolean;
}
