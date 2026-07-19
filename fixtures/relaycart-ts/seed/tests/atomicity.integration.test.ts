import assert from "node:assert/strict";
import test from "node:test";
import { MemoryIdempotencyStore } from "../src/idempotency/idempotency-store.ts";
import { MemoryLedger } from "../src/ledger/ledger.ts";
import { MemoryTransactionBoundary, MemoryTransactionState } from "../src/transactions/transaction-boundary.ts";

test("write-ahead state survives a marker timeout and boundary restart", async () => {
  const ledger = new MemoryLedger();
  class FailOnceStore extends MemoryIdempotencyStore { failures = 1; override async mark(id: string): Promise<void> { if (this.failures-- > 0) throw new Error("simulated timeout before marker commit"); await super.mark(id); } }
  const idempotency = new FailOnceStore(); const state = new MemoryTransactionState();
  const first = new MemoryTransactionBoundary(ledger, idempotency, state);
  await assert.rejects(first.creditOnce("evt_1", { eventId: "evt_1", customerId: "cus_1", amount: 500 }), /simulated timeout/);
  const restarted = new MemoryTransactionBoundary(ledger, idempotency, state);
  await restarted.creditOnce("evt_1", { eventId: "evt_1", customerId: "cus_1", amount: 500 });
  assert.equal(ledger.entries.length, 1);
});
