import { describe, expect, it } from "vitest";
import { analyzeTaskInputSchema, expansionEvidenceSchema, indexRepositoryInputSchema } from "@kerno/contracts";

describe("strict tool schemas", () => {
  it("rejects unknown input fields", () => {
    expect(() => analyzeTaskInputSchema.parse({ repositoryId: "repo_1", taskText: "fix it", command: "rm -rf ." })).toThrow();
  });
  it("applies safe index defaults", () => {
    expect(indexRepositoryInputSchema.parse({ root: "." }).mode).toBe("incremental");
  });
  it("requires an artifact id and rejects caller-controlled verification", () => {
    expect(() => expansionEvidenceSchema.parse({ kind: "runtime", text: "missing contract" })).toThrow();
    expect(() => expansionEvidenceSchema.parse({ kind: "runtime", artifactId: "artifact_1", text: "missing contract", verified: true })).toThrow();
  });
});
