import { Card, Text, Button } from "@mantine/core";
import CornerRibbon from "../../../components/CornerRibbon";

export default function QuickAccessMatrixCard() {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        width: "100%",
        background: "linear-gradient(90deg,#6d28d9,#a855f7)",
        color: "white",
      }}
    >
      <CornerRibbon text="Coming soon" color="#7c3aed" position="top-left" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Text style={{ fontSize: 16, fontWeight: 700, color: "white" }}>Quick Access</Text>
          <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>
            Jump to permissions matrix for detailed role management
          </Text>
        </div>
        <div>
          <Button
            radius="md"
            color="white"
            variant="filled"
            style={{ background: "white", color: "#6d28d9" }}
          >
            Open Matrix
          </Button>
        </div>
      </div>
    </Card>
  );
}
