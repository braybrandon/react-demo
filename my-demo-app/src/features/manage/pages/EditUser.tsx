import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainBodyWrapper from "../../../components/MainBodyWrapper";
import EditProfile from "../components/EditProfile";
import UserHeader from "../../../components/UserHeader";
import { Card, Tabs, Divider, Text } from "@mantine/core";
// titleCase removed; not used in this view
// CornerRibbon not used in this view

type ApiUser = {
  id: number;
  name: string;
  email?: string;
  roles?: { id: number; name: string }[];
  createdAt?: string;
  lastLogin?: string | null;
  status?: string;
};

export default function EditUser() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    async function load() {
      try {
        const resp = await fetch(
          `${(import.meta as any).env?.VITE_API_BASE || "http://localhost:4000"}/users/${id}`,
          { credentials: "include" }
        );
        if (!resp.ok) {
          const b = await resp.json().catch(() => ({}));
          throw new Error((b && b.error) || `Failed to fetch user (${resp.status})`);
        }
        const data = await resp.json();
        if (!cancelled) setUser(data);
      } catch (err) {
        // ignore for read-only demo
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const navigate = useNavigate();

  return (
    <MainBodyWrapper
      title="User Details"
      subtitle="Manage user profile, roles and permissions"
      onBack={() => navigate(-1)}
      avatarText={(user && user.name) || ""}
    >
      <Card withBorder style={{ marginTop: "2rem" }}>
        <UserHeader user={user} />
        <Divider style={{ margin: "12px 0" }} />

        <Tabs defaultValue="profile">
          <Tabs.List>
            <Tabs.Tab value="profile">Profile</Tabs.Tab>
            <Tabs.Tab value="activity" disabled>
              Activity
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="profile" pt="xs">
            <EditProfile
              user={user}
              onSave={async (patch) => {
                if (!user) return;
                const resp = await fetch(
                  `${(import.meta as any).env?.VITE_API_BASE || "http://localhost:4000"}/users/${user.id}`,
                  {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(patch),
                  }
                );
                if (!resp.ok) {
                  const b = await resp.json().catch(() => ({}));
                  throw new Error((b && b.error) || `Failed to update user (${resp.status})`);
                }
                const updated = await resp.json();
                // Preserve roles if the server response doesn't include them
                setUser((prev) => ({ ...(prev || {}), ...(updated || {}), roles: updated?.roles ?? prev?.roles } as any));
              }}
            />
          </Tabs.Panel>

          {/* Roles panel removed */}
          <Tabs.Panel value="activity" pt="xs">
            <Text color="dimmed">Recent activity and audit events will appear here.</Text>
          </Tabs.Panel>
        </Tabs>
      </Card>
    </MainBodyWrapper>
  );
}
