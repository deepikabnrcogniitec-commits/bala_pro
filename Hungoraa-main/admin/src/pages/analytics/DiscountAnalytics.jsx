import { useState } from 'react';
import {
  Stack, Title, Group, Card, Text, Select, SimpleGrid,
  ThemeIcon, Table, Badge, Skeleton, Box, Progress, Divider,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconTag, IconBuildingStore, IconBuildingBank, IconDevices,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { adminApi } from '../../api';

const FUNDED_COLOR = {
  restaurant: { color: 'green', icon: IconBuildingStore, label: 'Restaurant Funded' },
  platform: { color: 'blue', icon: IconDevices, label: 'Platform Funded' },
  bank: { color: 'violet', icon: IconBuildingBank, label: 'Bank Funded' },
};

export default function DiscountAnalytics() {
  const [from, setFrom] = useState(dayjs().subtract(30, 'day').toDate());
  const [to, setTo] = useState(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ['admin-discount-analytics', from, to],
    queryFn: () =>
      adminApi.getDiscountAnalytics({
        from: dayjs(from).format('YYYY-MM-DD'),
        to: dayjs(to).format('YYYY-MM-DD'),
      }).then((r) => r.data.data),
  });

  const summary = data?.summary || {};
  const byFunding = data?.byFunding || [];
  const topOffers = data?.topOffers || [];
  const byRestaurant = data?.byRestaurant || [];

  const totalDiscount = summary.totalDiscount || 0;
  const restaurantFunded = summary.restaurantFunded || 0;
  const platformFunded = summary.platformFunded || 0;
  const bankFunded = summary.bankFunded || 0;

  const getPercent = (val) => totalDiscount > 0 ? ((val / totalDiscount) * 100).toFixed(1) : 0;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Discount Analytics</Title>
        <Group gap="sm">
          <DateInput value={from} onChange={setFrom} placeholder="From" maxDate={to} style={{ width: 150 }} />
          <DateInput value={to} onChange={setTo} placeholder="To" minDate={from} style={{ width: 150 }} />
        </Group>
      </Group>

      {/* Total summary */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #cd302b' }}>
          <ThemeIcon color="red" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconTag size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="red.7">₹{totalDiscount.toLocaleString('en-IN')}</Text>
          <Text size="xs" c="dimmed">Total Discount Given</Text>
          <Text size="xs" c="red.6" fw={600}>{summary.totalTransactions || 0} transactions</Text>
        </Card>

        {Object.entries(FUNDED_COLOR).map(([key, { color, icon: Icon, label }]) => {
          const val = key === 'restaurant' ? restaurantFunded : key === 'platform' ? platformFunded : bankFunded;
          return (
            <Card key={key} withBorder radius="md" p="md" ta="center"
              style={{ borderTop: `3px solid var(--mantine-color-${color}-5)` }}>
              <ThemeIcon color={color} variant="light" size="xl" radius="xl" mx="auto" mb={8}>
                <Icon size={20} />
              </ThemeIcon>
              <Text size="xl" fw={800} c={`${color}.7`}>₹{val.toLocaleString('en-IN')}</Text>
              <Text size="xs" c="dimmed">{label}</Text>
              <Text size="xs" c={`${color}.6`} fw={600}>{getPercent(val)}%</Text>
            </Card>
          );
        })}
      </SimpleGrid>

      {/* Funding breakdown bar */}
      <Card withBorder radius="md" p="lg">
        <Text fw={700} size="sm" mb="md">Funding Breakdown</Text>
        <Stack gap="sm">
          {[
            { label: 'Restaurant', value: restaurantFunded, color: 'green' },
            { label: 'Platform', value: platformFunded, color: 'blue' },
            { label: 'Bank', value: bankFunded, color: 'violet' },
          ].map(({ label, value, color }) => (
            <Group key={label} gap="sm">
              <Text size="sm" style={{ width: 80 }}>{label}</Text>
              <Progress
                value={parseFloat(getPercent(value))}
                color={color}
                style={{ flex: 1 }}
                size="lg"
                radius="sm"
              />
              <Text size="sm" fw={600} style={{ width: 100 }} ta="right">
                ₹{value.toLocaleString('en-IN')} ({getPercent(value)}%)
              </Text>
            </Group>
          ))}
        </Stack>
      </Card>

      <Group gap="md" align="flex-start" wrap="nowrap" style={{ '@media (max-width: 768px)': { flexDirection: 'column' } }}>
        {/* Top offers */}
        <Card withBorder radius="md" p={0} style={{ flex: 1 }}>
          <Box p="md" style={{ borderBottom: '1px solid #e9ecef' }}>
            <Text fw={700} size="sm">Top Offers by Discount Given</Text>
          </Box>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead style={{ background: '#123f66' }}>
              <Table.Tr>
                <Table.Th>Offer</Table.Th>
                <Table.Th>Uses</Table.Th>
                <Table.Th>Total Discount</Table.Th>
                <Table.Th>Funded By</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading
                ? [1, 2, 3].map((i) => (
                    <Table.Tr key={i}>
                      {[1, 2, 3, 4].map((j) => <Table.Td key={j}><Skeleton height={16} /></Table.Td>)}
                    </Table.Tr>
                  ))
                : topOffers.length === 0
                ? (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Box py={24} ta="center"><Text c="dimmed" size="sm">No data</Text></Box>
                    </Table.Td>
                  </Table.Tr>
                )
                : topOffers.map((o) => (
                  <Table.Tr key={o._id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>{o.title}</Text>
                      <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>{o.code}</Text>
                    </Table.Td>
                    <Table.Td><Text size="sm">{o.usedCount}</Text></Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600} c="red">₹{(o.totalDiscount || 0).toLocaleString('en-IN')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={FUNDED_COLOR[o.fundedBy]?.color || 'gray'} variant="light" size="sm">
                        {o.fundedBy || 'restaurant'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </Card>

        {/* Top restaurants by platform discount cost */}
        <Card withBorder radius="md" p={0} style={{ flex: 1 }}>
          <Box p="md" style={{ borderBottom: '1px solid #e9ecef' }}>
            <Text fw={700} size="sm">Platform Discount Cost by Restaurant</Text>
          </Box>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead style={{ background: '#123f66' }}>
              <Table.Tr>
                <Table.Th>Restaurant</Table.Th>
                <Table.Th>Platform Cost</Table.Th>
                <Table.Th>Transactions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading
                ? [1, 2, 3].map((i) => (
                    <Table.Tr key={i}>
                      {[1, 2, 3].map((j) => <Table.Td key={j}><Skeleton height={16} /></Table.Td>)}
                    </Table.Tr>
                  ))
                : byRestaurant.length === 0
                ? (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Box py={24} ta="center"><Text c="dimmed" size="sm">No data</Text></Box>
                    </Table.Td>
                  </Table.Tr>
                )
                : byRestaurant.map((r) => (
                  <Table.Tr key={r._id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>{r.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600} c="blue">
                        ₹{(r.platformFunded || 0).toLocaleString('en-IN')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{r.count}</Text>
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
