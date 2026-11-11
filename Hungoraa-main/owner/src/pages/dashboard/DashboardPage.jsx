import { useState, useEffect } from 'react';
import {
  Grid, Card, Text, Title, Group, Stack, Badge, Select, Paper, Box,
  RingProgress, Progress, Table, Avatar, ActionIcon, Skeleton,
  SimpleGrid, ThemeIcon, rem,
} from '@mantine/core';
import {
  IconCalendar, IconCurrencyRupee, IconUsers, IconStar,
  IconTrendingUp, IconTrendingDown, IconArrowRight, IconCheck, IconClock,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { restaurantApi, bookingApi } from '../../api';
import { useAuthStore } from '../../store/authStore';

const STAT_COLORS = ['#e63946', '#2d6a4f', '#457b9d', '#f4a261'];

function StatCard({ title, value, icon: Icon, color, change, prefix = '' }) {
  const isPositive = change >= 0;
  return (
    <Card withBorder radius="md" p="lg" style={{ borderTop: `3px solid ${color}` }}>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>{title}</Text>
          <Text size="xl" fw={800} style={{ fontSize: rem(28) }}>
            {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </Text>
          {change !== undefined && (
            <Group gap={4}>
              {isPositive ? (
                <IconTrendingUp size={14} color="#2d6a4f" />
              ) : (
                <IconTrendingDown size={14} color="#e63946" />
              )}
              <Text size="xs" c={isPositive ? 'green' : 'red'} fw={600}>
                {isPositive ? '+' : ''}{change}% vs last month
              </Text>
            </Group>
          )}
        </Stack>
        <ThemeIcon color={color.replace('#', '')} variant="light" size="xl" radius="md"
          style={{ backgroundColor: `${color}18`, color }}>
          <Icon size={22} />
        </ThemeIcon>
      </Group>
    </Card>
  );
}

const BOOKING_STATUS_COLORS = {
  confirmed: '#2d6a4f',
  pending: '#f4a261',
  completed: '#457b9d',
  cancelled: '#e63946',
  seated: '#6b4fbb',
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [period, setPeriod] = useState('30');

  const { data: restaurants, isLoading: restLoading } = useQuery({
    queryKey: ['my-restaurants'],
    queryFn: () => restaurantApi.getMyRestaurants().then((r) => r.data.data.restaurants),
  });

  useEffect(() => {
    if (restaurants?.[0] && !selectedRestaurant) setSelectedRestaurant(restaurants[0]._id);
  }, [restaurants]);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: () => restaurantApi.getDashboard().then((r) => r.data.data),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['owner-analytics', selectedRestaurant, period],
    queryFn: () => restaurantApi.getAnalytics(selectedRestaurant, period).then((r) => r.data.data),
    enabled: !!selectedRestaurant,
  });

  const { data: todaysData } = useQuery({
    queryKey: ['todays-bookings', selectedRestaurant],
    queryFn: () => bookingApi.getToday(selectedRestaurant).then((r) => r.data.data),
    enabled: !!selectedRestaurant,
    refetchInterval: 30000,
  });

  const restaurantOptions = restaurants?.map((r) => ({ value: r._id, label: r.name })) || [];

  const revenueChartData = analytics?.bookingsByDay?.map((d) => ({
    date: d._id?.slice(5),
    bookings: d.count,
    revenue: d.revenue,
  })) || [];

  const statusData = [
    { name: 'Confirmed', value: todaysData?.summary?.confirmed || 0, color: '#2d6a4f' },
    { name: 'Pending', value: todaysData?.summary?.pending || 0, color: '#f4a261' },
    { name: 'Completed', value: todaysData?.summary?.seated || 0, color: '#457b9d' },
    { name: 'Cancelled', value: todaysData?.summary?.cancelled || 0, color: '#e63946' },
  ];

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Stack gap={2}>
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed" size="sm">
            Welcome back, <strong>{user?.name}</strong>! Here's your overview.
          </Text>
        </Stack>
        <Group gap="sm">
          {restaurants?.length > 1 && (
            <Select
              data={restaurantOptions}
              value={selectedRestaurant}
              onChange={setSelectedRestaurant}
              placeholder="Select Restaurant"
              size="sm"
              style={{ width: 200 }}
            />
          )}
          <Select
            data={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            value={period}
            onChange={setPeriod}
            size="sm"
            style={{ width: 140 }}
          />
        </Group>
      </Group>

      {/* Stats Row */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {dashLoading ? (
          [1,2,3,4].map((i) => <Skeleton key={i} height={120} radius="md" />)
        ) : (
          <>
            <StatCard title="Total Revenue" value={dashboard?.totalRevenue || 0} icon={IconCurrencyRupee} color="#e63946" change={dashboard?.revenueChange} prefix="₹" />
            <StatCard title="Today's Bookings" value={dashboard?.todayBookings || 0} icon={IconCalendar} color="#2d6a4f" change={dashboard?.bookingsChange} />
            <StatCard title="Total Bookings" value={dashboard?.totalBookings || 0} icon={IconUsers} color="#457b9d" />
            <StatCard title="Pending Approval" value={dashboard?.pendingBookings || 0} icon={IconClock} color="#f4a261" />
          </>
        )}
      </SimpleGrid>

      {/* Charts Row */}
      <Grid>
        {/* Revenue Chart */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder radius="md" p="lg">
            <Group justify="space-between" mb="lg">
              <Title order={4}>Revenue & Bookings</Title>
              <Badge variant="light" color="green">Live</Badge>
            </Group>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e63946" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#457b9d" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#457b9d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#e63946" fill="url(#revenueGrad)" strokeWidth={2} name="Revenue (₹)" />
                <Area type="monotone" dataKey="bookings" stroke="#457b9d" fill="url(#bookingGrad)" strokeWidth={2} name="Bookings" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Grid.Col>

        {/* Today's Status */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="lg" h="100%">
            <Title order={4} mb="lg">Today's Status</Title>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Stack gap={6} mt="sm">
              {statusData.map((s) => (
                <Group key={s.name} justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.color }} />
                    <Text size="xs" c="dimmed">{s.name}</Text>
                  </Group>
                  <Text size="xs" fw={700}>{s.value}</Text>
                </Group>
              ))}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Today's Bookings Table */}
      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" mb="md">
          <Title order={4}>Today's Bookings</Title>
          <ActionIcon variant="subtle" color="brand" onClick={() => navigate('/bookings')}>
            <IconArrowRight size={16} />
          </ActionIcon>
        </Group>

        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Time</Table.Th>
              <Table.Th>Guests</Table.Th>
              <Table.Th>Table</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(todaysData?.bookings || []).map((booking) => (
              <Table.Tr key={booking._id || booking.id} style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/bookings/${booking._id || booking.id}`)}>
                <Table.Td>
                  <Group gap={8}>
                    <Avatar size="sm" color="red">{booking.customer?.name?.charAt(0) || 'C'}</Avatar>
                    <Stack gap={0}>
                      <Text size="sm" fw={600}>{booking.customer?.name || 'Customer'}</Text>
                      <Text size="xs" c="dimmed">{booking.customer?.phone || ''}</Text>
                    </Stack>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600}>{booking.time}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{booking.guests} guests</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{booking.table?.name || 'T' + booking.guests}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={booking.status === 'confirmed' ? 'green' : booking.status === 'pending' ? 'yellow' : booking.status === 'seated' ? 'blue' : 'red'}
                    variant="light"
                    size="sm"
                  >
                    {booking.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} onClick={(e) => e.stopPropagation()}>
                    {booking.status === 'pending' && (
                      <>
                        <ActionIcon size="sm" color="green" variant="light" title="Confirm">
                          <IconCheck size={14} />
                        </ActionIcon>
                      </>
                    )}
                    <ActionIcon size="sm" variant="subtle" color="gray"
                      onClick={() => navigate(`/bookings/${booking._id || booking.id}`)}>
                      <IconArrowRight size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}

