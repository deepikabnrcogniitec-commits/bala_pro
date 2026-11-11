import { useState } from 'react';
import {
  Stack, Title, Group, TextInput, Select, Card, Table, Badge,
  Avatar, Text, Skeleton, ActionIcon, Box,
} from '@mantine/core';
import { IconSearch, IconTrash, IconEye } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { reviewApi } from '../../api';


export default function ReviewsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', search, ratingFilter],
    queryFn: () => reviewApi.getAll({ search, rating: ratingFilter !== 'all' ? ratingFilter : undefined })
      .then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => reviewApi.delete(id),
    onSuccess: () => {
      notifications.show({ title: 'Review deleted', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });

  const reviews = data?.reviews || [];

  return (
    <Stack gap="lg">
      <Title order={2}>Reviews Moderation</Title>

      <Card withBorder radius="md" p="md">
        <Group gap="sm">
          <TextInput
            placeholder="Search reviews..."
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            value={ratingFilter}
            onChange={setRatingFilter}
            data={[
              { value: 'all', label: 'All Ratings' },
              { value: '1', label: '⭐ 1 Star' },
              { value: '2', label: '⭐⭐ 2 Stars' },
              { value: '3', label: '⭐⭐⭐ 3 Stars' },
              { value: '4', label: '⭐⭐⭐⭐ 4 Stars' },
              { value: '5', label: '⭐⭐⭐⭐⭐ 5 Stars' },
            ]}
            style={{ width: 180 }}
          />
        </Group>
      </Card>

      <Card withBorder radius="md" p={0}>
        <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
          <Table.Thead style={{ background: '#123f66' }}>
            <Table.Tr>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Restaurant</Table.Th>
              <Table.Th>Rating</Table.Th>
              <Table.Th>Review</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              [1,2,3].map((i) => (
                <Table.Tr key={i}>
                  {[1,2,3,4,5,6].map((j) => <Table.Td key={j}><Skeleton height={20} /></Table.Td>)}
                </Table.Tr>
              ))
            ) : reviews.map((r) => (
              <Table.Tr key={r._id}>
                <Table.Td>
                  <Group gap={8}>
                    <Avatar size="xs" color="gold">{r.customer?.name?.charAt(0)}</Avatar>
                    <Text size="sm">{r.customer?.name}</Text>
                  </Group>
                </Table.Td>
                <Table.Td><Text size="sm">{r.restaurant?.name}</Text></Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Text size="sm" fw={700}>{r.rating}</Text>
                    <Text size="sm">⭐</Text>
                    {r.isReported && <Badge color="red" size="xs">Reported</Badge>}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" lineClamp={2} style={{ maxWidth: 300 }}>{r.comment}</Text>
                </Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{new Date(r.createdAt).toLocaleDateString()}</Text></Table.Td>
                <Table.Td>
                  <ActionIcon size="sm" color="red" variant="subtle"
                    onClick={() => deleteMutation.mutate(r._id)}
                    loading={deleteMutation.isPending}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}
