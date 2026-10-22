"use client";

import { refusalReason } from "@/lib/client/tideErrors";

export type Outcome =
  | { kind: "ok"; text: string }
  | { kind: "refused"; raw: string }
  | { kind: "info"; text: string };

// Shows plaintext only after a real decryption, or the network's refusal verbatim.
export function DecryptResult({ outcome, onClose }: { outcome: Outcome | null; onClose?: () => void }) {
  if (!outcome) return null;
  if (outcome.kind === "ok") {
    return (
      <div>
        <div className="alert ok" role="status">Decrypted in this browser by the Tide network.</div>
        <pre className="plain">{outcome.text}</pre>
        {onClose && (
          <div className="row">
            <button onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    );
  }
  if (outcome.kind === "refused") {
    return (
      <div className="alert bad" role="alert">
        <strong>Refused: {refusalReason(outcome.raw)}</strong>
        <span className="raw">{outcome.raw}</span>
      </div>
    );
  }
  return <div className="alert ok" role="status">{outcome.text}</div>;
}
