import type {
  AgentMode,
  ChatMessage,
  CompactedContext,
  ContextPin,
  Session,
} from './core.js';

export interface ToolResult {
  success: boolean;
  result?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  duration?: number;
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
