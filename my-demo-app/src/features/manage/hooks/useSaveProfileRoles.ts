import { useState } from "react";
import { addRoleToUser, removeRoleFromUser } from "../../../lib/role.api";
import { showNotification } from "@mantine/notifications";

type OnSaveFn =
  | ((patch: { name?: string; email?: string; status?: string }) => Promise<void>)
  | undefined;

export function useSaveProfileRoles(params: {
  userId: number | string;
  onSave?: OnSaveFn;
  selectedRoles: string[];
  initialRoles: string[];
  rolesOptions: { label: string; value: string }[];
  setInitialRoles: (v: string[]) => void;
}) {
  const { userId, onSave, selectedRoles, initialRoles, rolesOptions, setInitialRoles } = params;
  const [saving, setSaving] = useState(false);

  const handleSave = async (
    profileChanged: boolean,
    profilePatch?: { name?: string; email?: string; status?: string }
  ) => {
    setSaving(true);
    try {
      if (profileChanged) {
        if (!onSave) throw new Error("Save handler not provided");
        await onSave(profilePatch || {});
        showNotification({ title: "Saved", message: "User updated", color: "green" });
      }

      // Sync roles
      const orig = initialRoles;
      const added = (selectedRoles || []).filter((r: string) => !orig.includes(r));
      const removed = orig.filter((r: string) => !(selectedRoles || []).includes(r));
      let roleSyncFailed = false;

      for (const a of added) {
        const rid = Number(a);
        if (Number.isNaN(rid)) continue;
        try {
          await addRoleToUser(userId, rid);
          const label = rolesOptions.find((x) => x.value === String(rid))?.label ?? String(rid);
          showNotification({
            title: "Role added",
            message: `${label} assigned to user`,
            color: "green",
          });
        } catch (err: any) {
          roleSyncFailed = true;
          showNotification({
            title: "Role add failed",
            message: String(err?.message || err),
            color: "red",
          });
        }
      }

      for (const r of removed) {
        const rid = Number(r);
        if (Number.isNaN(rid)) continue;
        try {
          await removeRoleFromUser(userId, rid);
          const label = rolesOptions.find((x) => x.value === String(rid))?.label ?? String(rid);
          showNotification({
            title: "Role removed",
            message: `${label} removed from user`,
            color: "green",
          });
        } catch (err: any) {
          roleSyncFailed = true;
          showNotification({
            title: "Role remove failed",
            message: String(err?.message || err),
            color: "red",
          });
        }
      }

      if (!roleSyncFailed) {
        setInitialRoles([...selectedRoles]);
      }
    } finally {
      setSaving(false);
    }
  };

  return { saving, handleSave } as const;
}
