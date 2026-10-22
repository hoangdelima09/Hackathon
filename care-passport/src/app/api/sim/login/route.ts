import { simOnly } from "@/server/auth";
import { apiError, json, readJson } from "@/server/identity";
import { issueSimToken } from "@/sim/auth";

// SIMULATION ONLY: stands in for TideCloak sign-in (OIDC + Tide enclave). No password: the demo
// picks a synthetic identity. A real build answers 404 here.
export async function POST(req: Request) {
  const off = simOnly();
  if (off) return off;
  const body = await readJson(req, 1024);
  const username = typeof body?.username === "string" ? body.username : "";
  const token = await issueSimToken(username);
  return token ? json({ token, username }) : apiError(400, "invalid_request", "unknown demo identity");
}
