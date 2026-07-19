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
      const memory = service.recordDecision({ repositoryId: snapshot.repository.id, type: "architecture-decision", summary: "Ledger uniqueness is the authoritative refund idempotency boundary", scope: "branch", evidence: [{ id: "evidence_user_memory", kind: "user", path: "src/ledger/ledger.ts", note: "explicit fixture decision" }], invalidationConditions: [{ kind: "file", key: "src/ledger/ledger.ts", expected: snapshot.files.find((file) => file.path === "src/ledger/ledger.ts")!.contentHash }], userConfirmed: true });
      const task = service.analyze({ repositoryId: snapshot.repository.id, taskText: "Verify the authoritative refund idempotency boundary" });
      const capsule = await service.buildCapsule({ taskAnalysisId: task.id, budgetTokens: 2500 });
      const item = capsule.items.find((candidate) => candidate.sourceType === "memory" && candidate.trust === "verified-memory");
      expect(item).toBeDefined();
      if (!item) throw new Error("Expected a verified memory item");
      expect(item.invalidationKeys).toContainEqual({ kind: "manual", key: `memory:${memory.id}`, expected: item.contentHash });
    } finally { service.close(); }
  });

  it("invalidates commit-scoped evidence when HEAD changes", async () => {
    const snapshot = await indexRepository(fixture); const memory = createMemory({ repositoryId: snapshot.repository.id, branch: snapshot.worktree.branch, headCommit: snapshot.worktree.headCommit, type: "api-contract", summary: "Commit-scoped contract", evidence: [{ id: "evidence_user_commit", kind: "user" }], invalidationConditions: [{ kind: "commit", key: "head", expected: snapshot.worktree.headCommit ?? "unborn" }], creationSource: "user", userConfirmed: true });
    expect(invalidateMemory(memory, snapshot, { ...snapshot, worktree: { ...snapshot.worktree, headCommit: "different-head" } }).status).toBe("stale");
  });

  it("keeps manual invalidation explicit and detects graph changes without a caller hash", async () => {
    const snapshot = await indexRepository(fixture);
    const manual = createMemory({ repositoryId: snapshot.repository.id, branch: null, headCommit: snapshot.worktree.headCommit, type: "security-boundary", summary: "Manual policy", evidence: [{ id: "evidence_user_manual", kind: "user" }], invalidationConditions: [{ kind: "manual", key: "operator-review" }], creationSource: "user", userConfirmed: true });
    expect(invalidateMemory(manual, snapshot, snapshot).status).toBe("verified");
    const graph = createMemory({ repositoryId: snapshot.repository.id, branch: null, headCommit: snapshot.worktree.headCommit, type: "code-invariant", summary: "Graph invariant", evidence: [{ id: "evidence_user_graph", kind: "user" }], invalidationConditions: [{ kind: "graph", key: "dependency-graph" }], creationSource: "user", userConfirmed: true });
    expect(invalidateMemory(graph, snapshot, { ...snapshot, edges: snapshot.edges.slice(1) }).status).toBe("stale");
  });

  it("canonicalizes trusted test evidence and stops retrieving it after the artifact disappears", async () => {
    const service = new KernoService();
    try {
      const snapshot = await service.index({ root: fixture, mode: "incremental" });
      const artifact = service.recordArtifact({ kind: "test", source: "command", output: "authoritative refund idempotency boundary passed", exitCode: 0, command: ["node", "--test"], trusted: true });
      expect(() => service.recordDecision({ repositoryId: snapshot.repository.id, type: "test-proven-behavior", summary: "Authoritative refund idempotency boundary", scope: "branch", evidence: [{ id: "evidence_forged_hash", kind: "test", artifactId: artifact.id, contentHash: "0".repeat(64) }], invalidationConditions: [] })).toThrow("content hash");
      const memory = service.recordDecision({ repositoryId: snapshot.repository.id, type: "test-proven-behavior", summary: "Authoritative refund idempotency boundary", scope: "branch", evidence: [{ id: "evidence_caller", kind: "test", artifactId: artifact.id }], invalidationConditions: [] });
      expect(memory.evidence[0]).toMatchObject({ artifactId: artifact.id, contentHash: artifact.contentHash });
      expect(memory.invalidationConditions).toContainEqual({ kind: "test-artifact", key: artifact.id, expected: artifact.contentHash });
      expect(service.store.delete("artifact", artifact.id)).toBe(true);
      const task = service.analyze({ repositoryId: snapshot.repository.id, taskText: "Check the authoritative refund idempotency boundary" });
      const capsule = await service.buildCapsule({ taskAnalysisId: task.id, budgetTokens: 2500 });
      expect(capsule.items.some((item) => item.sourceType === "memory")).toBe(false);
      expect(service.store.get<typeof memory>("memory", memory.id)?.status).toBe("stale");
    } finally { service.close(); }
  });
});
