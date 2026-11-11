import { useState } from 'react';
import {
  Stack, Title, Group, Button, Card, Text, Badge, ActionIcon,
  SimpleGrid, Avatar, Menu, Modal, Box, Skeleton,
} from '@mantine/core';
import {
  IconPlus, IconEdit, IconTrash, IconDotsVertical, IconMapPin,
  IconStar, IconCalendar, IconBuildingStore, IconEye, IconFileText, IconExternalLink,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { restaurantApi } from '../../api';

const PLAN_COLORS = { basic: 'blue', premium: 'gold', enterprise: 'violet' };

export default function RestaurantsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteModal, setDeleteModal] = useState({ open: false, restaurant: null });
  const [docsModal, setDocsModal] = useState({ open: false, restaurant: null });
  const [preview, setPreview] = useState(null);

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['my-restaurants'],
    queryFn: () => restaurantApi.getMyRestaurants().then((r) => r.data.data.restaurants),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => restaurantApi.delete(id),
    onSuccess: () => {
      notifications.show({ title: 'Restaurant removed', color: 'green' });
      qc.invalidateQueries({ queryKey: ['my-restaurants'] });
      setDeleteModal({ open: false, restaurant: null });
    },
  });

  const list = restaurants || [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>My Restaurants</Title>
        <Button leftSection={<IconPlus size={16} />} color="brand"
          onClick={() => navigate('/restaurants/new')}>
          Add Restaurant
        </Button>
      </Group>

      {isLoading ? (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {[1, 2].map((i) => <Skeleton key={i} height={240} radius="md" />)}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {list.map((r) => (
            <Card key={r._id} withBorder radius="md" p="lg" style={{ position: 'relative' }}>
              {/* Top right menu */}
              <Box style={{ position: 'absolute', top: 12, right: 12 }}>
                <Menu shadow="md" position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEye size={14} />}
                      onClick={() => navigate(`/restaurants/${r._id}`)}>
                      View
                    </Menu.Item>
                    <Menu.Item leftSection={<IconEdit size={14} />}
                      onClick={() => navigate(`/restaurants/${r._id}/edit`)}>
                      Edit
                    </Menu.Item>
                    <Menu.Item leftSection={<IconFileText size={14} />}
                      onClick={() => setDocsModal({ open: true, restaurant: r })}>
                      Documents
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item color="red" leftSection={<IconTrash size={14} />}
                      onClick={() => setDeleteModal({ open: true, restaurant: r })}>
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Box>

              {/* Restaurant Header */}
              <Group gap="md" mb="md">
                <Avatar
                  src={r.logo?.url}
                  size={56}
                  radius="md"
                  color="red"
                >
                  {r.name?.charAt(0)}
                </Avatar>
                <Stack gap={4} style={{ flex: 1 }}>
                  <Group gap={8}>
                    <Text fw={700} size="lg">{r.name}</Text>
                    <Badge color={PLAN_COLORS[r.subscriptionPlan] || 'gray'} size="xs" variant="light">
                      {r.subscriptionPlan}
                    </Badge>
                  </Group>
                  <Group gap={4}>
                    <IconMapPin size={13} color="#868e96" />
                    <Text size="sm" c="dimmed">{r.address?.city || r.city}</Text>
                  </Group>
                </Stack>
              </Group>

              {/* Cuisines */}
              <Group gap={6} mb="md">
                {r.cuisine?.slice(0, 3).map((c) => (
                  <Badge key={c} size="sm" variant="outline" color="brand">{c}</Badge>
                ))}
                {r.cuisine?.length > 3 && (
                  <Badge size="sm" variant="outline" color="gray">+{r.cuisine.length - 3}</Badge>
                )}
              </Group>

              {/* Stats */}
              <SimpleGrid cols={3} spacing="sm" mb="md">
                <Stack gap={2} align="center">
                  <Group gap={4}>
                    <IconStar size={14} color="#f4a261" />
                    <Text size="sm" fw={700}>{r.averageRating?.toFixed(1)}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">{r.totalReviews} reviews</Text>
                </Stack>
                <Stack gap={2} align="center">
                  <Group gap={4}>
                    <IconCalendar size={14} color="#457b9d" />
                    <Text size="sm" fw={700}>{r.stats?.totalBookings || 0}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">total bookings</Text>
                </Stack>
                <Stack gap={2} align="center">
                  <Text size="sm" fw={700}>₹{(r.stats?.monthlyRevenue || 0).toLocaleString('en-IN')}</Text>
                  <Text size="xs" c="dimmed">this month</Text>
                </Stack>
              </SimpleGrid>

              {/* Status + Actions */}
              <Group justify="space-between" pt="sm" style={{ borderTop: '1px solid #f1f3f5' }}>
                <Group gap={6}>
                  <Badge
                    color={
                      r.status === 'approved' || r.status === 'active' ? 'green'
                      : r.status === 'pending' ? 'yellow'
                      : r.status === 'rejected' ? 'red'
                      : 'gray'
                    }
                    variant="light"
                    size="sm"
                  >
                    {r.status === 'pending' ? 'Pending — Edit to publish' : r.status}
                  </Badge>
                  {!r.isActive && <Badge color="red" variant="dot" size="sm">Inactive</Badge>}
                </Group>
                <Group gap="sm">
                  <Button size="xs" variant="light" leftSection={<IconEdit size={13} />}
                    onClick={() => navigate(`/restaurants/${r._id}/edit`)}>
                    Edit
                  </Button>
                  <Button size="xs" color="brand" leftSection={<IconBuildingStore size={13} />}
                    onClick={() => navigate(`/bookings?restaurant=${r._id}`)}>
                    Manage
                  </Button>
                </Group>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Delete Confirmation */}
      <Modal opened={deleteModal.open} onClose={() => setDeleteModal({ open: false, restaurant: null })}
        title="Delete Restaurant" centered size="sm">
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete <strong>{deleteModal.restaurant?.name}</strong>? This will also remove all associated branches, tables, and menus.
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

      {/* Documents list */}
      <Modal
        opened={docsModal.open}
        onClose={() => setDocsModal({ open: false, restaurant: null })}
        title="Business Documents"
        centered
        size="sm"
      >
        <Stack gap={10}>
          {[
            { label: 'FSSAI License', doc: docsModal.restaurant?.documents?.fssai },
            { label: 'PAN Card', doc: docsModal.restaurant?.documents?.pan },
            { label: 'Aadhar Card', doc: docsModal.restaurant?.documents?.aadhar },
          ].map(({ label, doc }) => (
            <Group key={label} justify="space-between" wrap="nowrap">
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text size="xs" c="dimmed">{label}</Text>
                <Text size="sm" fw={600} truncate>{doc?.number || '—'}</Text>
              </Stack>
              {doc?.url && (
                <Button
                  variant="subtle"
                  size="xs"
                  rightSection={<IconExternalLink size={12} />}
                  onClick={() => setPreview({ label, url: doc.url })}
                >
                  View
                </Button>
              )}
            </Group>
          ))}
        </Stack>
      </Modal>

      {/* Document preview */}
      <Modal
        opened={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.label}
        size="lg"
        centered
      >
        {preview?.url.toLowerCase().endsWith('.pdf') ? (
          <iframe
            src={preview.url}
            title={preview.label}
            style={{ width: '100%', height: '70vh', border: 'none' }}
          />
        ) : (
          <img
            src={preview?.url}
            alt={preview?.label}
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
          />
        )}
        <Group justify="flex-end" mt="sm">
          <Button
            component="a"
            href={preview?.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="subtle"
            size="xs"
            rightSection={<IconExternalLink size={12} />}
          >
            Open in new tab
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
