"use client";

import { useState } from "react";
import provisioned from "../../fixtures/records.json";
import { useApi } from "@/lib/client/api";
import { decryptForRecord } from "@/lib/tide/relationship";
import { tideErrorText } from "@/lib/client/tideErrors";
import { DecryptResult, type Outcome } from "./DecryptResult";

type Leaked = { id: string; label: string; group: string; ciphertext: string | null; policy: string | null };

// Simulates a full database leak: the server hands this user the ciphertext AND the policy of a
// record they were never given. Only the Tide network's check stands between them and the text.
export function LeakedCopyTest({ title = "Leaked-copy test" }: { title?: string }) {
  const api = useApi();
  const [recordId, setRecordId] = useState(provisioned[0].id);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function run() {
    setBusy(true);
    setOutcome(null);
    try {
      const { record } = await api<{ record: Leaked }>(`/api/demo/leaked/${encodeURIComponent(recordId)}`);
      if (!record.ciphertext || !record.policy) {
        setOutcome({ kind: "info", text: "This record has no ciphertext or signed policy yet." });
        return;
      }
      try {
        const text = await decryptForRecord(record.ciphertext, record.id, record.policy);
        setOutcome({ kind: "ok", text });
        await api("/api/events", { method: "POST", body: JSON.stringify({ type: "decrypt_ok", recordId: record.id, detail: "Leaked-copy test decrypted" }) }).catch(() => undefined);
      } catch (err) {
        const raw = tideErrorText(err);
        setOutcome({ kind: "refused", raw });
        await api("/api/events", { method: "POST", body: JSON.stringify({ type: "decrypt_refused", recordId: record.id, detail: `Leaked-copy test: ${raw}` }) }).catch(() => undefined);
      }
    } catch (err) {
      setOutcome({ kind: "refused", raw: tideErrorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="leaked-title">
      <h3 id="leaked-title">{title}</h3>
      <p className="meta">
        Demo only. The server deliberately hands you the ciphertext and policy of any record, as if its
        database had leaked. Decryption still has to pass the Tide network's care-group check.
      </p>
      <div className="row">
        <label htmlFor="leaked-record">Record</label>
        <select id="leaked-record" value={recordId} onChange={(e) => setRecordId(e.target.value)}>
          {provisioned.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} ({r.id})
            </option>
          ))}
        </select>
        <button className="primary" onClick={run} disabled={busy}>
          {busy ? "Asking the Tide network…" : "Try to decrypt the leaked copy"}
        </button>
      </div>
      <DecryptResult outcome={outcome} onClose={() => setOutcome(null)} />
    </section>
  );
}
