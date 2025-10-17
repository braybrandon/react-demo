import React, { createContext, useContext, useEffect, useState } from "react";
import type { ApiUser } from "./auth.service";
import { fetchCurrentUser } from "./auth.service";

type AuthContextValue = { user: ApiUser | null; setUser: (u: ApiUser | null) => void };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    // expose simple setter so auth.service can notify us when login/refresh/logout happen
    try {
      (window as any).__setCurrentUser = setUser;
    } catch {}

    // Attempt to populate from server-side cookie session on mount
    (async () => {
      const u = await fetchCurrentUser();
      if (u) setUser(u);
    })();

    return () => {
      try {
        (window as any).__setCurrentUser = undefined;
      } catch {}
    };
  }, []);

  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export default AuthProvider;
