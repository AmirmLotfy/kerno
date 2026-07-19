import assert from "node:assert/strict";
import test from "node:test";
import { MemoryIdempotencyStore } from "../src/idempotency/idempotency-store.ts";
import { MemoryLedger } from "../src/ledger/ledger.ts";
import { RefundHandler } from "../src/webhooks/refund-handler.ts";

const event = { id: "evt_1", type: "refund.succeeded" as const, customerId: "cus_1", amount: 500 };

test("concurrent duplicate deliveries across handlers credit exactly once", async () => {
  const ledger = new MemoryLedger(); const idempotency = new MemoryIdempotencyStore();
  const first = new RefundHandler(ledger, idempotency); const second = new RefundHandler(ledger, idempotency);
  await Promise.all([first.handle(event), second.handle(event)]);
  assert.equal(ledger.entries.length, 1, "TransactionBoundary is required to serialize duplicate deliveries");
});

test("public refund event shape is unchanged", () => {
  assert.deepEqual(Object.keys(event).sort(), ["amount", "customerId", "id", "type"]);
});
