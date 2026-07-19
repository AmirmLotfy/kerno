import { describe, expect, it } from "vitest";
import { assertWithinRepository, redactSecrets } from "@kerno/indexer";

describe("repository security boundaries", () => {
  it.each(["../secret", "/etc/passwd", "a/../../secret", "nul\0path"])("rejects unsafe path %s", (path) => {
    expect(() => assertWithinRepository("/tmp/repository", path)).toThrow();
  });
  it("redacts secret-like values before persistence", () => {
    const result = redactSecrets('const apiKey = "sk_abcdefghijklmnopqrstuvwxyz"');
    expect(result.redacted).toBe(true);
    expect(result.text).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });
});
