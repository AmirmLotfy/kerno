export interface IdempotencyStore {
  has(eventId: string): Promise<boolean>;
  mark(eventId: string): Promise<void>;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  readonly processed = new Set<string>();
  async has(eventId: string): Promise<boolean> { return this.processed.has(eventId); }
  async mark(eventId: string): Promise<void> { this.processed.add(eventId); }
}
