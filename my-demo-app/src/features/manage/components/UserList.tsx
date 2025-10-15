// component-only file; React import not required with newer JSX runtimes
import { Table, ScrollArea, Card, Button, Group, useMantineTheme, useMantineColorScheme } from '@mantine/core';
import { titleCase } from '../../../lib/string.service';

type Role = { name: string };

type ApiUser = {
  id: number;
  name: string;
  email?: string;
  roles?: Role[];
};

export default function UserList({ users }: { users: ApiUser[] }) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const headerBg = colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[2];
  const zebraBg = colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0];

  

  const rows = users.map((u, i) => (
    <tr key={u.id} style={{ background: i % 2 === 0 ? 'transparent' : zebraBg }}>
      <td style={{ textAlign: 'left', padding: '1rem' }}>{u.id}</td>
      <td style={{ textAlign: 'left', padding: '1rem' }}>{titleCase(u.name)}</td>
      <td style={{ textAlign: 'left', padding: '1rem' }}>{u.email}</td>
      <td style={{ textAlign: 'left', padding: '1rem' }}>{(u.roles || []).map((r) => r.name).join(', ')}</td>
      <td style={{ textAlign: 'left', padding: '1rem' }}>
        <Group gap="xs">
          <Button size="xs" variant="outline">Edit</Button>
        </Group>
      </td>
    </tr>
  ));

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderRadius: (theme as any).radius?.md || 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <ScrollArea style={{ flex: 1 }}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <thead>
              <tr style={{ background: headerBg }}>
                <th style={{ textAlign: 'left', padding: '1rem' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '1rem' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '1rem' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '1rem' }}>Roles</th>
                <th style={{ textAlign: 'left', padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </Table>
        </ScrollArea>
      </div>
    </Card>
  );
}
