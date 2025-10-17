import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import "@mantine/core/styles.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Shopping from "./pages/Shopping";
import Manage from "./features/manage/pages/Manage";
import EditUser from "./features/manage/pages/EditUser";
import Users from "./features/manage/pages/Users";
import Forbidden from "./pages/Forbidden";
import RequireRole from "./components/RequireRole";
import { PERM_MANAGE } from "./lib/auth.service";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
// OAuth callback removed for mock front-end auth
import RequireAuth from "./components/RequireAuth";
import { startAuthTimer, fetchCurrentUser } from "./lib/auth.service";

const MantProvider: any = MantineProvider;

function AppWrapper() {
  // Use Mantine Global styles to set the page background according to the theme
  // rather than mutating document.body directly. This keeps styles in the
  // React/Mantine system and respects SSR and theming.

  return (
    <MantProvider defaultColorScheme="dark">
      <Notifications position="top-right" zIndex={300} />
      <BrowserRouter>
        <StartupAuthTimer />
        <Routes>
          {/* login is outside the app layout */}
          <Route path="/login" element={<Login />} />
          {/* allow unauthenticated access to change-password (so users can navigate from login) */}
          <Route path="/change-password" element={<ChangePassword />} />

          {/* entire app requires authentication */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <App />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="shopping" element={<Shopping />} />
            <Route path="manage">
              <Route
                path=""
                element={
                  <RequireRole perm={PERM_MANAGE}>
                    <Manage />
                  </RequireRole>
                }
              />
              <Route
                path="users"
                element={
                  <RequireRole perm={PERM_MANAGE}>
                    <Users />
                  </RequireRole>
                }
              />
              <Route
                path="users/:id"
                element={
                  <RequireRole perm={PERM_MANAGE}>
                    <EditUser />
                  </RequireRole>
                }
              />
            </Route>
            <Route path="forbidden" element={<Forbidden />} />
          </Route>

          {/* catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MantProvider>
  );
}

function StartupAuthTimer() {
  // this component runs inside BrowserRouter so we can navigate
  const navigate = useNavigate();
  useEffect(() => {
    // expose helper for post-login startup
    try {
      (window as any).__startAuthTimer = startAuthTimer;
    } catch {}
    (async () => {
      // Try to populate current user from cookie-based session on page load
      await fetchCurrentUser();
      // Start timers after we've refreshed localStorage
      startAuthTimer(() => {
        navigate("/login", { replace: true });
      });
    })();
    // timer cleanup handled by auth.cancelAuthTimer if needed
  }, [navigate]);
  return null;
}

// Ensure favicon is loaded from src/assets (Vite-compatible URL) so dev builds use the asset
try {
  const xpFavicon = new URL("./assets/xp-icon.png", import.meta.url).href;
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = xpFavicon;
} catch (e) {
  // ignore runtime errors if asset is missing
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>
);
