import type {
  AgentDefinition,
  AgentMode,
  ChatMessage,
  CompactedContext,
  ContextPin,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  Session,
  ToolDefinition,
} from './core.js';
import type { AppConfig } from './config.js';
import type { EventName, EventPayload, ToolResult } from './events.js';
import type { PlatformInfo } from './platform.js';

export interface ConfigService {
  get(): AppConfig;
  update(updates: Partial<AppConfig>): Promise<void>;
  reset(): Promise<void>;
}

export interface ContextService {
  pin(pin: Omit<ContextPin, 'id' | 'createdAt' | 'hash'>): Promise<ContextPin>;
  unpin(pinId: string): Promise<boolean>;
  listPins(): ContextPin[];
  buildContext(session: Session): Promise<ChatMessage[]>;
  compact(session: Session): Promise<CompactedContext>;
}

export interface AgentService {
  getMode(): AgentMode;
  setMode(mode: AgentMode): void;
  getDefinition(mode: AgentMode): AgentDefinition;
  listAgents(): AgentDefinition[];
}

export interface ToolService {
  listTools(): ToolDefinition[];
  getTool(name: string): ToolDefinition | undefined;
  execute(name: string, args: unknown): Promise<ToolResult>;
}

export interface HistoryService {
  createSession(systemPrompt?: string): Promise<string>;
  loadSession(sessionId: string): Promise<Session | null>;
  addMessage(sessionId: string, message: ChatMessage): Promise<void>;
  deleteSession(sessionId: string): Promise<boolean>;
}

export interface LLMService {
  send(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
}

export interface EventBus {
  on<T extends EventName>(event: T, handler: (payload: EventPayload<T>) => void): void;
  off<T extends EventName>(event: T, handler: (payload: EventPayload<T>) => void): void;
  emit<T extends EventName>(event: T, payload: EventPayload<T>): void;
}

export interface PlatformService {
  getInfo(): PlatformInfo;
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

export interface CommandContext {
  session: Session;
  config: AppConfig;
  services: ServiceContainer;
  ui: UIService;
  abortSignal: AbortSignal;
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
