import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@kerno/contracts": `${root}packages/contracts/src/index.ts`,
      "@kerno/core": `${root}packages/core/src/index.ts`,
      "@kerno/indexer": `${root}packages/indexer/src/index.ts`,
      "@kerno/storage": `${root}packages/storage/src/index.ts`,
      "@kerno/daemon": `${root}packages/daemon/src/index.ts`,
      "@kerno/orchestrator": `${root}packages/orchestrator/src/index.ts`
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20_000,
    coverage: { reporter: ["text", "json-summary"] }
  }
});
