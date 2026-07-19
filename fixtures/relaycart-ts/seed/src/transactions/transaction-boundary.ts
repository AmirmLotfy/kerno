import type { IdempotencyStore } from "../idempotency/idempotency-store.ts";
import type { Ledger, LedgerEntry } from "../ledger/ledger.ts";

/** Governing contract: the ledger write and idempotency marker commit atomically. */
export interface TransactionBoundary {
  creditOnce(eventId: string, entry: LedgerEntry): Promise<"applied" | "duplicate">;
}

export class MemoryTransactionBoundary implements TransactionBoundary {
  private readonly committed = new Set<string>();
  private readonly ledger: Ledger;
  private readonly idempotency: IdempotencyStore;
  constructor(ledger: Ledger, idempotency: IdempotencyStore) {
    this.ledger = ledger;
    this.idempotency = idempotency;
  }
  async creditOnce(eventId: string, entry: LedgerEntry): Promise<"applied" | "duplicate"> {
    if (this.committed.has(eventId) || await this.idempotency.has(eventId)) return "duplicate";
    await this.ledger.credit(entry);
    await this.idempotency.mark(eventId);
    this.committed.add(eventId);
    return "applied";
  }
}
