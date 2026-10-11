import type { EventName, EventPayload } from '../types/index.js';

type EventHandler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<EventName, Set<EventHandler<never>>>();

  on<T extends EventName>(event: T, handler: EventHandler<EventPayload<T>>): void {
    const existing = this.handlers.get(event);
    const set = existing ?? new Set<EventHandler<never>>();
    set.add(handler as EventHandler<never>);
    this.handlers.set(event, set);
  }

  off<T extends EventName>(event: T, handler: EventHandler<EventPayload<T>>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<never>);
  }

  emit<T extends EventName>(event: T, payload: EventPayload<T>): void {
    this.handlers.get(event)?.forEach((handler) => {
      (handler as EventHandler<EventPayload<T>>)(payload);
    });
  }

  listenerCount(event: EventName): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  clear(): void {
    this.handlers.clear();
  }
}
