import { withAuth } from "@/server/auth";
import { apiError, identityOf, json, pathParam } from "@/server/identity";
import { newEvent, withDb } from "@/server/store";

// DEMO ONLY. Hands ANY signed-in user the ciphertext and policy of ANY record, as if the
// database leaked or the server were compromised. It exists to show that possession is
// not access: the Tide network still refuses anyone outside the record's care group.
export const GET = withAuth(async (req, jwt) => {
  const id = identityOf(jwt);
  const recordId = pathParam(req.url, "leaked");
  const leaked = await withDb((db) => {
    const rec = db.records.find((r) => r.id === recordId);
    if (!rec) return null;
    db.events.push(newEvent({ actor: id.username, recordId, type: "leaked_copy_fetched", source: "application", detail: "Leaked-copy test: ciphertext and policy handed out" }));
    return { id: rec.id, label: rec.label, group: rec.group, ciphertext: rec.ciphertext, policy: db.policies.find((p) => p.recordId === rec.id)?.policy ?? null };
  }, true);
  return leaked ? json({ record: leaked, demo: "leaked-copy" }) : apiError(404, "not_found");
});
