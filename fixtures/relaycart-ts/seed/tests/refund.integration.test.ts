import assert from "node:assert/strict";
import test from "node:test";
import { MemoryIdempotencyStore } from "../src/idempotency/idempotency-store.ts";
import { MemoryLedger } from "../src/ledger/ledger.ts";
import { RefundHandler } from "../src/webhooks/refund-handler.ts";

const event = { id: "evt_1", type: "refund.succeeded" as const, customerId: "cus_1", amount: 500 };

test("concurrent duplicate deliveries credit exactly once", async () => {
  const ledger = new MemoryLedger(); const idempotency = new MemoryIdempotencyStore(); const handler = new RefundHandler(ledger, idempotency);
  await Promise.all([handler.handle(event), handler.handle(event)]);
  assert.equal(ledger.entries.length, 1, "TransactionBoundary is required to serialize duplicate deliveries");
});

test("public refund event shape is unchanged", () => {
  assert.deepEqual(Object.keys(event).sort(), ["amount", "customerId", "id", "type"]);
});
