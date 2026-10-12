import { jest } from '@jest/globals';
import type { ChatMessage } from '../../src/types/index.js';

jest.unstable_mockModule('../../src/ui/terminal.js', () => ({
  TerminalUI: class {
    private readonly answers: string[] = ['Hello', '/exit'];
    private index = 0;

    async ask(): Promise<string> {
      const answer = this.answers[this.index];
      this.index += 1;
      return answer ?? '/exit';
    }

    log = jest.fn<() => void>();
    close = jest.fn<() => void>();
    restore = jest.fn<() => void>();
    async restoreAsync(): Promise<void> {}
  },
}));

jest.unstable_mockModule('../../src/services/llm.service.js', () => ({
  APIClient: class {
    async sendMessage(): Promise<unknown> {
      return { content: 'Mock response', tool_calls: [] };
    }
  },
}));

jest.unstable_mockModule('../../src/services/history.service.js', () => ({
  HistoryManager: class {
    async init(): Promise<void> {}
    async createSession(): Promise<string> {
      return 'test-session';
    }
    async loadSession(): Promise<null> {
      return null;
    }
    async addMessage(): Promise<void> {}
  },
}));

const { ChatCommand } = await import('../../src/commands/chat.command.js');

describe('ChatCommand Integration', () => {
  it('should run a simple chat loop and exit', async () => {
    const messages: ChatMessage[] = [];
    const sessionId = 'test-session';

    const config = {
      model: 'test-model',
      apiKey: 'test-key',
      apiUrl: 'https://api.test.com',
      systemPrompt: 'You are a test assistant',
      historyEnabled: true,
      streamEnabled: false,
    };

    const chatCommand = new ChatCommand(
      {} as never,
      {} as never,
      config as never,
    );

    await chatCommand.runChatLoop(messages, sessionId);

    expect(messages).toContainEqual({ role: 'user', content: 'Hello' });
  }, 30000);
});
