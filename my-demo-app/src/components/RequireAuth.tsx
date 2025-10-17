import React, { type ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { fetchCurrentUser, forceRefresh } from "../lib/auth.service";
import type { ApiUser } from "../lib/auth.service";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  // Do not trust localStorage blindly - start with null and validate with the server
  const [user, setUser] = useState<ApiUser | null>(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Always attempt to refresh/populate user from server; do not trust localStorage

      // Try to use the refresh token to obtain a new access token
      try {
        const refreshed = await forceRefresh();
        if (refreshed) {
          const me = await fetchCurrentUser();
          if (me && mounted) {
            setUser(me);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // ignore and fallthrough to a final fetch attempt
      }

      // As a fallback attempt to populate the user (maybe access cookie still valid)
      try {
        const me2 = await fetchCurrentUser();
        if (me2 && mounted) {
          setUser(me2);
          setLoading(false);
          return;
        }
      } catch (err) {
        // ignore
      }

      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null; // or a spinner component while we attempt refresh
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // If the user is required to change password, force them to the change-password page
  const isOnChangePassword = location.pathname === "/change-password";
  if ((user as ApiUser).mustChangePassword && !isOnChangePassword) {
    return <Navigate to="/change-password" replace state={{ from: location }} />;
  }

  return children as React.ReactElement;
}
