import { useEffect, useState } from 'react';
import { Title, Text, Button, Loader } from '@mantine/core';
import UserList from '../../manage/components/UserList';
import FeaturesList from '../../manage/components/FeaturesList';

type ApiUser = {
  id: number;
  name: string;
  email?: string;
  roles?: any[];
};

export default function Manage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${(import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'}/users`, { credentials: 'include' });
      if (!resp.ok) {
        const b = await resp.json().catch(() => ({}));
        throw new Error((b && b.error) || `Failed to fetch users (${resp.status})`);
      }
      const data = await resp.json();
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title order={2}>Manage</Title>
        </div>
        <div>
          <Button onClick={fetchUsers} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <Loader />
        ) : error ? (
          <Text color="red">{error}</Text>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
            <UserList users={users} />
            <FeaturesList />
          </div>
        )}
      </div>
    </div>
  );
}
