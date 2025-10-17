import {
  AppShell,
  Burger,
  Group,
  Avatar,
  Breadcrumbs,
  Anchor,
  Menu,
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { IconGauge, IconShoppingCart, IconSettings } from "@tabler/icons-react";
import { currentUser, logout, userHasPermission, PERM_MANAGE } from "./lib/auth.service";
import { titleCase } from "./lib/string.service";
import Logo from "./components/Logo";

function App() {
  const [opened, { toggle }] = useDisclosure();
  const { setColorScheme } = useMantineColorScheme();
  const navigate = useNavigate();
  const user = currentUser();
  const location = useLocation();
  const computedColorScheme = useComputedColorScheme("light");

  function doLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const mustChange =
    (user as any)?.mustChangePassword === true || location.pathname === "/change-password";

  return (
    <AppShell
      style={{ minHeight: "100vh" }}
      padding="md"
      header={mustChange ? undefined : { height: 60 }}
      navbar={
        mustChange ? undefined : { width: 300, breakpoint: "sm", collapsed: { mobile: !opened } }
      }
    >
      {!mustChange && (
        <AppShell.Header>
          <Group h="100%" px="md" style={{ justifyContent: "space-between" }}>
            <Group>
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              {/* Breadcrumbs showing current location */}
              <Logo onClick={() => navigate("/")} />
              <Breadcrumbs>
                {(() => {
                  const segments = location.pathname.split("/").filter(Boolean);
                  // mapping for better labels
                  const map: Record<string, string> = {
                    dashboard: "Dashboard",
                    shopping: "Shopping",
                    manage: "Manage",
                  };

                  if (segments.length === 0) {
                    return (
                      <Anchor component="button" onClick={() => navigate("/")}>
                        {map.dashboard}
                      </Anchor>
                    );
                  }

                  const crumbs = segments.map((seg, idx) => {
                    const to = "/" + segments.slice(0, idx + 1).join("/");
                    const label = map[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
                    return { label, to };
                  });

                  return crumbs.map((c) => (
                    <Anchor component="button" key={c.to} onClick={() => navigate(c.to)}>
                      {c.label}
                    </Anchor>
                  ));
                })()}
              </Breadcrumbs>
            </Group>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Tooltip
                label={computedColorScheme === "dark" ? "Switch to light" : "Switch to dark"}
              >
                <ActionIcon
                  onClick={() => setColorScheme(computedColorScheme === "dark" ? "light" : "dark")}
                >
                  {computedColorScheme === "dark" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                  )}
                </ActionIcon>
              </Tooltip>
              {user && (
                <Menu position="bottom-end">
                  <Menu.Target>
                    <Avatar radius="xl" size={28} style={{ cursor: "pointer" }}>
                      {(titleCase(user.name) || "").charAt(0).toUpperCase()}
                    </Avatar>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item color="red" onClick={doLogout}>
                      Logout
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
            </div>
          </Group>
        </AppShell.Header>
      )}

      {!mustChange && (
        <AppShell.Navbar p="md">
          <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <NavLink
              to="/"
              end
              style={({ isActive }: { isActive: boolean }) => ({
                fontWeight: isActive ? 700 : 500,
                display: "flex",
                gap: 8,
                alignItems: "center",
              })}
            >
              <IconGauge size={16} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/shopping"
              style={({ isActive }: { isActive: boolean }) => ({
                fontWeight: isActive ? 700 : 500,
                display: "flex",
                gap: 8,
                alignItems: "center",
              })}
            >
              <IconShoppingCart size={16} />
              <span>Shopping</span>
            </NavLink>
            {userHasPermission(user, PERM_MANAGE) && (
              <NavLink
                to="/manage"
                style={({ isActive }: { isActive: boolean }) => ({
                  fontWeight: isActive ? 700 : 500,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                })}
              >
                <IconSettings size={16} />
                <span>Manage</span>
              </NavLink>
            )}
          </nav>
        </AppShell.Navbar>
      )}

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
export default App;
