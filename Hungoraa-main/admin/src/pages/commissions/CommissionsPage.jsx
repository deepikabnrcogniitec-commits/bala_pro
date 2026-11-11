import { useState } from 'react';
import {
  Stack, Title, Group, Select, Card, Table, Badge, Text, Skeleton,
  SimpleGrid, Pagination, Box, ThemeIcon, Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCoin, IconCircleCheck, IconClock, IconInfoCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { commissionApi, restaurantApi } from '../../api';

const STATUS_COLOR = { pending: 'yellow', included: 'blue', settled: 'green' };

export default function CommissionsPage() {
  const [status, setStatus] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [page, setPage] = useState(1);

  const { data: restaurants } = useQuery({
    queryKey: ['admin-restaurants-list'],
    queryFn: () => restaurantApi.getAll({ limit: 200 }).then((r) => r.data.data.restaurants),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-commissions', status, restaurantId, from, to, page],
    queryFn: () =>
      commissionApi.getAll({
        status: status || undefined,
        restaurantId: restaurantId || undefined,
        from: from ? dayjs(from).format('YYYY-MM-DD') : undefined,
        to: to ? dayjs(to).format('YYYY-MM-DD') : undefined,
        page,
        limit: 20,
      }).then((r) => r.data.data),
  });

  const commissions = data?.commissions || [];
  const byStatus = data?.byStatus || [];
  const totals = data?.totals || {};
  const pagination = data?.pagination || {};

  const pendingSummary = byStatus.find((s) => s._id === 'pending');
  const includedSummary = byStatus.find((s) => s._id === 'included');
  const settledSummary = byStatus.find((s) => s._id === 'settled');

  const restaurantOptions = [
    { value: '', label: 'All Restaurants' },
    ...(restaurants || []).map((r) => ({ value: r._id, label: r.name })),
  ];

  return (
    <Stack gap="lg">
      <Title order={2}>Commissions</Title>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #f9a91b' }}>
          <ThemeIcon color="yellow" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconClock size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="yellow.7">
            ₹{(pendingSummary?.totalAmount || 0).toLocaleString('en-IN')}
          </Text>
          <Text size="xs" c="dimmed">Pending Commission</Text>
          <Text size="xs" c="yellow.6" fw={600}>{pendingSummary?.count || 0} invoices</Text>
        </Card>

        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #2a628f' }}>
          <ThemeIcon color="gold" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconCoin size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="brand.7">
            ₹{(includedSummary?.totalAmount || 0).toLocaleString('en-IN')}
          </Text>
          <Text size="xs" c="dimmed">In Settlement</Text>
          <Text size="xs" c="brand.6" fw={600}>{includedSummary?.count || 0} invoices</Text>
        </Card>

        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #2d6a4f' }}>
          <ThemeIcon color="green" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconCircleCheck size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="green.7">
            ₹{(settledSummary?.totalAmount || 0).toLocaleString('en-IN')}
          </Text>
          <Text size="xs" c="dimmed">Settled Commission</Text>
          <Text size="xs" c="green.6" fw={600}>{settledSummary?.count || 0} invoices</Text>
        </Card>

        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #cd302b' }}>
          <ThemeIcon color="red" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconCoin size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="red.7">
            ₹{(totals?.totalCommission || 0).toLocaleString('en-IN')}
          </Text>
          <Text size="xs" c="dimmed">Total Earned</Text>
          <Text size="xs" c="red.6" fw={600}>{pagination.total || 0} records</Text>
        </Card>
      </SimpleGrid>

      {/* Filters */}
      <Card withBorder radius="md" p="md">
        <Group gap="sm" wrap="wrap">
          <Select
            placeholder="All Status"
            value={status}
            onChange={(v) => { setStatus(v || ''); setPage(1); }}
            data={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'included', label: 'In Settlement' },
              { value: 'settled', label: 'Settled' },
            ]}
            style={{ width: 180 }}
            clearable
          />
          <Select
            placeholder="All Restaurants"
            value={restaurantId}
            onChange={(v) => { setRestaurantId(v || ''); setPage(1); }}
            data={restaurantOptions}
            style={{ width: 220 }}
            searchable
            clearable
          />
          <DateInput placeholder="From date" value={from}
            onChange={(v) => { setFrom(v); setPage(1); }} clearable style={{ width: 160 }} />
          <DateInput placeholder="To date" value={to}
            onChange={(v) => { setTo(v); setPage(1); }} clearable style={{ width: 160 }} />
        </Group>
      </Card>

      {/* Table */}
      <Card withBorder radius="md" p={0}>
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="lg">
          <Table.Thead style={{ background: '#123f66' }}>
            <Table.Tr>
              <Table.Th>Restaurant</Table.Th>
              <Table.Th>Invoice</Table.Th>
              <Table.Th>
                <Group gap={4}>
                  Gross Amount
                  <Tooltip label="Total bill before discounts">
                    <IconInfoCircle size={12} color="#868e96" />
                  </Tooltip>
                </Group>
              </Table.Th>
              <Table.Th>
                <Group gap={4}>
                  Comm. Base
                  <Tooltip label="Gross − restaurant-funded discount">
                    <IconInfoCircle size={12} color="#868e96" />
                  </Tooltip>
                </Group>
              </Table.Th>
              <Table.Th>Rate</Table.Th>
              <Table.Th>Commission</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Settlement</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <Table.Tr key={i}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => (
                      <Table.Td key={j}><Skeleton height={18} radius="sm" /></Table.Td>
                    ))}
                  </Table.Tr>
                ))
              : commissions.length === 0
              ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Box py={40} ta="center">
                      <Text c="dimmed">No commissions found</Text>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              )
              : commissions.map((c) => (
                <Table.Tr key={c._id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>{c.restaurant?.name || '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" style={{ fontFamily: 'monospace' }}>
                      {c.invoice?.invoiceId || '—'}
                    </Text>
                    <Text size="xs" c="dimmed">{dayjs(c.createdAt).format('DD MMM')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>₹{(c.grossAmount || c.invoiceAmount || 0).toLocaleString('en-IN')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">₹{(c.commissionBase || c.invoiceAmount || 0).toLocaleString('en-IN')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{c.percentage}%</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={700} c="gold">₹{c.amount?.toLocaleString('en-IN')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">{dayjs(c.createdAt).format('DD MMM YYYY')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLOR[c.status] || 'gray'} variant="light" size="sm">
                      {c.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {c.settlement ? (
                      <Text size="xs" c="green" fw={600} style={{ fontFamily: 'monospace' }}>
                        {c.settlement?.settlementId || 'Linked'}
                      </Text>
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      </Card>

      {pagination.pages > 1 && (
        <Group justify="center">
          <Pagination total={pagination.pages} value={page} onChange={setPage} color="gold" />
        </Group>
      )}
    </Stack>
  );
}
