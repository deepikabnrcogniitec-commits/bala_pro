import { useState } from 'react';
import {
  Box, Paper, TextInput, PasswordInput, Button, Text, Title,
  Stack, Alert, Center, Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconMail, IconAlertCircle, IconBuildingStore } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/logo.svg';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length >= 6 ? null : 'Password required'),
    },
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    onSuccess: ({ data }) => {
      const { user, accessToken, refreshToken } = data.data;
      if (!['owner', 'admin'].includes(user.role)) {
        setError('Access denied. Owner or Admin account required.');
        return;
      }
      setAuth(user, accessToken, refreshToken);
      notifications.show({ title: 'Welcome back!', message: user.name, color: 'green' });
      navigate('/dashboard');
    },
    onError: (err) => setError(err.response?.data?.message || 'Invalid credentials'),
  });

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #071c30 0%, #0c2f4e 50%, #123f66 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Box style={{ width: '100%', maxWidth: 440 }}>
        <Center mb="xl">
          <Stack align="center" gap="xs">
            <img
              src={logo}
              alt="Hungora"
              style={{ width: 84, height: 84, borderRadius: 20, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.5)' }}
            />
            <Title order={2} c="white">Hungora</Title>
            <Text c="rgba(255,255,255,0.65)" size="sm">Owner & Manager Portal</Text>
          </Stack>
        </Center>

        <Paper radius="lg" p="xl" shadow="xl">
          <Group gap="sm" mb="lg">
            <IconBuildingStore size={22} color="#cd302b" />
            <Title order={3}>Sign In</Title>
          </Group>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" variant="light">
              {error}
            </Alert>
          )}

          <form onSubmit={form.onSubmit((v) => { setError(''); loginMutation.mutate(v); })}>
            <Stack gap="sm">
              <TextInput
                label="Email Address"
                placeholder="owner@restaurant.com"
                leftSection={<IconMail size={16} />}
                required
                {...form.getInputProps('email')}
              />
              <PasswordInput
                label="Password"
                placeholder="••••••••"
                required
                {...form.getInputProps('password')}
              />
              <Button
                type="submit"
                fullWidth
                size="md"
                color="brand"
                loading={loginMutation.isPending}
                mt="xs"
              >
                Sign In to Dashboard
              </Button>
            </Stack>
          </form>

          <Text ta="center" size="xs" c="dimmed" mt="lg">
            For customer app, download Hungora mobile app
          </Text>
        </Paper>
      </Box>
    </Box>
  );
}
