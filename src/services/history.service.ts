import fs from 'fs-extra';
import path from 'node:path';
import { ChatMessage, ChatSession } from '../types/index.js';

export class HistoryManager {
  private historyDir: string;

  constructor(historyDir: string) {
    this.historyDir = historyDir;
  }

  private getSessionFilePath(sessionId: string): string {
    return path.join(this.historyDir, `${sessionId}.json`);
  }

  async init(): Promise<void> {
    await fs.ensureDir(this.historyDir);
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
    await this.saveSession(session);
    return sessionId;
  }

  async saveSession(session: ChatSession): Promise<void> {
    session.updatedAt = new Date();
    const filePath = this.getSessionFilePath(session.id);
    await fs.writeJson(filePath, session, { spaces: 2 });
  }

  async loadSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const filePath = this.getSessionFilePath(sessionId);
      if (!(await fs.pathExists(filePath))) {
        return null;
      }
      const sessionData = await fs.readJson(filePath);
      // Basic validation, could be more thorough
      if (sessionData && sessionData.id && sessionData.messages && Array.isArray(sessionData.messages)) {
        return sessionData as ChatSession;
      }
      return null;
    } catch (error: any) {
      console.error(`Error loading session ${sessionId}: ${error.message}`);
      return null;
    }
  }

  async loadAllSessions(): Promise<ChatSession[]> {
    try {
      const files = await fs.readdir(this.historyDir);
      const sessions: ChatSession[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          const session = await this.loadSession(sessionId);
          if (session) {
            sessions.push(session);
          }
        }
      }
      // Ensure dates are correctly parsed if they are stored as strings
      return sessions.map(s => ({ ...s, createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt) }))
                     .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error: any) {
      console.error(`Error loading all sessions: ${error.message}`);
      return [];
    }
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.messages.push(message);
    // Update title if it's a new conversation and the user adds the first message
    if (message.role === 'user' && session.title === 'New Conversation' && session.messages.length === 2) {
      // Replace \r and \n with spaces explicitly, one by one.
      const content = typeof message.content === 'string' ? message.content : '';
      session.title = content.substring(0, 50).replace(/\r/g, ' ').replace(/\n/g, ' ');
    }
    await this.saveSession(session);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const filePath = this.getSessionFilePath(sessionId);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error(`Error deleting session ${sessionId}: ${error.message}`);
      return false;
    }
  }

  async clearAllSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.historyDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.remove(path.join(this.historyDir, file));
        }
      }
    } catch (error: any) {
      console.error(`Error clearing all sessions: ${error.message}`);
    }
  }

  async getSessionCount(): Promise<number> {
    try {
      const files = await fs.readdir(this.historyDir);
      return files.filter(f => f.endsWith('.json')).length;
    } catch (error: any) {
      console.error(`Error getting session count: ${error.message}`);
      return 0;
    }
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    // Explicitly replace \r and \n with spaces, one by one.
    const safeTitle = typeof title === 'string' ? title : '';
    session.title = safeTitle.substring(0, 50).replace(/\r/g, ' ').replace(/\n/g, ' ');
    await this.saveSession(session);
  }
}
