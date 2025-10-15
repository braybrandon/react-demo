import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Paper, Button, Text, Title, TextInput, PasswordInput } from '@mantine/core';
import { login } from '../lib/auth.service';

// simple local login form (mock credentials)

export default function Login() {
  const [email, setEmail] = useState('bbray@example.com');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location: any = useLocation();
  const from = location.state?.from?.pathname || '/';

  async function submit(e: any) {
    e?.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper shadow="md" radius="md" p="xl" style={{ width: 420 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Title order={2}>Sign in</Title>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <TextInput label="Email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} required />
              <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} required />
              {error && <Text color="red">{error}</Text>}
              <Button type="submit">Sign in</Button>
            </div>
          </form>
          <Text style={{ textAlign: 'center' }}>Local mock login</Text>
        </div>
      </Paper>
    </div>
  );
}
