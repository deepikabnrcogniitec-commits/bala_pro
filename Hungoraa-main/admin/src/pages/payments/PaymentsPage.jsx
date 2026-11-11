import { useState } from 'react';
import {
  Stack, Title, Group, Select, Card, Table, Badge, Text, Skeleton,
  SimpleGrid, Pagination,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { paymentApi } from '../../api';

const STATUS_COLORS = { completed: 'green', failed: 'red', refunded: 'orange', pending: 'yellow', partially_refunded: 'grape' };
const METHOD_COLORS = { razorpay: 'blue', wallet: 'violet', cash: 'gray', card: 'cyan', upi: 'indigo', netbanking: 'teal' };


export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', statusFilter, fromDate, toDate, page],
    queryFn: () => paymentApi.getAll({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      from: fromDate ? dayjs(fromDate).format('YYYY-MM-DD') : undefined,
      to: toDate ? dayjs(toDate).format('YYYY-MM-DD') : undefined,
      page, limit: 20,
    }).then((r) => r.data.data),
  });

  const payments = data?.payments || [];
  const summary = data?.summary || {};

  return (
    <Stack gap="lg">
      <Title order={2}>Payments & Revenue</Title>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        {[
          { label: 'Total Revenue', value: `₹${(summary.totalRevenue || 0).toLocaleString('en-IN')}`, color: '#2a628f' },
          { label: 'Total Transactions', value: (summary.totalTransactions || 0).toLocaleString('en-IN'), color: '#2d6a4f' },
          { label: 'Avg Order Value', value: `₹${Math.round(summary.avgOrderValue || 0).toLocaleString('en-IN')}`, color: '#f9a91b' },
        ].map(({ label, value, color }) => (
          <Card key={label} withBorder radius="md" p="md" ta="center" style={{ borderTop: `3px solid ${color}` }}>
            <Text size="xl" fw={800} c={color}>{value}</Text>
            <Text size="xs" c="dimmed">{label}</Text>
          </Card>
        ))}
      </SimpleGrid>

      {/* Filters */}
      <Card withBorder radius="md" p="md">
        <Group gap="sm" wrap="wrap">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'all', label: 'All Status' },
              { value: 'completed', label: 'Completed' },
              { value: 'refunded', label: 'Refunded' },
              { value: 'failed', label: 'Failed' },
              { value: 'pending', label: 'Pending' },
            ]}
            style={{ width: 180 }}
          />
          <DateInput placeholder="From date" value={fromDate} onChange={setFromDate} clearable style={{ width: 160 }} />
          <DateInput placeholder="To date" value={toDate} onChange={setToDate} clearable style={{ width: 160 }} />
        </Group>
      </Card>

      {/* Table */}
      <Card withBorder radius="md" p={0}>
        <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
          <Table.Thead style={{ background: '#123f66' }}>
            <Table.Tr>
              <Table.Th>Payment ID</Table.Th>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Restaurant</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Method</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              [1,2,3].map((i) => (
                <Table.Tr key={i}>
                  {[1,2,3,4,5,6,7].map((j) => <Table.Td key={j}><Skeleton height={20} /></Table.Td>)}
                </Table.Tr>
              ))
            ) : payments.map((p) => (
              <Table.Tr key={p._id}>
                <Table.Td>
                  <Text size="xs" fw={700} c="gold" style={{ fontFamily: 'monospace' }}>
                    {p.razorpayPaymentId || p._id?.slice(-8).toUpperCase()}
                  </Text>
                </Table.Td>
                <Table.Td><Text size="sm">{p.customer?.name}</Text></Table.Td>
                <Table.Td><Text size="sm">{p.restaurant?.name || '—'}</Text></Table.Td>
                <Table.Td><Text size="sm" fw={600}>₹{(p.amount || 0).toLocaleString('en-IN')}</Text></Table.Td>
                <Table.Td>
                  <Badge color={METHOD_COLORS[p.method] || 'gray'} variant="light" size="sm">{p.method}</Badge>
                </Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{new Date(p.createdAt).toLocaleDateString()}</Text></Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLORS[p.status] || 'gray'} variant="light" size="sm">{p.status}</Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      {data?.pages > 1 && (
        <Group justify="center">
          <Pagination total={data.pages} value={page} onChange={setPage} color="gold" />
        </Group>
      )}
    </Stack>
  );
}
