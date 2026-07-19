import assert from "node:assert/strict";
import test from "node:test";
import { MemoryIdempotencyStore } from "../src/idempotency/idempotency-store.ts";
import { MemoryLedger } from "../src/ledger/ledger.ts";
import { RefundHandler } from "../src/webhooks/refund-handler.ts";

test("write-ahead state survives a marker timeout and handler restart", async () => {
  const ledger = new MemoryLedger();
  class FailingStore extends MemoryIdempotencyStore { override async mark(): Promise<void> { throw new Error("simulated timeout before marker commit"); } }
  const first = new RefundHandler(ledger, new FailingStore());
  const event = { id: "evt_1", type: "refund.succeeded" as const, customerId: "cus_1", amount: 500 };
  await assert.rejects(first.handle(event), /simulated timeout/);
  // A new handler and marker store simulate process-local state loss; the ledger remains durable.
  const restarted = new RefundHandler(ledger, new MemoryIdempotencyStore());
  await restarted.handle(event);
  assert.equal(ledger.entries.length, 1);

  const freshLedger = new MemoryLedger(); const staleMarker = new MemoryIdempotencyStore();
  await staleMarker.mark("evt_stale");
  await new RefundHandler(freshLedger, staleMarker).handle({ ...event, id: "evt_stale" });
  assert.equal(freshLedger.entries.length, 1, "a stale marker cannot suppress the durable ledger operation");
});
