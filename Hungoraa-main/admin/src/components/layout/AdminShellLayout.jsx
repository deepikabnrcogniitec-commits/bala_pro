import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  AppShell, Group, Text, Avatar, Menu, ActionIcon, Burger, ScrollArea,
  Badge, Indicator, Divider, Stack, UnstyledButton, Box, Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard, IconUsers, IconBuildingStore, IconCalendar,
  IconStar, IconCurrencyRupee, IconBell, IconChartBar, IconSettings,
  IconLogout, IconChevronRight, IconMessage, IconCoin, IconBuildingBank,
  IconTag, IconChecklist,
} from '@tabler/icons-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api';
import logo from '../../assets/hungora-logo.png';

const NAV_ITEMS = [
  { path: '/dashboard', icon: IconLayoutDashboard, label: 'Dashboard' },
  { path: '/users', icon: IconUsers, label: 'Users' },
  { path: '/restaurants', icon: IconBuildingStore, label: 'Restaurants' },
  { path: '/bookings', icon: IconCalendar, label: 'Bookings' },
  { path: '/reviews', icon: IconStar, label: 'Reviews' },
  { path: '/offers', icon: IconTag, label: 'Offers', end: true },
  { path: '/offers/approval', icon: IconChecklist, label: 'Offer Approval' },
  { divider: true, label: 'Finance' },
  { path: '/payments', icon: IconCurrencyRupee, label: 'Payments' },
  { path: '/commissions', icon: IconCoin, label: 'Commissions' },
  { path: '/settlements', icon: IconBuildingBank, label: 'Settlements' },
  { divider: true, label: 'System' },
  { path: '/notifications', icon: IconBell, label: 'Notifications' },
  { path: '/reports', icon: IconChartBar, label: 'Reports' },
  { path: '/settings', icon: IconSettings, label: 'Settings' },
];

export default function AdminShellLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout(refreshToken); } catch {}
    logout();
    navigate('/login');
  };

  const NavItem = ({ path, icon: Icon, label, badge, end }) => (
    <NavLink to={path} end={end} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <UnstyledButton
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 10,
            backgroundColor: isActive ? 'rgba(249, 169, 27, 0.14)' : 'transparent',
            border: `1px solid ${isActive ? 'rgba(249, 169, 27, 0.32)' : 'transparent'}`,
            backdropFilter: isActive ? 'blur(8px)' : 'none',
            color: isActive ? '#f9a91b' : '#a9b1c4',
            fontWeight: isActive ? 600 : 400,
            width: '100%', transition: 'all 0.15s',
          }}
        >
          <Icon size={18} style={{ minWidth: 18 }} />
          <Text size="sm" style={{ flex: 1 }}>{label}</Text>
          {badge && <Badge size="xs" color="red" variant="filled">{badge}</Badge>}
        </UnstyledButton>
      )}
    </NavLink>
  );

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={10}>
              <img src={logo} alt="Hungora" style={{ height: 34, width: 'auto' }} />
              <Badge variant="light" color="gold" size="sm">Admin</Badge>
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
                    <Avatar src={user?.avatar?.url} color="gold" radius="xl" size={32}>
                      {user?.name?.charAt(0)}
                    </Avatar>
                    <Box visibleFrom="sm">
                      <Text size="sm" fw={600}>{user?.name}</Text>
                      <Text size="xs" c="dimmed">Administrator</Text>
                    </Box>
                    <IconChevronRight size={14} style={{ color: '#6e7994' }} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Admin Account</Menu.Label>
                <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => navigate('/settings')}>
                  Settings
                </Menu.Item>
                <Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                  Log Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={4}>
            {NAV_ITEMS.map((item) =>
              item.divider ? (
                <Box key={item.label} px="sm" pt="sm" pb={2}>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.8px' }}>
                    {item.label}
                  </Text>
                </Box>
              ) : (
                <NavItem key={item.path} {...item} />
              )
            )}
          </Stack>
        </AppShell.Section>
        <AppShell.Section>
          <Divider mb="sm" />
          <Box px="sm" pb="sm">
            <Text size="xs" c="dimmed">Hungora Admin v1.0</Text>
          </Box>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
