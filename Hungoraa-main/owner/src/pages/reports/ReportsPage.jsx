import { useState, useEffect } from 'react';
import {
  Stack, Title, Group, Select, Card, Text, SimpleGrid, Grid, Box, Badge, Skeleton,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { IconTrendingUp, IconTrendingDown, IconCurrencyRupee, IconUsers, IconCalendar, IconStar } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { restaurantApi } from '../../api';

const COLORS = ['#e63946', '#2d6a4f', '#457b9d', '#f4a261', '#6b4fbb', '#20c997'];

function StatCard({ title, value, icon: Icon, color, change, prefix = '' }) {
  const isPositive = change >= 0;
  return (
    <Card withBorder radius="md" p="lg" style={{ borderTop: `3px solid ${color}` }}>
      <Group justify="space-between">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{title}</Text>
          <Text size="xl" fw={800}>{prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</Text>
          {change !== undefined && (
            <Group gap={4}>
              {isPositive ? <IconTrendingUp size={13} color="#2d6a4f" /> : <IconTrendingDown size={13} color="#e63946" />}
              <Text size="xs" c={isPositive ? 'green' : 'red'} fw={600}>
                {isPositive ? '+' : ''}{change}% vs last period
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

export default function ReportsPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [period, setPeriod] = useState('30');

  const { data: restaurants } = useQuery({
    queryKey: ['my-restaurants'],
    queryFn: () => restaurantApi.getMyRestaurants().then((r) => r.data.data.restaurants),
  });

  useEffect(() => {
    if (restaurants?.[0] && !restaurantId) setRestaurantId(restaurants[0]._id);
  }, [restaurants]);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', restaurantId, period],
    queryFn: () => restaurantApi.getAnalytics(restaurantId, period).then((r) => r.data.data),
    enabled: !!restaurantId,
  });

  const restaurantOptions = restaurants?.map((r) => ({ value: r._id, label: r.name })) || [];
  const revenueData = analytics?.bookingsByDay?.map((d) => ({
    date: d._id?.slice(5),
    revenue: d.revenue,
    bookings: d.count,
  })) || [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Reports & Analytics</Title>
        <Group gap="sm">
          {restaurants?.length > 1 && (
            <Select data={restaurantOptions} value={restaurantId} onChange={setRestaurantId}
              placeholder="Select Restaurant" style={{ width: 200 }} />
          )}
          <Select
            value={period}
            onChange={setPeriod}
            data={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            style={{ width: 150 }}
          />
        </Group>
      </Group>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {isLoading ? (
          [1,2,3,4].map((i) => <Skeleton key={i} height={110} radius="md" />)
        ) : (
          <>
            <StatCard title="Total Revenue" value={analytics?.totalRevenue || 0} icon={IconCurrencyRupee} color="#e63946" prefix="₹" />
            <StatCard title="Total Bookings" value={analytics?.totalBookings || 0} icon={IconCalendar} color="#2d6a4f" />
            <StatCard title="Unique Customers" value={analytics?.uniqueCustomers || 0} icon={IconUsers} color="#457b9d" />
            <StatCard title="Avg Rating" value={analytics?.avgRating?.toFixed(1) || '—'} icon={IconStar} color="#f4a261" />
          </>
        )}
      </SimpleGrid>

      {/* Revenue Chart */}
      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" mb="lg">
          <Text fw={700} size="lg">Revenue Over Time</Text>
          <Badge variant="light" color="brand">₹ Revenue</Badge>
        </Group>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e63946" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#e63946" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, n) => [n === 'revenue' ? `₹${v.toLocaleString('en-IN')}` : v, n === 'revenue' ? 'Revenue' : 'Bookings']} />
            <Area type="monotone" dataKey="revenue" stroke="#e63946" fill="url(#revGrad)" strokeWidth={2} name="revenue" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Grid gutter="md">
        {/* Peak Hours */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius="md" p="lg" h="100%">
            <Text fw={700} size="lg" mb="lg">Peak Booking Hours</Text>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics?.guestsByTime || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#e63946" radius={[4, 4, 0, 0]} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid.Col>

        {/* Booking Status */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder radius="md" p="lg" h="100%">
            <Text fw={700} size="lg" mb="lg">Booking Status</Text>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={analytics?.statusBreakdown || []} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {(analytics?.statusBreakdown || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}%`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <Stack gap={6} mt="sm">
              {(analytics?.statusBreakdown || []).map((s, i) => (
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

        {/* Top Menu Items */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} size="lg" mb="lg">Top Menu Items</Text>
            <Stack gap="sm">
              {(analytics?.topItems || []).map((item, i) => {
                const maxOrders = analytics?.topItems?.[0]?.orders || 1;
                const pct = (item.orders / maxOrders) * 100;
                return (
                  <Box key={item.name}>
                    <Group justify="space-between" mb={4}>
                      <Group gap={8}>
                        <Text size="sm" c="dimmed" fw={700} style={{ width: 16 }}>#{i + 1}</Text>
                        <Text size="sm" fw={600}>{item.name}</Text>
                      </Group>
                      <Group gap={12}>
                        <Text size="sm" c="dimmed">{item.orders} orders</Text>
                        <Text size="sm" fw={700} c="brand">₹{item.revenue.toLocaleString('en-IN')}</Text>
                      </Group>
                    </Group>
                    <Box style={{ height: 6, background: '#f1f3f5', borderRadius: 3, overflow: 'hidden' }}>
                      <Box style={{ width: `${pct}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Popular Cuisine Mix */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} size="lg" mb="lg">Cuisine Preference</Text>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={analytics?.cuisinePreference || []} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {(analytics?.cuisinePreference || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
