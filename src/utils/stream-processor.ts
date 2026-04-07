/**
 * Stream Processor Module
 * Handles streaming responses from LLM with proper accumulation
 * Manages content, tool calls, and reasoning separately
 */

export interface StreamChunk {
  content?: string | undefined;
  reasoning?: string | undefined;
  toolCalls?: ToolCallDelta[] | undefined;
  finishReason?: string | undefined;
}

export interface ToolCallDelta {
  index: number;
  id?: string | undefined;
  type?: string | undefined;
  function?: {
    name?: string | undefined;
    arguments?: string | undefined;
  } | undefined;
}

export interface StreamResult {
  content: string;
  reasoning: string;
  toolCalls: any[];
  finishReason?: string | undefined;
}

export interface StreamCallbacks {
  onData?: (chunk: string) => void;
  onContent?: (chunk: string) => void;
  onReasoning?: (chunk: string) => void;
  onToolCalls?: (toolCalls: any[]) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Accumulate stream chunks into final result
 * Handles content, reasoning, and tool calls separately
 */
export class StreamAccumulator {
  private content: string = '';
  private reasoning: string = '';
  private toolCalls: ToolCallDelta[] = [];
  private finishReason?: string;
  private callbacks: StreamCallbacks;

  constructor(callbacks: StreamCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Process a single chunk from the stream
   */
  process(chunk: StreamChunk): void {
    // Accumulate content
    if (chunk.content) {
      this.content += chunk.content;
      this.callbacks.onData?.(chunk.content);
      this.callbacks.onContent?.(chunk.content);
    }

    // Accumulate reasoning
    if (chunk.reasoning) {
      this.reasoning += chunk.reasoning;
      this.callbacks.onReasoning?.(chunk.reasoning);
    }

    // Accumulate tool calls
    if (chunk.toolCalls) {
      this.accumulateToolCalls(chunk.toolCalls);
    }

    // Track finish reason
    if (chunk.finishReason) {
      this.finishReason = chunk.finishReason;
    }
  }

  /**
   * Accumulate tool call deltas into complete tool calls
   */
  private accumulateToolCalls(deltas: ToolCallDelta[]): void {
    for (const delta of deltas) {
      const index = delta.index;

      // Initialize tool call if new
      if (!this.toolCalls[index]) {
        this.toolCalls[index] = {
          index,
          id: delta.id,
          type: delta.type || 'function',
          function: { name: '', arguments: '' },
        } as ToolCallDelta;
      }

      const existing = this.toolCalls[index]!;

      // Update fields
      if (delta.id) existing.id = delta.id;
      if (delta.type) existing.type = delta.type;
      if (delta.function?.name) {
        existing.function!.name = delta.function.name;
      }
      if (delta.function?.arguments) {
        existing.function!.arguments += delta.function.arguments;
      }
    }
  }

  /**
   * Get final accumulated result
   */
  getResult(): StreamResult {
    return {
      content: this.content,
      reasoning: this.reasoning,
      toolCalls: this.toolCalls.filter(Boolean),
      finishReason: this.finishReason,
    };
  }

  /**
   * Get content only
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Get tool calls only
   */
  getToolCalls(): any[] {
    return this.toolCalls.filter(Boolean);
  }
}

/**
 * Create a stream accumulator with callbacks
 */
export function createStreamAccumulator(
  callbacks: StreamCallbacks = {}
): StreamAccumulator {
  return new StreamAccumulator(callbacks);
}

/**
 * Parse SSE (Server-Sent Events) line
 */
export function parseSSELine(line: string): string | null {
  // Skip empty lines and comments
  if (!line.trim() || line.startsWith(':')) {
    return null;
  }

  // Remove "data: " prefix
  return line.replace(/^data: /, '').trim();
}

/**
 * Process SSE stream data
 */
export function processSSEData(
  data: string,
  accumulator: StreamAccumulator,
  options: { onDone?: () => void } = {}
): void {
  const lines = data.split('\n');

  for (const line of lines) {
    const message = parseSSELine(line);

    if (!message) continue;

    // Check for end of stream
    if (message === '[DONE]') {
      options.onDone?.();
      return;
    }

    // Parse JSON chunk
    try {
      const parsed = JSON.parse(message);
      const delta = parsed.choices?.[0]?.delta;

      if (!delta) continue;

      // Process chunk
      accumulator.process({
        content: delta.content,
        reasoning: delta.reasoning_content,
        toolCalls: delta.tool_calls,
        finishReason: parsed.choices?.[0]?.finish_reason,
      });
    } catch {
      // Ignore invalid JSON
    }
  }
}
