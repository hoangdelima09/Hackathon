"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell, useMe } from "@/components/AppShell";
import { DecryptResult, type Outcome } from "@/components/DecryptResult";
import { LeakedCopyTest } from "@/components/LeakedCopyTest";
import { usePlatform } from "@/lib/client/platform";
import { tideErrorText } from "@/lib/client/tideErrors";

type Rec = { id: string; label: string; group: string; owner: string; ciphertext: string | null; policy: string | null };

export default function ClinicianPage() {
  return (
    <AppShell>
      <Clinician />
    </AppShell>
  );
}

function Clinician() {
  const me = useMe();
  const { api, decrypt, credentialGroups } = usePlatform();
  const [records, setRecords] = useState<Rec[]>([]);
  const [opened, setOpened] = useState<Record<string, Outcome | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dokenGroups, setDokenGroups] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ records: Rec[] }>("/api/records");
      setRecords(r.records.filter((x) => x.owner !== me?.username));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setDokenGroups(credentialGroups());
  }, [api, me?.username, credentialGroups]);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  if (!me) return <p>Loading your profile…</p>;

  async function open(rec: Rec) {
    if (!rec.ciphertext || !rec.policy) return;
    setBusy(rec.id);
    try {
      const text = await decrypt(rec.ciphertext, rec.id, rec.policy);
      setOpened((o) => ({ ...o, [rec.id]: { kind: "ok", text } }));
      await api("/api/events", { method: "POST", body: JSON.stringify({ type: "decrypt_ok", recordId: rec.id, detail: "Opened shared record" }) }).catch(() => undefined);
    } catch (err) {
      const raw = tideErrorText(err);
      setOpened((o) => ({ ...o, [rec.id]: { kind: "refused", raw } }));
      await api("/api/events", { method: "POST", body: JSON.stringify({ type: "decrypt_refused", recordId: rec.id, detail: raw }) }).catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h1>Shared with me</h1>
      <p className="sub">
        Records appear here when your verified token says you are in that record&apos;s care group. Opening one
        asks the Tide network, which checks your group and your decrypt role before releasing anything.
      </p>
      {error && <p className="alert bad">{error}</p>}

      {records.length === 0 ? (
        <p className="card">
          No records have been shared with you. If a patient has just shared one, sign out and sign in again
          after the stewards approve, so your credential carries the new group.
        </p>
      ) : (
        <div className="grid">
          {records.map((rec) => (
            <section key={rec.id} className="card record" data-record={rec.id} aria-labelledby={`c-${rec.id}`}>
              <h3 id={`c-${rec.id}`}>{rec.label}</h3>
              <p className="meta">
                From {rec.owner} · <span className="mono">{rec.id}</span> · group <span className="mono">{rec.group}</span>
              </p>
              <div className="row">
                <button className="primary" disabled={!rec.ciphertext || !rec.policy || busy !== null} onClick={() => open(rec)}>
                  {busy === rec.id ? "Asking the Tide network…" : "Open"}
                </button>
              </div>
              <DecryptResult outcome={opened[rec.id] ?? null} onClose={() => setOpened((o) => ({ ...o, [rec.id]: null }))} />
            </section>
          ))}
        </div>
      )}

      <h2>Your credential</h2>
      <div className="card">
        <p className="meta">What the app and the network see for {me.displayName} ({me.username}).</p>
        <p>Groups in access token: {me.groups.length ? me.groups.map((g) => <span key={g} className="pill info">{g} </span>) : <span className="meta">none</span>}</p>
        <p>Groups in the credential the network checks: {dokenGroups === null ? <span className="meta">unavailable</span> : dokenGroups.length ? dokenGroups.map((g) => <span key={g} className="pill info">{g} </span>) : <span className="meta">none</span>}</p>
        <p>Crypto roles: {me.cryptoRoles.length ? me.cryptoRoles.join(", ") : <span className="meta">none</span>}</p>
        <div className="row">
          <button onClick={load}>Refresh</button>
        </div>
      </div>

      <h2>Prove it</h2>
      <LeakedCopyTest />
    </>
  );
}
