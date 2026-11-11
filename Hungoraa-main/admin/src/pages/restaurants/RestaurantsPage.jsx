import { useState } from 'react';
import {
  Stack, Title, Group, TextInput, Select, Card, Table, Avatar, Badge,
  ActionIcon, Text, Skeleton, Menu, Button, Modal, Textarea, NumberInput,
  MultiSelect, Grid,
} from '@mantine/core';
import {
  IconSearch, IconCheck, IconX, IconDotsVertical, IconEye, IconBan,
  IconCurrencyRupee, IconBuildingStore, IconPlus, IconEdit, IconTrash,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { restaurantApi } from '../../api';

const STATUS_COLORS = { active: 'green', approved: 'green', pending: 'yellow', rejected: 'red', suspended: 'orange' };
const PLAN_COLORS = { basic: 'blue', premium: 'gold', enterprise: 'violet' };

const CUISINE_OPTIONS = [
  'North Indian', 'South Indian', 'Chinese', 'Italian', 'Continental',
  'Mughlai', 'Fast Food', 'Pizza', 'Biryani', 'Seafood', 'Bengali',
  'Maharashtrian', 'Gujarati', 'Kerala', 'Tandoor', 'Rolls', 'Desserts',
];

const PRICE_RANGES = [
  { value: '$', label: '$ — Budget' },
  { value: '$$', label: '$$ — Moderate' },
  { value: '$$$', label: '$$$ — Upscale' },
  { value: '$$$$', label: '$$$$ — Fine Dining' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
];

export default function RestaurantsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [rejectModal, setRejectModal] = useState({ open: false, restaurant: null });
  const [commModal, setCommModal] = useState({ open: false, restaurant: null });
  const [editModal, setEditModal] = useState({ open: false, restaurant: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, restaurant: null });
  const [rejectReason, setRejectReason] = useState('');
  const [commission, setCommission] = useState(10);

  const [editForm, setEditForm] = useState({
    name: '', city: '', state: '', address: '', description: '',
    cuisine: [], priceRange: '$$', phone: '', email: '', status: 'active',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-restaurants', search, statusFilter],
    queryFn: () => restaurantApi.getAll({ search, status: statusFilter !== 'all' ? statusFilter : undefined })
      .then((r) => r.data.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => restaurantApi.approve(id),
    onSuccess: () => { notifications.show({ title: 'Restaurant approved', color: 'green' }); qc.invalidateQueries({ queryKey: ['admin-restaurants'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => restaurantApi.reject(id, reason),
    onSuccess: () => {
      notifications.show({ title: 'Restaurant rejected', color: 'orange' });
      qc.invalidateQueries({ queryKey: ['admin-restaurants'] });
      setRejectModal({ open: false, restaurant: null });
    },
  });

  const commissionMutation = useMutation({
    mutationFn: ({ id, commission }) => restaurantApi.updateCommission(id, commission),
    onSuccess: () => {
      notifications.show({ title: 'Commission updated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-restaurants'] });
      setCommModal({ open: false, restaurant: null });
    },
  });

  const toggleBlockMutation = useMutation({
    mutationFn: (id) => restaurantApi.toggleBlock(id),
    onSuccess: () => { notifications.show({ title: 'Status updated', color: 'green' }); qc.invalidateQueries({ queryKey: ['admin-restaurants'] }); },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => restaurantApi.update(id, data),
    onSuccess: () => {
      notifications.show({ title: 'Restaurant updated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-restaurants'] });
      setEditModal({ open: false, restaurant: null });
    },
    onError: (err) => notifications.show({ title: 'Update failed', message: err.response?.data?.message || 'Error', color: 'red' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => restaurantApi.delete(id),
    onSuccess: () => {
      notifications.show({ title: 'Restaurant deleted', color: 'red' });
      qc.invalidateQueries({ queryKey: ['admin-restaurants'] });
      setDeleteModal({ open: false, restaurant: null });
    },
    onError: (err) => notifications.show({ title: 'Delete failed', message: err.response?.data?.message || 'Error', color: 'red' }),
  });

  const openEditModal = (r) => {
    setEditForm({
      name: r.name || '',
      city: r.address?.city || '',
      state: r.address?.state || '',
      address: r.address?.street || '',
      description: r.description || '',
      cuisine: r.cuisine || [],
      priceRange: r.priceRange || '$$',
      phone: r.contact?.phone || '',
      email: r.contact?.email || '',
      status: r.status || 'active',
    });
    setEditModal({ open: true, restaurant: r });
  };

  const handleEditSubmit = () => {
    editMutation.mutate({ id: editModal.restaurant._id, data: editForm });
  };

  const restaurants = data?.restaurants || [];
  const filtered = restaurants
    .filter((r) => search ? r.name.toLowerCase().includes(search.toLowerCase()) || (r.address?.city || '').toLowerCase().includes(search.toLowerCase()) : true)
    .filter((r) => statusFilter === 'all' || r.status === statusFilter);

  const pendingCount = restaurants.filter((r) => r.status === 'pending').length;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group gap="sm">
          <Title order={2}>Restaurants</Title>
          {pendingCount > 0 && <Badge color="orange" size="lg">{pendingCount} pending</Badge>}
        </Group>
        <Button color="gold" leftSection={<IconPlus size={16} />} onClick={() => navigate('/restaurants/new')}>
          Create Restaurant
        </Button>
      </Group>

      {/* Filters */}
      <Card withBorder radius="md" p="md">
        <Group gap="sm">
          <TextInput
            placeholder="Search restaurant or city..."
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
              { value: 'pending', label: '⏳ Pending' },
              { value: 'active', label: '✅ Active' },
              { value: 'approved', label: '✅ Approved' },
              { value: 'suspended', label: '🔴 Suspended' },
              { value: 'rejected', label: '❌ Rejected' },
            ]}
            style={{ width: 180 }}
          />
        </Group>
      </Card>

      {/* Table */}
      <Card withBorder radius="md" p={0}>
        <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
          <Table.Thead style={{ background: '#123f66' }}>
            <Table.Tr>
              <Table.Th>Restaurant</Table.Th>
              <Table.Th>Owner</Table.Th>
              <Table.Th>City</Table.Th>
              <Table.Th>Plan</Table.Th>
              <Table.Th>Commission</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              [1,2,3,4].map((i) => (
                <Table.Tr key={i}>
                  {[1,2,3,4,5,6,7].map((j) => <Table.Td key={j}><Skeleton height={20} /></Table.Td>)}
                </Table.Tr>
              ))
            ) : filtered.map((r) => (
              <Table.Tr key={r._id}>
                <Table.Td>
                  <Group gap={8}>
                    <Avatar size="sm" color="gold">{r.name.charAt(0)}</Avatar>
                    <Stack gap={0}>
                      <Text size="sm" fw={600}>{r.name}</Text>
                      <Text size="xs" c="dimmed">{r.cuisine?.slice(0, 2).join(', ')}</Text>
                    </Stack>
                  </Group>
                </Table.Td>
                <Table.Td><Text size="sm">{r.owner?.name}</Text></Table.Td>
                <Table.Td><Text size="sm">{r.address?.city}</Text></Table.Td>
                <Table.Td>
                  <Badge color={PLAN_COLORS[r.subscriptionPlan] || 'gray'} size="sm" variant="light">
                    {r.subscriptionPlan}
                  </Badge>
                </Table.Td>
                <Table.Td><Text size="sm" fw={600}>{r.commission}%</Text></Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLORS[r.status] || 'gray'} variant="light" size="sm">{r.status}</Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {r.status === 'pending' && (
                      <>
                        <ActionIcon size="sm" color="green" variant="light"
                          title="Approve" loading={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(r._id)}>
                          <IconCheck size={13} />
                        </ActionIcon>
                        <ActionIcon size="sm" color="red" variant="light"
                          title="Reject"
                          onClick={() => setRejectModal({ open: true, restaurant: r })}>
                          <IconX size={13} />
                        </ActionIcon>
                      </>
                    )}
                    <Menu shadow="md" position="bottom-end">
                      <Menu.Target>
                        <ActionIcon size="sm" variant="subtle">
                          <IconDotsVertical size={13} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEye size={13} />}
                          onClick={() => navigate(`/restaurants/${r._id}`)}>
                          View Details
                        </Menu.Item>
                        <Menu.Item leftSection={<IconEdit size={13} />}
                          onClick={() => openEditModal(r)}>
                          Edit
                        </Menu.Item>
                        <Menu.Item leftSection={<IconCurrencyRupee size={13} />}
                          onClick={() => { setCommModal({ open: true, restaurant: r }); setCommission(r.commission); }}>
                          Set Commission
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item leftSection={<IconBan size={13} />} color={r.status === 'suspended' ? 'green' : 'orange'}
                          onClick={() => toggleBlockMutation.mutate(r._id)}>
                          {r.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                        </Menu.Item>
                        <Menu.Item leftSection={<IconTrash size={13} />} color="red"
                          onClick={() => setDeleteModal({ open: true, restaurant: r })}>
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Edit Modal */}
      <Modal opened={editModal.open} onClose={() => setEditModal({ open: false, restaurant: null })}
        title={<Text fw={700}>Edit: {editModal.restaurant?.name}</Text>} centered size="lg">
        <Stack gap="md">
          <Grid gutter="sm">
            <Grid.Col span={6}>
              <TextInput label="Restaurant Name" value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="City" value={editForm.city}
                onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="State" value={editForm.state}
                onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="Street Address" value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="Phone" value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="Email" value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select label="Price Range" value={editForm.priceRange} data={PRICE_RANGES}
                onChange={(v) => setEditForm((f) => ({ ...f, priceRange: v }))} />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select label="Status" value={editForm.status} data={STATUS_OPTIONS}
                onChange={(v) => setEditForm((f) => ({ ...f, status: v }))} />
            </Grid.Col>
            <Grid.Col span={12}>
              <MultiSelect label="Cuisines" data={CUISINE_OPTIONS} value={editForm.cuisine}
                onChange={(v) => setEditForm((f) => ({ ...f, cuisine: v }))} searchable />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea label="Description" value={editForm.description} rows={3}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </Grid.Col>
          </Grid>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal({ open: false, restaurant: null })}>Cancel</Button>
            <Button color="gold" loading={editMutation.isPending} onClick={handleEditSubmit}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal opened={deleteModal.open} onClose={() => setDeleteModal({ open: false, restaurant: null })}
        title="Delete Restaurant" centered size="sm">
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete <strong>{deleteModal.restaurant?.name}</strong>?
            This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteModal({ open: false, restaurant: null })}>Cancel</Button>
            <Button color="red" loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteModal.restaurant?._id)}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Reject Modal */}
      <Modal opened={rejectModal.open} onClose={() => setRejectModal({ open: false, restaurant: null })}
        title={`Reject: ${rejectModal.restaurant?.name}`} centered size="sm">
        <Stack gap="md">
          <Textarea placeholder="Reason for rejection..." value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setRejectModal({ open: false, restaurant: null })}>Cancel</Button>
            <Button color="red" loading={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ id: rejectModal.restaurant?._id, reason: rejectReason })}>
              Reject
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Commission Modal */}
      <Modal opened={commModal.open} onClose={() => setCommModal({ open: false, restaurant: null })}
        title={`Commission: ${commModal.restaurant?.name}`} centered size="sm">
        <Stack gap="md">
          <NumberInput label="Commission %" value={commission} onChange={setCommission} min={0} max={50} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setCommModal({ open: false, restaurant: null })}>Cancel</Button>
            <Button color="gold" loading={commissionMutation.isPending}
              onClick={() => commissionMutation.mutate({ id: commModal.restaurant?._id, commission })}>
              Update
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
