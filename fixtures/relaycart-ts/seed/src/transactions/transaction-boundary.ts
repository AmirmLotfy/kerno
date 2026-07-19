import type { IdempotencyStore } from "../idempotency/idempotency-store.ts";
import type { Ledger, LedgerEntry } from "../ledger/ledger.ts";

/** Governing contract: the durable ledger owns uniqueness; the marker is a repairable cache. */
export interface TransactionBoundary {
  creditOnce(eventId: string, entry: LedgerEntry): Promise<"applied" | "duplicate">;
}

export class MemoryTransactionBoundary implements TransactionBoundary {
  private readonly ledger: Ledger;
  private readonly idempotency: IdempotencyStore;
  constructor(ledger: Ledger, idempotency: IdempotencyStore) {
    this.ledger = ledger;
    this.idempotency = idempotency;
  }
  async creditOnce(eventId: string, entry: LedgerEntry): Promise<"applied" | "duplicate"> {
    // The durable ledger is authoritative. A marker may be missing or stale and must
    // never suppress a legitimate ledger write.
    const result = await this.ledger.creditOnce(entry);
    if (!await this.idempotency.has(eventId)) await this.idempotency.mark(eventId);
    return result;
  }
}

/** Factory kept explicit so the handler depends on the governing transaction contract. */
export function transactionBoundaryFor(ledger: Ledger, idempotency: IdempotencyStore): TransactionBoundary {
  return new MemoryTransactionBoundary(ledger, idempotency);
}
