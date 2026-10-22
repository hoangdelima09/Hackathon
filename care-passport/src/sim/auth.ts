import { NextRequest } from "next/server";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { hasRole, extractToken } from "@/lib/auth/tideJWT";
import { ADMIN_ROLE, withSim } from "./state";

// SIMULATION ONLY: stands in for TideCloak sign-in and for verifyTideJWT + DPoP. The token carries
// the same claims the real access token does (preferred_username, groups, realm_access,
// resource_access["realm-management"]), as a snapshot taken at sign-in, so a membership change
// reaches it only after the user signs in again, as with a real credential.

const ISSUER = "care-passport-simulated-tidecloak";
const AUDIENCE = "care-passport-sim";
type AuthHandler = (req: NextRequest, jwt: JWTPayload) => Promise<Response>;

const secretKey = () => withSim((s) => new Uint8Array(Buffer.from(s.secret, "base64")));

export async function issueSimToken(username: string): Promise<string | null> {
  const user = await withSim((s) => s.users[username] ?? null);
  if (!user) return null;
  return new SignJWT({
    preferred_username: username,
    groups: user.groups,
    realm_access: { roles: user.roles },
    resource_access: { "realm-management": { roles: user.admin ? [ADMIN_ROLE] : [] } },
    azp: AUDIENCE,
    simulated: true,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(`sim-${username}`)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(await secretKey());
}

async function verifySimToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, await secretKey(), { issuer: ISSUER, algorithms: ["HS256"] });
  if (payload.azp !== AUDIENCE) throw new Error("Token azp does not match client");
  return payload;
}

export function simWithAuth(handler: AuthHandler) {
  return async (req: NextRequest) => {
    try {
      const jwt = await verifySimToken(extractToken(req.headers.get("authorization")));
      return handler(req, jwt);
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Unauthorized" }, { status: 401 });
    }
  };
}

export function simWithRole(role: string, handler: AuthHandler) {
  return simWithAuth(async (req, jwt) => {
    if (!hasRole(jwt, role)) return Response.json({ error: "Forbidden" }, { status: 403 });
    return handler(req, jwt);
  });
}
