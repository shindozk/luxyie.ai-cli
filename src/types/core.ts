export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ChatContent[];
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

export interface ModelConfig {
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

export interface Config {
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

export interface CommandContext {
  session: Session;
  config: Config;
  services: ServiceContainer;
  ui: UIService;
  abortSignal: AbortSignal;
}

export interface ServiceContainer {
  config: ConfigService;
  context: ContextService;
  agent: AgentService;
  tool: ToolService;
  history: HistoryService;
  llm: LLMService;
  events: EventBus;
  platform: PlatformService;
}

export interface UIService {
  print: (text: string) => void;
  prompt: (options: PromptOptions) => Promise<string>;
  select: (options: SelectOptions) => Promise<string>;
  confirm: (message: string, defaultValue?: boolean) => Promise<boolean>;
  spinner: SpinnerController;
  progress: ProgressController;
  table: (data: Record<string, unknown>[]) => void;
  tree: (data: TreeNode) => void;
  markdown: (content: string) => void;
  code: (code: string, language?: string) => void;
  diff: (oldText: string, newText: string) => void;
}

export interface PromptOptions {
  message: string;
  default?: string;
  validate?: (value: string) => boolean | string;
  mask?: boolean;
}

export interface SelectOptions {
  message: string;
  choices: SelectChoice[];
  default?: string;
  pageSize?: number;
}

export interface SelectChoice {
  name: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface SpinnerController {
  start: (text: string) => void;
  stop: () => void;
  succeed: (text: string) => void;
  fail: (text: string) => void;
  warn: (text: string) => void;
  info: (text: string) => void;
  update: (text: string) => void;
}

export interface ProgressController {
  start: (total: number, text?: string) => void;
  increment: (amount?: number) => void;
  update: (current: number, text?: string) => void;
  stop: () => void;
}

export interface TreeNode {
  name: string;
  path?: string;
  children?: TreeNode[];
  type?: 'file' | 'directory' | 'symlink';
  metadata?: Record<string, unknown>;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  exitCode?: number;
}

export interface SlashCommand {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  handler: (args: string[], context: CommandContext) => Promise<CommandResult>;
  completions?: (partial: string) => string[];
}

export interface EventMap {
  'session:created': { session: Session };
  'session:updated': { session: Session };
  'session:deleted': { sessionId: string };
  'message:added': { sessionId: string; message: ChatMessage };
  'message:removed': { sessionId: string; messageId: string };
  'context:pinned': { pin: ContextPin };
  'context:unpinned': { pinId: string };
  'context:compacted': { sessionId: string; result: CompactedContext };
  'agent:changed': { mode: AgentMode; previousMode: AgentMode };
  'tool:executed': { tool: string; args: unknown; result: ToolResult };
  'tool:approved': { tool: string; action: 'once' | 'always' };
  'tool:denied': { tool: string; reason?: string };
  'config:changed': { key: string; value: unknown };
  'model:changed': { model: string; previousModel: string };
  'error': { error: Error; context?: string };
  'warning': { message: string; context?: string };
}

export type EventName = keyof EventMap;
export type EventPayload<T extends EventName> = EventMap[T];

export interface ToolResult {
  success: boolean;
  result?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  duration?: number;
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

export interface ProviderCapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
  jsonMode: boolean;
  parallelTools: boolean;
  systemPrompt: boolean;
}

export interface PlatformInfo {
  os: string;
  arch: string;
  nodeVersion: string;
  shell: string;
  isTTY: boolean;
  isCI: boolean;
  termProgram?: string;
  termVersion?: string;
  colorSupport: 'none' | 'basic' | '256' | 'truecolor';
  unicodeSupport: boolean;
}