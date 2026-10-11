import type {
  ChatMessage,
  CompactedContext,
  ContextConfig,
  ContextPin,
  Session,
} from '../types/index.js';

export interface TokenEstimator {
  estimate(text: string): number;
}

export interface Summarizer {
  summarize(messages: ChatMessage[], maxTokens: number): Promise<string>;
}

const DEFAULT_TOKEN_ESTIMATOR: TokenEstimator = {
  estimate: (text: string): number => Math.ceil(text.length / 4),
};

export class ContextService {
  private pins: ContextPin[] = [];
  private readonly config: ContextConfig;
  private readonly estimator: TokenEstimator;
  private readonly summarizer: Summarizer | undefined;

  constructor(
    config: ContextConfig,
    options: { estimator?: TokenEstimator; summarizer?: Summarizer } = {},
  ) {
    this.config = config;
    this.estimator = options.estimator ?? DEFAULT_TOKEN_ESTIMATOR;
    this.summarizer = options.summarizer;
  }

  async pin(input: Omit<ContextPin, 'id' | 'createdAt' | 'hash'>): Promise<ContextPin> {
    if (input.size > this.config.pinnedFilesMaxSize) {
      throw new Error(
        `Pinned content exceeds the maximum size of ${this.config.pinnedFilesMaxSize} bytes`,
      );
    }

    const pin: ContextPin = {
      ...input,
      id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      hash: this.hashContent(input),
    };

    this.pins.push(pin);
    return pin;
  }

  async unpin(pinId: string): Promise<boolean> {
    const index = this.pins.findIndex((pin) => pin.id === pinId);
    if (index === -1) {
      return false;
    }
    this.pins.splice(index, 1);
    return true;
  }

  listPins(): ContextPin[] {
    return [...this.pins];
  }

  getPin(pinId: string): ContextPin | undefined {
    return this.pins.find((pin) => pin.id === pinId);
  }

  async buildContext(session: Session): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    for (const pin of this.pins) {
      messages.push({
        role: 'system',
        content: `[Pinned context: ${pin.label}]\n${pin.content ?? ''}`,
        metadata: { timestamp: pin.createdAt, pinned: true },
      });
    }

    messages.push(...session.messages);
    return messages;
  }

  shouldCompact(session: Session): boolean {
    if (!this.config.autoCompact) {
      return false;
    }
    return this.estimateSessionTokens(session) > this.config.maxTokens * this.config.compactThreshold;
  }

  estimateSessionTokens(session: Session): number {
    return session.messages.reduce((total, message) => total + this.estimateMessage(message), 0);
  }

  async compact(session: Session): Promise<CompactedContext> {
    const preserveRecent = this.config.preserveRecentMessages;
    const messages = session.messages;
    const nonSystem = messages.filter((message) => message.role !== 'system');
    const recent = nonSystem.slice(-preserveRecent);
    const compactable = nonSystem.slice(0, Math.max(0, nonSystem.length - preserveRecent));

    let summary = '';
    let tokensSaved = 0;

    if (compactable.length > 0 && this.summarizer) {
      const compactableTokens = compactable.reduce(
        (total, message) => total + this.estimateMessage(message),
        0,
      );
      summary = await this.summarizer.summarize(compactable, this.config.maxTokens);
      tokensSaved = Math.max(0, compactableTokens - this.estimate(summary));
    }

    return {
      summary,
      originalMessages: compactable.length,
      tokensSaved,
      compactedAt: Date.now(),
      preservedPins: this.pins.map((pin) => pin.id),
    };
  }

  private estimateMessage(message: ChatMessage): number {
    if (message.content === null) {
      return 0;
    }
    if (typeof message.content === 'string') {
      return this.estimate(message.content);
    }
    return message.content.reduce(
      (total, part) => total + this.estimate(part.text ?? ''),
      0,
    );
  }

  private estimate(text: string): number {
    return this.estimator.estimate(text);
  }

  private hashContent(input: Omit<ContextPin, 'id' | 'createdAt' | 'hash'>): string {
    const raw = `${input.type}:${input.path ?? ''}:${input.url ?? ''}:${input.content ?? ''}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i += 1) {
      hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
  }
}
