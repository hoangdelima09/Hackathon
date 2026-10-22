import { withAuth } from "@/server/auth";
import { apiError, clinicians, identityOf, json, readJson } from "@/server/identity";
import { newEvent, newId, withDb } from "@/server/store";

const PURPOSES = ["Referral consultation", "Ongoing physiotherapy", "Second opinion", "Care coordination"];

// The patient's intent. It grants nothing: a steward makes the governed change in TideCloak,
// and two of three stewards must approve it there.
export const POST = withAuth(async (req, jwt) => {
  const id = identityOf(jwt);
  const body = await readJson(req);
  const recordId = body?.recordId;
  const recipient = body?.recipient;
  const action = body?.action;
  const purpose = typeof body?.purpose === "string" ? body.purpose : "";
  if (typeof recordId !== "string" || typeof recipient !== "string" || (action !== "share" && action !== "withdraw")) {
    return apiError(400, "invalid_request", "recordId, recipient and action are required");
  }
  if (!clinicians().some((c) => c.username === recipient)) return apiError(400, "invalid_request", "unknown clinician");
  if (action === "share" && !PURPOSES.includes(purpose)) return apiError(400, "invalid_request", "choose a listed purpose");

  const created = await withDb((db) => {
    const rec = db.records.find((r) => r.id === recordId && r.owner === id.username);
    if (!rec) return null;
    const open = db.requests.find(
      (r) => r.recordId === recordId && r.recipient === recipient && r.action === action && r.status === "requested"
    );
    if (open) return open;
    const now = new Date().toISOString();
    const row = {
      id: newId(), recordId, owner: id.username, recipient, action: action as "share" | "withdraw", purpose,
      status: "requested" as const, note: "", createdAt: now, updatedAt: now,
    };
    db.requests.push(row);
    db.events.push(newEvent({
      actor: id.username, recordId, source: "application",
      type: action === "share" ? "share_requested" : "withdraw_requested",
      detail: `${action === "share" ? "Share with" : "Withdraw"} ${recipient}${purpose ? ` — ${purpose}` : ""}`,
    }));
    return row;
  }, true);
  return created ? json({ request: created }, 201) : apiError(404, "not_found");
});

export const GET = withAuth(async (_req, jwt) => {
  const id = identityOf(jwt);
  const requests = await withDb((db) =>
    db.requests
      .filter((r) => id.isSteward || r.owner === id.username)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
  return json({ requests, purposes: PURPOSES });
});
