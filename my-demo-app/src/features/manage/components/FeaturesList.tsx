import { useEffect, useState } from 'react';
import { Card, ScrollArea, Table, Text, Loader, useMantineTheme, useMantineColorScheme } from '@mantine/core';

type Feature = {
  id: number;
  key: string;
  name?: string;
  description?: string;
};

export default function FeaturesList() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const headerBg = colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[2];
  const zebraBg = colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0];

  async function fetchFeatures() {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';
      const resp = await fetch(`${API_BASE}/features`, { credentials: 'include' });
      if (!resp.ok) {
        const b = await resp.json().catch(() => ({}));
        throw new Error((b && b.error) || `Failed to fetch features (${resp.status})`);
      }
      const data = await resp.json();
      setFeatures(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch features');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeatures();
  }, []);

  const rows = features.map((f, i) => (
    <tr key={f.id} style={{ background: i % 2 === 0 ? 'transparent' : zebraBg }}>
      <td style={{ padding: '0.75rem' }}>{f.id}</td>
      <td style={{ padding: '0.75rem' }}>{f.key}</td>
      <td style={{ padding: '0.75rem' }}>{f.name || ''}</td>
      <td style={{ padding: '0.75rem' }}>{f.description || ''}</td>
    </tr>
  ));

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ width: '100%', marginTop: 16 }}>
      {loading ? (
        <Loader />
      ) : error ? (
        <Text color="red">{error}</Text>
      ) : (
        <div style={{ borderRadius: (theme as any).radius?.md || 8, overflow: 'hidden' }}>
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="sm">
              <thead>
                <tr style={{ background: headerBg }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Key</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Description</th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </Table>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}
