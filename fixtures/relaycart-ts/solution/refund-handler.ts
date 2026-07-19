import type { IdempotencyStore } from "../idempotency/idempotency-store.ts";
import type { Ledger } from "../ledger/ledger.ts";
import { transactionBoundaryFor, type TransactionBoundary } from "../transactions/transaction-boundary.ts";

export type RefundSucceeded = {
  id: string;
  type: "refund.succeeded";
  customerId: string;
  amount: number;
};

export class RefundHandler {
  private readonly transaction: TransactionBoundary;
  constructor(ledger: Ledger, idempotency: IdempotencyStore, transaction?: TransactionBoundary) {
    this.transaction = transaction ?? transactionBoundaryFor(ledger, idempotency);
  }

  async handle(event: RefundSucceeded): Promise<void> {
    await this.transaction.creditOnce(event.id, { customerId: event.customerId, amount: event.amount, eventId: event.id });
  }
}
