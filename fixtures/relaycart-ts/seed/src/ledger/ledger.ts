export type LedgerEntry = { customerId: string; amount: number; eventId: string };

export interface Ledger {
  credit(entry: LedgerEntry): Promise<void>;
}

export class MemoryLedger implements Ledger {
  readonly entries: LedgerEntry[] = [];
  async credit(entry: LedgerEntry): Promise<void> {
    this.entries.push(entry);
  }
}
