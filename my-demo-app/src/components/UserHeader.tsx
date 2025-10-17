import type { ReactNode } from "react";
import { Avatar, Text, Badge } from "@mantine/core";
import { titleCase } from "../lib/string.service";

type UserHeaderProps = {
  user: {
    name?: string;
    email?: string;
    status?: string;
    derivedStatus?: string;
    lastLogin?: string | null;
  } | null;
  className?: string;
  children?: ReactNode;
};

export default function UserHeader({ user, className }: UserHeaderProps) {
  return (
    <div className={className} style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Avatar radius="xl" size={64}>
        {(titleCase(user?.name) || "").charAt(0).toUpperCase()}
      </Avatar>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Text fw={700} size="lg" style={{ margin: 0 }}>
          {titleCase(user?.name) || "User"}
        </Text>
        <Text size="sm" color="dimmed" style={{ marginTop: -8 }}>
          {user?.email || "user@user.com"}
        </Text>
        {(() => {
          const derived =
            (user as any)?.derivedStatus || ((user as any)?.status || "").toLowerCase();
          let status: "active" | "archived" | "inactive" = "active";
          if (derived === "archived") status = "archived";
          else if (derived === "inactive") status = "inactive";
          else if (derived === "active") status = "active";
          else {
            // fallback compute from lastLogin (inactive if > 7 days)
            const last = (user as any)?.lastLogin;
            if (last) {
              try {
                const d = new Date(String(last));
                if (d < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) status = "inactive";
              } catch {}
            }
          }

          const color = status === "active" ? "green" : status === "archived" ? "red" : "orange";
          const label = status.charAt(0).toUpperCase() + status.slice(1);
          return (
            <Badge
              color={color}
              variant="filled"
              size="xs"
              style={{ height: 14, padding: "0 6px", width: "fit-content", margin: 0, fontSize: 8 }}
            >
              {label}
            </Badge>
          );
        })()}
      </div>
    </div>
  );
}
