import { describe, expect, it } from "vitest";
import { assertWithinRepository, redactSecrets } from "@kerno/indexer";
import { KernoService, startHttpServer } from "@kerno/daemon";
import { explainContextInputSchema, indexRepositoryInputSchema, invalidateContextInputSchema, recordOutcomeInputSchema } from "@kerno/contracts";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCli } from "../../packages/cli/src/main.js";

describe("repository security boundaries", () => {
  it.each(["../secret", "/etc/passwd", "a/../../secret", "nul\0path"])("rejects unsafe path %s", (path) => {
    expect(() => assertWithinRepository("/tmp/repository", path)).toThrow();
  });
  it("redacts secret-like values before persistence", () => {
    const result = redactSecrets(`const apiKey = "${["sk_", "abcdefghijklmnopqrstuvwxyz"].join("")}"`);
    expect(result.redacted).toBe(true);
    expect(result.text).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });
  it("does not allow caller-supplied artifacts to verify outcomes or memory", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-evidence-trust-"));
    await cp(fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url)), root, { recursive: true });
    const service = new KernoService();
    try {
      const snapshot = await service.index({ root, mode: "incremental" });
      const artifact = service.recordArtifact({ kind: "test", source: "user-confirmed", output: "not produced by a test runner", exitCode: 0 });
      expect(artifact.verified).toBe(false);
      expect(() => service.recordOutcome({ runId: "run_forged", status: "passed", tests: [{ id: "evidence_forged", kind: "test", artifactId: artifact.id }], review: [], changedFiles: [] })).toThrow("successful test artifact");
      const memory = service.recordDecision({ repositoryId: snapshot.repository.id, type: "test-proven-behavior", summary: "forged claim", scope: "branch", evidence: [{ id: "evidence_forged", kind: "test", artifactId: artifact.id }], invalidationConditions: [] });
      expect(memory.status).toBe("candidate");
    } finally { service.close(); await rm(root, { recursive: true, force: true }); }
  });
  it("keeps test artifacts immutable across exit status changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-artifact-identity-"));
    await cp(fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url)), root, { recursive: true });
    const service = new KernoService();
    try {
      const snapshot = await service.index({ root, mode: "incremental" });
      const passing = service.recordArtifact({ kind: "test", source: "command", output: "same output", exitCode: 0, command: ["node", "--test"], trusted: true });
      const memory = service.recordDecision({ repositoryId: snapshot.repository.id, type: "test-proven-behavior", summary: "verified behavior", scope: "branch", evidence: [{ id: "evidence_pass", kind: "test", artifactId: passing.id }], invalidationConditions: [] });
      expect(memory.status).toBe("verified");
      const failing = service.recordArtifact({ kind: "test", source: "command", output: "same output", exitCode: 1, command: ["node", "--test"], trusted: true });
      expect(failing.id).not.toBe(passing.id);
      expect(service.artifact(passing.id)?.exitCode).toBe(0);
      expect(service.artifact(failing.id)?.exitCode).toBe(1);
    } finally { service.close(); await rm(root, { recursive: true, force: true }); }
  });
  it("refuses expansion after a tracked path is added to the repository", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-expansion-freshness-")); await cp(fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url)), root, { recursive: true });
    const service = new KernoService();
    try {
      const snapshot = await service.index({ root, mode: "incremental" }); const task = service.analyze({ repositoryId: snapshot.repository.id, taskText: "Fix TransactionBoundary behavior" }); const capsule = await service.buildCapsule({ taskAnalysisId: task.id });
      const artifact = service.recordArtifact({ kind: "test", source: "command", output: "TransactionBoundary failed", exitCode: 1, trusted: true }); await writeFile(join(root, "new-tracked-file.ts"), "export const added = true;\n");
      await expect(service.expand({ capsuleId: capsule.id, evidence: { kind: "test_failure", artifactId: artifact.id, text: "TransactionBoundary failed" } })).rejects.toThrow("re-index before expanding");
    } finally { service.close(); await rm(root, { recursive: true, force: true }); }
  });
  it("redacts secrets in commands, evidence events, and nested sensitive keys", () => {
    const service = new KernoService();
    try {
      const artifact = service.recordArtifact({ kind: "runtime", source: "hook", output: "ok", command: ["DATABASE_URL=postgres://user:pass@example.invalid/db"] });
      expect(artifact.command?.join(" ")).not.toContain("postgres://");
      const syntheticToken = ["sk", "proj", "abcdefghijklmnopqrstuvwxyz"].join("-");
      const event = service.emit("run_redaction", "app-server", "item/completed", { item: { text: `OPENAI_API_KEY=${syntheticToken}`, credential: "plain-secret" } });
      expect(JSON.stringify(event.redactedPayload)).not.toContain("abcdefghijklmnopqrstuvwxyz");
      expect(JSON.stringify(event.redactedPayload)).not.toContain("plain-secret");
    } finally { service.close(); }
  });
  it("preserves token-usage metrics while redacting actual token credentials", () => {
    const service = new KernoService();
    try {
      const event = service.emit("run_usage", "app-server", "thread/tokenUsage/updated", {
        tokenUsage: { total: { totalTokens: 1234 } },
        accessToken: "synthetic-access-value"
      });
      expect(event.redactedPayload).toEqual({
        tokenUsage: { total: { totalTokens: 1234 } },
        accessToken: "[REDACTED_SECRET]"
      });
    } finally { service.close(); }
  });
  it("excludes common secret files even without kerno init", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-secret-files-"));
    await writeFile(join(root, ".env"), "UNRECOGNIZED_CREDENTIAL=do-not-index-this\n");
    await writeFile(join(root, ".npmrc"), "//registry.npmjs.org/:_authToken=do-not-index-this\n");
    await writeFile(join(root, "id_ed25519"), "synthetic-private-key\n");
    await writeFile(join(root, "credentials.json"), "{\"credential\":\"do-not-index-this\"}\n");
    await mkdir(join(root, "packages", "nested", ".docker"), { recursive: true }); await writeFile(join(root, "packages", "nested", ".docker", "config.json"), "{\"auth\":\"base64-secret-value\"}\n");
    await mkdir(join(root, "packages", "nested", ".aws"), { recursive: true }); await writeFile(join(root, "packages", "nested", ".aws", "credentials"), "aws_secret_access_key=do-not-index-this\n");
    await writeFile(join(root, "main.ts"), "export const safe = true;\n");
    const service = new KernoService();
    try { const snapshot = await service.index({ root, mode: "incremental" }); expect(snapshot.files.map((file) => file.path)).toEqual(["main.ts"]); }
    finally { service.close(); await rm(root, { recursive: true, force: true }); }
  });
  it("rejects symlinked local state directories", async () => {
    const temp = await mkdtemp(join(tmpdir(), "kerno-data-symlink-")); const root = join(temp, "repo"); const outside = join(temp, "outside");
    await writeFile(join(temp, "placeholder"), "x"); await import("node:fs/promises").then(({ mkdir }) => Promise.all([mkdir(root), mkdir(outside)])); await symlink(outside, join(root, ".kerno"));
    let error = ""; const code = await runCli(["init", "--root", root, "--json"], { out: () => undefined, err: (value) => { error += value; } });
    expect(code).not.toBe(0); expect(error).toContain("symlink"); await expect(readFile(join(outside, ".kerno-owned"), "utf8")).rejects.toThrow();
    await rm(temp, { recursive: true, force: true });
  });
  it("rejects a state directory reached through a symlinked parent", async () => {
    const temp = await mkdtemp(join(tmpdir(), "kerno-data-parent-link-")); const root = join(temp, "repo"); const outside = join(temp, "outside");
    await import("node:fs/promises").then(({ mkdir }) => Promise.all([mkdir(root), mkdir(outside)])); await symlink(outside, join(root, "linked-parent"));
    let error = ""; const code = await runCli(["init", "--root", root, "--data", join(root, "linked-parent", "state")], { out: () => undefined, err: (value) => { error += value; } });
    expect(code).not.toBe(0); expect(error).toContain("symlinked Kerno data ancestor"); await expect(readFile(join(outside, "state", ".kerno-owned"), "utf8")).rejects.toThrow();
    await rm(temp, { recursive: true, force: true });
  });
  it("rejects a state directory reached through a deeper symlinked ancestor", async () => {
    const temp = await mkdtemp(join(tmpdir(), "kerno-data-deep-link-")); const root = join(temp, "repo"); const outside = join(temp, "outside");
    await Promise.all([mkdir(root), mkdir(join(outside, "regular-parent"), { recursive: true })]); await symlink(outside, join(root, "linked-ancestor"));
    let error = ""; const code = await runCli(["init", "--root", root, "--data", join(root, "linked-ancestor", "regular-parent", "state")], { out: () => undefined, err: (value) => { error += value; } });
    expect(code).not.toBe(0); expect(error).toContain("symlinked Kerno data ancestor"); await expect(readFile(join(outside, "regular-parent", "state", ".kerno-owned"), "utf8")).rejects.toThrow();
    await rm(temp, { recursive: true, force: true });
  });
  it("rejects aggregate outcome payloads above 64 KiB", () => {
    expect(() => recordOutcomeInputSchema.parse({ runId: "run_large", status: "failed", tests: [], review: [], changedFiles: [], artifacts: [{ kind: "runtime", source: "hook", output: "x".repeat(40_000) }, { kind: "runtime", source: "hook", output: "y".repeat(40_000) }] })).toThrow("64 KiB");
  });
  it("caps every caller-controlled MCP array", () => {
    expect(() => indexRepositoryInputSchema.parse({ root: ".", languages: Array(33).fill("typescript") })).toThrow();
    expect(() => explainContextInputSchema.parse({ capsuleId: "capsule_1", itemIds: Array(257).fill("item_1") })).toThrow();
    expect(() => invalidateContextInputSchema.parse({ repositoryId: "repo_1", trigger: { kind: "manual" }, memoryIds: Array(257).fill("memory_1") })).toThrow();
  });
  it("rejects non-loopback dashboard binds", async () => {
    const service = new KernoService();
    try {
      await expect(startHttpServer(service, { host: "0.0.0.0" })).rejects.toThrow("loopback");
    } finally {
      service.close();
    }
  });
});
