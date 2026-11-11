import {
  Stack, Title, Group, Card, Text, Badge, Avatar, ActionIcon, Button,
  Grid, Divider, SimpleGrid, Box, Select, NumberInput, Modal,
} from '@mantine/core';
import { IconArrowLeft, IconCheck, IconX, IconFileText, IconExternalLink } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { restaurantApi } from '../../api';


const PLAN_OPTIONS = ['basic', 'premium', 'enterprise'];

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newPlan, setNewPlan] = useState('');
  const [newCommission, setNewCommission] = useState(10);
  const [preview, setPreview] = useState(null);

  const { data: restaurant } = useQuery({
    queryKey: ['admin-restaurant', id],
    queryFn: () => restaurantApi.getById(id).then((r) => {
      const data = r.data.data.restaurant;
      if (data) {
        setNewCommission(data.commission ?? 10);
        setNewPlan(data.subscriptionPlan ?? 'basic');
      }
      return data;
    }),
  });

  const r = restaurant || {};

  const approveMutation = useMutation({
    mutationFn: () => restaurantApi.approve(id),
    onSuccess: () => { notifications.show({ title: 'Approved!', color: 'green' }); qc.invalidateQueries({ queryKey: ['admin-restaurant', id] }); },
  });

  const commissionMutation = useMutation({
    mutationFn: () => restaurantApi.updateCommission(id, newCommission),
    onSuccess: () => { notifications.show({ title: 'Commission updated', color: 'green' }); qc.invalidateQueries({ queryKey: ['admin-restaurant', id] }); },
  });

  const planMutation = useMutation({
    mutationFn: () => restaurantApi.updateSubscription(id, newPlan),
    onSuccess: () => { notifications.show({ title: 'Plan updated', color: 'green' }); qc.invalidateQueries({ queryKey: ['admin-restaurant', id] }); },
  });

  return (
    <Stack gap="lg">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/restaurants')}>
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Title order={2}>{r.name}</Title>
        <Badge color={r.status === 'active' || r.status === 'approved' ? 'green' : r.status === 'pending' ? 'yellow' : r.status === 'suspended' ? 'orange' : 'red'} size="lg">
          {r.status}
        </Badge>
      </Group>

      <Grid gutter="md">
        {/* Left */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Restaurant Info</Text>
              <Stack gap={8}>
                <Group gap={6}><Text size="sm" c="dimmed" style={{ width: 80 }}>City:</Text><Text size="sm" fw={600}>{r.address?.city}</Text></Group>
                <Group gap={6}><Text size="sm" c="dimmed" style={{ width: 80 }}>Phone:</Text><Text size="sm">{r.contact?.phone}</Text></Group>
                <Group gap={6}><Text size="sm" c="dimmed" style={{ width: 80 }}>Email:</Text><Text size="sm">{r.contact?.email}</Text></Group>
                <Group gap={6}><Text size="sm" c="dimmed" style={{ width: 80 }}>Rating:</Text><Text size="sm" fw={700}>⭐ {r.averageRating?.toFixed(1)} ({r.totalReviews} reviews)</Text></Group>
                <Group gap={6}><Text size="sm" c="dimmed" style={{ width: 80 }}>Since:</Text><Text size="sm">{new Date(r.createdAt).toLocaleDateString()}</Text></Group>
              </Stack>

              {r.status === 'pending' && (
                <>
                  <Divider my="md" />
                  <Group>
                    <Button color="green" leftSection={<IconCheck size={14} />} size="sm"
                      loading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                      Approve
                    </Button>
                    <Button color="red" variant="light" leftSection={<IconX size={14} />} size="sm">
                      Reject
                    </Button>
                  </Group>
                </>
              )}
            </Card>

            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Owner</Text>
              <Group gap="sm" mb="sm">
                <Avatar color="gold" size="md">{r.owner?.name?.charAt(0)}</Avatar>
                <Stack gap={2}>
                  <Text fw={700} size="sm">{r.owner?.name}</Text>
                  <Text size="xs" c="dimmed">{r.owner?.email}</Text>
                </Stack>
              </Group>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Group justify="space-between" mb="md">
                <Group gap={8}>
                  <IconFileText size={16} color="#f9a91b" />
                  <Text fw={700} size="sm" c="dimmed" tt="uppercase">Business Documents</Text>
                </Group>
                <Badge color={r.documentsVerified ? 'green' : 'yellow'} variant="light" size="sm">
                  {r.documentsVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </Group>
              <Stack gap={10}>
                {[
                  { label: 'FSSAI License', doc: r.documents?.fssai },
                  { label: 'PAN Card', doc: r.documents?.pan },
                  { label: 'Aadhar Card', doc: r.documents?.aadhar },
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
            </Card>
          </Stack>
        </Grid.Col>

        {/* Right */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Performance</Text>
              <SimpleGrid cols={4}>
                {[
                  { label: 'Total Bookings', value: r.stats?.totalBookings || 0, color: '#2a628f' },
                  { label: 'Completed', value: r.stats?.completedBookings || 0, color: '#2d6a4f' },
                  { label: 'Revenue', value: `₹${(r.stats?.revenue || 0).toLocaleString('en-IN')}`, color: '#f9a91b' },
                  { label: 'Cancel Rate', value: `${r.stats?.cancelRate || 0}%`, color: '#cd302b' },
                ].map(({ label, value, color }) => (
                  <Box key={label} ta="center" p="md" style={{ background: '#123f66', borderRadius: 8 }}>
                    <Text fw={800} size="lg" c={color}>{value}</Text>
                    <Text size="xs" c="dimmed">{label}</Text>
                  </Box>
                ))}
              </SimpleGrid>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Commission Settings</Text>
              <Group gap="sm">
                <NumberInput
                  label="Commission %"
                  value={newCommission}
                  onChange={setNewCommission}
                  min={0} max={50}
                  style={{ width: 160 }}
                />
                <Button mt={24} color="gold" onClick={() => commissionMutation.mutate()}
                  loading={commissionMutation.isPending}>
                  Update
                </Button>
              </Group>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Subscription Plan</Text>
              <Group gap="sm">
                <Select
                  label="Plan"
                  value={newPlan || r.subscriptionPlan}
                  onChange={setNewPlan}
                  data={PLAN_OPTIONS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
                  style={{ width: 200 }}
                />
                <Button mt={24} color="gold" onClick={() => planMutation.mutate()}
                  loading={planMutation.isPending}>
                  Update Plan
                </Button>
              </Group>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

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
