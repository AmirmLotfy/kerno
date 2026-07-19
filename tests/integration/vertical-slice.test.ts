import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { KernoService } from "@kerno/daemon";

const fixture = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));
const taskText = "A retried refund.succeeded webhook can credit a customer twice if the first delivery commits the ledger entry but times out before the idempotency marker. Make handling exactly-once at the application boundary without changing the public API.";
const services: KernoService[] = [];
const execFile = promisify(execFileCallback);

afterEach(() => { while (services.length) services.pop()!.close(); });

describe("first vertical slice", () => {
  it("indexes incrementally and expands from a genuine test artifact", async () => {
    const service = new KernoService(); services.push(service);
    const first = await service.index({ root: fixture, mode: "incremental" });
    const second = await service.index({ root: fixture, mode: "incremental" });
    expect(first.stats.parsed).toBeGreaterThan(0);
    expect(second.stats.parsed).toBe(0);
    expect(second.stats.reused).toBe(first.files.length);

    const task = service.analyze({ repositoryId: second.repository.id, taskText });
    const capsule = await service.buildCapsule({ taskAnalysisId: task.id, budgetTokens: 2500 });
    expect(capsule.items.some((item) => item.locator.path.includes("transaction-boundary"))).toBe(false);
    let output = ""; let exitCode = 0;
    try { await execFile(process.execPath, ["--test", "--experimental-strip-types", "tests/refund.integration.test.ts"], { cwd: fixture }); }
    catch (error: any) { output = `${error.stdout ?? ""}\n${error.stderr ?? error.message ?? ""}`; exitCode = typeof error.code === "number" ? error.code : 1; }
    expect(exitCode).not.toBe(0);
    const artifact = service.recordArtifact({ kind: "test", source: "command", output, exitCode, command: [process.execPath, "--test", "tests/refund.integration.test.ts"], trusted: true });
    const child = await service.expand({
      capsuleId: capsule.id,
      evidence: {
        kind: "test_failure",
        artifactId: artifact.id,
        text: "TransactionBoundary is required to atomically couple the ledger credit and idempotency marker",
        symbols: ["TransactionBoundary"]
      }
    });
    expect(child.parentCapsuleId).toBe(capsule.id);
    expect(child.items.map((item) => item.locator.path)).toContain("src/transactions/transaction-boundary.ts");
    expect(child.estimatedTokens).toBeLessThanOrEqual(1250);
    await expect(service.expand({ capsuleId: capsule.id, evidence: { kind: "test_failure", artifactId: "artifact_unknown", text: "TransactionBoundary" } })).rejects.toThrow("Unknown evidence artifact");
  });
});
