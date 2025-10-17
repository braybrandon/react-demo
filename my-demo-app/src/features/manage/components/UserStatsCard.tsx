import { Card, Text, Badge, ThemeIcon } from "@mantine/core";
import CornerRibbon from "../../../components/CornerRibbon";

export default function UserStatsCard({ users }: { users: any[] }) {
  const total = users?.length || 0;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeIcon radius="md" size="lg" color="blue" variant="light">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1e40af"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </ThemeIcon>
          <div>
            <Text style={{ fontSize: 12 }} color="dimmed">
              Total Users
            </Text>
            <Text style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
              {total.toLocaleString()}
            </Text>
          </div>
        </div>
        <div>
          <Badge color="teal" variant="light">
            +12%
          </Badge>
        </div>
      </div>
    </Card>
  );
}
