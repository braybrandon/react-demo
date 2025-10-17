import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Paper, Button, Text, Title, TextInput, PasswordInput } from "@mantine/core";
import { fetchCurrentUser, logout } from "../lib/auth.service";

export default function ChangePassword() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const me = await fetchCurrentUser();
      if (me && me.email) setEmail(me.email);
    })();
  }, []);

  async function submit(e?: any) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(
        `${(import.meta as any).env.VITE_API_BASE || "http://localhost:4000"}/auth/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email,
            currentPassword: currentPassword || undefined,
            newPassword,
          }),
        }
      );
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `Change password failed (${resp.status})`);
      }
      try {
        logout();
      } catch {}
      // pass a small state flag so the login page can show a success notification
      navigate("/login", { replace: true, state: { passwordChanged: true } });
    } catch (err: any) {
      setError(err.message || "Change password failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Paper shadow="md" radius="md" p="xl" style={{ width: 520 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Title order={2}>Change Password</Title>
          <form onSubmit={submit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <TextInput
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
              />
              <PasswordInput
                label="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.currentTarget.value)}
              />
              <PasswordInput
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.currentTarget.value)}
                required
              />
              {error && <Text color="red">{error}</Text>}
              <Button type="submit" loading={loading}>
                Change Password
              </Button>
            </div>
          </form>
          <Text style={{ textAlign: "center" }}>You must change your password to continue.</Text>
        </div>
      </Paper>
    </div>
  );
}
