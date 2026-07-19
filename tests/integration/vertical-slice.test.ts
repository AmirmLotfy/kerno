import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { KernoService } from "@kerno/daemon";

const fixture = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));
const taskText = "A retried refund.succeeded webhook can credit a customer twice if the first delivery commits the ledger entry but times out before the idempotency marker. Make handling exactly-once at the application boundary without changing the public API.";
const services: KernoService[] = [];
const cleanup: string[] = [];
const execFile = promisify(execFileCallback);

afterEach(async () => {
  while (services.length) services.pop()!.close();
  while (cleanup.length) await rm(cleanup.pop()!, { recursive: true, force: true });
});

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

  it("keeps a snapshot fresh when discovered binary files are intentionally skipped", async () => {
    const temp = await mkdtemp(join(tmpdir(), "kerno-binary-freshness-")); cleanup.push(temp);
    const root = join(temp, "repo");
    await cp(fixture, root, { recursive: true });
    await writeFile(join(root, "preview.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3]));
    const service = new KernoService(); services.push(service);

    const snapshot = await service.index({ root, mode: "incremental" });
    expect(snapshot.stats.skipped).toBeGreaterThan(0);
    await expect(service.status({ repositoryId: snapshot.repository.id, worktreeId: snapshot.worktree.id })).resolves.toMatchObject({ snapshotStatus: "current" });

    const task = service.analyze({ repositoryId: snapshot.repository.id, worktreeId: snapshot.worktree.id, taskText });
    await expect(service.buildCapsule({ taskAnalysisId: task.id, budgetTokens: 2500 })).resolves.toMatchObject({ snapshotId: snapshot.id });
  });
});
