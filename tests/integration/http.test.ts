import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { KernoService, startHttpServer } from "@kerno/daemon";

const fixture = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));

describe("loopback read-only API", () => {
  it("requires its bearer token, restricts origins, and rejects mutations", async () => {
    const service = new KernoService(); const snapshot = await service.index({ root: fixture, mode: "incremental" }); const handle = await startHttpServer(service);
    try {
      expect((await fetch(`${handle.url}/v1/repositories/${snapshot.repository.id}`)).status).toBe(401);
      expect((await fetch(`${handle.url}/v1/repositories/${snapshot.repository.id}`, { headers: { authorization: `Bearer ${handle.token}`, origin: "https://evil.invalid" } })).status).toBe(403);
      const allowed = await fetch(`${handle.url}/v1/repositories/${snapshot.repository.id}`, { headers: { authorization: `Bearer ${handle.token}`, origin: "http://localhost:4173" } });
      expect(allowed.status).toBe(200); expect((await allowed.json() as any).repositoryId).toBe(snapshot.repository.id);
      expect((await fetch(`${handle.url}/v1/repositories/${snapshot.repository.id}`, { method: "POST", headers: { authorization: `Bearer ${handle.token}` } })).status).toBe(405);
    } finally { await handle.close(); service.close(); }
  });
});
