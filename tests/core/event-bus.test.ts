import { EventBus } from '../../src/core/event-bus.js';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('emits events to registered handlers', () => {
    const received: unknown[] = [];
    bus.on('context:pinned', (payload) => received.push(payload));

    bus.emit('context:pinned', {
      pin: {
        id: 'pin_1',
        type: 'file',
        path: '/tmp/a.ts',
        label: 'a.ts',
        createdAt: 1,
        size: 10,
        hash: 'abc',
      },
    });

    expect(received).toHaveLength(1);
  });

  it('supports multiple handlers for the same event', () => {
    const calls: string[] = [];
    bus.on('warning', (p) => calls.push(`a:${p.message}`));
    bus.on('warning', (p) => calls.push(`b:${p.message}`));

    bus.emit('warning', { message: 'careful' });

    expect(calls).toEqual(['a:careful', 'b:careful']);
  });

  it('removes handlers with off()', () => {
    let count = 0;
    const handler = (): void => {
      count += 1;
    };

    bus.on('model:changed', handler);
    bus.emit('model:changed', { model: 'm1', previousModel: 'm0' });
    expect(count).toBe(1);

    bus.off('model:changed', handler);
    bus.emit('model:changed', { model: 'm2', previousModel: 'm1' });
    expect(count).toBe(1);
  });

  it('dedupes identical handler references and clears all handlers', () => {
    const handler = (): void => undefined;
    bus.on('error', handler);
    bus.on('error', handler);
    expect(bus.listenerCount('error')).toBe(1);

    const other = (): void => undefined;
    bus.on('error', other);
    expect(bus.listenerCount('error')).toBe(2);

    bus.clear();
    expect(bus.listenerCount('error')).toBe(0);
  });

  it('fires a deduped handler only once per emit', () => {
    let calls = 0;
    const handler = (): void => {
      calls += 1;
    };
    bus.on('error', handler);
    bus.on('error', handler);

    bus.emit('error', { error: new Error('x') });

    expect(calls).toBe(1);
  });

  it('does not throw when emitting an event with no listeners', () => {
    expect(() => bus.emit('tool:denied', { tool: 'run_command' })).not.toThrow();
  });
});
