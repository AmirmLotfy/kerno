import { describe, expect, it } from "vitest";
import { createMemory, invalidateMemory } from "@kerno/core";
import { indexRepository } from "@kerno/indexer";
import { KernoService } from "@kerno/daemon";
import { fileURLToPath } from "node:url";

const fixture = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));

describe("evidence-backed memory", () => {
  it("does not promote agent prose", async () => {
    const snapshot = await indexRepository(fixture);
    const memory = createMemory({ repositoryId: snapshot.repository.id, branch: snapshot.worktree.branch, headCommit: snapshot.worktree.headCommit, type: "code-invariant", summary: "A claim made only by an agent", evidence: [], invalidationConditions: [], creationSource: "codex" });
    expect(memory.status).toBe("candidate");
  });

  it("invalidates verified file evidence after a hash mismatch", async () => {
    const snapshot = await indexRepository(fixture);
    const file = snapshot.files[0]!;
    const memory = createMemory({ repositoryId: snapshot.repository.id, branch: snapshot.worktree.branch, headCommit: snapshot.worktree.headCommit, type: "test-proven-behavior", summary: "Proven behavior", evidence: [{ id: "evidence_test", kind: "test", path: file.path, artifactId: "artifact_pass" }], invalidationConditions: [{ kind: "file", key: file.path, expected: file.contentHash }], creationSource: "test" });
    const changed = { ...snapshot, files: snapshot.files.map((candidate) => candidate.path === file.path ? { ...candidate, contentHash: "changed" } : candidate) };
    expect(invalidateMemory(memory, snapshot, changed).status).toBe("stale");
  });

  it("supersedes an earlier repository decision transactionally", async () => {
    const service = new KernoService();
    try {
      const snapshot = await service.index({ root: fixture, mode: "incremental" });
      const first = service.recordDecision({ repositoryId: snapshot.repository.id, type: "architecture-decision", summary: "Refund markers are written after ledger credit", scope: "branch", evidence: [{ id: "evidence_user_old", kind: "user", note: "fixture decision" }], invalidationConditions: [], userConfirmed: true });
      const replacement = service.recordDecision({ repositoryId: snapshot.repository.id, type: "architecture-decision", summary: "Refund markers and ledger credits share one transaction boundary", scope: "branch", evidence: [{ id: "evidence_user_new", kind: "user", note: "corrected decision" }], invalidationConditions: [], userConfirmed: true, supersedes: [first.id] });
      expect(replacement.supersedes).toEqual([first.id]);
      expect(service.store.get<typeof first>("memory", first.id)).toMatchObject({ status: "superseded", supersededBy: replacement.id });
    } finally { service.close(); }
  });
});
