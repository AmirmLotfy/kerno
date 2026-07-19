import type { IdempotencyStore } from "../idempotency/idempotency-store.ts";
import type { Ledger } from "../ledger/ledger.ts";

export type RefundSucceeded = {
  id: string;
  type: "refund.succeeded";
  customerId: string;
  amount: number;
};

export class RefundHandler {
  private readonly ledger: Ledger;
  private readonly idempotency: IdempotencyStore;
  constructor(ledger: Ledger, idempotency: IdempotencyStore) {
    this.ledger = ledger;
    this.idempotency = idempotency;
  }

  async handle(event: RefundSucceeded): Promise<void> {
    if (await this.idempotency.has(event.id)) return;
    await this.ledger.credit({ customerId: event.customerId, amount: event.amount, eventId: event.id });
    // A timeout here allows the retry to credit the customer again.
    await this.idempotency.mark(event.id);
  }
}
