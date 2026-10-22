"use client";

import { usePlatform } from "@/lib/client/platform";
import { AppShell, useMe } from "@/components/AppShell";

// Public home page. No auth required.
export default function HomePage() {
  return (
    <AppShell requireAuth={false}>
      <Home />
    </AppShell>
  );
}

function Home() {
  const { authenticated, login, simulated } = usePlatform();
  const me = useMe();
  const start =
    me?.kind === "patient" ? "/patient" : me?.kind === "steward" || me?.isSteward ? "/steward" : me ? "/clinician" : null;

  return (
    <>
      <h1>Care Passport</h1>
      <p className="sub">
        Share one health record with one named clinician, and withdraw it later. The server stores only
        ciphertext, Tide&apos;s network decides every decryption, and no single administrator can widen access.
      </p>
      <div className="grid">
        <section className="card feature">
          <h3><span className="step">1</span>Patient decides</h3>
          <p className="meta">Records are encrypted in the patient&apos;s browser, one care group per record.</p>
        </section>
        <section className="card feature">
          <h3><span className="step">2</span>Two of three stewards approve</h3>
          <p className="meta">Joining or leaving a care group is a TideCloak change request that needs a quorum.</p>
        </section>
        <section className="card feature">
          <h3><span className="step">3</span>The network enforces</h3>
          <p className="meta">
            Decryption is released only to members of the record&apos;s care group (built-in
            <span className="mono"> RelationshipAttestation:1</span> contract).
          </p>
        </section>
      </div>
      <div className="row" style={{ marginTop: 20 }}>
        {!authenticated ? (
          !simulated && <button className="primary" onClick={() => login()}>Sign in with Tide</button>
        ) : start ? (
          <a href={start}><button className="primary">Continue as {me?.displayName}</button></a>
        ) : (
          <p className="meta">Loading your profile…</p>
        )}
      </div>
    </>
  );
}
