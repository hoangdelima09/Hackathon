"use client";

import { useTideCloak } from "@tidecloak/nextjs";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { bindIAMService } from "@/lib/tide/relationship";
import { useApi } from "@/lib/client/api";

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
  const { authenticated, isInitializing, login, logout, IAMService } = useTideCloak();
  const api = useApi();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

  useEffect(() => {
    bindIAMService(IAMService);
  }, [IAMService]);

  useEffect(() => {
    if (!isInitializing && !authenticated && requireAuth) login();
  }, [isInitializing, authenticated, requireAuth, login]);

  useEffect(() => {
    if (!authenticated) return;
    api<Me>("/api/me")
      .then(setMe)
      .catch((e) => setMeError(e instanceof Error ? e.message : String(e)));
  }, [authenticated, api]);

  return (
    <>
      <header className="top">
        <span className="brand">Care Passport</span>
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
              Signed in as <strong>{me.displayName}</strong> ({me.username}){" "}
              <button onClick={() => logout()}>Sign out</button>
            </>
          ) : authenticated ? (
            <button onClick={() => logout()}>Sign out</button>
          ) : (
            !isInitializing && <button className="primary" onClick={() => login()}>Sign in with Tide</button>
          )}
        </span>
      </header>
      <main>
        <p className="banner">Synthetic demonstration data only. No real patients or clinical records.</p>
        {requireAuth && (isInitializing || !authenticated) ? (
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
