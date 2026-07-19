import { describe, expect, it } from "vitest";
import { analyzeTaskInputSchema, expansionEvidenceSchema, indexRepositoryInputSchema } from "@kerno/contracts";

describe("strict tool schemas", () => {
  it("rejects unknown input fields", () => {
    expect(() => analyzeTaskInputSchema.parse({ repositoryId: "repo_1", taskText: "fix it", command: "rm -rf ." })).toThrow();
  });
  it("applies safe index defaults", () => {
    expect(indexRepositoryInputSchema.parse({ root: "." }).mode).toBe("incremental");
  });
  it("never treats omitted expansion verification as trusted", () => {
    expect(expansionEvidenceSchema.parse({ kind: "runtime", text: "missing contract" }).verified).toBe(false);
  });
});
