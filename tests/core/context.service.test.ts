import { ContextService } from '../../src/core/context.service.js';
import type { ContextConfig, Session } from '../../src/types/index.js';

function createConfig(overrides: Partial<ContextConfig> = {}): ContextConfig {
  return {
    maxTokens: 1000,
    autoCompact: true,
    compactThreshold: 0.8,
    preserveSystemPrompt: true,
    preserveRecentMessages: 2,
    pinnedFilesMaxSize: 1000,
    ...overrides,
  };
}

function createSession(messages: Session['messages']): Session {
  return {
    id: 'session_1',
    title: 'Test',
    messages,
    metadata: {
      model: 'test-model',
      agentMode: 'code',
      contextPins: [],
      tokenUsage: { total: 0, prompt: 0, completion: 0, byModel: {} },
      settings: {
        maxTokens: 1000,
        temperature: 0.6,
        topP: 0.95,
        enableThinking: true,
        autoCompact: true,
        compactThreshold: 0.8,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('ContextService', () => {
  describe('pinning', () => {
    it('pins content and returns a stable id', async () => {
      const service = new ContextService(createConfig());

      const pin = await service.pin({
        type: 'file',
        path: '/tmp/a.ts',
        content: 'const a = 1;',
        label: 'a.ts',
        size: 12,
      });

      expect(pin.id).toMatch(/^pin_/);
      expect(pin.createdAt).toBeGreaterThan(0);
      expect(pin.hash).toBeTruthy();
      expect(service.listPins()).toHaveLength(1);
    });

    it('rejects pins larger than the configured maximum', async () => {
      const service = new ContextService(createConfig({ pinnedFilesMaxSize: 10 }));

      await expect(
        service.pin({
          type: 'text',
          content: 'way too large for the limit',
          label: 'big',
          size: 100,
        }),
      ).rejects.toThrow(/exceeds the maximum size/);
    });

    it('unpins by id', async () => {
      const service = new ContextService(createConfig());
      const pin = await service.pin({
        type: 'text',
        content: 'note',
        label: 'note',
        size: 4,
      });

      expect(await service.unpin(pin.id)).toBe(true);
      expect(service.listPins()).toHaveLength(0);
      expect(await service.unpin('missing')).toBe(false);
    });

    it('generates the same hash for identical content', async () => {
      const service = new ContextService(createConfig());

      const first = await service.pin({
        type: 'text',
        content: 'same',
        label: 'one',
        size: 4,
      });
      const second = await service.pin({
        type: 'text',
        content: 'same',
        label: 'two',
        size: 4,
      });

      expect(first.hash).toBe(second.hash);
    });
  });

  describe('buildContext', () => {
    it('prepends pinned context ahead of session messages', async () => {
      const service = new ContextService(createConfig());
      await service.pin({
        type: 'file',
        path: '/tmp/a.ts',
        content: 'PINNED BODY',
        label: 'a.ts',
        size: 11,
      });

      const session = createSession([{ role: 'user', content: 'hello' }]);
      const messages = await service.buildContext(session);

      expect(messages).toHaveLength(2);
      const pinned = messages[0];
      expect(pinned?.role).toBe('system');
      expect(String(pinned?.content)).toContain('[Pinned context: a.ts]');
      expect(String(pinned?.content)).toContain('PINNED BODY');
      expect(pinned?.metadata?.pinned).toBe(true);
      expect(messages[1]).toEqual({ role: 'user', content: 'hello' });
    });

    it('returns session messages untouched when nothing is pinned', async () => {
      const service = new ContextService(createConfig());
      const session = createSession([
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ]);

      const messages = await service.buildContext(session);

      expect(messages).toEqual(session.messages);
    });
  });

  describe('compaction', () => {
    it('detects when a session exceeds the compaction threshold', () => {
      const service = new ContextService(createConfig({ maxTokens: 100, compactThreshold: 0.5 }));
      const session = createSession([{ role: 'user', content: 'x'.repeat(400) }]);

      expect(service.estimateSessionTokens(session)).toBeGreaterThan(50);
      expect(service.shouldCompact(session)).toBe(true);
    });

    it('does not compact when autoCompact is disabled', () => {
      const service = new ContextService(
        createConfig({ autoCompact: false, maxTokens: 100, compactThreshold: 0.5 }),
      );
      const session = createSession([{ role: 'user', content: 'x'.repeat(400) }]);

      expect(service.shouldCompact(session)).toBe(false);
    });

    it('summarizes older messages while preserving recent ones', async () => {
      let summarized: string | null = null;
      const service = new ContextService(createConfig(), {
        summarizer: {
          summarize: async (messages, maxTokens) => {
            summarized = `summary of ${messages.length} messages within ${maxTokens} tokens`;
            return 'brief summary';
          },
        },
      });

      const session = createSession([
        { role: 'user', content: 'a fairly long first message that uses many tokens' },
        { role: 'assistant', content: 'a fairly long second message that uses many tokens' },
        { role: 'user', content: 'recent one' },
        { role: 'assistant', content: 'recent two' },
      ]);

      const result = await service.compact(session);

      expect(summarized).toBe('summary of 2 messages within 1000 tokens');
      expect(result.summary).toBe('brief summary');
      expect(result.originalMessages).toBe(2);
      expect(result.tokensSaved).toBeGreaterThan(0);
      expect(result.compactedAt).toBeGreaterThan(0);
    });

    it('returns an empty summary without a summarizer', async () => {
      const service = new ContextService(createConfig());
      const session = createSession([
        { role: 'user', content: 'old' },
        { role: 'user', content: 'new' },
      ]);

      const result = await service.compact(session);

      expect(result.summary).toBe('');
      expect(result.tokensSaved).toBe(0);
    });

    it('records preserved pin ids in the compaction result', async () => {
      const service = new ContextService(createConfig());
      const pin = await service.pin({ type: 'text', content: 'keep', label: 'keep', size: 4 });

      const result = await service.compact(createSession([{ role: 'user', content: 'hi' }]));

      expect(result.preservedPins).toEqual([pin.id]);
    });
  });
});
