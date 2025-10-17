import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Paper, Button, Text, Title, TextInput, PasswordInput } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useEffect, useRef } from "react";
import { login, fetchCurrentUser } from "../lib/auth.service";

// simple local login form (mock credentials)

export default function Login() {
  const [email, setEmail] = useState("bbray@example.com");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location: any = useLocation();
  const from = location.state?.from?.pathname || "/";

  const shownRef = useRef(false);

  useEffect(() => {
    if (location.state?.passwordChanged && !shownRef.current) {
      shownRef.current = true;
      showNotification({
        title: "Password changed",
        message: "Please sign in with your new password.",
        color: "green",
      });
      // Clear the state so the notification is only shown once (avoids double notifications in StrictMode / re-mounts)
      try {
        navigate(location.pathname, { replace: true, state: undefined });
      } catch {}
    }
  }, [location.state]);

  async function submit(e: any) {
    e?.preventDefault();
    setError(null);
    try {
      await login(email, password);
      // After login, fetch current user to inspect mustChangePassword flag
      const me = await fetchCurrentUser();
      if (me && (me as any).mustChangePassword) {
        navigate("/change-password", { replace: true, state: { from } });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
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
      <Paper shadow="md" radius="md" p="xl" style={{ width: 420 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Title order={2}>Sign in</Title>
          <form onSubmit={submit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <TextInput
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
              />
              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
              {error && <Text color="red">{error}</Text>}
              <Button type="submit">Sign in</Button>
              <Button
                variant="subtle"
                onClick={() => navigate("/change-password")}
                style={{ marginTop: 8 }}
                styles={(theme: any) => ({
                  root: {
                    background: "transparent",
                    border: "none",
                    paddingTop: 8,
                    paddingBottom: 8,
                    "&:hover": {
                      background: "transparent",
                      border: "none",
                      color:
                        (theme.colors && theme.colors.blue && theme.colors.blue[9]) || undefined,
                    },
                  },
                })}
              >
                Change password
              </Button>
            </div>
          </form>
        </div>
      </Paper>
    </div>
  );
}
