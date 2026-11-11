import { useState, useEffect } from 'react';
import {
  Stack, Title, Group, Button, Card, Text, Badge, ActionIcon, Select,
  Modal, TextInput, NumberInput, Switch, SimpleGrid, Box, Grid, Skeleton,
  SegmentedControl,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconEdit, IconTrash, IconTable } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { tableApi, restaurantApi } from '../../api';

const TABLE_TYPES = [
  { value: 'indoor', label: '🍽️ Indoor', color: 'blue' },
  { value: 'outdoor', label: '🌿 Outdoor', color: 'green' },
  { value: 'booth', label: '🛋️ Booth', color: 'violet' },
  { value: 'bar', label: '🍹 Bar', color: 'orange' },
  { value: 'private', label: '🔒 Private', color: 'red' },
];

const TYPE_EMOJIS = { indoor: '🍽️', outdoor: '🌿', booth: '🛋️', bar: '🍹', private: '🔒' };
const TYPE_COLORS = { indoor: 'blue', outdoor: 'green', booth: 'violet', bar: 'orange', private: 'red' };

function TableFormModal({ opened, onClose, table, restaurantId }) {
  const qc = useQueryClient();
  const isEdit = !!table?._id;

  const form = useForm({
    initialValues: {
      name: table?.name || '', type: table?.type || 'indoor',
      capacity: table?.capacity || 2, floor: table?.floor || 1, isActive: table?.isActive ?? true,
    },
    validate: {
      name: (v) => (v.trim().length >= 1 ? null : 'Table name required'),
      capacity: (v) => (v >= 1 ? null : 'Capacity must be at least 1'),
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? tableApi.update(restaurantId, table._id, data)
      : tableApi.create(restaurantId, data),
    onSuccess: () => {
      notifications.show({ title: isEdit ? 'Table updated' : 'Table added', color: 'green' });
      qc.invalidateQueries({ queryKey: ['tables', restaurantId] });
      onClose();
      form.reset();
    },
    onError: (err) => notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit Table' : 'Add Table'} centered size="sm">
      <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
        <Stack gap="md">
          <Grid gutter="md">
            <Grid.Col span={8}>
              <TextInput label="Table Name" placeholder="e.g. Table 1" required {...form.getInputProps('name')} />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput label="Capacity" min={1} max={50} required {...form.getInputProps('capacity')} />
            </Grid.Col>
            <Grid.Col span={8}>
              <Select
                label="Type"
                data={TABLE_TYPES}
                value={form.values.type}
                onChange={(v) => form.setFieldValue('type', v)}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput label="Floor" min={0} max={20} {...form.getInputProps('floor')} />
            </Grid.Col>
            <Grid.Col span={12}>
              <Switch label="Table Available" checked={form.values.isActive}
                onChange={(e) => form.setFieldValue('isActive', e.target.checked)} color="green" />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" color="brand" loading={mutation.isPending}>
              {isEdit ? 'Save Changes' : 'Add Table'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default function TablesPage() {
  const qc = useQueryClient();
  const [restaurantId, setRestaurantId] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modal, setModal] = useState({ open: false, table: null });

  const { data: restaurants } = useQuery({
    queryKey: ['my-restaurants'],
    queryFn: () => restaurantApi.getMyRestaurants().then((r) => r.data.data.restaurants),
  });

  useEffect(() => {
    if (restaurants?.[0] && !restaurantId) setRestaurantId(restaurants[0]._id);
  }, [restaurants]);

  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: () => tableApi.getAll(restaurantId).then((r) => r.data.data.tables),
    enabled: !!restaurantId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => tableApi.update(restaurantId, id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables', restaurantId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => tableApi.delete(restaurantId, id),
    onSuccess: () => {
      notifications.show({ title: 'Table deleted', color: 'green' });
      qc.invalidateQueries({ queryKey: ['tables', restaurantId] });
    },
  });

  const tableList = tables || [];
  const filtered = typeFilter === 'all' ? tableList : tableList.filter((t) => t.type === typeFilter);
  const restaurantOptions = restaurants?.map((r) => ({ value: r._id, label: r.name })) || [];

  const stats = {
    total: tableList.length,
    active: tableList.filter((t) => t.isActive).length,
    totalCapacity: tableList.reduce((acc, t) => acc + t.capacity, 0),
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Tables</Title>
        <Group gap="sm">
          {restaurants?.length > 1 && (
            <Select data={restaurantOptions} value={restaurantId} onChange={setRestaurantId}
              placeholder="Select Restaurant" style={{ width: 200 }} />
          )}
          <Button leftSection={<IconPlus size={16} />} color="brand"
            onClick={() => setModal({ open: true, table: null })}>
            Add Table
          </Button>
        </Group>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={3} spacing="md">
        {[
          { label: 'Total Tables', value: stats.total },
          { label: 'Active Tables', value: stats.active },
          { label: 'Total Capacity', value: `${stats.totalCapacity} seats` },
        ].map(({ label, value }) => (
          <Card key={label} withBorder radius="md" p="md" ta="center">
            <Text size="xl" fw={800}>{value}</Text>
            <Text size="sm" c="dimmed">{label}</Text>
          </Card>
        ))}
      </SimpleGrid>

      {/* Type Filter */}
      <Group gap={8} wrap="wrap">
        {[{ value: 'all', label: 'All Types' }, ...TABLE_TYPES].map((t) => (
          <Button
            key={t.value}
            size="xs"
            variant={typeFilter === t.value ? 'filled' : 'light'}
            color={typeFilter === t.value ? 'brand' : 'gray'}
            onClick={() => setTypeFilter(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </Group>

      {/* Tables Grid */}
      {isLoading ? (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
          {[1,2,3,4,5,6].map((i) => <Skeleton key={i} height={160} radius="md" />)}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
          {filtered.map((table) => (
            <Card
              key={table._id}
              withBorder
              radius="md"
              p="md"
              style={{
                opacity: table.isActive ? 1 : 0.6,
                borderColor: table.isActive ? undefined : '#dee2e6',
                cursor: 'pointer',
              }}
            >
              <Stack gap="sm" align="center">
                <Box
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: table.isActive ? '#fff0f1' : '#f8f9fa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                  }}
                >
                  {TYPE_EMOJIS[table.type] || '🍽️'}
                </Box>
                <Stack gap={2} align="center">
                  <Text size="sm" fw={700}>{table.name}</Text>
                  <Badge size="xs" color={TYPE_COLORS[table.type] || 'gray'} variant="light">
                    {table.type}
                  </Badge>
                  <Text size="xs" c="dimmed">{table.capacity} seats • Floor {table.floor}</Text>
                </Stack>

                <Switch
                  size="sm"
                  checked={table.isActive}
                  onChange={(e) => toggleMutation.mutate({ id: table._id, isActive: e.target.checked })}
                  color="green"
                  label={table.isActive ? 'Open' : 'Closed'}
                />

                <Group gap={4}>
                  <ActionIcon size="sm" variant="subtle"
                    onClick={() => setModal({ open: true, table })}>
                    <IconEdit size={13} />
                  </ActionIcon>
                  <ActionIcon size="sm" color="red" variant="subtle"
                    onClick={() => deleteMutation.mutate(table._id)}>
                    <IconTrash size={13} />
                  </ActionIcon>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {filtered.length === 0 && !isLoading && (
        <Box py={60} style={{ textAlign: 'center' }}>
          <Text size={40} mb={8}>🪑</Text>
          <Text fw={600}>No tables found</Text>
          <Text c="dimmed" size="sm">Add tables to accept bookings</Text>
          <Button mt="md" color="brand" leftSection={<IconPlus size={16} />}
            onClick={() => setModal({ open: true, table: null })}>
            Add First Table
          </Button>
        </Box>
      )}

      <TableFormModal
        opened={modal.open}
        onClose={() => setModal({ open: false, table: null })}
        table={modal.table}
        restaurantId={restaurantId}
      />
    </Stack>
  );
}
