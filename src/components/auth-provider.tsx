"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { msUntilRefresh, refreshAccessToken } from "@/lib/api/client";
import { logout as logoutRequest } from "@/lib/api/resources";
import {
  clearSession,
  getStoredUser,
  hasSession,
  resetSessionEndGuard,
  setFlash,
} from "@/lib/api/session";
import type { UserAccount } from "@/lib/api/types";

interface AuthContextValue {
  ready: boolean;
  user: UserAccount | null;
  refreshUser: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserAccount | null>(null);

  function refreshUser() {
    setUser(getStoredUser());
  }

  useEffect(() => {
    refreshUser();
    setReady(true);
    function onEnd() {
      setUser(null);
      if (!window.location.pathname.startsWith("/login")) {
        router.replace("/login");
      }
    }
    window.addEventListener("senoria-session-end", onEnd);
    return () => window.removeEventListener("senoria-session-end", onEnd);
  }, [router]);

  useEffect(() => {
    if (!ready || !hasSession()) return;
    let timer = 0;
    let cancelled = false;

    const schedule = () => {
      const delay = msUntilRefresh();
      if (delay == null) return;
      timer = window.setTimeout(async () => {
        const ok = await refreshAccessToken();
        if (cancelled) return;
        if (ok) schedule();
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready, user]);

  async function logout() {
    let revoked = true;
    try {
      await logoutRequest();
    } catch {
      revoked = false;
    } finally {
      clearSession();
      resetSessionEndGuard();
      setUser(null);
      if (!revoked) {
        setFlash("Signed out on this browser. The server did not confirm that the refresh token was revoked.");
      }
      router.replace("/login");
    }
  }

  const value = useMemo(() => ({ ready, user, refreshUser, logout }), [ready, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
