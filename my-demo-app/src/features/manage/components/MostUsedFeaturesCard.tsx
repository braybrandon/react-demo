import { Card, Text, Progress } from "@mantine/core";
import CornerRibbon from "../../../components/CornerRibbon";

export default function MostUsedFeaturesCard() {
  const features = [
    { name: "Document Management", pct: 89, color: "#2563eb" },
    { name: "User Management", pct: 76, color: "#16a34a" },
    { name: "Analytics", pct: 64, color: "#8b5cf6" },
    { name: "Settings", pct: 52, color: "#f97316" },
  ];

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ width: "100%" }}>
      <CornerRibbon text="Coming soon" color="#7c3aed" position="top-left" />
      <Text style={{ fontSize: 16, fontWeight: 700 }}>Most-used Features</Text>
      <Text style={{ fontSize: 12, color: "var(--mantine-color-dimmed)" }}>
        Popular features by usage
      </Text>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {features.map((f) => (
          <div key={f.name}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 14 }}>{f.name}</Text>
              <Text style={{ fontSize: 12, color: "var(--mantine-color-dimmed)" }}>{f.pct}%</Text>
            </div>
            <Progress value={f.pct} color={f.color} size="lg" />
          </div>
        ))}
      </div>
    </Card>
  );
}
