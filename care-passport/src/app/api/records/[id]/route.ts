import { withAuth } from "@/lib/auth/protect";
import { apiError, identityOf, json, pathParam, readJson } from "@/server/identity";
import { newEvent, withDb } from "@/server/store";

// Owner stores ciphertext produced in their own browser. The server never sees plaintext.
export const PUT = withAuth(async (req, jwt) => {
  const id = identityOf(jwt);
  const recordId = pathParam(req.url, "records");
  const body = await readJson(req);
  const ciphertext = body?.ciphertext;
  if (typeof ciphertext !== "string" || ciphertext.length === 0) {
    return apiError(400, "invalid_request", "ciphertext (string) is required");
  }
  const result = await withDb((db) => {
    const rec = db.records.find((r) => r.id === recordId && r.owner === id.username);
    if (!rec) return null;
    rec.ciphertext = ciphertext;
    rec.updatedAt = new Date().toISOString();
    db.events.push(newEvent({ actor: id.username, recordId, type: "record_saved", source: "application", detail: "Ciphertext stored" }));
    return { id: rec.id, updatedAt: rec.updatedAt };
  }, true);
  return result ? json({ record: result }) : apiError(404, "not_found");
});
