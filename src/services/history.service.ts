import type { ChatMessage, ChatSession } from '../types/index.js';
import type { IHistoryRepository } from './history/repository.interface.js';
import { JSONHistoryRepository } from './history/json-repository.js';

export class HistoryManager {
  private repository: IHistoryRepository;

  constructor(historyDir: string) {
    this.repository = new JSONHistoryRepository(historyDir);
  }

  async init(): Promise<void> {
    await this.repository.init();
  }

  async createSession(systemPrompt?: string): Promise<string> {
    const sessionId = `session_${Date.now()}`;
    const session: ChatSession = {
      id: sessionId,
      title: 'New Conversation',
      messages: systemPrompt ? [{ role: 'system', content: systemPrompt }] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.repository.saveSession(session);
    return sessionId;
  }

  async saveSession(session: ChatSession): Promise<void> {
    await this.repository.saveSession(session);
  }

  async loadSession(sessionId: string): Promise<ChatSession | null> {
    return this.repository.loadSession(sessionId);
  }

  async loadAllSessions(): Promise<ChatSession[]> {
    return this.repository.loadAllSessions();
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.messages.push(message);
    
    if (message.role === 'user' && session.title === 'New Conversation' && session.messages.length === 2) {
      const content = typeof message.content === 'string' ? message.content : '';
      session.title = content.substring(0, 50).replace(/\r/g, ' ').replace(/\n/g, ' ');
    }
    await this.repository.saveSession(session);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.repository.deleteSession(sessionId);
  }

  async clearAllSessions(): Promise<void> {
    await this.repository.clearAllSessions();
  }

  async getSessionCount(): Promise<number> {
    return this.repository.getSessionCount();
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const safeTitle = typeof title === 'string' ? title : '';
    session.title = safeTitle.substring(0, 50).replace(/\r/g, ' ').replace(/\n/g, ' ');
    await this.repository.saveSession(session);
  }
}

