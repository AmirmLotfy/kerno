import { mkdtemp, readFile, rm } from "node:fs/promises";
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
    expect(errors.join("")).toContain("limited to a directory named .kerno");
  });
});
