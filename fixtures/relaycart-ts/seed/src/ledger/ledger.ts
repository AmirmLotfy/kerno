export type LedgerEntry = { customerId: string; amount: number; eventId: string };

export interface Ledger {
  credit(entry: LedgerEntry): Promise<void>;
  /** Durable atomic insert keyed by eventId; production implementations use a unique constraint. */
  creditOnce(entry: LedgerEntry): Promise<"applied" | "duplicate">;
}

export class MemoryLedger implements Ledger {
  readonly entries: LedgerEntry[] = [];
  private readonly eventIds = new Set<string>();
  async credit(entry: LedgerEntry): Promise<void> {
    this.entries.push(entry);
  }
  async creditOnce(entry: LedgerEntry): Promise<"applied" | "duplicate"> {
    if (this.eventIds.has(entry.eventId)) return "duplicate";
    this.eventIds.add(entry.eventId);
    this.entries.push(entry);
    return "applied";
  }
}
