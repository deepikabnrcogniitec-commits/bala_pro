import { useState, useEffect } from 'react';
import {
  Stack, Title, Group, Select, TextInput, Badge, Table, Avatar, ActionIcon,
  Button, Card, Text, Tabs, SegmentedControl, Tooltip, Menu, Modal,
  Textarea, Box, Skeleton,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconSearch, IconFilter, IconCheck, IconX, IconArrowRight,
  IconDotsVertical, IconMessage, IconCalendar, IconRefresh,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { bookingApi, restaurantApi } from '../../api';

const STATUS_COLORS = { confirmed: 'green', pending: 'yellow', seated: 'blue', completed: 'teal', cancelled: 'red', 'no-show': 'gray' };

export default function BookingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [restaurantId, setRestaurantId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState({ open: false, bookingId: null });
  const [rejectReason, setRejectReason] = useState('');

  const { data: restaurants } = useQuery({
    queryKey: ['my-restaurants'],
    queryFn: () => restaurantApi.getMyRestaurants().then((r) => r.data.data.restaurants),
  });

  useEffect(() => {
    if (restaurants?.[0] && !restaurantId) setRestaurantId(restaurants[0]._id);
  }, [restaurants]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['owner-bookings', restaurantId, statusFilter, dateFilter],
    queryFn: () =>
      bookingApi.getAll({
        restaurantId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date: dateFilter ? dayjs(dateFilter).format('YYYY-MM-DD') : undefined,
      }).then((r) => r.data.data),
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }) => bookingApi.updateStatus(id, status, reason),
    onSuccess: (_, { status }) => {
      notifications.show({ title: `Booking ${status}`, color: status === 'confirmed' ? 'green' : 'red' });
      qc.invalidateQueries({ queryKey: ['owner-bookings'] });
      setRejectModal({ open: false, bookingId: null });
    },
  });

  const handleConfirm = (id) => updateStatusMutation.mutate({ id, status: 'confirmed' });
  const handleReject = () => updateStatusMutation.mutate({ id: rejectModal.bookingId, status: 'cancelled', reason: rejectReason });
  const handleSeated = (id) => updateStatusMutation.mutate({ id, status: 'seated' });
  const handleComplete = (id) => updateStatusMutation.mutate({ id, status: 'completed' });

  const bookings = data?.bookings || [];
  const filtered = bookings.filter((b) =>
    search ? b.customer?.name?.toLowerCase().includes(search.toLowerCase()) || b.bookingId?.includes(search) : true
  );

  const restaurantOptions = restaurants?.map((r) => ({ value: r._id, label: r.name })) || [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Bookings</Title>
        <Group gap="sm">
          <Tooltip label="Refresh">
            <ActionIcon variant="subtle" onClick={() => refetch()}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Badge color="green" variant="dot" size="lg">Live Updates</Badge>
        </Group>
      </Group>

      {/* Filters */}
      <Card withBorder radius="md" p="md">
        <Group gap="sm" wrap="wrap">
          {restaurants?.length > 1 && (
            <Select
              data={restaurantOptions}
              value={restaurantId}
              onChange={setRestaurantId}
              placeholder="Select Restaurant"
              style={{ minWidth: 200 }}
            />
          )}
          <TextInput
            placeholder="Search by name or booking ID..."
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <DateInput
            placeholder="Filter by date"
            leftSection={<IconCalendar size={14} />}
            value={dateFilter}
            onChange={setDateFilter}
            clearable
            style={{ width: 160 }}
          />
        </Group>
      </Card>

      {/* Status Tabs */}
      <SegmentedControl
        value={statusFilter}
        onChange={setStatusFilter}
        data={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: '⏳ Pending' },
          { value: 'confirmed', label: '✅ Confirmed' },
          { value: 'seated', label: '🪑 Seated' },
          { value: 'completed', label: '🎉 Completed' },
          { value: 'cancelled', label: '❌ Cancelled' },
        ]}
        color="brand"
      />

      {/* Bookings Table */}
      <Card withBorder radius="md" p={0}>
        <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
          <Table.Thead style={{ backgroundColor: '#f8f9fa' }}>
            <Table.Tr>
              <Table.Th>Booking ID</Table.Th>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Date & Time</Table.Th>
              <Table.Th>Guests</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              [1,2,3,4,5].map((i) => (
                <Table.Tr key={i}>
                  {[1,2,3,4,5,6,7].map((j) => <Table.Td key={j}><Skeleton height={20} /></Table.Td>)}
                </Table.Tr>
              ))
            ) : filtered.map((booking) => (
              <Table.Tr key={booking._id || booking.id}>
                <Table.Td>
                  <Text size="sm" fw={700} c="brand">#{booking.bookingId || booking.id}</Text>
                </Table.Td>
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
                  <Stack gap={0}>
                    <Text size="sm" fw={600}>{booking.date}</Text>
                    <Text size="xs" c="dimmed">{booking.time}</Text>
                  </Stack>
                </Table.Td>
                <Table.Td><Text size="sm">{booking.guests} guests</Text></Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600}>
                    {booking.totalAmount > 0 ? `₹${booking.totalAmount}` : 'Pay at resto'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLORS[booking.status] || 'gray'} variant="light" size="sm">
                    {booking.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {booking.status === 'pending' && (
                      <>
                        <Tooltip label="Confirm">
                          <ActionIcon size="sm" color="green" variant="light"
                            loading={updateStatusMutation.isPending}
                            onClick={() => handleConfirm(booking._id || booking.id)}>
                            <IconCheck size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Reject">
                          <ActionIcon size="sm" color="red" variant="light"
                            onClick={() => setRejectModal({ open: true, bookingId: booking._id || booking.id })}>
                            <IconX size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <Tooltip label="Mark Seated">
                        <ActionIcon size="sm" color="blue" variant="light"
                          onClick={() => handleSeated(booking._id || booking.id)}>
                          <IconCheck size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {booking.status === 'seated' && (
                      <Tooltip label="Mark Completed">
                        <ActionIcon size="sm" color="teal" variant="light"
                          onClick={() => handleComplete(booking._id || booking.id)}>
                          <IconCheck size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="View Details">
                      <ActionIcon size="sm" variant="subtle"
                        onClick={() => navigate(`/bookings/${booking._id || booking.id}`)}>
                        <IconArrowRight size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {filtered.length === 0 && !isLoading && (
          <Box py={48} style={{ textAlign: 'center' }}>
            <Text size="xl" mb={8}>📅</Text>
            <Text fw={600}>No bookings found</Text>
            <Text c="dimmed" size="sm">Try adjusting your filters</Text>
          </Box>
        )}
      </Card>

      {/* Reject Modal */}
      <Modal opened={rejectModal.open} onClose={() => setRejectModal({ open: false, bookingId: null })}
        title="Reject Booking" centered>
        <Stack gap="md">
          <Text size="sm" c="dimmed">Please provide a reason for rejection (optional)</Text>
          <Textarea
            placeholder="Table not available, fully booked, etc."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setRejectModal({ open: false, bookingId: null })}>Cancel</Button>
            <Button color="red" onClick={handleReject} loading={updateStatusMutation.isPending}>
              Reject Booking
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

