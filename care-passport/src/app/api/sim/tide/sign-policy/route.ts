import { simOnly, withRole } from "@/server/auth";
import { apiError, identityOf, json, readJson } from "@/server/identity";
import { withSim } from "@/sim/state";
import { signGroupPolicy } from "@/sim/network";
import provisioned from "../../../../../../fixtures/records.json";

// SIMULATION ONLY: stands in for a steward approving a policy in the Tide enclave, after which the
// network signs it. Stewards only, checked on the server.
export const POST = withRole("tide-realm-admin", async (req, jwt) => {
  const off = simOnly();
  if (off) return off;
  const body = await readJson(req, 4 * 1024);
  const rec = provisioned.find((r) => r.id === body?.recordId);
  if (!rec) return apiError(404, "not_found");
  const policy = await withSim((s) => signGroupPolicy(s, identityOf(jwt).username, rec.id, rec.group));
  return json({ policy });
});
