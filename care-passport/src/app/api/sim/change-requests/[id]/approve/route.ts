import { simOnly, withRole } from "@/server/auth";
import { apiError, identityOf, json, pathParam } from "@/server/identity";
import { withSim } from "@/sim/state";
import { newEvent, withDb } from "@/server/store";

// SIMULATION ONLY: one steward's approval of a change request (in TideCloak this is an enclave
// signature in that steward's own browser). At `threshold` distinct approvals the change commits.
export const POST = withRole("tide-realm-admin", async (req, jwt) => {
  const off = simOnly();
  if (off) return off;
  const me = identityOf(jwt).username;
  const id = pathParam(req.url, "change-requests");
  const result = await withSim((s) => {
    const c = s.changes.find((x) => x.id === id);
    if (!c) return "not_found" as const;
    if (c.status !== "PENDING") return "committed" as const;
    if (c.approvals.includes(me)) return "duplicate" as const;
    c.approvals.push(me);
    if (c.approvals.length >= c.threshold) {
      const u = s.users[c.username];
      u.groups = c.action === "add" ? [...new Set([...u.groups, c.group])] : u.groups.filter((g) => g !== c.group);
      c.status = "COMMITTED";
      c.committedAt = new Date().toISOString();
    }
    return c;
  }, true);
  if (result === "not_found") return apiError(404, "not_found");
  if (result === "committed") return apiError(409, "invalid_request", "already committed");
  if (result === "duplicate") return apiError(409, "invalid_request", "you already approved this change request");
  await withDb((db) => {
    db.events.push(newEvent({
      actor: me, recordId: null, source: "application",
      type: result.status === "COMMITTED" ? "change_request_committed" : "change_request_approved",
      detail: `${result.action} ${result.username} ${result.action === "add" ? "to" : "from"} ${result.group}: ${result.approvals.length}/${result.threshold}`,
    }));
  }, true);
  return json({ change: result });
});
