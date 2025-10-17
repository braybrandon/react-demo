import { Card, Text, Badge, ThemeIcon, Loader } from "@mantine/core";
import { useEffect, useState } from "react";
import CornerRibbon from "../../../components/CornerRibbon";

export default function RoleStatsCard() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchRoles() {
    setLoading(true);
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000";
      const resp = await fetch(`${API_BASE}/roles`, { credentials: "include" });
      if (!resp.ok) {
        setCount(0);
        return;
      }
      const data = await resp.json();
      setCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeIcon radius="md" size="lg" color="violet" variant="light">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b21a8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            </svg>
          </ThemeIcon>
          <div>
            <Text style={{ fontSize: 12 }} color="dimmed">
              Total Roles
            </Text>
            <Text style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
              {loading ? <Loader size="sm" /> : (count ?? 0)}
            </Text>
          </div>
        </div>
        <div>
          <Badge color="blue" variant="light">
            +3
          </Badge>
        </div>
      </div>
    </Card>
  );
}
