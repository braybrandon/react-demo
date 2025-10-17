import type { ReactNode } from "react";
import { Group, Button, Title, Text, Avatar } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

type MainBodyWrapperProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  avatarText?: string;
  children?: ReactNode;
};

export default function MainBodyWrapper({
  title,
  subtitle,
  onBack,
  avatarText,
  children,
}: MainBodyWrapperProps) {
  return (
    <>
      <div style={{ padding: "2rem" }}>
        <Group align="flex-start" style={{ marginBottom: 12, gap: 12, alignItems: "center" }}>
          {onBack && (
            <Button
              style={{
                padding: 0,
                height: "fit-content",
                minWidth: "auto",
                width: "auto",
                border: 0,
              }}
              variant="subtle"
              onClick={onBack}
              size="xs"
            >
              <IconArrowLeft size={18} style={{ padding: 0, margin: 0, display: "block" }} />
            </Button>
          )}
          <div>
            <Title order={3} style={{ margin: 0 }}>
              {title}
            </Title>
            {subtitle && (
              <Text color="dimmed" size="sm">
                {subtitle}
              </Text>
            )}
          </div>
          {avatarText && (
            <div style={{ marginLeft: "auto" }}>
              <Avatar radius="xl" size={40}>
                {avatarText.charAt(0).toUpperCase()}
              </Avatar>
            </div>
          )}
        </Group>
        {children}
      </div>
    </>
  );
}
