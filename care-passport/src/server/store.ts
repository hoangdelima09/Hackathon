import { promises as fs } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import provisioned from "../../fixtures/records.json";
import { SIMULATED } from "@/lib/mode";

// App store: ciphertext, signed policies, requests and events. Never plaintext or keys.
// One JSON file is enough for the demo; writes are serialized and replaced atomically.

export type RecordRow = {
  id: string;
  owner: string;
  group: string;
  label: string;
  ciphertext: string | null;
  updatedAt: string | null;
};
export type PolicyRow = { recordId: string; policy: string; subject: string; signedBy: string; createdAt: string };
export type RequestRow = {
  id: string;
  recordId: string;
  owner: string;
  recipient: string;
  action: "share" | "withdraw";
  purpose: string;
  status: "requested" | "done" | "rejected";
  note: string;
  createdAt: string;
  updatedAt: string;
};
export type EventRow = {
  id: string;
  at: string;
  actor: string;
  recordId: string | null;
  type: string;
  source: "application" | "client_report";
  detail: string;
};
type Db = { records: RecordRow[]; policies: PolicyRow[]; requests: RequestRow[]; events: EventRow[] };

// A simulated build keeps its own store so simulated ciphertext never mixes with real Tide ciphertext.
const DB_PATH = join(process.cwd(), "data", SIMULATED ? "sim-app-db.json" : "app-db.json");

function emptyDb(): Db {
  return {
    records: provisioned.map((r) => ({ ...r, ciphertext: null, updatedAt: null })),
    policies: [],
    requests: [],
    events: [],
  };
}

async function load(): Promise<Db> {
  try {
    const db = JSON.parse(await fs.readFile(DB_PATH, "utf-8")) as Db;
    // Provisioned records always exist, even if the file predates a fixture change.
    for (const r of provisioned) {
      if (!db.records.some((x) => x.id === r.id)) db.records.push({ ...r, ciphertext: null, updatedAt: null });
    }
    return db;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyDb();
    throw err;
  }
}

async function save(db: Db) {
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_PATH);
}

let queue: Promise<unknown> = Promise.resolve();

/** Run fn against the store; if it returns normally, persist. Calls are serialized. */
export function withDb<T>(fn: (db: Db) => T | Promise<T>, write = false): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    if (write) await save(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function newEvent(e: Omit<EventRow, "id" | "at">): EventRow {
  return { id: randomUUID(), at: new Date().toISOString(), ...e };
}

export const newId = () => randomUUID();
