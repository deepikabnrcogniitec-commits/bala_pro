import { useState } from 'react';
import {
  Stack, Title, Group, Card, Text, Select, SimpleGrid,
  ThemeIcon, Table, Skeleton, Box, Divider,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconCurrencyRupee, IconPercentage, IconBuildingStore, IconCalendar,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { adminApi } from '../../api';

export default function RevenueAnalytics() {
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState(dayjs().subtract(6, 'month').toDate());
  const [to, setTo] = useState(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue-analytics', period, from, to],
    queryFn: () =>
      adminApi.getRevenueAnalytics({
        period,
        from: dayjs(from).format('YYYY-MM-DD'),
        to: dayjs(to).format('YYYY-MM-DD'),
      }).then((r) => r.data.data),
  });

  const summary = data?.summary || {};
  const trend = data?.trend || [];
  const topRestaurants = data?.topRestaurants || [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Revenue Analytics</Title>
        <Group gap="sm">
          <Select
            value={period}
            onChange={(v) => setPeriod(v || 'monthly')}
            data={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            style={{ width: 130 }}
          />
          <DateInput value={from} onChange={setFrom} placeholder="From" style={{ width: 150 }} />
          <DateInput value={to} onChange={setTo} placeholder="To" style={{ width: 150 }} />
        </Group>
      </Group>

      {/* Summary cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #2a628f' }}>
          <ThemeIcon color="gold" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconCurrencyRupee size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="brand.7">
            ₹{(summary.totalGross || 0).toLocaleString('en-IN')}
          </Text>
          <Text size="xs" c="dimmed">Total Gross Revenue</Text>
        </Card>

        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #cd302b' }}>
          <ThemeIcon color="red" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconPercentage size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="red.7">
            ₹{(summary.totalCommission || 0).toLocaleString('en-IN')}
          </Text>
          <Text size="xs" c="dimmed">Platform Commission</Text>
          <Text size="xs" c="red.6" fw={600}>
            {summary.totalGross > 0
              ? `${((summary.totalCommission / summary.totalGross) * 100).toFixed(1)}% effective rate`
              : '—'}
          </Text>
        </Card>

        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #2d6a4f' }}>
          <ThemeIcon color="green" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconBuildingStore size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="green.7">
            ₹{(summary.totalRestaurantReceivable || 0).toLocaleString('en-IN')}
          </Text>
          <Text size="xs" c="dimmed">Paid to Restaurants</Text>
        </Card>

        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #f9a91b' }}>
          <ThemeIcon color="yellow" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconCalendar size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="yellow.7">{summary.totalInvoices || 0}</Text>
          <Text size="xs" c="dimmed">Total Invoices</Text>
        </Card>
      </SimpleGrid>

      <Group gap="md" align="flex-start" wrap="nowrap">
        {/* Trend table */}
        <Card withBorder radius="md" p={0} style={{ flex: 2 }}>
          <Box p="md" style={{ borderBottom: '1px solid #e9ecef' }}>
            <Text fw={700} size="sm">Revenue Trend ({period})</Text>
          </Box>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead style={{ background: '#123f66' }}>
              <Table.Tr>
                <Table.Th>Period</Table.Th>
                <Table.Th>Gross Revenue</Table.Th>
                <Table.Th>Commission</Table.Th>
                <Table.Th>Restaurant Payout</Table.Th>
                <Table.Th>Invoices</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading
                ? [1, 2, 3, 4, 5].map((i) => (
                    <Table.Tr key={i}>
                      {[1, 2, 3, 4, 5].map((j) => <Table.Td key={j}><Skeleton height={16} /></Table.Td>)}
                    </Table.Tr>
                  ))
                : trend.length === 0
                ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Box py={32} ta="center"><Text c="dimmed">No data for selected period</Text></Box>
                    </Table.Td>
                  </Table.Tr>
                )
                : trend.map((t) => (
                  <Table.Tr key={t._id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>{t._id}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>₹{(t.totalGross || 0).toLocaleString('en-IN')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="violet" fw={600}>₹{(t.totalCommission || 0).toLocaleString('en-IN')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="green.7" fw={600}>₹{(t.restaurantPayout || 0).toLocaleString('en-IN')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{t.count}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </Card>

        {/* Top restaurants */}
        <Card withBorder radius="md" p={0} style={{ flex: 1 }}>
          <Box p="md" style={{ borderBottom: '1px solid #e9ecef' }}>
            <Text fw={700} size="sm">Top Restaurants</Text>
          </Box>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead style={{ background: '#123f66' }}>
              <Table.Tr>
                <Table.Th>Restaurant</Table.Th>
                <Table.Th>Revenue</Table.Th>
                <Table.Th>Commission</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading
                ? [1, 2, 3].map((i) => (
                    <Table.Tr key={i}>
                      {[1, 2, 3].map((j) => <Table.Td key={j}><Skeleton height={16} /></Table.Td>)}
                    </Table.Tr>
                  ))
                : topRestaurants.length === 0
                ? (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Box py={24} ta="center"><Text c="dimmed" size="sm">No data</Text></Box>
                    </Table.Td>
                  </Table.Tr>
                )
                : topRestaurants.map((r) => (
                  <Table.Tr key={r._id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>{r.name}</Text>
                      <Text size="xs" c="dimmed">{r.invoices} invoices</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>₹{(r.totalGross || 0).toLocaleString('en-IN')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="violet">₹{(r.totalCommission || 0).toLocaleString('en-IN')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Group>
    </Stack>
  );
}
