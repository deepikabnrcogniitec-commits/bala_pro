import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  AppShell, Group, Text, Avatar, Menu, ActionIcon, Burger, ScrollArea,
  Badge, Indicator, rem, Divider, Stack, UnstyledButton, Box, Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconLayoutDashboard, IconCalendar, IconMenu2, IconBuildingStore,
  IconTable, IconTag, IconStar, IconChartBar, IconLogout, IconBell,
  IconChevronRight, IconSettings, IconReceipt,
} from '@tabler/icons-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api';
import logo from '../../assets/logo.svg';

const NAV_ITEMS = [
  { path: '/dashboard', icon: IconLayoutDashboard, label: 'Dashboard' },
  { path: '/restaurants', icon: IconBuildingStore, label: 'Restaurants' },
  { path: '/bookings', icon: IconCalendar, label: 'Bookings', badge: 'Live' },
  { path: '/menu', icon: IconMenu2, label: 'Menu' },
  { path: '/tables', icon: IconTable, label: 'Tables' },
  { path: '/offers', icon: IconTag, label: 'Offers' },
  { path: '/reviews', icon: IconStar, label: 'Reviews' },
  { path: '/invoices', icon: IconReceipt, label: 'Invoices' },
  { path: '/reports', icon: IconChartBar, label: 'Reports' },
];

export default function AppShellLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout(refreshToken); } catch {}
    logout();
    navigate('/login');
  };

  const NavItem = ({ path, icon: Icon, label, badge }) => (
    <Tooltip label={label} position="right" withArrow disabled={opened}>
      <NavLink to={path} style={{ textDecoration: 'none' }}>
        {({ isActive }) => (
          <UnstyledButton
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: isActive ? '#eaf1f7' : 'transparent',
              color: isActive ? '#0c2f4e' : '#495057',
              fontWeight: isActive ? 600 : 400,
              width: '100%',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={18} style={{ minWidth: 18 }} />
            <Text size="sm" style={{ flex: 1 }}>{label}</Text>
            {badge && (
              <Badge size="xs" color="red" variant="filled">{badge}</Badge>
            )}
          </UnstyledButton>
        )}
      </NavLink>
    </Tooltip>
  );

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={8}>
              <img src={logo} alt="Hungora" style={{ width: 30, height: 30, borderRadius: 8 }} />
              <Text fw={700} size="lg" c="brand">Hungora</Text>
              <Badge variant="light" color="gray" size="sm">Owner</Badge>
            </Group>
          </Group>

          <Group gap="sm">
            <Indicator color="red" size={8}>
              <ActionIcon variant="subtle" color="gray" size="lg">
                <IconBell size={18} />
              </ActionIcon>
            </Indicator>

            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap={8}>
                    <Avatar
                      src={user?.avatar?.url}
                      color="red"
                      radius="xl"
                      size={32}
                    >
                      {user?.name?.charAt(0)}
                    </Avatar>
                    <Box visibleFrom="sm">
                      <Text size="sm" fw={600}>{user?.name}</Text>
                      <Text size="xs" c="dimmed">{user?.role}</Text>
                    </Box>
                    <IconChevronRight size={14} style={{ color: '#868e96' }} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item leftSection={<IconSettings size={14} />}>Settings</Menu.Item>
                <Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                  Log Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Navbar */}
      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={4}>
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Divider mb="sm" />
          <Box px="sm" pb="sm">
            <Text size="xs" c="dimmed" mb={4}>Logged in as</Text>
            <Text size="sm" fw={600}>{user?.name}</Text>
            <Text size="xs" c="dimmed">{user?.email}</Text>
          </Box>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
