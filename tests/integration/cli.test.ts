import { mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertSafeDataDirectory, runCli } from "../../packages/cli/src/main.js";

const cleanup: string[] = [];
afterEach(async () => { while (cleanup.length) await rm(cleanup.pop()!, { recursive: true, force: true }); });

describe("Kerno CLI", () => {
  it("initializes safely and provides JSON diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-cli-")); cleanup.push(root);
    const stdout: string[] = []; const stderr: string[] = [];
    expect(await runCli(["init", "--root", root, "--json"], { out: (value) => stdout.push(value), err: (value) => stderr.push(value) })).toBe(0);
    expect(await readFile(join(root, ".kerno", ".kerno-owned"), "utf8")).toContain("kerno-local-data");
    expect(stderr).toEqual([]); expect(JSON.parse(stdout.join(""))).toMatchObject({ initialized: true, root });
  });
  it("refuses broad or unowned destructive paths", async () => {
    expect(() => assertSafeDataDirectory("/", "/tmp/project")).toThrow("Refusing destructive");
    expect(() => assertSafeDataDirectory("/tmp", "/tmp/project")).toThrow("Refusing destructive");
    const root = await mkdtemp(join(tmpdir(), "kerno-delete-")); cleanup.push(root);
    const errors: string[] = [];
    expect(await runCli(["data-delete", "--root", root, "--data", join(root, "not-kerno"), "--yes"], { out: () => {}, err: (value) => errors.push(value) })).toBe(2);
    expect(errors.join("")).toContain("unmarked directory");
  });
  it("exports and deletes the portable plugin store without overwriting or leaking excerpts", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-portable-")); cleanup.push(root); const data = join(root, "plugin-data"); const output = join(root, "safe-export.json");
    const previousStorage = process.env.KERNO_STORAGE; process.env.KERNO_STORAGE = "json";
    try {
      expect(await runCli(["init", "--root", root, "--data", data, "--json"], { out: () => {}, err: () => {} })).toBe(0);
      await writeFile(join(data, "kerno-state.json"), `${JSON.stringify({ schemaVersion: 1, entities: [{ kind: "task", id: "task_export", createdAt: new Date().toISOString(), value: { id: "task_export", canonicalPath: root, absolutePath: join(root, "secret.ts"), excerpt: "private source", accessToken: "plain-access-value" } }], events: [] })}\n`, { mode: 0o600 });
      expect(await runCli(["data-export", "--root", root, "--data", data, "--out", output, "--json"], { out: () => {}, err: () => {} })).toBe(0);
      const exported = await readFile(output, "utf8"); expect(exported).not.toContain(root); expect(exported).not.toContain("plain-access-value"); expect(exported).toContain("[OMITTED_FROM_SAFE_EXPORT]");
      expect((await stat(output)).mode & 0o777).toBe(0o600);
      expect(await runCli(["data-export", "--root", root, "--data", data, "--out", output, "--json"], { out: () => {}, err: () => {} })).toBe(2);
      const outside = join(root, "outside.json"); const linkedOutput = join(root, "linked-export.json"); await writeFile(outside, "sentinel\n"); await symlink(outside, linkedOutput);
      expect(await runCli(["data-export", "--root", root, "--data", data, "--out", linkedOutput, "--json"], { out: () => {}, err: () => {} })).toBe(2); expect(await readFile(outside, "utf8")).toBe("sentinel\n");
      expect(await runCli(["data-delete", "--root", root, "--data", data, "--yes", "--json"], { out: () => {}, err: () => {} })).toBe(0);
    } finally { if (previousStorage === undefined) delete process.env.KERNO_STORAGE; else process.env.KERNO_STORAGE = previousStorage; }
  });
  it("refuses a symlinked portable state file without reading or writing its target", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-state-link-")); cleanup.push(root); const data = join(root, "plugin-data"); const outside = join(root, "outside-state.json");
    const previousStorage = process.env.KERNO_STORAGE; process.env.KERNO_STORAGE = "json";
    try {
      expect(await runCli(["init", "--root", root, "--data", data], { out: () => {}, err: () => {} })).toBe(0);
      const original = "{\"schemaVersion\":1,\"entities\":[],\"events\":[]}\n"; await writeFile(outside, original); await symlink(outside, join(data, "kerno-state.json"));
      const errors: string[] = [];
      expect(await runCli(["data-export", "--root", root, "--data", data, "--out", join(root, "export.json")], { out: () => {}, err: (value) => errors.push(value) })).not.toBe(0);
      expect(errors.join("")).toContain("symlinked Kerno state file"); expect(await readFile(outside, "utf8")).toBe(original);
    } finally { if (previousStorage === undefined) delete process.env.KERNO_STORAGE; else process.env.KERNO_STORAGE = previousStorage; }
  });
  it("requires an explicit condition, task, and immutable pair id for live benchmarks", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-benchmark-cli-")); cleanup.push(root);
    const errors: string[] = [];
    expect(await runCli(["benchmark", "--root", root, "--baseline"], { out: () => {}, err: (value) => errors.push(value) })).toBe(2);
    expect(errors.join("")).toContain("--task <task-id> and --pair-id <stable-pair-id>");
  });
});
