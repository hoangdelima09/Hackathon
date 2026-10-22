"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell, useMe } from "@/components/AppShell";
import { LeakedCopyTest } from "@/components/LeakedCopyTest";
import { usePlatform } from "@/lib/client/platform";
import { tideErrorText } from "@/lib/client/tideErrors";

type PolicyRec = { id: string; label: string; group: string; owner: string; hasContent: boolean; policy: { subject: string; signedBy: string; createdAt: string } | null };
type Req = { id: string; recordId: string; owner: string; recipient: string; action: "share" | "withdraw"; purpose: string; status: "requested" | "done" | "rejected"; note: string; createdAt: string };
type SimChange = { id: string; action: "add" | "remove"; username: string; group: string; filedBy: string; approvals: string[]; threshold: number; status: "PENDING" | "COMMITTED"; createdAt: string };
type SimRealm = { threshold: number; users: { username: string; roles: string[]; groups: string[]; admin: boolean }[]; changes: SimChange[] };

export default function StewardPage() {
  return (
    <AppShell>
      <Steward />
    </AppShell>
  );
}

function Steward() {
  const me = useMe();
  const { api, simulated, signPolicy, describePolicy, prepareSigning, signingError, consoleUrl } = usePlatform();
  const [records, setRecords] = useState<PolicyRec[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [realm, setRealm] = useState<SimRealm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, q, r] = await Promise.all([
        api<{ records: PolicyRec[] }>("/api/policies"),
        api<{ requests: Req[] }>("/api/requests"),
        simulated ? api<SimRealm>("/api/sim/realm") : Promise.resolve(null),
      ]);
      setRecords(p.records);
      setRequests(q.requests);
      setRealm(r);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
    }
  }, [api, simulated]);

  useEffect(() => {
    if (me?.isSteward) {
      load();
      prepareSigning();
    }
  }, [me?.isSteward, load, prepareSigning]);

  if (!me) return <p>Loading your profile…</p>;
  if (!me.isSteward) {
    return (
      <>
        <p className="alert bad">This page is for stewards (tide-realm-admin). You are signed in as {me.username}.</p>
        <LeakedCopyTest />
      </>
    );
  }

  async function sign(rec: PolicyRec) {
    if (simulated && !window.confirm(`Simulated Tide enclave\n\nApprove a RelationshipAttestation:1 policy granting record ${rec.id} to group ${rec.group} (read-write)?`)) return;
    setBusy(rec.id);
    setMessage(null);
    try {
      // Real build: opens the Tide enclave; the steward's approval there IS the grant of this record to its group.
      const signed = await signPolicy(rec.id, rec.group);
      const d = describePolicy(signed);
      if (!d.isRelationshipPolicy || d.recordId !== rec.id || d.subjectId !== rec.group) {
        throw new Error(`Signed policy does not match the record (${JSON.stringify(d)})`);
      }
      await api("/api/policies", { method: "POST", body: JSON.stringify({ recordId: rec.id, policy: signed, subject: d.subjectId }) });
      setMessage({ ok: true, text: `Policy signed for ${rec.label}: contract ${d.contractId}, subject ${d.subjectType} ${d.subjectId}, roles ${d.roles}.` });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: `Signing failed: ${tideErrorText(err)}` });
    } finally {
      setBusy(null);
    }
  }

  async function fileChange(action: "add" | "remove", username: string, group: string) {
    setBusy(`file:${username}:${group}`);
    setMessage(null);
    try {
      await api("/api/sim/change-requests", { method: "POST", body: JSON.stringify({ action, username, group }) });
      setMessage({ ok: true, text: `Change request filed: ${action} ${username} ${action === "add" ? "to" : "from"} ${group}. It needs ${realm?.threshold ?? 2} steward approvals.` });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function approve(c: SimChange) {
    setBusy(c.id);
    setMessage(null);
    try {
      const { change } = await api<{ change: SimChange }>(`/api/sim/change-requests/${c.id}/approve`, { method: "POST" });
      setMessage({ ok: true, text: change.status === "COMMITTED" ? `Committed with ${change.approvals.length}/${change.threshold} approvals. The member must sign in again.` : `Approved: ${change.approvals.length}/${change.threshold}. Still pending.` });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function mark(r: Req, status: "done" | "rejected") {
    const note = window.prompt(status === "done" ? "Optional note (e.g. change request id):" : "Reason (optional):") ?? "";
    setBusy(r.id);
    try {
      await api(`/api/requests/${r.id}`, { method: "PATCH", body: JSON.stringify({ status, note }) });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  const groupFor = (recordId: string) => records.find((x) => x.id === recordId)?.group ?? `/${recordId}`;

  return (
    <>
      <h1>Care governance</h1>
      <p className="sub">
        Stewards hold no decrypt role and belong to no care group. Every membership change is a governed
        change request that needs two of three stewards, so no steward can act alone.
      </p>
      {message && <p className={`alert ${message.ok ? "ok" : "bad"}`}>{message.text}</p>}

      <h2>Record policies</h2>
      <p className="meta">
        One <span className="mono">RelationshipAttestation:1</span> policy per record, naming the record&apos;s care
        group. Signing opens the {simulated ? "(simulated) " : ""}Tide enclave (allow pop-ups).
        {signingError && <span className="alert bad" style={{ display: "block" }}>Admin policy unavailable: {signingError} <button onClick={prepareSigning}>Retry</button></span>}
      </p>
      <table>
        <thead>
          <tr><th>Record</th><th>Care group</th><th>Policy</th><th></th></tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <tr key={rec.id}>
              <td>{rec.label} <span className="meta mono">{rec.id}</span></td>
              <td className="mono">{rec.group}</td>
              <td>
                {rec.policy ? (
                  <span className="pill ok">Signed by {rec.policy.signedBy}</span>
                ) : (
                  <span className="pill wait">Not signed</span>
                )}
              </td>
              <td>
                <button className={rec.policy ? "" : "primary"} disabled={!!signingError || busy !== null} onClick={() => sign(rec)}>
                  {busy === rec.id ? "Waiting for enclave…" : rec.policy ? "Re-sign" : "Sign policy"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Patient requests</h2>
      <p className="meta">
        {simulated ? (
          <>To act on a request, file the membership change below (simulated TideCloak IGA), then a second steward approves it.</>
        ) : (
          <>
            To act on a request, open the <a href={consoleUrl ?? "#"} target="_blank" rel="noreferrer">TideCloak admin console</a> →
            Users → the clinician → Groups → join or leave the record&apos;s care group. Then approve the change
            request with a second steward.
          </>
        )}{" "}
        Marking a request here is bookkeeping only and grants nothing.
      </p>
      {requests.length === 0 ? (
        <p className="meta">No requests.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Patient</th><th>Request</th><th>Do this in TideCloak</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.owner}</td>
                <td>{r.action === "share" ? "Share" : "Withdraw"} {r.recordId}{r.purpose ? <div className="meta">{r.purpose}</div> : null}</td>
                <td className="mono">{r.action === "share" ? "add" : "remove"} {r.recipient} {r.action === "share" ? "to" : "from"} {groupFor(r.recordId)}</td>
                <td>{r.status === "requested" ? <span className="pill wait">Requested</span> : r.status === "done" ? <span className="pill ok">Done</span> : <span className="pill bad">Rejected</span>}</td>
                <td>
                  {r.status === "requested" && (
                    <div className="row" style={{ marginTop: 0 }}>
                      {simulated && (
                        <button className="primary" disabled={busy !== null} onClick={() => fileChange(r.action === "share" ? "add" : "remove", r.recipient, groupFor(r.recordId))}>
                          File change request
                        </button>
                      )}
                      <button disabled={busy !== null} onClick={() => mark(r, "done")}>Mark committed</button>
                      <button disabled={busy !== null} onClick={() => mark(r, "rejected")}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {simulated && realm && <SimGovernance realm={realm} me={me.username} busy={busy} onApprove={approve} onFile={fileChange} />}

      <h2>Lone-administrator test</h2>
      <LeakedCopyTest title="Try to read a patient record as a steward" />
    </>
  );
}

/** Simulated build only: what the TideCloak admin console's Change Requests and Groups screens show. */
function SimGovernance(props: {
  realm: SimRealm;
  me: string;
  busy: string | null;
  onApprove: (c: SimChange) => void;
  onFile: (action: "add" | "remove", username: string, group: string) => void;
}) {
  const { realm, me, busy } = props;
  const [who, setWho] = useState(me);
  const [action, setAction] = useState<"add" | "remove">("add");
  const [group, setGroup] = useState("/pa-pathology");
  const groups = ["/pa-referral", "/pa-careplan", "/pa-pathology"];
  return (
    <>
      <h2>Change requests (simulated TideCloak IGA)</h2>
      <p className="meta">
        Admin threshold: <strong>{realm.threshold}</strong> of {realm.users.filter((u) => u.admin).length} stewards,
        i.e. max(1, floor(0.7 × stewards)). A change commits only at the threshold; the filer may approve their own.
      </p>
      {realm.changes.length === 0 ? (
        <p className="meta">No change requests.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Change</th><th>Filed by</th><th>Approvals</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {realm.changes.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.action} {c.username} {c.action === "add" ? "to" : "from"} {c.group}</td>
                <td>{c.filedBy}</td>
                <td>{c.approvals.length}/{c.threshold}{c.approvals.length ? <div className="meta">{c.approvals.join(", ")}</div> : null}</td>
                <td>{c.status === "COMMITTED" ? <span className="pill ok">Committed</span> : <span className="pill wait">Pending</span>}</td>
                <td>
                  {c.status === "PENDING" && (
                    <button disabled={busy !== null || c.approvals.includes(me)} onClick={() => props.onApprove(c)}>
                      {c.approvals.includes(me) ? "You approved" : "Approve"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="row">
        <label htmlFor="cr-who">File a change</label>
        <select id="cr-who" value={who} onChange={(e) => setWho(e.target.value)}>
          {realm.users.map((u) => <option key={u.username} value={u.username}>{u.username}</option>)}
        </select>
        <select aria-label="Action" value={action} onChange={(e) => setAction(e.target.value as "add" | "remove")}>
          <option value="add">add to</option>
          <option value="remove">remove from</option>
        </select>
        <select aria-label="Care group" value={group} onChange={(e) => setGroup(e.target.value)}>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button disabled={busy !== null} onClick={() => props.onFile(action, who, group)}>File change request</button>
      </div>
      <h3>Members (committed state)</h3>
      <table>
        <thead>
          <tr><th>User</th><th>Groups</th><th>Crypto roles</th><th>Steward</th></tr>
        </thead>
        <tbody>
          {realm.users.map((u) => (
            <tr key={u.username}>
              <td>{u.username}</td>
              <td className="mono">{u.groups.join(", ") || "—"}</td>
              <td className="mono">{u.roles.join(", ") || "—"}</td>
              <td>{u.admin ? "yes" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
