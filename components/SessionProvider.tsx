"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { connectAccount, disconnectAccount } from "@/lib/library-store";

export type Account = {
  id: string;
  email: string;
  displayName: string;
  status: "active" | "suspended";
  role: "admin" | "moderator" | "member";
  handle: string;
  motto: string;
  bio: string;
  avatarUrl: string | null;
  favoriteComposers: string[];
  libraryPublic: boolean;
};

type Session = {
  account: Account | null;
  loading: boolean;
  isEditor: boolean;
  refresh: () => Promise<Account | null>;
  signOut: () => Promise<void>;
  setAccount: (account: Account) => void;
};

const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}

export default function SessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccountState] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = response.ok ? ((await response.json()) as { account: Account | null }) : { account: null };
      setAccountState(data.account);
      return data.account;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the session once on mount; state is set when the request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (account) void connectAccount(account.id);
  }, [account]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }).catch(() => undefined);
    disconnectAccount();
    setAccountState(null);
  }, []);

  const value = useMemo<Session>(() => ({
    account,
    loading,
    isEditor: account?.role === "admin",
    refresh,
    signOut,
    setAccount: setAccountState,
  }), [account, loading, refresh, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
