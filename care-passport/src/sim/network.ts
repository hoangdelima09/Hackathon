import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { JWTPayload } from "jose";
import { DECRYPT_ROLE, ENCRYPT_ROLE, type SimState } from "./state";

// SIMULATION ONLY: stands in for the Tide ORK network running the built-in contract
// RelationshipAttestation:1. The checks, their order and their refusal messages follow the
// contract as documented in Tide's agent pack (scenario relationship-attestation). The real network
// never releases a key; this stand-in releases the record key to a browser that passes the checks,
// and the browser encrypts or decrypts locally, so plaintext still never reaches the server.

export const CONTRACT_ID = "RelationshipAttestation:1";
const MODEL_IDS = ["PolicyEnabledEncryption:1", "PolicyEnabledDecryption:1"];
const ROLES_FOR = { read: [DECRYPT_ROLE], write: [ENCRYPT_ROLE], "read-write": [ENCRYPT_ROLE, DECRYPT_ROLE] } as const;

type SimPolicy = {
  version: "sim-1";
  contractId: string;
  modelId: string[];
  keyId: string;
  params: { subjectType: string; subjectId: string; assignmentId: string; roles: string };
  expiry: number | null;
  signedBy: string;
  signedAt: string;
  signature?: string;
};

const canonical = (p: SimPolicy) =>
  JSON.stringify([p.version, p.contractId, p.modelId, p.keyId, p.params.subjectType, p.params.subjectId, p.params.assignmentId, p.params.roles, p.expiry, p.signedBy, p.signedAt]);
const mac = (s: SimState, p: SimPolicy) => createHmac("sha256", Buffer.from(s.secret, "base64")).update(canonical(p)).digest("base64");

/** The steward's (simulated) enclave approval: the network signs a Group policy for one record. */
export function signGroupPolicy(s: SimState, signer: string, recordId: string, group: string, access: keyof typeof ROLES_FOR = "read-write") {
  const policy: SimPolicy = {
    version: "sim-1",
    contractId: CONTRACT_ID,
    modelId: MODEL_IDS,
    keyId: "care-passport-sim-vendor",
    params: { subjectType: "Group", subjectId: group, assignmentId: recordId, roles: JSON.stringify(ROLES_FOR[access]) },
    expiry: null,
    signedBy: signer,
    signedAt: new Date().toISOString(),
  };
  policy.signature = mac(s, policy);
  return Buffer.from(JSON.stringify(policy)).toString("base64");
}

function parse(policyB64: string): SimPolicy | null {
  try {
    return JSON.parse(Buffer.from(policyB64, "base64").toString("utf-8")) as SimPolicy;
  } catch {
    return null;
  }
}

/** Runs the contract's checks for one request. Returns the refusal message, or null to allow. */
export function contractCheck(s: SimState, op: "encrypt" | "decrypt", tags: unknown, policyB64: string, doken: JWTPayload): string | null {
  const p = parse(policyB64);
  if (!p || !p.params) return "Policy could not be parsed.";
  const given = Buffer.from(p.signature ?? "", "base64");
  const expected = Buffer.from(mac(s, p), "base64");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return "Policy supplied has not been signed";
  if (p.contractId !== CONTRACT_ID) return `Policy refers to wrong contract. Expected '${CONTRACT_ID}' but policy has '${p.contractId}'`;
  if (p.expiry !== null && p.expiry < Date.now() / 1000) return "Policy has expired.";

  if (!Array.isArray(tags) || tags.length === 0) return "Every item must be tagged with the assignmentId.";
  if (tags.some((t) => t !== p.params.assignmentId)) return "Tags do not contain assignmentId.";

  const groups = Array.isArray(doken.groups) ? (doken.groups as unknown[]).map(String) : [];
  if (p.params.subjectType !== "Group") return "Parameter 'subjectType' must be User, Group, or Role.";
  if (!groups.includes(p.params.subjectId)) return `'${p.params.subjectId}' group not found in doken.`;

  const role = op === "encrypt" ? ENCRYPT_ROLE : DECRYPT_ROLE;
  let permitted: string[] = [];
  try {
    permitted = JSON.parse(p.params.roles);
  } catch {
    return "Required parameter 'roles' is missing.";
  }
  if (!permitted.includes(role)) return `${role} not found in list of roles.`;

  const realmRoles = ((doken.realm_access as { roles?: string[] } | undefined)?.roles ?? []).map(String);
  if (!realmRoles.includes(role)) return `'${role}' role not found for this ${op}ion request.`;
  return null;
}

/** The record's data key, created on first use. Held by the simulated network, never the app store. */
export function recordKey(s: SimState, recordId: string) {
  if (!s.recordKeys[recordId]) s.recordKeys[recordId] = randomBytes(32).toString("base64");
  return s.recordKeys[recordId];
}
