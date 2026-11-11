import { useState } from 'react';
import {
  Stack, Title, Group, Card, Text, Button, Textarea, Select, MultiSelect,
  Badge, Tabs, Box, Switch, SimpleGrid,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBell, IconSend, IconUsers, IconBuildingStore } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { notificationApi } from '../../api';


export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('send');

  const form = useForm({
    initialValues: {
      title: '', body: '', target: 'all', channels: ['push'],
    },
    validate: {
      title: (v) => (v.trim().length >= 2 ? null : 'Title required'),
      body: (v) => (v.trim().length >= 10 ? null : 'Message must be at least 10 characters'),
    },
  });

  const sendMutation = useMutation({
    mutationFn: (data) => notificationApi.sendBulk(data),
    onSuccess: () => {
      notifications.show({ title: 'Notifications sent!', color: 'green' });
      form.reset();
    },
    onError: () => notifications.show({ title: 'Failed to send', color: 'red' }),
  });

  const { data: historyData } = useQuery({
    queryKey: ['notification-history'],
    queryFn: () => notificationApi.getHistory({}).then((r) => r.data.data.notifications),
  });

  const history = historyData || [];

  return (
    <Stack gap="lg">
      <Title order={2}>Notifications</Title>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="send" leftSection={<IconSend size={14} />}>Send Notification</Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconBell size={14} />}>History</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="send" pt="lg">
          <Card withBorder radius="md" p="xl" maw={640}>
            <Text fw={700} mb="lg" size="lg">Broadcast Notification</Text>
            <form onSubmit={form.onSubmit((v) => sendMutation.mutate(v))}>
              <Stack gap="md">
                <Select
                  label="Target Audience"
                  data={[
                    { value: 'all', label: '🌐 All Users' },
                    { value: 'customers', label: '👤 Customers Only' },
                    { value: 'owners', label: '🏪 Restaurant Owners Only' },
                  ]}
                  {...form.getInputProps('target')}
                />

                <MultiSelect
                  label="Channels"
                  data={[
                    { value: 'push', label: '📱 Push Notification' },
                    { value: 'email', label: '📧 Email' },
                    { value: 'sms', label: '💬 SMS' },
                  ]}
                  {...form.getInputProps('channels')}
                />

                <SimpleGrid cols={2}>
                  <Box p="md" style={{ background: '#123f66', borderRadius: 8, textAlign: 'center' }}>
                    <IconUsers size={24} color="#2a628f" />
                    <Text size="sm" fw={700} mt={4}>12,840</Text>
                    <Text size="xs" c="dimmed">Total customers</Text>
                  </Box>
                  <Box p="md" style={{ background: '#123f66', borderRadius: 8, textAlign: 'center' }}>
                    <IconBuildingStore size={24} color="#2d6a4f" />
                    <Text size="sm" fw={700} mt={4}>342</Text>
                    <Text size="xs" c="dimmed">Restaurant owners</Text>
                  </Box>
                </SimpleGrid>

                <Textarea
                  label="Notification Title"
                  placeholder="e.g. Weekend Special Offer!"
                  rows={1}
                  {...form.getInputProps('title')}
                />
                <Textarea
                  label="Message Body"
                  placeholder="Write your notification message here..."
                  rows={4}
                  {...form.getInputProps('body')}
                />

                <Group justify="flex-end">
                  <Button type="submit" color="gold" leftSection={<IconSend size={16} />}
                    loading={sendMutation.isPending} size="md">
                    Send Notification
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="lg">
          {history.length === 0 ? (
            <Card withBorder radius="md" p="xl" ta="center">
              <IconBell size={32} color="#adb5bd" style={{ margin: '0 auto 8px' }} />
              <Text c="dimmed" size="sm">No notification history yet</Text>
            </Card>
          ) : (
            <Stack gap="md">
              {history.map((n) => (
                <Card key={n._id} withBorder radius="md" p="lg">
                  <Group justify="space-between" mb="sm">
                    <Text fw={700}>{n.title}</Text>
                    <Text size="xs" c="dimmed">{new Date(n.createdAt).toLocaleString()}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">{n.body}</Text>
                </Card>
              ))}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
