"use client";

import { useCallback, useEffect, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import { AppShell, useMe } from "@/components/AppShell";
import { LeakedCopyTest } from "@/components/LeakedCopyTest";
import { useApi } from "@/lib/client/api";
import { describeRelationshipPolicy, signRelationshipPolicy } from "@/lib/tide/relationship";
import { tideErrorText } from "@/lib/client/tideErrors";

type PolicyRec = { id: string; label: string; group: string; owner: string; hasContent: boolean; policy: { subject: string; signedBy: string; createdAt: string } | null };
type Req = { id: string; recordId: string; owner: string; recipient: string; action: "share" | "withdraw"; purpose: string; status: "requested" | "done" | "rejected"; note: string; createdAt: string };

const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export default function StewardPage() {
  return (
    <AppShell>
      <Steward />
    </AppShell>
  );
}

function Steward() {
  const me = useMe();
  const api = useApi();
  const { IAMService, getConfig } = useTideCloak();
  const [records, setRecords] = useState<PolicyRec[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [adminPolicy, setAdminPolicy] = useState<Uint8Array | null>(null);
  const [adminPolicyError, setAdminPolicyError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const cfg = getConfig() as { realm?: string; "auth-server-url"?: string; vendorId?: string };
  const base = (cfg["auth-server-url"] ?? "").replace(/\/+$/, "");
  const consoleUrl = `${base}/admin/${cfg.realm}/console/`;

  const load = useCallback(async () => {
    try {
      const [p, q] = await Promise.all([
        api<{ records: PolicyRec[] }>("/api/policies"),
        api<{ requests: Req[] }>("/api/requests"),
      ]);
      setRecords(p.records);
      setRequests(q.requests);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
    }
  }, [api]);

  // Fetch the realm's admin policy from TideCloak directly, with this steward's own DPoP-bound
  // token. Done ahead of time so the enclave pop-up opens straight from the click.
  const loadAdminPolicy = useCallback(async () => {
    setAdminPolicyError(null);
    try {
      const token = await IAMService.getToken();
      const res = await IAMService.secureFetch(`${base}/admin/realms/${cfg.realm}/iga/role-policies/name/tide-realm-admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`TideCloak answered ${res.status}`);
      const body = (await res.json()) as { policy?: string };
      if (!body.policy) throw new Error("No admin policy in the response");
      setAdminPolicy(fromBase64(body.policy));
    } catch (err) {
      setAdminPolicyError(tideErrorText(err));
    }
  }, [IAMService, base, cfg.realm]);

  useEffect(() => {
    if (me?.isSteward) {
      load();
      loadAdminPolicy();
    }
  }, [me?.isSteward, load, loadAdminPolicy]);

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
    if (!adminPolicy || !cfg.vendorId) return;
    setBusy(rec.id);
    setMessage(null);
    try {
      // Opens the Tide enclave: the steward's approval there IS the grant of this record to its group.
      const signed = await signRelationshipPolicy(
        { vendorId: cfg.vendorId, subject: { type: "Group", id: rec.group }, recordId: rec.id, access: "read-write" },
        adminPolicy
      );
      const d = describeRelationshipPolicy(signed);
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
        Stewards hold no decrypt role and belong to no care group. Membership changes are made in the
        TideCloak console and need two of three stewards to approve, so no steward can act alone.
      </p>
      {message && <p className={`alert ${message.ok ? "ok" : "bad"}`}>{message.text}</p>}

      <h2>Record policies</h2>
      <p className="meta">
        One <span className="mono">RelationshipAttestation:1</span> policy per record, naming the record&apos;s care
        group. Signing opens the Tide enclave (allow pop-ups).
        {adminPolicyError && <span className="alert bad" style={{ display: "block" }}>Admin policy unavailable: {adminPolicyError} <button onClick={loadAdminPolicy}>Retry</button></span>}
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
                <button className={rec.policy ? "" : "primary"} disabled={!adminPolicy || busy !== null} onClick={() => sign(rec)}>
                  {busy === rec.id ? "Waiting for enclave…" : rec.policy ? "Re-sign" : "Sign policy"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Patient requests</h2>
      <p className="meta">
        To act on a request, open the <a href={consoleUrl} target="_blank" rel="noreferrer">TideCloak admin console</a> →
        Users → the clinician → Groups → join or leave the record&apos;s care group. Then approve the change
        request with a second steward. Marking a request here is bookkeeping only and grants nothing.
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

      <h2>Lone-administrator test</h2>
      <LeakedCopyTest title="Try to read a patient record as a steward" />
    </>
  );
}
