import { useState } from 'react';
import {
  Stack, Title, Group, Select, Card, Text, SimpleGrid, Grid, Box, Badge,
} from '@mantine/core';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api';
import dayjs from 'dayjs';

const COLORS = ['#cd302b', '#2d6a4f', '#2a628f', '#f9a91b', '#153f63', '#ffd76b'];

const CHART_TOOLTIP_STYLE = {
  background: '#0c2f4e',
  border: '1px solid #123f66',
  borderRadius: 8,
  color: '#f6f4ee',
};

const AXIS_TICK = { fontSize: 10, fill: '#8892a8' };


function KPICard({ label, value, change, color }) {
  const isPositive = change >= 0;
  return (
    <Card withBorder radius="md" p="md" style={{ borderTop: `3px solid ${color}` }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
      <Text size="xl" fw={800} mt={4}>{value}</Text>
      <Group gap={4} mt={4}>
        {isPositive ? <IconTrendingUp size={13} color="#2d6a4f" /> : <IconTrendingDown size={13} color="#cd302b" />}
        <Text size="xs" c={isPositive ? 'green' : 'red'} fw={600}>
          {isPositive ? '+' : ''}{change}% vs last period
        </Text>
      </Group>
    </Card>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('30');

  const { data: stats } = useQuery({
    queryKey: ['admin-stats', period],
    queryFn: () => adminApi.getStats(period).then((r) => r.data.data),
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Platform Reports</Title>
        <Select
          value={period}
          onChange={setPeriod}
          data={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
          ]}
          style={{ width: 160 }}
        />
      </Group>

      {/* KPIs */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <KPICard label="New Users" value={(stats?.newUsers || 0).toLocaleString('en-IN')} change={stats?.userGrowth ?? 0} color="#2a628f" />
        <KPICard label="New Restaurants" value={(stats?.newRestaurants || 0).toLocaleString('en-IN')} change={stats?.restaurantGrowth ?? 0} color="#2d6a4f" />
        <KPICard label="Total Bookings" value={(stats?.totalBookings || 0).toLocaleString('en-IN')} change={stats?.bookingGrowth ?? 0} color="#cd302b" />
        <KPICard label="Platform Revenue" value={`₹${((stats?.totalRevenue || 0) / 100000).toFixed(1)}L`} change={stats?.revenueGrowth ?? 0} color="#f9a91b" />
      </SimpleGrid>

      {/* Growth Chart */}
      <Card withBorder radius="md" p="lg">
        <Text fw={700} size="lg" mb="lg">Platform Growth</Text>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={stats?.growthData || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#123f66" />
            <XAxis dataKey="date" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f6f4ee' }} />
            <Legend wrapperStyle={{ color: '#a9b1c4' }} />
            <Line type="monotone" dataKey="users" stroke="#2a628f" strokeWidth={2} dot={false} name="New Users" />
            <Line type="monotone" dataKey="bookings" stroke="#cd302b" strokeWidth={2} dot={false} name="Bookings" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Grid gutter="md">
        {/* Revenue Chart */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} size="lg" mb="lg">Daily Revenue</Text>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={stats?.growthData || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#cd302b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#cd302b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#123f66" />
                <XAxis dataKey="date" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={{ color: '#f6f4ee' }}
                  formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#cd302b" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Grid.Col>

        {/* Cuisine Mix */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} size="lg" mb="lg">Top Cuisines</Text>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={stats?.cuisines || []} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3}>
                  {(stats?.cuisines || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f6f4ee' }} />
              </PieChart>
            </ResponsiveContainer>
            <Stack gap={4} mt="sm">
              {(stats?.cuisines || []).map((c, i) => (
                <Group key={c.name} justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                    <Text size="xs" c="dimmed">{c.name}</Text>
                  </Group>
                  <Text size="xs" fw={700}>{c.value}%</Text>
                </Group>
              ))}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Top Cities */}
        <Grid.Col span={12}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} size="lg" mb="lg">Top Cities by Bookings</Text>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.topCities || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#123f66" />
                <XAxis type="number" tick={AXIS_TICK} />
                <YAxis type="category" dataKey="city" tick={{ fontSize: 11, fill: '#8892a8' }} width={80} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={{ color: '#f6f4ee' }}
                  formatter={(v, n) => [n === 'revenue' ? `₹${v.toLocaleString('en-IN')}` : v, n === 'revenue' ? 'Revenue' : 'Bookings']}
                />
                <Bar dataKey="bookings" fill="#cd302b" radius={[0, 4, 4, 0]} name="bookings" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

