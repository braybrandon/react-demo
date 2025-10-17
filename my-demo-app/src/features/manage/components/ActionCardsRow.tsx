import { Card, Text, Button, ThemeIcon } from "@mantine/core";
import { IconGridDots, IconUserPlus, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import CornerRibbon from "../../../components/CornerRibbon";

function ActionCard({ title, subtitle, buttonText, color, icon, onClick }: any) {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ minHeight: 140, display: "flex", alignItems: "stretch" }}
    >
      <CornerRibbon text="Coming soon" color="#7c3aed" position="top-left" />
      <div
        style={{
          display: "flex",
          gap: 14,
          flexDirection: "column",
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        <ThemeIcon color={color} radius="md" size={44} variant="light" style={{ flex: "0 0 44px" }}>
          {icon}
        </ThemeIcon>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Text fw={700} size="md">
              {title}
            </Text>
            <Text size="sm" color="dimmed" style={{ marginTop: 6 }}>
              {subtitle}
            </Text>
          </div>
        </div>

        <Button
          fullWidth
          radius="xl"
          variant="filled"
          color={color}
          style={{ height: 36 }}
          onClick={onClick}
        >
          {buttonText}
        </Button>
      </div>
    </Card>
  );
}

export default function ActionCardsRow() {
  const navigate = useNavigate();
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, 1fr)", marginTop: 12 }}>
      <ActionCard
        title="Open Permissions Matrix"
        subtitle="View and manage detailed role permissions in matrix format"
        buttonText="Open Matrix"
        color="violet"
        icon={<IconGridDots size={18} />}
        onClick={() => navigate("/manage/matrix")}
      />
      <ActionCard
        title="Edit Users"
        subtitle="Add or update team members and assign appropriate roles"
        buttonText="Edit Users"
        color="green"
        icon={<IconUserPlus size={18} />}
        onClick={() => navigate("/manage/users")}
      />
      <ActionCard
        title="Edit Roles"
        subtitle="Define and adjust roles with custom permission sets"
        buttonText="Edit Roles"
        color="violet"
        icon={<IconPlus size={18} />}
        onClick={() => navigate("/manage/roles")}
      />
    </div>
  );
}
