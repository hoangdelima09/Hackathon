import type { JWTPayload } from "jose";
import directory from "../../fixtures/directory.json";
import { hasRole } from "@/lib/auth/tideJWT";

export type Kind = "patient" | "gp" | "physio" | "steward" | "unknown";
export type Profile = { username: string; displayName: string; kind: Kind };

const dir = directory as Record<string, { displayName: string; kind: Kind }>;

export function profileOf(username: string): Profile {
  const entry = dir[username];
  return entry ? { username, ...entry } : { username, displayName: username, kind: "unknown" };
}

export function clinicians(): Profile[] {
  return Object.keys(dir)
    .map(profileOf)
    .filter((p) => p.kind === "gp" || p.kind === "physio");
}

/** Everything here comes from the verified access token; labels come from the synthetic directory. */
export function identityOf(jwt: JWTPayload) {
  const username = String(jwt.preferred_username ?? "");
  const groups = Array.isArray(jwt.groups) ? (jwt.groups as unknown[]).map(String) : [];
  const realmRoles: string[] = ((jwt.realm_access as { roles?: string[] } | undefined)?.roles ?? []).map(String);
  return {
    sub: String(jwt.sub ?? ""),
    profile: profileOf(username),
    username,
    groups,
    cryptoRoles: realmRoles.filter((r) => r === "_tide_encryptor" || r === "_tide_decryptor"),
    isSteward: hasRole(jwt, "tide-realm-admin"),
  };
}

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const apiError = (status: number, error: string, message?: string) => json({ error, message }, status);

/** Last path segment before an optional suffix, e.g. /api/records/pa-referral → pa-referral. */
export function pathParam(url: string, after: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf(after);
  return i >= 0 && parts[i + 1] ? decodeURIComponent(parts[i + 1]) : "";
}

export async function readJson(req: Request, maxBytes = 256 * 1024): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
