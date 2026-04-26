import fs from 'fs-extra';
import path from 'node:path';
import type { ChatSession } from '../../types/index.js';
import type { IHistoryRepository } from './repository.interface.js';

export class JSONHistoryRepository implements IHistoryRepository {
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
      if (sessionData && sessionData.id && sessionData.messages && Array.isArray(sessionData.messages)) {
        return {
          ...sessionData,
          createdAt: new Date(sessionData.createdAt),
          updatedAt: new Date(sessionData.updatedAt)
        } as ChatSession;
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
      return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error: any) {
      console.error(`Error loading all sessions: ${error.message}`);
      return [];
    }
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
      return files.filter((f: string) => f.endsWith('.json')).length;
    } catch (error: any) {
      console.error(`Error getting session count: ${error.message}`);
      return 0;
    }
  }
}
