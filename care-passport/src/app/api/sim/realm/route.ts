import { simOnly, withRole } from "@/server/auth";
import { json } from "@/server/identity";
import { threshold, withSim } from "@/sim/state";

// SIMULATION ONLY: what a steward would see in the TideCloak admin console.
export const GET = withRole("tide-realm-admin", async () => {
  const off = simOnly();
  if (off) return off;
  const view = await withSim((s) => ({
    threshold: threshold(s),
    users: Object.entries(s.users).map(([username, u]) => ({ username, ...u })),
    changes: [...s.changes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }));
  return json(view);
});
