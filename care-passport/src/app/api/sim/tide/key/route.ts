import { simOnly, withAuth } from "@/server/auth";
import { apiError, json, readJson } from "@/server/identity";
import { withSim } from "@/sim/state";
import { contractCheck, recordKey } from "@/sim/network";

// SIMULATION ONLY: stands in for the Tide network's encrypt/decrypt. Runs RelationshipAttestation:1's
// checks against the caller's verified credential and, only if they pass, releases the record key
// to that browser. Plaintext never comes here.
export const POST = withAuth(async (req, jwt) => {
  const off = simOnly();
  if (off) return off;
  const body = await readJson(req, 64 * 1024);
  const op = body?.op;
  const policy = body?.policy;
  if ((op !== "encrypt" && op !== "decrypt") || typeof policy !== "string") {
    return apiError(400, "invalid_request", "op and policy are required");
  }
  const result = await withSim((s) => {
    const refusal = contractCheck(s, op, body?.tags, policy, jwt);
    if (refusal) return { refusal };
    const tags = body!.tags as string[];
    return { key: recordKey(s, tags[0]) };
  }, true);
  if ("refusal" in result) {
    return apiError(403, "network_refused", `[SIMULATED Tide network] ${op} refused by RelationshipAttestation:1: ${result.refusal}`);
  }
  return json({ key: result.key });
});
