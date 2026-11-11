import { useState, useEffect } from 'react';
import {
  Stack, Title, Group, Badge, Card, Text, Select, SimpleGrid,
  Table, Box, Skeleton, Button, Anchor,
} from '@mantine/core';
import { IconReceipt, IconCheck, IconClock } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { invoiceApi, restaurantApi, commissionApi, settlementApi } from '../../api';

const STATUS_COLORS = { draft: 'gray', sent: 'yellow', paid: 'green', cancelled: 'red' };

export default function InvoicesPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: restaurants } = useQuery({
    queryKey: ['my-restaurants'],
    queryFn: () => restaurantApi.getMyRestaurants().then((r) => r.data.data.restaurants),
  });

  useEffect(() => {
    if (restaurants?.[0] && !restaurantId) setRestaurantId(restaurants[0]._id);
  }, [restaurants]);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', restaurantId, statusFilter],
    queryFn: () =>
      invoiceApi.getRestaurantInvoices(restaurantId, { status: statusFilter || undefined })
        .then((r) => r.data.data),
    enabled: !!restaurantId,
  });

  const { data: commissionData } = useQuery({
    queryKey: ['commissions', restaurantId],
    queryFn: () => commissionApi.getMy(restaurantId).then((r) => r.data.data),
    enabled: !!restaurantId,
  });

  const { data: settlementsData } = useQuery({
    queryKey: ['settlements', restaurantId],
    queryFn: () => settlementApi.getMy(restaurantId).then((r) => r.data.data),
    enabled: !!restaurantId,
  });

  const invoices = invoicesData?.invoices || [];
  const restaurantOptions = restaurants?.map((r) => ({ value: r._id, label: r.name })) || [];

  // Summary stats from invoices
  const totalRevenue = invoices.filter((i) => i.paymentStatus === 'paid').reduce((s, i) => s + i.finalAmount, 0);
  const totalCommission = invoices.filter((i) => i.paymentStatus === 'paid').reduce((s, i) => s + i.commissionAmount, 0);
  const pendingCount = invoices.filter((i) => i.paymentStatus !== 'paid').length;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Invoices & Billing</Title>
        {restaurants?.length > 1 && (
          <Select
            data={restaurantOptions}
            value={restaurantId}
            onChange={setRestaurantId}
            style={{ width: 200 }}
          />
        )}
      </Group>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        {[
          { label: 'Total Invoices', value: invoices.length, color: 'blue' },
          { label: 'Pending Payment', value: pendingCount, color: 'yellow' },
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: 'green' },
          { label: 'Commission Due', value: `₹${(commissionData?.pendingAmount || 0).toLocaleString()}`, color: 'red' },
        ].map(({ label, value, color }) => (
          <Card key={label} withBorder radius="md" p="md" ta="center">
            <Text size="xl" fw={800} c={color}>{value}</Text>
            <Text size="sm" c="dimmed">{label}</Text>
          </Card>
        ))}
      </SimpleGrid>

      {/* Filter */}
      <Group gap="sm">
        {[
          { value: '', label: 'All' },
          { value: 'sent', label: 'Pending' },
          { value: 'paid', label: 'Paid' },
          { value: 'cancelled', label: 'Cancelled' },
        ].map((f) => (
          <Button
            key={f.value}
            size="xs"
            variant={statusFilter === f.value ? 'filled' : 'light'}
            color={statusFilter === f.value ? 'brand' : 'gray'}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </Group>

      {/* Invoices Table */}
      <Card withBorder radius="md" p={0}>
        {isLoading ? (
          <Stack p="md" gap="sm">
            {[1, 2, 3].map((i) => <Skeleton key={i} height={50} radius="sm" />)}
          </Stack>
        ) : invoices.length === 0 ? (
          <Box py={60} ta="center">
            <Text size={40} mb={8}>🧾</Text>
            <Text fw={600}>No invoices yet</Text>
            <Text c="dimmed" size="sm">Invoices are generated from Booking Detail page</Text>
          </Box>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Invoice ID</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Food Bill</Table.Th>
                <Table.Th>Discount</Table.Th>
                <Table.Th>Final Amount</Table.Th>
                <Table.Th>Commission</Table.Th>
                <Table.Th>You Receive</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Booking</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {invoices.map((inv) => (
                <Table.Tr key={inv._id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>{inv.invoiceId}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{inv.customer?.name}</Text>
                    <Text size="xs" c="dimmed">{inv.customer?.phone}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{inv.booking?.date}</Text>
                    <Text size="xs" c="dimmed">{inv.booking?.time}</Text>
                  </Table.Td>
                  <Table.Td><Text size="sm">₹{inv.subtotal?.toLocaleString()}</Text></Table.Td>
                  <Table.Td>
                    {inv.discountAmount > 0 ? (
                      <Text size="sm" c="green">-₹{inv.discountAmount.toLocaleString()}</Text>
                    ) : (
                      <Text size="sm" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={700} c="brand">₹{inv.finalAmount?.toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="red">₹{inv.commissionAmount?.toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="green" fw={600}>₹{inv.restaurantReceives?.toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLORS[inv.status] || 'gray'} size="sm" variant="light">
                      {inv.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Anchor component={Link} to={`/bookings/${inv.booking?._id}`} size="xs">
                      #{inv.booking?.bookingId}
                    </Anchor>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Settlements Section */}
      {settlementsData?.settlements?.length > 0 && (
        <Stack gap="md">
          <Title order={4}>Settlements</Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {settlementsData.settlements.map((s) => (
              <Card key={s._id} withBorder radius="md" p="md">
                <Group justify="space-between" mb="sm">
                  <Text fw={700} size="sm">{s.settlementId}</Text>
                  <Badge color={s.status === 'completed' ? 'green' : 'yellow'} variant="light" size="sm">
                    {s.status}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" mb="xs">
                  {new Date(s.periodFrom).toLocaleDateString()} – {new Date(s.periodTo).toLocaleDateString()}
                </Text>
                <Group gap="xl">
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">Revenue</Text>
                    <Text size="sm" fw={600}>₹{s.totalRevenue?.toLocaleString()}</Text>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">Commission</Text>
                    <Text size="sm" c="red">₹{s.totalCommission?.toLocaleString()}</Text>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">You Receive</Text>
                    <Text size="sm" c="green" fw={700}>₹{s.netPayable?.toLocaleString()}</Text>
                  </Stack>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      )}
    </Stack>
  );
}
