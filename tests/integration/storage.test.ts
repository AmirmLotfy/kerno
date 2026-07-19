import { chmod, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { JsonStateStore, SqliteStateStore } from "@kerno/storage";
import { indexRepository } from "@kerno/indexer";
import { fileURLToPath } from "node:url";

const fixture = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));
const cleanup: string[] = [];
afterEach(async () => { while (cleanup.length) await rm(cleanup.pop()!, { recursive: true, force: true }); });

describe("storage migrations and integrity", () => {
  it("creates versioned domain tables and persists normalized index rows transactionally", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-storage-")); cleanup.push(root);
    await chmod(root, 0o755);
    const store = new SqliteStateStore(join(root, "kerno.db"));
    try {
      expect((await stat(root)).mode & 0o777).toBe(0o700); expect((await stat(join(root, "kerno.db"))).mode & 0o777).toBe(0o600);
      expect(store.health()).toEqual({ ok: true, backend: "sqlite", schemaVersion: 2, integrity: "ok" });
      const snapshot = await indexRepository(fixture); store.saveSnapshot(snapshot);
      const names = (store.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((row) => row.name);
      expect(names).toEqual(expect.arrayContaining(["repositories", "worktrees", "file_snapshots", "symbols", "edges", "memories", "evidence", "invalidations", "runs", "benchmarks"]));
      expect((store.db.prepare("SELECT COUNT(*) AS count FROM symbols").get() as { count: number }).count).toBeGreaterThan(0);
      expect((store.db.prepare("SELECT COUNT(*) AS count FROM edges").get() as { count: number }).count).toBeGreaterThan(0);
      store.put("run", "run_storage", { id: "run_storage", createdAt: new Date().toISOString() }, "repo_storage", "completed");
      store.put("benchmark", "benchmark_storage", { id: "benchmark_storage", createdAt: new Date().toISOString() }, "repo_storage");
      expect((store.db.prepare("SELECT COUNT(*) AS count FROM runs").get() as { count: number }).count).toBe(1);
      expect((store.db.prepare("SELECT COUNT(*) AS count FROM benchmarks").get() as { count: number }).count).toBe(1);
    } finally { store.close(); }
  });
  it("fails with an actionable error for corrupt portable state", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-corrupt-")); cleanup.push(root); const path = join(root, "state.json");
    await writeFile(path, "{truncated", "utf8");
    expect(() => new JsonStateStore(path)).toThrow("portable storage is corrupt");
  });
});
