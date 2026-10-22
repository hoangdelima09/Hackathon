"use client";

import { useCallback } from "react";
import { useTideCloak } from "@tidecloak/nextjs";

// All app API calls go through IAMService.secureFetch with an absolute URL and the managed
// token, so the SDK upgrades Bearer to DPoP and attaches the proof (adapter rule).
export function useApi() {
  const { IAMService } = useTideCloak();
  return useCallback(
    async <T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await IAMService.getToken();
      const headers: Record<string, string> = {
        ...(init.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      };
      if (init.body) headers["Content-Type"] = "application/json";
      const res = await IAMService.secureFetch(`${window.location.origin}${path}`, { ...init, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || `HTTP ${res.status}`);
      return data as T;
    },
    [IAMService]
  );
}
