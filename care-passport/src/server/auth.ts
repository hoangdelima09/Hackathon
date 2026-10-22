import { withAuth as tideWithAuth, withRole as tideWithRole } from "@/lib/auth/protect";
import { SIMULATED } from "@/lib/mode";
import { simWithAuth, simWithRole } from "@/sim/auth";

// API routes import these instead of @/lib/auth/protect. In the default (tide) mode they ARE the
// template's wrappers: verifyTideJWT with the embedded jwk, plus the DPoP proof. Only a build with
// NEXT_PUBLIC_CARE_PASSPORT_MODE=simulated verifies the simulated TideCloak token instead.
export const withAuth: typeof tideWithAuth = SIMULATED ? simWithAuth : tideWithAuth;
export const withRole: typeof tideWithRole = SIMULATED ? simWithRole : tideWithRole;

/** Simulation-only routes answer 404 in a real build, so they can never act as a backdoor. */
export const simOnly = () => (SIMULATED ? null : Response.json({ error: "not_found" }, { status: 404 }));
