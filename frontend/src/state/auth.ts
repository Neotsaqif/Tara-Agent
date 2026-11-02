import { useCallback, useEffect, useState } from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  readStoredBundle,
  storeBundle,
  type TokenBundle,
} from "../services/auth";

export type AuthStatus = "anonymous" | "authenticated";

export function useAuth() {
  const [bundle, setBundle] = useState<TokenBundle | null>(() => readStoredBundle());

  useEffect(() => {
    const sync = () => setBundle(readStoredBundle());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, organizationId?: string) => {
      const next = await apiLogin(email, password, organizationId);
      setBundle(next);
      return next;
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (bundle) await apiLogout(bundle);
    storeBundle(null);
    setBundle(null);
  }, [bundle]);

  return {
    status: bundle ? ("authenticated" as AuthStatus) : ("anonymous" as AuthStatus),
    bundle,
    accessToken: bundle?.access_token ?? null,
    principal: bundle?.principal ?? null,
    signIn,
    signOut,
  };
}
