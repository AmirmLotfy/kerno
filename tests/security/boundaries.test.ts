import { describe, expect, it } from "vitest";
import { assertWithinRepository, redactSecrets } from "@kerno/indexer";
import { KernoService, startHttpServer } from "@kerno/daemon";

describe("repository security boundaries", () => {
  it.each(["../secret", "/etc/passwd", "a/../../secret", "nul\0path"])("rejects unsafe path %s", (path) => {
    expect(() => assertWithinRepository("/tmp/repository", path)).toThrow();
  });
  it("redacts secret-like values before persistence", () => {
    const result = redactSecrets(`const apiKey = "${["sk_", "abcdefghijklmnopqrstuvwxyz"].join("")}"`);
    expect(result.redacted).toBe(true);
    expect(result.text).not.toContain("abcdefghijklmnopqrstuvwxyz");
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
