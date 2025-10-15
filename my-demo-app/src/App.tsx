import { AppShell, Burger, Group, Button, Text, Avatar } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { IconGauge, IconShoppingCart, IconSettings } from '@tabler/icons-react';
import { currentUser, logout, userHasPermission, PERM_MANAGE } from './lib/auth.service';

function App() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const user = currentUser();

  function doLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <AppShell style={{ minHeight: '100vh' }}
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" style={{ justifyContent: 'space-between' }}>
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text>Header has a burger icon below sm breakpoint</Text>
          </Group>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {user && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Avatar radius="xl" size={24}>
                  {(user.name || '').charAt(0).toUpperCase()}
                </Avatar>
                <Text size="sm">{user.name}</Text>
              </div>
            )}
            <Button variant="outline" size="xs" onClick={doLogout}>Logout</Button>
          </div>
        </Group>
      </AppShell.Header>
        <AppShell.Navbar p="md">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <NavLink to="/" end style={({ isActive }: { isActive: boolean }) => ({ fontWeight: isActive ? 700 : 500, display: 'flex', gap: 8, alignItems: 'center' })}>
              <IconGauge size={16} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/shopping" style={({ isActive }: { isActive: boolean }) => ({ fontWeight: isActive ? 700 : 500, display: 'flex', gap: 8, alignItems: 'center' })}>
              <IconShoppingCart size={16} />
              <span>Shopping</span>
            </NavLink>
            {userHasPermission(user, PERM_MANAGE) && (
              <NavLink to="/manage" style={({ isActive }: { isActive: boolean }) => ({ fontWeight: isActive ? 700 : 500, display: 'flex', gap: 8, alignItems: 'center' })}>
                <IconSettings size={16} />
                <span>Manage</span>
              </NavLink>
            )}
          </nav>
        </AppShell.Navbar>
        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
    </AppShell>
  );
}
export default App;