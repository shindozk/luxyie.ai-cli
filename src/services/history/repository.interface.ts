import type { ChatSession, ChatMessage } from '../../types/index.js';

export interface IHistoryRepository {
  init(): Promise<void>;
  saveSession(session: ChatSession): Promise<void>;
  loadSession(sessionId: string): Promise<ChatSession | null>;
  loadAllSessions(): Promise<ChatSession[]>;
  deleteSession(sessionId: string): Promise<boolean>;
  clearAllSessions(): Promise<void>;
  getSessionCount(): Promise<number>;
}
