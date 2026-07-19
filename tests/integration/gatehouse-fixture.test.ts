import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { indexRepository } from "@kerno/indexer";

const execFile = promisify(execFileCallback);
const seed = fileURLToPath(new URL("../../fixtures/gatehouse-python/seed", import.meta.url));
const solution = fileURLToPath(new URL("../../fixtures/gatehouse-python/solution", import.meta.url));

async function tests(root: string): Promise<number> { try { await execFile("python3", ["-m", "unittest", "discover", "-s", "tests", "-v"], { cwd: root }); return 0; } catch (error: any) { return typeof error.code === "number" ? error.code : 1; } }

describe("substantial Python benchmark fixture", () => {
  it("indexes multiple modules, fails before the task, and passes the pinned solution", async () => {
    const root = await mkdtemp(join(tmpdir(), "gatehouse-fixture-")); await cp(seed, root, { recursive: true });
    const snapshot = await indexRepository(root); expect(snapshot.files.filter((file) => file.language === "python").length).toBeGreaterThanOrEqual(6); expect(snapshot.edges.some((edge) => edge.type === "imports")).toBe(true);
    expect(await tests(root)).not.toBe(0);
    await writeFile(join(root, "gatehouse/retry.py"), await readFile(join(solution, "retry.py")), { mode: 0o600 }); await writeFile(join(root, "gatehouse/worker.py"), await readFile(join(solution, "worker.py")), { mode: 0o600 });
    expect(await tests(root)).toBe(0);
  });
});
