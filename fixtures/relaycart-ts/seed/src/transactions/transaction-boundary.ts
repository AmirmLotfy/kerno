import type { IdempotencyStore } from "../idempotency/idempotency-store.ts";
import type { Ledger, LedgerEntry } from "../ledger/ledger.ts";

/** Governing contract: the ledger write and idempotency marker commit atomically. */
export interface TransactionBoundary {
  creditOnce(eventId: string, entry: LedgerEntry): Promise<"applied" | "duplicate">;
}

export class MemoryTransactionState {
  readonly committed = new Set<string>();
  readonly inflight = new Map<string, Promise<"applied" | "duplicate">>();
}

export class MemoryTransactionBoundary implements TransactionBoundary {
  private readonly ledger: Ledger;
  private readonly idempotency: IdempotencyStore;
  private readonly state: MemoryTransactionState;
  constructor(ledger: Ledger, idempotency: IdempotencyStore, state = new MemoryTransactionState()) {
    this.ledger = ledger;
    this.idempotency = idempotency;
    this.state = state;
  }
  async creditOnce(eventId: string, entry: LedgerEntry): Promise<"applied" | "duplicate"> {
    const running = this.state.inflight.get(eventId);
    if (running) { await running; return "duplicate"; }
    const operation = (async (): Promise<"applied" | "duplicate"> => {
      if (this.state.committed.has(eventId) || await this.idempotency.has(eventId)) {
        if (this.state.committed.has(eventId) && !await this.idempotency.has(eventId)) await this.idempotency.mark(eventId);
        return "duplicate";
      }
      // Write-ahead state represents the application transaction record. It survives a
      // handler restart in the fixture and prevents a second ledger write after marker failure.
      this.state.committed.add(eventId);
      try { await this.ledger.credit(entry); }
      catch (error) { this.state.committed.delete(eventId); throw error; }
      await this.idempotency.mark(eventId);
      return "applied";
    })();
    this.state.inflight.set(eventId, operation);
    try { return await operation; }
    finally { this.state.inflight.delete(eventId); }
  }
}
