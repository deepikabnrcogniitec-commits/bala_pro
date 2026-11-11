import { useState } from 'react';
import {
  Stack, Title, Group, TextInput, Select, Card, Table, Badge,
  Avatar, Text, Skeleton, Box, Pagination,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '../../api';

const STATUS_COLORS = { confirmed: 'green', pending: 'yellow', seated: 'blue', completed: 'teal', cancelled: 'red', 'no-show': 'gray' };


export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', search, statusFilter, page],
    queryFn: () => bookingApi.getAll({ search, status: statusFilter !== 'all' ? statusFilter : undefined, page, limit: 20 })
      .then((r) => r.data.data),
  });

  const bookings = data?.bookings || [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>All Bookings</Title>
        <Text c="dimmed" size="sm">{data?.total || 0} total bookings</Text>
      </Group>

      <Card withBorder radius="md" p="md">
        <Group gap="sm">
          <TextInput
            placeholder="Search booking ID or customer..."
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'seated', label: 'Seated' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            style={{ width: 180 }}
          />
        </Group>
      </Card>

      <Card withBorder radius="md" p={0}>
        <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
          <Table.Thead style={{ background: '#123f66' }}>
            <Table.Tr>
              <Table.Th>Booking ID</Table.Th>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Restaurant</Table.Th>
              <Table.Th>Date & Time</Table.Th>
              <Table.Th>Guests</Table.Th>
              <Table.Th>Amount</Table.Th>
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
            ) : bookings.map((b) => (
              <Table.Tr key={b._id}>
                <Table.Td><Text size="sm" fw={700} c="gold">#{b.bookingId}</Text></Table.Td>
                <Table.Td>
                  <Group gap={8}>
                    <Avatar size="xs" color="gold">{b.customer?.name?.charAt(0)}</Avatar>
                    <Text size="sm">{b.customer?.name}</Text>
                  </Group>
                </Table.Td>
                <Table.Td><Text size="sm">{b.restaurant?.name}</Text></Table.Td>
                <Table.Td>
                  <Stack gap={0}>
                    <Text size="sm" fw={600}>{b.date}</Text>
                    <Text size="xs" c="dimmed">{b.time}</Text>
                  </Stack>
                </Table.Td>
                <Table.Td><Text size="sm">{b.guests}</Text></Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600}>
                    {b.totalAmount > 0 ? `₹${b.totalAmount}` : '—'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLORS[b.status] || 'gray'} variant="light" size="sm">
                    {b.status}
                  </Badge>
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
