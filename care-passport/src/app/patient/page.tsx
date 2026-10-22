"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell, useMe } from "@/components/AppShell";
import { DecryptResult, type Outcome } from "@/components/DecryptResult";
import { usePlatform } from "@/lib/client/platform";
import { tideErrorText } from "@/lib/client/tideErrors";
import { SYNTHETIC_CONTENT } from "@/lib/client/synthetic";

type Rec = { id: string; label: string; group: string; owner: string; ciphertext: string | null; policy: string | null; updatedAt: string | null };
type Req = { id: string; recordId: string; recipient: string; action: "share" | "withdraw"; purpose: string; status: "requested" | "done" | "rejected"; note: string; createdAt: string };
type Clin = { username: string; displayName: string; kind: string };
type Ev = { id: string; at: string; actor: string; recordId: string | null; type: string; source: string; detail: string };

export default function PatientPage() {
  return (
    <AppShell>
      <Patient />
    </AppShell>
  );
}

function Patient() {
  const me = useMe();
  const { api, encrypt, decrypt } = usePlatform();
  const [records, setRecords] = useState<Rec[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [clinicians, setClinicians] = useState<Clin[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [opened, setOpened] = useState<Record<string, Outcome | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, q, d, e] = await Promise.all([
        api<{ records: Rec[] }>("/api/records"),
        api<{ requests: Req[]; purposes: string[] }>("/api/requests"),
        api<{ clinicians: Clin[] }>("/api/directory"),
        api<{ events: Ev[] }>("/api/events"),
      ]);
      setRecords(r.records.filter((x) => x.owner === me?.username));
      setRequests(q.requests);
      setPurposes(q.purposes);
      setClinicians(d.clinicians);
      setEvents(e.events);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [api, me?.username]);

  useEffect(() => {
    if (me?.kind === "patient") load();
  }, [me?.kind, load]);

  if (!me) return <p>Loading your profile…</p>;
  if (me.kind !== "patient") {
    return <p className="alert bad">This page is for the patient account (patient-a). You are signed in as {me.username}.</p>;
  }

  const nameOf = (u: string) => clinicians.find((c) => c.username === u)?.displayName ?? u;

  async function writeContent(rec: Rec) {
    if (!rec.policy) return;
    setBusy(`write:${rec.id}`);
    try {
      const ciphertext = await encrypt(SYNTHETIC_CONTENT[rec.id] ?? `Synthetic ${rec.label}`, rec.id, rec.policy);
      await api(`/api/records/${rec.id}`, { method: "PUT", body: JSON.stringify({ ciphertext }) });
      await load();
    } catch (err) {
      setOpened((o) => ({ ...o, [rec.id]: { kind: "refused", raw: tideErrorText(err) } }));
    } finally {
      setBusy(null);
    }
  }

  async function open(rec: Rec) {
    if (!rec.ciphertext || !rec.policy) return;
    setBusy(`open:${rec.id}`);
    try {
      const text = await decrypt(rec.ciphertext, rec.id, rec.policy);
      setOpened((o) => ({ ...o, [rec.id]: { kind: "ok", text } }));
    } catch (err) {
      setOpened((o) => ({ ...o, [rec.id]: { kind: "refused", raw: tideErrorText(err) } }));
    } finally {
      setBusy(null);
    }
  }

  async function request(rec: Rec, action: "share" | "withdraw", recipient: string, purpose: string) {
    if (!recipient) return;
    if (action === "withdraw") {
      const ok = window.confirm(
        `Stop new access to "${rec.label}" for ${nameOf(recipient)}?\n\nCopies already viewed cannot be erased. ` +
          "The withdrawal takes effect when two of three stewards approve it and the clinician's credential refreshes."
      );
      if (!ok) return;
    }
    setBusy(`${action}:${rec.id}`);
    try {
      await api("/api/requests", { method: "POST", body: JSON.stringify({ recordId: rec.id, recipient, action, purpose }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h1>My records</h1>
      <p className="sub">
        Your records are encrypted in this browser. Each one has its own care group in TideCloak, and the
        Tide network only lets members of that group decrypt it. You decide what to share; two of three
        stewards must approve each change, so nobody can widen access alone.
      </p>
      {error && <p className="alert bad">{error}</p>}

      <div className="grid">
        {records.map((rec) => (
          <RecordCard
            key={rec.id}
            rec={rec}
            busy={busy}
            outcome={opened[rec.id] ?? null}
            clinicians={clinicians}
            purposes={purposes}
            requests={requests.filter((r) => r.recordId === rec.id)}
            onWrite={() => writeContent(rec)}
            onOpen={() => open(rec)}
            onClose={() => setOpened((o) => ({ ...o, [rec.id]: null }))}
            onRequest={(action, who, purpose) => request(rec, action, who, purpose)}
          />
        ))}
      </div>

      <h2>Sharing requests</h2>
      {requests.length === 0 ? (
        <p className="meta">No sharing requests yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Record</th><th>Request</th><th>Clinician</th><th>Purpose</th><th>Status</th><th>Requested</th></tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{records.find((x) => x.id === r.recordId)?.label ?? r.recordId}</td>
                <td>{r.action === "share" ? "Share" : "Withdraw"}</td>
                <td>{nameOf(r.recipient)}</td>
                <td>{r.purpose || "—"}</td>
                <td><RequestStatus r={r} /></td>
                <td className="meta">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Activity</h2>
      <Activity events={events} />
      <div className="row">
        <button onClick={load}>Refresh</button>
      </div>
    </>
  );
}

function RequestStatus({ r }: { r: Req }) {
  if (r.status === "requested") return <span className="pill wait">Waiting for 2 of 3 steward approvals in TideCloak</span>;
  if (r.status === "done") return <span className="pill ok">Steward reports the change was committed{r.note ? ` (${r.note})` : ""}</span>;
  return <span className="pill bad">Rejected by stewards{r.note ? ` (${r.note})` : ""}</span>;
}

function RecordCard(props: {
  rec: Rec;
  busy: string | null;
  outcome: Outcome | null;
  clinicians: Clin[];
  purposes: string[];
  requests: Req[];
  onWrite: () => void;
  onOpen: () => void;
  onClose: () => void;
  onRequest: (action: "share" | "withdraw", recipient: string, purpose: string) => void;
}) {
  const { rec, busy, outcome, clinicians, purposes, requests } = props;
  const [shareTo, setShareTo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [withdrawFrom, setWithdrawFrom] = useState("");
  const sharedWith = [...new Set(requests.filter((r) => r.action === "share" && r.status !== "rejected").map((r) => r.recipient))];

  return (
    <section className="card record" data-record={rec.id} aria-labelledby={`h-${rec.id}`}>
      <h3 id={`h-${rec.id}`}>{rec.label}</h3>
      <p className="meta">
        Record <span className="mono">{rec.id}</span> · care group <span className="mono">{rec.group}</span>
      </p>
      <p>
        {!rec.policy ? (
          <span className="pill wait">No signed policy yet (steward step)</span>
        ) : rec.ciphertext ? (
          <span className="pill ok">Encrypted · server holds ciphertext only</span>
        ) : (
          <span className="pill info">Empty</span>
        )}
      </p>

      <div className="row">
        {rec.policy && !rec.ciphertext && (
          <button className="primary" onClick={props.onWrite} disabled={busy !== null}>
            {busy === `write:${rec.id}` ? "Encrypting…" : "Write synthetic content"}
          </button>
        )}
        {rec.ciphertext && rec.policy && (
          <button onClick={props.onOpen} disabled={busy !== null}>
            {busy === `open:${rec.id}` ? "Decrypting…" : "Open"}
          </button>
        )}
      </div>
      <DecryptResult outcome={outcome} onClose={props.onClose} />

      {rec.ciphertext && (
        <>
          <div className="row">
            <label htmlFor={`share-${rec.id}`}>Share with</label>
            <select id={`share-${rec.id}`} value={shareTo} onChange={(e) => setShareTo(e.target.value)}>
              <option value="">Choose a clinician…</option>
              {clinicians.map((c) => (
                <option key={c.username} value={c.username}>
                  {c.displayName} — {c.kind === "gp" ? "GP" : "Physiotherapist"}
                </option>
              ))}
            </select>
            <select aria-label="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              <option value="">Purpose…</option>
              {purposes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              className="primary"
              disabled={!shareTo || !purpose || busy !== null}
              onClick={() => props.onRequest("share", shareTo, purpose)}
            >
              Request access
            </button>
          </div>
          <div className="row">
            <label htmlFor={`withdraw-${rec.id}`}>Withdraw from</label>
            <select id={`withdraw-${rec.id}`} value={withdrawFrom} onChange={(e) => setWithdrawFrom(e.target.value)}>
              <option value="">Choose a clinician…</option>
              {clinicians.map((c) => (
                <option key={c.username} value={c.username}>
                  {c.displayName}{sharedWith.includes(c.username) ? " (shared)" : ""}
                </option>
              ))}
            </select>
            <button className="danger" disabled={!withdrawFrom || busy !== null} onClick={() => props.onRequest("withdraw", withdrawFrom, "")}>
              Withdraw future access
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function Activity({ events }: { events: Ev[] }) {
  if (events.length === 0) return <p className="meta">No activity yet.</p>;
  return (
    <table>
      <thead>
        <tr><th>When</th><th>Who</th><th>Event</th><th>Source</th></tr>
      </thead>
      <tbody>
        {events.slice(0, 30).map((e) => (
          <tr key={e.id}>
            <td className="meta">{new Date(e.at).toLocaleString()}</td>
            <td>{e.actor}</td>
            <td>
              <strong>{e.type.replaceAll("_", " ")}</strong>
              {e.recordId ? <span className="meta"> · {e.recordId}</span> : null}
              <div className="meta">{e.detail}</div>
            </td>
            <td><span className="pill info">{e.source === "client_report" ? "reported by browser" : "application"}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
