import { withAuth } from "@/server/auth";
import { apiError, identityOf, json, readJson } from "@/server/identity";
import { newEvent, withDb } from "@/server/store";

// Client reports of decryption outcomes. Detail carries the network's refusal text, never plaintext.
export const POST = withAuth(async (req, jwt) => {
  const id = identityOf(jwt);
  const body = await readJson(req, 8 * 1024);
  const type = body?.type;
  const recordId = typeof body?.recordId === "string" ? body.recordId : null;
  if (type !== "decrypt_ok" && type !== "decrypt_refused" && type !== "encrypt_refused") {
    return apiError(400, "invalid_request", "unknown event type");
  }
  const detail = typeof body?.detail === "string" ? body.detail.slice(0, 500) : "";
  await withDb((db) => {
    db.events.push(newEvent({ actor: id.username, recordId, type, source: "client_report", detail }));
  }, true);
  return json({ ok: true }, 201);
});

// Patient: events on their own records. Steward: everything. Clinicians: their own reports.
export const GET = withAuth(async (_req, jwt) => {
  const id = identityOf(jwt);
  const events = await withDb((db) => {
    const own = new Set(db.records.filter((r) => r.owner === id.username).map((r) => r.id));
    return db.events
      .filter((e) => id.isSteward || (e.recordId !== null && own.has(e.recordId)) || e.actor === id.username)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 100);
  });
  return json({ events });
});
