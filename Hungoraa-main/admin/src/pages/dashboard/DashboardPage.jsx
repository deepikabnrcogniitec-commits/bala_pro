import { useState } from 'react';
import {
  Stack, Title, Group, Select, Card, Text, SimpleGrid, Grid, Box,
  Table, Badge, Avatar, Skeleton, ThemeIcon, rem,
} from '@mantine/core';
import {
  IconUsers, IconBuildingStore, IconCalendar, IconCurrencyRupee,
  IconTrendingUp, IconTrendingDown, IconClock, IconCheck,
} from '@tabler/icons-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { adminApi, restaurantApi } from '../../api';

const COLORS = ['#cd302b', '#2d6a4f', '#2a628f', '#f9a91b'];

const CHART_TOOLTIP_STYLE = {
  background: '#0c2f4e',
  border: '1px solid #123f66',
  borderRadius: 8,
  color: '#f6f4ee',
};


function StatCard({ title, value, icon: Icon, color, change, prefix = '' }) {
  const isPositive = change >= 0;
  return (
    <Card withBorder radius="md" p="lg" style={{ borderTop: `3px solid ${color}` }}>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{title}</Text>
          <Text size="xl" fw={800} style={{ fontSize: rem(26) }}>
            {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </Text>
          {change !== undefined && (
            <Group gap={4}>
              {isPositive ? <IconTrendingUp size={13} color="#2d6a4f" /> : <IconTrendingDown size={13} color="#cd302b" />}
              <Text size="xs" c={isPositive ? 'green' : 'red'} fw={600}>
                {isPositive ? '+' : ''}{change}% vs yesterday
              </Text>
            </Group>
          )}
        </Stack>
        <Box style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={color} />
        </Box>
      </Group>
    </Card>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('14');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard().then((r) => r.data.data),
  });

  const s = stats || {};

  const bookingStatus = [
    { name: 'Completed', value: 68 },
    { name: 'Cancelled', value: 12 },
    { name: 'Confirmed', value: 15 },
    { name: 'Pending', value: 5 },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={2}>
          <Title order={2}>Admin Dashboard</Title>
          <Text c="dimmed" size="sm">Platform-wide overview</Text>
        </Stack>
        <Select
          value={period}
          onChange={setPeriod}
          data={[
            { value: '7', label: 'Last 7 days' },
            { value: '14', label: 'Last 14 days' },
            { value: '30', label: 'Last 30 days' },
          ]}
          size="sm"
          style={{ width: 150 }}
        />
      </Group>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {isLoading ? (
          [1,2,3,4].map((i) => <Skeleton key={i} height={110} radius="md" />)
        ) : (
          <>
            <StatCard title="Total Users" value={s.totalUsers} icon={IconUsers} color="#2a628f" change={5.2} />
            <StatCard title="Restaurants" value={s.totalRestaurants} icon={IconBuildingStore} color="#2d6a4f" change={3.1} />
            <StatCard title="Total Bookings" value={s.totalBookings} icon={IconCalendar} color="#cd302b" change={8.4} />
            <StatCard title="Platform Revenue" value={s.totalRevenue} icon={IconCurrencyRupee} color="#f9a91b" change={12.8} prefix="₹" />
          </>
        )}
      </SimpleGrid>

      {/* Today Highlights */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        {[
          { label: "New Users Today", value: s.newUsersToday, color: '#2a628f' },
          { label: "Today's Bookings", value: s.todayBookings, color: '#cd302b' },
          { label: "Pending Approvals", value: s.pendingApproval, color: '#f9a91b' },
          { label: "Today's Revenue", value: `₹${(s.todayRevenue || 0).toLocaleString('en-IN')}`, color: '#2d6a4f' },
        ].map(({ label, value, color }) => (
          <Card key={label} withBorder radius="md" p="md" ta="center" style={{ borderTop: `3px solid ${color}` }}>
            <Text size="xl" fw={800} c={color}>{value}</Text>
            <Text size="xs" c="dimmed" mt={4}>{label}</Text>
          </Card>
        ))}
      </SimpleGrid>

      {/* Charts */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} size="lg" mb="lg">Growth Trends</Text>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats?.growthData || []}>
                <defs>
                  <linearGradient id="uGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2a628f" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2a628f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#cd302b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#cd302b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#123f66" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8892a8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#8892a8' }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f6f4ee' }} />
                <Area type="monotone" dataKey="users" stroke="#2a628f" fill="url(#uGrad)" strokeWidth={2} name="New Users" />
                <Area type="monotone" dataKey="bookings" stroke="#cd302b" fill="url(#bGrad)" strokeWidth={2} name="Bookings" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="lg" h="100%">
            <Text fw={700} size="lg" mb="lg">Booking Status</Text>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={bookingStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {bookingStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f6f4ee' }} />
              </PieChart>
            </ResponsiveContainer>
            <Stack gap={6} mt="sm">
              {bookingStatus.map((s, i) => (
                <Group key={s.name} justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                    <Text size="xs" c="dimmed">{s.name}</Text>
                  </Group>
                  <Text size="xs" fw={700}>{s.value}%</Text>
                </Group>
              ))}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Pending Restaurant Approvals */}
      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <Text fw={700} size="lg">Pending Restaurant Approvals</Text>
            <Badge color="orange" size="sm">{s.pendingApproval || 0}</Badge>
          </Group>
        </Group>
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead style={{ background: '#123f66' }}>
            <Table.Tr>
              <Table.Th>Restaurant</Table.Th>
              <Table.Th>Owner</Table.Th>
              <Table.Th>City</Table.Th>
              <Table.Th>Submitted</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(stats?.pendingRestaurants || []).map((r) => (
              <Table.Tr key={r._id}>
                <Table.Td>
                  <Group gap={8}>
                    <Avatar size="sm" color="red">{r.name.charAt(0)}</Avatar>
                    <Text size="sm" fw={600}>{r.name}</Text>
                  </Group>
                </Table.Td>
                <Table.Td><Text size="sm">{r.owner}</Text></Table.Td>
                <Table.Td><Text size="sm">{r.city || r.address?.city}</Text></Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{new Date(r.createdAt).toLocaleDateString()}</Text></Table.Td>
                <Table.Td><Badge color="yellow" variant="light">Pending</Badge></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}
