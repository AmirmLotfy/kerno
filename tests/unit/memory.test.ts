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

  it("retrieves only a currently verified task-relevant memory into a capsule", async () => {
    const service = new KernoService();
    try {
      const snapshot = await service.index({ root: fixture, mode: "incremental" });
      service.recordDecision({ repositoryId: snapshot.repository.id, type: "architecture-decision", summary: "Ledger uniqueness is the authoritative refund idempotency boundary", scope: "branch", evidence: [{ id: "evidence_user_memory", kind: "user", path: "src/ledger/ledger.ts", note: "explicit fixture decision" }], invalidationConditions: [{ kind: "file", key: "src/ledger/ledger.ts", expected: snapshot.files.find((file) => file.path === "src/ledger/ledger.ts")!.contentHash }], userConfirmed: true });
      const task = service.analyze({ repositoryId: snapshot.repository.id, taskText: "Verify the authoritative refund idempotency boundary" });
      const capsule = await service.buildCapsule({ taskAnalysisId: task.id, budgetTokens: 2500 });
      expect(capsule.items.some((item) => item.sourceType === "memory" && item.trust === "verified-memory")).toBe(true);
    } finally { service.close(); }
  });

  it("invalidates commit-scoped evidence when HEAD changes", async () => {
    const snapshot = await indexRepository(fixture); const memory = createMemory({ repositoryId: snapshot.repository.id, branch: snapshot.worktree.branch, headCommit: snapshot.worktree.headCommit, type: "api-contract", summary: "Commit-scoped contract", evidence: [{ id: "evidence_user_commit", kind: "user" }], invalidationConditions: [{ kind: "commit", key: "head", expected: snapshot.worktree.headCommit ?? "unborn" }], creationSource: "user", userConfirmed: true });
    expect(invalidateMemory(memory, snapshot, { ...snapshot, worktree: { ...snapshot.worktree, headCommit: "different-head" } }).status).toBe("stale");
  });
});
