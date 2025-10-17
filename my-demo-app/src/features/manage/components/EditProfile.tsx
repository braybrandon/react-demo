import { TextInput, Group, Button, Checkbox, Modal, Text } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import UserStatus from "../../../lib/types";
import { useState, useEffect } from "react";
import RoleMultiSelect from "./RoleMultiSelect";
import { useRoles } from "../hooks/useRoles";
import { useSaveProfileRoles } from "../hooks/useSaveProfileRoles";

type EditProfileProps = {
  user: any | null;
  onSave?: (patch: { name?: string; email?: string; status?: string }) => Promise<void>;
};

export default function EditProfile({ user, onSave }: EditProfileProps) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const mapIncomingStatus = (s: any) => {
    if (!s) return UserStatus.ACTIVE;
    const lower = String(s).toLowerCase();
    if (lower === "inactive") return UserStatus.ACTIVE; // inactive is derived from lastLogin, not persisted
    if (lower === "archived") return UserStatus.ARCHIVED;
    if (lower === "active") return UserStatus.ACTIVE;
    return UserStatus.ACTIVE;
  };

  const [status, setStatus] = useState<string | null>(mapIncomingStatus(user?.status));
  const { rolesOptions, selectedRoles, setSelectedRoles, initialRoles, setInitialRoles } = useRoles(
    user?.roles
  );

  // keep local state in sync when user prop changes
  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setStatus(mapIncomingStatus(user?.status));
    // useRoles hook handles role syncing
  }, [user]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {user && (user as any).mustChangePassword ? (
        <div
          style={{
            padding: 10,
            background: "#fff3cd",
            border: "1px solid #ffeeba",
            borderRadius: 6,
          }}
        >
          This user is required to change their password on next login.
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <TextInput
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
          styles={{ label: { marginBottom: 8 } }}
        />
        <TextInput
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
          styles={{ label: { marginBottom: 8 } }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <TextInput
          label="Last Login"
          value={
            user && (user as any).lastLogin
              ? new Date(String((user as any).lastLogin)).toLocaleString()
              : ""
          }
          disabled
          styles={{ label: { marginBottom: 8 } }}
        />

        <TextInput
          label="Created"
          value={
            user && (user as any).createdAt
              ? new Date(String((user as any).createdAt)).toLocaleString()
              : ""
          }
          disabled
          styles={{ label: { marginBottom: 8 } }}
        />
      </div>

      <RoleMultiSelect data={rolesOptions} value={selectedRoles} onChange={setSelectedRoles} />

      <Checkbox
        label="Archive"
        checked={status === UserStatus.ARCHIVED}
        onChange={(e) =>
          setStatus(e.currentTarget.checked ? UserStatus.ARCHIVED : UserStatus.ACTIVE)
        }
        styles={{ label: { marginBottom: 8 } }}
      />

      <Group style={{ justifyContent: "flex-end" }}>
        <SaveAndResetButtons
          user={user}
          name={name}
          email={email}
          status={status}
          onSave={onSave}
          selectedRoles={selectedRoles}
          initialRoles={initialRoles}
          rolesOptions={rolesOptions}
          setInitialRoles={setInitialRoles}
        />
      </Group>

      {/* Reset modal handled inside SaveAndResetButtons */}
    </div>
  );
}

function SaveAndResetButtons(props: {
  user: any | null;
  name: string;
  email: string;
  status: string | null;
  onSave?: (patch: { name?: string; email?: string; status?: string }) => Promise<void>;
  selectedRoles: string[];
  initialRoles: string[];
  rolesOptions: { label: string; value: string }[];
  setInitialRoles: (v: string[]) => void;
}) {
  const {
    user,
    name,
    email,
    status,
    onSave,
    selectedRoles,
    initialRoles,
    rolesOptions,
    setInitialRoles,
  } = props;
  const profileChanged =
    name !== (user?.name || "") ||
    email !== (user?.email || "") ||
    (status ?? UserStatus.ACTIVE) !==
      (function (s: any) {
        if (!s) return UserStatus.ACTIVE;
        const lower = String(s).toLowerCase();
        if (lower === "inactive") return UserStatus.ACTIVE;
        if (lower === "archived") return UserStatus.ARCHIVED;
        if (lower === "active") return UserStatus.ACTIVE;
        return UserStatus.ACTIVE;
      })(user?.status);

  const rolesChanged =
    JSON.stringify((selectedRoles || []).sort()) !== JSON.stringify((initialRoles || []).sort());
  const changed = profileChanged || rolesChanged;

  const { saving, handleSave } = useSaveProfileRoles({
    userId: user?.id ?? "",
    onSave,
    selectedRoles,
    initialRoles,
    rolesOptions,
    setInitialRoles,
  });

  const [resetting, setResetting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  return (
    <>
      <Button
        color="orange"
        onClick={async () => {
          if (!user) return;
          setResetting(true);
          try {
            const resp = await fetch(
              `${(import.meta as any).env.VITE_API_BASE || "http://localhost:4000"}/users/${user.id}/reset-password`,
              {
                method: "POST",
                credentials: "include",
              }
            );
            if (!resp.ok) {
              const body = await resp.json().catch(() => ({}));
              throw new Error(body?.error || `Reset failed (${resp.status})`);
            }
            const body = await resp.json();
            setGeneratedPassword(body.password);
            setShowResetModal(true);
          } catch (err: any) {
            showNotification({
              title: "Reset failed",
              message: String(err?.message || err),
              color: "red",
            });
          } finally {
            setResetting(false);
          }
        }}
        disabled={resetting}
      >
        Reset Password
      </Button>
      <Button
        style={{ marginLeft: "0.5rem" }}
        onClick={async () => {
          if (!user) return;
          try {
            await handleSave(profileChanged, { name, email, status: status ?? undefined });
          } catch (err: any) {
            showNotification({
              title: "Save failed",
              message: String(err?.message || err),
              color: "red",
            });
          }
        }}
        disabled={!changed || saving}
      >
        Save Changes
      </Button>
      <Modal
        opened={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Password reset"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Text>
            The user's password was reset. Share this temporary password with the user and advise
            them to change it on next login.
          </Text>
          <Text style={{ fontFamily: "monospace", fontSize: 18 }}>{generatedPassword}</Text>
        </div>
      </Modal>
    </>
  );
}
