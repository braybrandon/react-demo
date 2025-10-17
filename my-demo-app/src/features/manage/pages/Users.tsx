import MainBodyWrapper from "../../../components/MainBodyWrapper";
import UserList from "../components/UserList";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Modal, Button, TextInput, PasswordInput, MultiSelect } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import UserStatus from "../../../lib/types";

type ApiUser = {
  id: number;
  name: string;
  email?: string;
  roles?: { id: number; name: string }[];
  createdAt?: string;
  lastActive?: string;
  lastLogin?: string | null;
  status?: string;
};

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<{ label: string; value: string }[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoles, setNewRoles] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(
          `${(import.meta as any).env?.VITE_API_BASE || "http://localhost:4000"}/users`,
          { credentials: "include" }
        );
        if (!resp.ok) throw new Error("Failed to fetch users");
        const data = await resp.json();
        // normalize API response to include lastActive and status for the UI
        const normalized = (data || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          roles: u.roles || [],
          createdAt: u.createdAt,
          // show lastLogin as lastActive (createdAt was used previously by mistake)
          lastActive: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : undefined,
          status:
            u.derivedStatus ||
            u.status ||
            (u.lastLogin && new Date(u.lastLogin) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ? UserStatus.INACTIVE
              : UserStatus.ACTIVE),
        }));
        setUsers(normalized);
      } catch (e) {
        setUsers([]);
      }
    }
    load();

    // load roles for add-user form
    (async () => {
      try {
        const r = await fetch(
          `${(import.meta as any).env?.VITE_API_BASE || "http://localhost:4000"}/roles`,
          { credentials: "include" }
        );
        if (!r.ok) return;
        const list = await r.json();
        setRoles((list || []).map((x: any) => ({ label: x.name, value: String(x.id) })));
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  async function createUser() {
    try {
      const resp = await fetch(
        `${(import.meta as any).env?.VITE_API_BASE || "http://localhost:4000"}/auth/register`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName, email: newEmail, password: newPassword }),
        }
      );
      if (!resp.ok) {
        const b = await resp.json().catch(() => ({}));
        throw new Error((b && b.error) || `Failed to create user (${resp.status})`);
      }
      const created = await resp.json();

      // assign roles if any
      for (const rid of newRoles) {
        const rId = Number(rid);
        if (Number.isNaN(rId)) continue;
        try {
          await fetch(
            `${(import.meta as any).env?.VITE_API_BASE || "http://localhost:4000"}/users/${created.id}/roles/${rId}`,
            {
              method: "PUT",
              credentials: "include",
            }
          );
        } catch (err) {
          console.error("Failed to assign role", err);
        }
      }

      showNotification({ title: "User created", message: `${created.email}` });
      setAddOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRoles([]);
      // reload users
      const reload = await fetch(
        `${(import.meta as any).env?.VITE_API_BASE || "http://localhost:4000"}/users`,
        { credentials: "include" }
      );
      if (reload.ok) {
        const data = await reload.json();
        const normalized = (data || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          roles: u.roles || [],
          createdAt: u.createdAt,
          lastActive: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : undefined,
          status:
            u.derivedStatus ||
            u.status ||
            (u.lastLogin && new Date(u.lastLogin) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ? UserStatus.INACTIVE
              : UserStatus.ACTIVE),
        }));
        setUsers(normalized);
      }
    } catch (err: any) {
      showNotification({
        title: "Create failed",
        message: String(err.message || err),
        color: "red",
      });
    }
  }

  return (
    <MainBodyWrapper
      title="Users"
      subtitle="Manage your team members and their permissions"
      onBack={() => navigate(-1)}
      avatarText=""
    >
      <div style={{ marginTop: 8 }}>
        <UserList
          users={users}
          roles={roles}
          onAdd={() => setAddOpen(true)}
          onDelete={(id) => setUsers((s) => s.filter((u) => u.id !== id))}
        />

        <Modal opened={addOpen} onClose={() => setAddOpen(false)} title="Add user" centered>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <TextInput
              label="Full name"
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
            />
            <TextInput
              label="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
            />
            <MultiSelect
              label="Roles"
              data={roles}
              value={newRoles}
              onChange={setNewRoles}
              placeholder="Select roles"
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="default" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => createUser()} disabled={!newName || !newEmail || !newPassword}>
                Create
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainBodyWrapper>
  );
}
