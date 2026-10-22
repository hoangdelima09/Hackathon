"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePlatform } from "@/lib/client/platform";
import directory from "../../fixtures/directory.json";

export type Me = {
  username: string;
  displayName: string;
  kind: "patient" | "gp" | "physio" | "steward" | "unknown";
  groups: string[];
  cryptoRoles: string[];
  isSteward: boolean;
};

const MeContext = createContext<Me | null>(null);
export const useMe = () => useContext(MeContext);

const NAV = [
  { href: "/patient", label: "Patient" },
  { href: "/clinician", label: "Clinician" },
  { href: "/steward", label: "Steward" },
];

// Route guard = UI gating only. Every API route verifies the JWT + DPoP, and the Tide network
// decides every decryption.
export function AppShell({ children, requireAuth = true }: { children: React.ReactNode; requireAuth?: boolean }) {
  const { authenticated, isInitializing, login, logout, api, simulated, simUser } = usePlatform();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

  useEffect(() => {
    if (!simulated && !isInitializing && !authenticated && requireAuth) login();
  }, [simulated, isInitializing, authenticated, requireAuth, login]);

  useEffect(() => {
    if (me) document.title = `${me.displayName} · Care Passport`;
  }, [me]);

  useEffect(() => {
    if (!authenticated) return;
    api<Me>("/api/me")
      .then(setMe)
      .catch((e) => setMeError(e instanceof Error ? e.message : String(e)));
  }, [authenticated, api]);

  return (
    <>
      <header className="top">
        <span className="brand"><span className="logo" aria-hidden="true">✚</span>Care Passport</span>
        <nav aria-label="Main">
          <a href="/" className={pathname === "/" ? "active" : ""}>Home</a>
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={pathname === n.href ? "active" : ""}>
              {n.label}
            </a>
          ))}
        </nav>
        <span className="who">
          {authenticated && me ? (
            <>
              <span className={`avatar ${me.kind}`} aria-hidden="true">{initials(me.displayName)}</span>
              <span>
                <strong>{me.displayName}</strong> <span className="mono">{me.username}</span>
              </span>{" "}
              {simulated && simUser && (
                <button onClick={() => login(simUser)} title="Re-issue the credential, as after signing in again">Sign in again</button>
              )}{" "}
              <button onClick={() => logout()}>Sign out</button>
            </>
          ) : authenticated ? (
            <button onClick={() => logout()}>Sign out</button>
          ) : (
            !isInitializing && !simulated && <button className="primary" onClick={() => login()}>Sign in with Tide</button>
          )}
        </span>
      </header>
      <main>
        <p className="banner">Synthetic demonstration data only. No real patients or clinical records.</p>
        {simulated && (
          <p className="simbar" role="note">
            <strong>SIMULATED</strong>
            <span> Sign-in, roles, change requests and the network&apos;s
            access checks are local stand-ins that follow TideCloak and RelationshipAttestation:1 rules.
            Nothing on this screen is evidence of Tide enforcement.
            </span>
          </p>
        )}
        {simulated && !isInitializing && !authenticated ? (
          <SimSignIn onPick={(u) => login(u)} />
        ) : requireAuth && (isInitializing || !authenticated) ? (
          <p className="center">Checking your session…</p>
        ) : meError ? (
          <p className="alert bad">Could not load your profile: {meError}</p>
        ) : (
          <MeContext.Provider value={me}>{children}</MeContext.Provider>
        )}
      </main>
    </>
  );
}

const dir = directory as Record<string, { displayName: string; kind: string }>;

/** Simulated build only: stands in for the TideCloak + Tide enclave sign-in. No password. */
function SimSignIn({ onPick }: { onPick: (username: string) => void }) {
  return (
    <section className="card" aria-labelledby="sim-signin">
      <h2 id="sim-signin">Simulated sign-in</h2>
      <p className="meta">
        Pick a synthetic identity. Each browser tab keeps its own identity. In the real build this is the
        TideCloak login with the user&apos;s own Tide account.
      </p>
      <div className="identity-grid">
        {Object.entries(dir).map(([username, d]) => (
          <button key={username} onClick={() => onPick(username)}>
            <span className={`avatar ${d.kind}`} aria-hidden="true">{initials(d.displayName)}</span>
            <span>
              {d.displayName}
              <span className="meta mono" style={{ display: "block" }}>{username}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function initials(name: string) {
  const words = name.replace(/\(.*?\)/g, "").replace(/^Dr\s+/, "").trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}
