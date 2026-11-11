import {
  Stack, Title, Group, Card, Text, Badge, Avatar, ActionIcon, Button,
  Grid, Divider, SimpleGrid, Box,
} from '@mantine/core';
import { IconArrowLeft, IconBan, IconCheck, IconMail, IconPhone } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { userApi } from '../../api';


export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => userApi.getById(id).then((r) => r.data.data),
  });

  const user = userData?.user;
  const bookingStats = userData?.stats || {};

  const blockMutation = useMutation({
    mutationFn: () => userApi.toggleBlock(id),
    onSuccess: () => {
      notifications.show({ title: 'User updated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
    },
  });

  const u = user || {};
  const s = bookingStats;

  return (
    <Stack gap="lg">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/users')}>
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Title order={2}>User Details</Title>
      </Group>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="lg" ta="center">
            <Avatar size={80} color="gold" radius="xl" mx="auto" mb="md">
              {u.name?.charAt(0)}
            </Avatar>
            <Text fw={700} size="lg">{u.name}</Text>
            <Badge color={u.role === 'admin' ? 'red' : u.role === 'owner' ? 'green' : 'blue'} mt={8}>
              {u.role}
            </Badge>

            <Divider my="md" />

            <Stack gap={8}>
              <Group gap={8} justify="center">
                <IconMail size={14} color="#868e96" />
                <Text size="sm">{u.email}</Text>
                {u.isEmailVerified && <Badge size="xs" color="green">Verified</Badge>}
              </Group>
              <Group gap={8} justify="center">
                <IconPhone size={14} color="#868e96" />
                <Text size="sm">{u.phone || 'Not set'}</Text>
                {u.isPhoneVerified && <Badge size="xs" color="green">Verified</Badge>}
              </Group>
            </Stack>

            <Divider my="md" />

            <Stack gap="sm">
              <Text size="xs" c="dimmed">Joined: {new Date(u.createdAt).toLocaleDateString()}</Text>
              <Badge color={u.isBlocked ? 'red' : 'green'} variant="light" size="lg">
                {u.isBlocked ? 'Blocked' : 'Active'}
              </Badge>
              <Button
                color={u.isBlocked ? 'green' : 'red'}
                variant="light"
                leftSection={u.isBlocked ? <IconCheck size={14} /> : <IconBan size={14} />}
                loading={blockMutation.isPending}
                onClick={() => blockMutation.mutate()}
                fullWidth
              >
                {u.isBlocked ? 'Unblock User' : 'Block User'}
              </Button>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Booking Statistics</Text>
              <SimpleGrid cols={3}>
                {[
                  { label: 'Total Bookings', value: s.totalBookings || 0, color: '#2a628f' },
                  { label: 'Completed', value: s.completedBookings || 0, color: '#2d6a4f' },
                  { label: 'Cancelled', value: s.cancelledBookings || 0, color: '#cd302b' },
                ].map(({ label, value, color }) => (
                  <Box key={label} ta="center" p="md" style={{ background: '#123f66', borderRadius: 8 }}>
                    <Text size="xl" fw={800} c={color}>{value}</Text>
                    <Text size="xs" c="dimmed">{label}</Text>
                  </Box>
                ))}
              </SimpleGrid>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Wallet</Text>
              <Group gap={8}>
                <Text size="xl" fw={800} c="gold">₹{u.wallet?.balance || 0}</Text>
                <Text size="sm" c="dimmed">available balance</Text>
              </Group>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
