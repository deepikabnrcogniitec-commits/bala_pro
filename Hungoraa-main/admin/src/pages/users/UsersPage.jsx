import { useState } from 'react';
import {
  Stack, Title, Group, TextInput, Select, Card, Table, Avatar, Badge,
  ActionIcon, Text, Skeleton, Box, Menu, Pagination, Modal, PasswordInput, Button,
} from '@mantine/core';
import {
  IconSearch, IconDotsVertical, IconBan, IconEye, IconTrash, IconCheck, IconKey,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api';

const ROLE_COLORS = { customer: 'blue', owner: 'green', admin: 'red', staff: 'orange' };

export default function UsersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [resetModal, setResetModal] = useState({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn: () => userApi.getAll({ search, role: roleFilter !== 'all' ? roleFilter : undefined, page, limit: 20 })
      .then((r) => r.data.data),
  });

  const blockMutation = useMutation({
    mutationFn: (id) => userApi.toggleBlock(id),
    onSuccess: () => {
      notifications.show({ title: 'User updated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => userApi.delete(id),
    onSuccess: () => {
      notifications.show({ title: 'User deleted', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }) => userApi.resetPassword(id, password),
    onSuccess: () => {
      notifications.show({ title: 'Password reset', message: 'User must login with the new password', color: 'green' });
      setResetModal({ open: false, user: null });
      setNewPassword('');
    },
    onError: (err) => notifications.show({ title: 'Reset failed', message: err.response?.data?.message || 'Error', color: 'red' }),
  });

  const openResetModal = (u) => {
    setNewPassword('');
    setResetModal({ open: true, user: u });
  };

  const handleResetSubmit = () => {
    if (newPassword.length < 8) {
      notifications.show({ title: 'Too short', message: 'Password must be at least 8 characters', color: 'orange' });
      return;
    }
    resetPasswordMutation.mutate({ id: resetModal.user._id, password: newPassword });
  };

  const users = data?.users || [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Users</Title>
        <Text c="dimmed" size="sm">{data?.total || 0} total users</Text>
      </Group>

      {/* Filters */}
      <Card withBorder radius="md" p="md">
        <Group gap="sm">
          <TextInput
            placeholder="Search by name, email or phone..."
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            data={[
              { value: 'all', label: 'All Roles' },
              { value: 'customer', label: 'Customers' },
              { value: 'owner', label: 'Owners' },
              { value: 'admin', label: 'Admins' },
            ]}
            style={{ width: 160 }}
          />
        </Group>
      </Card>

      {/* Table */}
      <Card withBorder radius="md" p={0}>
        <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
          <Table.Thead style={{ background: '#123f66' }}>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Phone</Table.Th>
              <Table.Th>Joined</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              [1,2,3,4].map((i) => (
                <Table.Tr key={i}>
                  {[1,2,3,4,5,6].map((j) => <Table.Td key={j}><Skeleton height={20} /></Table.Td>)}
                </Table.Tr>
              ))
            ) : users.map((u) => (
              <Table.Tr key={u._id}>
                <Table.Td>
                  <Group gap={8}>
                    <Avatar size="sm" color="gold">{u.name?.charAt(0)}</Avatar>
                    <Stack gap={0}>
                      <Text size="sm" fw={600}>{u.name}</Text>
                      <Text size="xs" c="dimmed">{u.email}</Text>
                    </Stack>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color={ROLE_COLORS[u.role] || 'gray'} variant="light" size="sm">{u.role}</Badge>
                </Table.Td>
                <Table.Td><Text size="sm">{u.phone}</Text></Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{new Date(u.createdAt).toLocaleDateString()}</Text></Table.Td>
                <Table.Td>
                  {u.isBlocked ? (
                    <Badge color="red" variant="dot">Blocked</Badge>
                  ) : u.isActive ? (
                    <Badge color="green" variant="dot">Active</Badge>
                  ) : (
                    <Badge color="gray" variant="dot">Inactive</Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Menu shadow="md" position="bottom-end">
                    <Menu.Target>
                      <ActionIcon size="sm" variant="subtle">
                        <IconDotsVertical size={13} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEye size={13} />}
                        onClick={() => navigate(`/users/${u._id}`)}>
                        View Details
                      </Menu.Item>
                      <Menu.Item leftSection={<IconKey size={13} />} color="blue"
                        onClick={() => openResetModal(u)}>
                        Reset Password
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item leftSection={u.isBlocked ? <IconCheck size={13} /> : <IconBan size={13} />}
                        color={u.isBlocked ? 'green' : 'orange'}
                        onClick={() => blockMutation.mutate(u._id)}>
                        {u.isBlocked ? 'Unblock' : 'Block'}
                      </Menu.Item>
                      <Menu.Item leftSection={<IconTrash size={13} />} color="red"
                        onClick={() => deleteMutation.mutate(u._id)}>
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {users.length === 0 && !isLoading && (
          <Box py={48} style={{ textAlign: 'center' }}>
            <Text fw={600}>No users found</Text>
          </Box>
        )}
      </Card>

      {data?.pages > 1 && (
        <Group justify="center">
          <Pagination total={data.pages} value={page} onChange={setPage} color="gold" />
        </Group>
      )}

      {/* Reset Password Modal */}
      <Modal
        opened={resetModal.open}
        onClose={() => { setResetModal({ open: false, user: null }); setNewPassword(''); }}
        title={<Text fw={700}>Reset Password — {resetModal.user?.name}</Text>}
        centered size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            This will immediately update the password and invalidate all active sessions for this user.
          </Text>
          <PasswordInput
            label="New Password"
            placeholder="Min. 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => { setResetModal({ open: false, user: null }); setNewPassword(''); }}>
              Cancel
            </Button>
            <Button color="blue" loading={resetPasswordMutation.isPending} onClick={handleResetSubmit}>
              Reset Password
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
