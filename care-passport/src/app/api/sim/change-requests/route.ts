import { simOnly, withRole } from "@/server/auth";
import { apiError, identityOf, json, readJson } from "@/server/identity";
import { isGroup, newChangeId, threshold, withSim } from "@/sim/state";
import { newEvent, withDb } from "@/server/store";

// SIMULATION ONLY: stands in for TideCloak IGA. Filing a membership change grants nothing; it
// commits only when `threshold` distinct stewards approve (2 of 3).
export const POST = withRole("tide-realm-admin", async (req, jwt) => {
  const off = simOnly();
  if (off) return off;
  const me = identityOf(jwt).username;
  const body = await readJson(req, 4 * 1024);
  const action = body?.action;
  const username = typeof body?.username === "string" ? body.username : "";
  const group = typeof body?.group === "string" ? body.group : "";
  if ((action !== "add" && action !== "remove") || !isGroup(group)) {
    return apiError(400, "invalid_request", "action (add|remove), username and a care group are required");
  }
  const change = await withSim((s) => {
    if (!s.users[username]) return null;
    const c = {
      id: newChangeId(), action: action as "add" | "remove", username, group, filedBy: me, approvals: [] as string[],
      threshold: threshold(s), status: "PENDING" as const, createdAt: new Date().toISOString(), committedAt: null,
    };
    s.changes.push(c);
    return c;
  }, true);
  if (!change) return apiError(400, "invalid_request", "unknown user");
  await withDb((db) => {
    db.events.push(newEvent({ actor: me, recordId: null, type: "change_request_filed", source: "application", detail: `${action} ${username} ${action === "add" ? "to" : "from"} ${group} (needs ${change.threshold})` }));
  }, true);
  return json({ change }, 201);
});
