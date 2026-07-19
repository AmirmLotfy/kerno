import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { indexRepository } from "@kerno/indexer";

const fixture = fileURLToPath(new URL("../../fixtures/gatehouse-python/seed", import.meta.url));
describe("Python repository intelligence", () => {
  it("extracts Python classes, functions, imports, and tests with explicit confidence", async () => {
    const snapshot = await indexRepository(fixture);
    const symbols = snapshot.files.flatMap((file) => file.symbols.map((symbol) => symbol.name));
    expect(symbols).toContain("RetryPolicy"); expect(symbols).toContain("policy_for"); expect(symbols).toContain("Worker");
    expect(snapshot.files.find((file) => file.path.endsWith("test_worker.py"))?.isTest).toBe(true);
    expect(snapshot.files.filter((file) => file.language === "python").every((file) => file.parser === "lezer-python" && file.confidence === 0.9)).toBe(true);
  });
});
