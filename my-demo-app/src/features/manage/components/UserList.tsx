// component-only file; React import not required with newer JSX runtimes
import {
  Table,
  ScrollArea,
  Card,
  Group,
  useMantineTheme,
  useMantineColorScheme,
  Avatar,
  Badge,
  ActionIcon,
  Text,
  Tooltip,
  Modal,
  Button,
} from "@mantine/core";
import { TextInput, Select } from "@mantine/core";
import { useState } from "react";
// types
import { showNotification } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";
import { titleCase } from "../../../lib/string.service";
import UserStatus from "../../../lib/types";
import { IconEdit, IconTrash } from "@tabler/icons-react";

type Role = { id?: number; name: string };

type ApiUser = {
  id: number;
  name: string;
  email?: string;
  roles?: Role[];
  lastActive?: string;
  status?: string;
  createdAt?: string;
  lastLogin?: string | null;
};

export default function UserList({
  users,
  onDelete,
  roles,
  onAdd,
}: {
  users: ApiUser[];
  onDelete?: (id: number) => void;
  roles?: { label: string; value: string }[];
  onAdd?: () => void;
}) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<ApiUser | null>(null);
  // local filter state (controls are inside this component now)
  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string | null>("All");
  const [filterStatus, setFilterStatus] = useState<string | null>("All");
  const headerBg = colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[2];
  const zebraBg = colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[0];

  const roleColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("admin")) return "red";
    if (n.includes("analyst")) return "blue";
    if (n.includes("editor")) return "green";
    if (n.includes("viewer")) return "gray";
    return "violet";
  };

  const statusColor = (s?: string) => {
    if (!s) return "gray";
    const lower = (s || "").toLowerCase();
    if (lower === UserStatus.ACTIVE) return "green";
    if (lower === "pending") return "yellow";
    return "gray";
  };

  const filtered = (users || []).filter((u) => {
    if (query) {
      const q = query.toLowerCase();
      if (!((u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)))
        return false;
    }
    if (filterRole && filterRole !== "All") {
      if (
        !(u.roles || []).some(
          (r) =>
            String(r.id) === filterRole ||
            (r.name || "").toLowerCase() === (filterRole || "").toLowerCase()
        )
      )
        return false;
    }
    if (filterStatus && filterStatus !== "All") {
      if (((u.status || "") as string).toLowerCase() !== (filterStatus || "").toLowerCase())
        return false;
    }
    return true;
  });

  const rows = filtered.map((u, i) => (
    <tr key={u.id} style={{ background: i % 2 === 0 ? "transparent" : zebraBg }}>
      <td style={{ textAlign: "left", padding: "0.75rem" }}>
        <Group>
          <Avatar radius="xl" size={40}>
            {(titleCase(u.name) || "").charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text fw={600}>{titleCase(u.name)}</Text>
          </div>
        </Group>
      </td>

      <td style={{ textAlign: "left", padding: "0.75rem" }}>{u.email}</td>

      <td style={{ textAlign: "left", padding: "0.75rem" }}>
        <Group>
          {(u.roles || []).map((r) => (
            <Badge key={r.name} color={roleColor(r.name)} variant="light">
              {titleCase(r.name)}
            </Badge>
          ))}
        </Group>
      </td>

      <td style={{ textAlign: "left", padding: "0.75rem" }}>{u.lastActive ?? "—"}</td>

      <td style={{ textAlign: "left", padding: "0.75rem" }}>
        <Badge color={statusColor(u.status)} variant="filled">
          {(u.status || "Unknown").toString().toUpperCase()}
        </Badge>
      </td>

      <td style={{ textAlign: "left", padding: "0.75rem" }}>
        <Group>
          <Tooltip label="Edit">
            <ActionIcon variant="light" onClick={() => navigate(`/manage/users/${u.id}`)}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          {/* Hide delete for admin users */}
          {!(u.roles || []).some((r) => (r.name || "").toLowerCase().includes("admin")) && (
            <Tooltip label="Delete">
              <ActionIcon
                color="red"
                variant="light"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingUser(u);
                  setConfirmOpen(true);
                }}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </td>
    </tr>
  ));

  return (
    <Card
      shadow="sm"
      radius="md"
      withBorder
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "2rem",
        marginTop: "2rem",
      }}
    >
      <div
        style={{
          borderRadius: (theme as any).radius?.md || 8,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        {/* header controls inside the card */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "2rem" }}>
          <TextInput
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            style={{ width: 360 }}
          />
          <Select
            data={[{ value: "All", label: "All Roles" }, ...(roles || [])]}
            value={filterRole ?? "All"}
            onChange={(v) => setFilterRole(v)}
            style={{ width: 140 }}
          />
          <Select
            data={[
              { value: "All", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "archived", label: "Archived" },
            ]}
            value={filterStatus ?? "All"}
            onChange={(v) => setFilterStatus(v)}
            style={{ width: 140 }}
          />
          <div style={{ marginLeft: "auto" }}>
            <Button onClick={() => onAdd && onAdd()}>+ Add User</Button>
          </div>
        </div>
        <ScrollArea style={{ flex: 1 }}>
          <Table highlightOnHover verticalSpacing="sm">
            <thead>
              <tr style={{ background: headerBg }}>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Name</th>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Email</th>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Roles</th>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Last Active</th>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </Table>
        </ScrollArea>
      </div>
      {/* Confirmation modal for delete */}
      <Modal opened={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm delete">
        <div style={{ marginBottom: 16 }}>
          Are you sure you want to delete user{" "}
          <strong>{deletingUser ? titleCase(deletingUser.name) : ""}</strong>?
        </div>
        <div style={{ textAlign: "right" }}>
          <Button
            variant="default"
            onClick={() => setConfirmOpen(false)}
            style={{ marginRight: 8 }}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={async () => {
              if (!deletingUser) return;
              try {
                const resp = await fetch(
                  `${(import.meta as any).env?.VITE_API_BASE || "http://localhost:4000"}/users/${deletingUser.id}`,
                  {
                    method: "DELETE",
                    credentials: "include",
                  }
                );
                if (!resp.ok) throw new Error(`Delete failed (${resp.status})`);
                if (onDelete) onDelete(deletingUser.id);
                // success notification
                try {
                  showNotification({
                    title: "User deleted",
                    message: `${titleCase(deletingUser.name)} was deleted`,
                    color: "green",
                  });
                } catch (_) {}
                setConfirmOpen(false);
                setDeletingUser(null);
              } catch (err) {
                try {
                  const b = await (err instanceof Response ? err.json() : Promise.resolve({}));
                  // eslint-disable-next-line no-console
                  console.error("Delete user error", err, b);
                } catch (_) {}
                // show a notification for errors
                try {
                  showNotification({
                    title: "Delete failed",
                    message: "Failed to delete user",
                    color: "red",
                  });
                } catch (_) {}
                setConfirmOpen(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
