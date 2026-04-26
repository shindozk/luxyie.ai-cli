import { ChatCommand } from '../../src/commands/chat.command.js';
import { APIClient } from '../../src/services/llm.service.js';
import { HistoryManager } from '../../src/services/history.service.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/services/llm.service.js');
jest.mock('../../src/services/history.service.js');
jest.mock('../../src/ui/terminal.js', () => {
  return {
    TerminalUI: jest.fn().mockImplementation(() => ({
      ask: jest.fn()
        .mockResolvedValueOnce('Hello')
        .mockResolvedValueOnce('/exit'),
      log: jest.fn(),
      close: jest.fn(),
      restore: jest.fn(),
      restoreAsync: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

describe('ChatCommand Integration', () => {
  let apiClient: jest.Mocked<APIClient>;
  let historyManager: jest.Mocked<HistoryManager>;
  let chatCommand: ChatCommand;
  let config: any;

  beforeEach(() => {
    config = {
      model: 'test-model',
      apiKey: 'test-key',
      apiUrl: 'https://api.test.com',
      systemPrompt: 'You are a test assistant',
      historyEnabled: true,
      streamEnabled: false
    };

    apiClient = new APIClient('', '', '') as jest.Mocked<APIClient>;
    historyManager = new HistoryManager('') as jest.Mocked<HistoryManager>;
    
    // Setup mocks
    apiClient.sendMessage = jest.fn().mockResolvedValue({
      content: 'Mock response',
      tool_calls: []
    });

    historyManager.addMessage = jest.fn().mockResolvedValue(undefined);

    chatCommand = new ChatCommand(apiClient, historyManager, config);
  });

  it('should run a simple chat loop and exit', async () => {
    const messages: any[] = [];
    const sessionId = 'test-session';

    await chatCommand.runChatLoop(messages, sessionId);

    // Verify user message was added
    expect(messages).toContainEqual({ role: 'user', content: 'Hello' });
    
    // Verify API was called
    expect(apiClient.sendMessage).toHaveBeenCalled();
    
    // Verify response was handled
    expect(historyManager.addMessage).toHaveBeenCalled();
  });
});
