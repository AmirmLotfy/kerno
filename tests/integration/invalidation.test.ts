import { afterEach, describe, expect, it } from "vitest";
import { appendFile, cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { KernoService } from "@kerno/daemon";

const execFile = promisify(execFileCallback);
const fixture = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));
const cleanup: string[] = [];
afterEach(async () => { while (cleanup.length) await rm(cleanup.pop()!, { recursive: true, force: true }); });

describe("branch and file invalidation", () => {
  it("never silently reuses branch-scoped memory or hash-stale capsules", async () => {
    const temp = await mkdtemp(join(tmpdir(), "kerno-invalidation-")); cleanup.push(temp); const root = join(temp, "repo"); await cp(fixture, root, { recursive: true });
    const git = async (...args: string[]) => execFile("git", ["-C", root, ...args], { env: { ...process.env, GIT_AUTHOR_NAME: "Kerno Test", GIT_AUTHOR_EMAIL: "test@local.invalid", GIT_COMMITTER_NAME: "Kerno Test", GIT_COMMITTER_EMAIL: "test@local.invalid" } });
    await git("init", "-b", "main"); await git("add", "."); await git("commit", "-m", "fixture");
    const service = new KernoService();
    try {
      const main = await service.index({ root, mode: "incremental" });
      const task = service.analyze({ repositoryId: main.repository.id, taskText: "Fix the duplicate refund webhook credit" });
      const capsule = service.buildCapsule({ taskAnalysisId: task.id, budgetTokens: 1200 });
      const memory = service.recordDecision({ repositoryId: main.repository.id, type: "api-contract", summary: "Refund event shape is stable", scope: "branch", evidence: [{ id: "evidence_user", kind: "user", note: "explicit test confirmation" }], invalidationConditions: [], userConfirmed: true });
      await git("checkout", "-b", "changed-interface");
      await appendFile(join(root, "src/webhooks/refund-handler.ts"), "\nexport const changedInterface = true;\n");
      await service.index({ root, mode: "incremental" });
      expect(service.store.capsule(capsule.id)?.status).toBe("stale");
      expect(service.store.memories(main.repository.id).find((item) => item.id === memory.id)?.status).toBe("stale");
    } finally { service.close(); }
  });
});
