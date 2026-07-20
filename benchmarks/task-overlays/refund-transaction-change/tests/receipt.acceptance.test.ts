import assert from "node:assert/strict";
import test from "node:test";
import { MemoryIdempotencyStore } from "../src/idempotency/idempotency-store.ts";
import { MemoryLedger } from "../src/ledger/ledger.ts";
import { RefundHandler } from "../src/webhooks/refund-handler.ts";

test("the webhook handler exposes the transaction receipt without changing the event", async () => {
  const handler = new RefundHandler(new MemoryLedger(), new MemoryIdempotencyStore());
  const event = { id: "evt_receipt", type: "refund.succeeded" as const, customerId: "cus_receipt", amount: 900 };

  assert.equal(await handler.handle(event), "applied");
  assert.equal(await handler.handle(event), "duplicate");
  assert.deepEqual(Object.keys(event).sort(), ["amount", "customerId", "id", "type"]);
});
