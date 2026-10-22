import { withRole } from "@/lib/auth/protect";
import { apiError, identityOf, json, pathParam, readJson } from "@/server/identity";
import { newEvent, withDb } from "@/server/store";

// Bookkeeping only: a steward notes what happened in TideCloak. It grants or removes nothing.
export const PATCH = withRole("tide-realm-admin", async (req, jwt) => {
  const id = identityOf(jwt);
  const requestId = pathParam(req.url, "requests");
  const body = await readJson(req);
  const status = body?.status;
  const note = typeof body?.note === "string" ? body.note.slice(0, 200) : "";
  if (status !== "done" && status !== "rejected") return apiError(400, "invalid_request", "status must be done or rejected");
  const updated = await withDb((db) => {
    const row = db.requests.find((r) => r.id === requestId);
    if (!row) return null;
    row.status = status;
    row.note = note;
    row.updatedAt = new Date().toISOString();
    db.events.push(newEvent({
      actor: id.username, recordId: row.recordId, source: "application", type: `request_${status}`,
      detail: `${row.action} ${row.recipient}: marked ${status} by steward${note ? ` (${note})` : ""}`,
    }));
    return row;
  }, true);
  return updated ? json({ request: updated }) : apiError(404, "not_found");
});
