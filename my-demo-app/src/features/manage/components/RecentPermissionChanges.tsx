import { Card, Text, Group, Avatar, Badge, Loader } from "@mantine/core";
import CornerRibbon from "../../../components/CornerRibbon";
import { useEffect, useState } from "react";

const API_BASE = (import.meta as any).env.VITE_API_BASE || "http://localhost:4000";

type AuditRow = {
  id: number;
  actorId?: number | null;
  actorName?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  details?: any;
  createdAt: string;
};

function timeAgo(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch (e) {
    return iso;
  }
}

export default function RecentPermissionChanges() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/audit?limit=3`, { credentials: "include" });
        if (!mounted) return;
        if (!resp.ok) {
          setRows([]);
          return;
        }
        const data = (await resp.json()) as AuditRow[];
        if (mounted) setRows(data || []);
      } catch (e) {
        if (mounted) setRows([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <Text style={{ fontWeight: 700 }}>Recent Permission Changes</Text>
          <Text size="sm" color="dimmed">
            Latest updates to user permissions and roles
          </Text>
        </div>
        <Badge variant="outline">View All</Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows === null ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Loader size="sm" />
          </div>
        ) : rows.length === 0 ? (
          <Text color="dimmed">No recent changes</Text>
        ) : (
          rows.map((r) => {
            // Build a human-friendly title from the audit row
            let title = r.details?.summary;

            const color =
              r.action === "DELETE" || r.action === "UNASSIGN"
                ? "red"
                : r.action === "CREATE"
                  ? "blue"
                  : "teal";

            return (
              <Card
                key={r.id}
                radius="md"
                padding="md"
                withBorder
                style={{ background: "transparent" }}
              >
                <Group style={{ flexWrap: "nowrap" }}>
                  <Avatar size={40} src={undefined} alt={r.actorName || "actor"} />
                  <div style={{ flex: 1 }}>
                    <Text size="sm">{title}</Text>
                    <Text size="xs" color="dimmed">
                      {timeAgo(r.createdAt)}
                      {r.actorName ? ` by ${r.actorName}` : ""}
                    </Text>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: 8, background: color }} />
                </Group>
              </Card>
            );
          })
        )}
      </div>
    </Card>
  );
}
