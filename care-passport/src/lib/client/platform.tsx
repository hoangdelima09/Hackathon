"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import { SIMULATED } from "@/lib/mode";
import { useApi } from "./api";
import {
  bindIAMService,
  decryptForRecord,
  describeRelationshipPolicy,
  encryptForRecord,
  readSession,
  signRelationshipPolicy,
} from "@/lib/tide/relationship";

// The one surface pages use for sign-in, API calls and record crypto. TidePlatformProvider is the
// real thing (TideCloak + Tide network). SimPlatformProvider is used only in a simulated build.

export type PolicyInfo = { contractId: string; subjectType: string; subjectId: string; recordId: string; roles: string; signed: boolean; isRelationshipPolicy: boolean };
type Api = <T = Record<string, unknown>>(path: string, init?: RequestInit) => Promise<T>;

export type Platform = {
  simulated: boolean;
  authenticated: boolean;
  isInitializing: boolean;
  /** Simulated build only: the signed-in demo identity. */
  simUser: string | null;
  login: (simUsername?: string) => void;
  logout: () => void;
  api: Api;
  encrypt: (text: string, recordId: string, policyB64: string) => Promise<string>;
  decrypt: (ciphertext: string, recordId: string, policyB64: string) => Promise<string>;
  /** Steward: get the record's Group policy signed (enclave approval). */
  signPolicy: (recordId: string, group: string) => Promise<string>;
  describePolicy: (policyB64: string) => PolicyInfo;
  /** Groups the credential that the network checks actually carries. */
  credentialGroups: () => string[] | null;
  /** Steward: readiness of the realm admin policy that authorises signing (tide only). */
  prepareSigning: () => Promise<void>;
  signingError: string | null;
  consoleUrl: string | null;
};

const Ctx = createContext<Platform | null>(null);
export function usePlatform(): Platform {
  const p = useContext(Ctx);
  if (!p) throw new Error("usePlatform outside a platform provider");
  return p;
}

const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));

// --- real: TideCloak + Tide network -------------------------------------------------------------

export function TidePlatformProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, isInitializing, login, logout, IAMService, getConfig } = useTideCloak();
  const api = useApi();
  const adminPolicy = useRef<Uint8Array | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);

  useEffect(() => {
    bindIAMService(IAMService);
  }, [IAMService]);

  const cfg = getConfig() as { realm?: string; "auth-server-url"?: string; vendorId?: string };
  const base = (cfg["auth-server-url"] ?? "").replace(/\/+$/, "");

  // The realm admin policy, fetched from TideCloak directly with the steward's own DPoP-bound token,
  // ahead of time so the enclave pop-up opens straight from the click.
  const prepareSigning = useCallback(async () => {
    setSigningError(null);
    try {
      const token = await IAMService.getToken();
      const res = await IAMService.secureFetch(`${base}/admin/realms/${cfg.realm}/iga/role-policies/name/tide-realm-admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`TideCloak answered ${res.status}`);
      const body = (await res.json()) as { policy?: string };
      if (!body.policy) throw new Error("No admin policy in the response");
      adminPolicy.current = fromBase64(body.policy);
    } catch (err) {
      setSigningError(err instanceof Error ? err.message : String(err));
    }
  }, [IAMService, base, cfg.realm]);

  const value = useMemo<Platform>(
    () => ({
      simulated: false,
      authenticated,
      isInitializing,
      simUser: null,
      login: () => login(),
      logout: () => logout(),
      api,
      encrypt: encryptForRecord,
      decrypt: decryptForRecord,
      signPolicy: async (recordId, group) => {
        if (!adminPolicy.current) throw new Error(signingError ?? "Admin policy not loaded yet");
        if (!cfg.vendorId) throw new Error("vendorId missing from the adapter");
        return signRelationshipPolicy({ vendorId: cfg.vendorId, subject: { type: "Group", id: group }, recordId, access: "read-write" }, adminPolicy.current);
      },
      describePolicy: describeRelationshipPolicy,
      credentialGroups: () => {
        try {
          return readSession().groups;
        } catch {
          return null;
        }
      },
      prepareSigning,
      signingError,
      consoleUrl: `${base}/admin/${cfg.realm}/console/`,
    }),
    [authenticated, isInitializing, login, logout, api, prepareSigning, signingError, base, cfg.realm, cfg.vendorId]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// --- simulated: local stand-ins (src/sim/) ------------------------------------------------------

const TOKEN_KEY = "care-passport-sim-token";
const USER_KEY = "care-passport-sim-user";

function sessionGet(k: string) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function sessionSet(k: string, v: string | null) {
  try {
    if (v === null) sessionStorage.removeItem(k);
    else sessionStorage.setItem(k, v);
  } catch {
    // storage unavailable: the session lasts until reload
  }
}

/** Claims of the simulated access token, read without verification (display only). */
function claimsOf(token: string | null): Record<string, unknown> {
  if (!token) return {};
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

const enc = new TextEncoder();
const dec = new TextDecoder();
async function aesKey(keyB64: string) {
  return crypto.subtle.importKey("raw", fromBase64(keyB64), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function SimPlatformProvider({ children }: { children: React.ReactNode }) {
  // Per tab (sessionStorage), so one browser can hold several demo identities side by side.
  const [token, setToken] = useState<string | null>(null);
  const [simUser, setSimUser] = useState<string | null>(null);
  const [isInitializing, setInitializing] = useState(true);

  useEffect(() => {
    setToken(sessionGet(TOKEN_KEY));
    setSimUser(sessionGet(USER_KEY));
    setInitializing(false);
  }, []);


  const api: Api = useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (init.body) headers["Content-Type"] = "application/json";
      const res = await fetch(path, { ...init, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { message?: string }).message || (data as { error?: string }).error || `HTTP ${res.status}`);
      return data as T;
    },
    [token]
  ) as Api;

  const login = useCallback(async (username?: string) => {
    if (!username) return;
    const res = await fetch("/api/sim/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
    const data = (await res.json()) as { token?: string };
    if (!data.token) return;
    sessionSet(TOKEN_KEY, data.token);
    sessionSet(USER_KEY, username);
    // Reload so every page starts from the new credential, as after a real sign-in.
    window.location.reload();
  }, []);

  const logout = useCallback(() => {
    sessionSet(TOKEN_KEY, null);
    sessionSet(USER_KEY, null);
    window.location.href = "/";
  }, []);

  // Demo convenience: /?as=gp-a signs this tab in as that identity once.
  useEffect(() => {
    if (isInitializing || token) return;
    const as = new URLSearchParams(window.location.search).get("as");
    if (as) {
      window.history.replaceState(null, "", window.location.pathname);
      void login(as);
    }
  }, [isInitializing, token, login]);

  const releaseKey = useCallback(
    async (op: "encrypt" | "decrypt", recordId: string, policyB64: string) =>
      (await api<{ key: string }>("/api/sim/tide/key", { method: "POST", body: JSON.stringify({ op, tags: [recordId], policy: policyB64 }) })).key,
    [api]
  );

  const value = useMemo<Platform>(
    () => ({
      simulated: true,
      authenticated: !!token,
      isInitializing,
      simUser,
      login: (u) => void login(u),
      logout,
      api,
      encrypt: async (text, recordId, policyB64) => {
        const key = await aesKey(await releaseKey("encrypt", recordId, policyB64));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(recordId) }, key, enc.encode(text)));
        return `sim1.${toBase64(iv)}.${toBase64(ct)}`;
      },
      decrypt: async (ciphertext, recordId, policyB64) => {
        const key = await aesKey(await releaseKey("decrypt", recordId, policyB64));
        const [, iv, ct] = ciphertext.split(".");
        const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv), additionalData: enc.encode(recordId) }, key, fromBase64(ct));
        return dec.decode(pt);
      },
      signPolicy: async (recordId) =>
        (await api<{ policy: string }>("/api/sim/tide/sign-policy", { method: "POST", body: JSON.stringify({ recordId }) })).policy,
      describePolicy: (policyB64) => {
        const p = JSON.parse(atob(policyB64)) as { contractId: string; params: Record<string, string>; signature?: string };
        return {
          contractId: p.contractId,
          subjectType: p.params.subjectType,
          subjectId: p.params.subjectId,
          recordId: p.params.assignmentId,
          roles: p.params.roles,
          signed: !!p.signature,
          isRelationshipPolicy: p.contractId === "RelationshipAttestation:1",
        };
      },
      credentialGroups: () => {
        const g = claimsOf(token).groups;
        return Array.isArray(g) ? g.map(String) : [];
      },
      prepareSigning: async () => undefined,
      signingError: null,
      consoleUrl: null,
    }),
    [token, isInitializing, simUser, login, logout, api, releaseKey]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const PlatformProvider = SIMULATED ? SimPlatformProvider : TidePlatformProvider;
