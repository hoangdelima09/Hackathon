import { withRole } from "@/lib/auth/protect";
import { apiError, identityOf, json, readJson } from "@/server/identity";
import { newEvent, withDb } from "@/server/store";

// Stewards see which records have a signed policy. No ciphertext here.
export const GET = withRole("tide-realm-admin", async () => {
  const records = await withDb((db) =>
    db.records.map((r) => {
      const p = db.policies.find((x) => x.recordId === r.id);
      return { id: r.id, label: r.label, group: r.group, owner: r.owner, hasContent: !!r.ciphertext, policy: p ? { subject: p.subject, signedBy: p.signedBy, createdAt: p.createdAt } : null };
    })
  );
  return json({ records });
});

// Stewards store the policy they just signed in the Tide enclave. The subject was decoded in
// the steward's browser (describeRelationshipPolicy); the network enforces the signed bytes anyway.
export const POST = withRole("tide-realm-admin", async (req, jwt) => {
  const id = identityOf(jwt);
  const body = await readJson(req);
  const recordId = body?.recordId;
  const policy = body?.policy;
  const subject = body?.subject;
  if (typeof recordId !== "string" || typeof policy !== "string" || typeof subject !== "string") {
    return apiError(400, "invalid_request", "recordId, policy and subject are required");
  }
  const stored = await withDb((db) => {
    const rec = db.records.find((r) => r.id === recordId);
    if (!rec) return "unknown";
    if (subject !== rec.group) return "mismatch";
    db.policies = db.policies.filter((p) => p.recordId !== recordId);
    db.policies.push({ recordId, policy, subject, signedBy: id.username, createdAt: new Date().toISOString() });
    db.events.push(newEvent({ actor: id.username, recordId, type: "policy_signed", source: "application", detail: `Policy for group ${subject}` }));
    return "ok";
  }, true);
  if (stored === "unknown") return apiError(404, "not_found");
  if (stored === "mismatch") return apiError(400, "invalid_request", "policy subject must be the record's care group");
  return json({ ok: true }, 201);
});
