import { promises as fs } from "fs";
import { join } from "path";
import { randomBytes, randomUUID } from "crypto";
import provisioned from "../../fixtures/records.json";

// SIMULATION ONLY. Stands in for what the real app never holds: TideCloak's realm state (users,
// roles, groups, change requests) and the Tide network's secrets (policy-signing key, record keys).
// It lives in its own file so the app store (data/sim-app-db.json) still holds ciphertext only.

export const ENCRYPT_ROLE = "_tide_encryptor";
export const DECRYPT_ROLE = "_tide_decryptor";
export const ADMIN_ROLE = "tide-realm-admin";

export type SimUser = { roles: string[]; groups: string[]; admin: boolean };
export type SimChange = {
  id: string;
  action: "add" | "remove";
  username: string;
  group: string;
  filedBy: string;
  approvals: string[];
  threshold: number;
  status: "PENDING" | "COMMITTED";
  createdAt: string;
  committedAt: string | null;
};
export type SimState = {
  secret: string;
  recordKeys: Record<string, string>;
  users: Record<string, SimUser>;
  changes: SimChange[];
};

const PATH = join(process.cwd(), "data", "sim-tide.json");
const ALL_GROUPS = provisioned.map((r) => r.group);

// Same starting point as scripts/provision-demo.sh, with the full cast.
function seed(): SimState {
  const clinician = (groups: string[] = []): SimUser => ({ roles: [DECRYPT_ROLE], groups, admin: false });
  const steward = (): SimUser => ({ roles: [], groups: [], admin: true });
  return {
    secret: randomBytes(32).toString("base64"),
    recordKeys: {},
    users: {
      "patient-a": { roles: [ENCRYPT_ROLE, DECRYPT_ROLE], groups: [...ALL_GROUPS], admin: false },
      "gp-a": clinician(),
      "gp-b": clinician(),
      "physio-a": clinician(["/pa-careplan"]),
      admin: steward(),
      "steward-b": steward(),
      "steward-c": steward(),
    },
    changes: [],
  };
}

async function load(): Promise<SimState> {
  try {
    return JSON.parse(await fs.readFile(PATH, "utf-8")) as SimState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const s = seed();
      await save(s);
      return s;
    }
    throw err;
  }
}

async function save(s: SimState) {
  const tmp = `${PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(s, null, 2));
  await fs.rename(tmp, PATH);
}

let queue: Promise<unknown> = Promise.resolve();

/** Serialized access to the simulated realm and network, like store.ts's withDb. */
export function withSim<T>(fn: (s: SimState) => T | Promise<T>, write = false): Promise<T> {
  const run = queue.then(async () => {
    const s = await load();
    const result = await fn(s);
    if (write) await save(s);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** TideCloak's rule for the admin policy: max(1, floor(0.7 × admins)). 3 stewards → 2. */
export function threshold(s: SimState) {
  const admins = Object.values(s.users).filter((u) => u.admin).length;
  return Math.max(1, Math.floor(0.7 * admins));
}

export function isGroup(group: string) {
  return ALL_GROUPS.includes(group);
}

export const newChangeId = () => randomUUID();
