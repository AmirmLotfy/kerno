import assert from "node:assert/strict";
import test from "node:test";
import { MemoryIdempotencyStore } from "../src/idempotency/idempotency-store.ts";
import { MemoryLedger } from "../src/ledger/ledger.ts";
import { RefundHandler } from "../src/webhooks/refund-handler.ts";

test("refund credit and marker must share TransactionBoundary", async () => {
  const ledger = new MemoryLedger();
  const idempotency = new MemoryIdempotencyStore();
  const handler = new RefundHandler(ledger, idempotency);
  await handler.handle({ id: "evt_1", type: "refund.succeeded", customerId: "cus_1", amount: 500 });
  idempotency.processed.delete("evt_1"); // models a timeout before the marker is committed
  await handler.handle({ id: "evt_1", type: "refund.succeeded", customerId: "cus_1", amount: 500 });
  assert.equal(ledger.entries.length, 1, "TransactionBoundary is required to atomically couple the ledger credit and idempotency marker");
});
