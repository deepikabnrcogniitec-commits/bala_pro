import { useState } from 'react';
import {
  Stack, Title, Group, Card, Text, TextInput, PasswordInput, Button,
  Grid, Divider, Select, MultiSelect, NumberInput, Textarea, FileInput,
  ActionIcon, Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowLeft, IconBuildingStore, IconUser, IconCheck, IconFileText, IconUpload } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { restaurantApi } from '../../api';

const CUISINE_OPTIONS = [
  'North Indian', 'South Indian', 'Chinese', 'Italian', 'Continental',
  'Mughlai', 'Fast Food', 'Pizza', 'Biryani', 'Seafood', 'Bengali',
  'Maharashtrian', 'Gujarati', 'Kerala', 'Tandoor', 'Rolls', 'Desserts',
];

const PRICE_RANGES = [
  { value: '$', label: '$ — Budget (under ₹300)' },
  { value: '$$', label: '$$ — Moderate (₹300–₹700)' },
  { value: '$$$', label: '$$$ — Upscale (₹700–₹1500)' },
  { value: '$$$$', label: '$$$$ — Fine Dining (₹1500+)' },
];

export default function CreateRestaurantPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [success, setSuccess] = useState(null);

  const form = useForm({
    initialValues: {
      // Owner
      ownerName: '',
      ownerEmail: '',
      ownerPassword: '',
      ownerPhone: '',
      // Restaurant
      name: '',
      city: '',
      state: '',
      address: '',
      cuisine: [],
      priceRange: '$$',
      phone: '',
      email: '',
      description: '',
      subscriptionPlan: 'basic',
      commission: 10,
      // KYC documents
      fssaiNumber: '',
      fssaiDoc: null,
      panNumber: '',
      panDoc: null,
      aadharNumber: '',
      aadharDoc: null,
    },
    validate: {
      ownerName: (v) => (v.trim().length >= 2 ? null : 'Owner name required'),
      ownerEmail: (v) => (/^\S+@\S+$/.test(v) ? null : 'Valid email required'),
      ownerPassword: (v) => (v.length >= 8 ? null : 'Password must be at least 8 characters'),
      name: (v) => (v.trim().length >= 2 ? null : 'Restaurant name required'),
      city: (v) => (v.trim().length >= 2 ? null : 'City required'),
      fssaiNumber: (v) => (!v || v.trim().length >= 5 ? null : 'FSSAI license number looks too short'),
      panNumber: (v) => (!v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.trim().toUpperCase()) ? null : 'Valid PAN format (e.g. ABCDE1234F)'),
      aadharNumber: (v) => (!v || /^\d{12}$/.test(v.trim()) ? null : 'Aadhar number must be 12 digits'),
    },
  });

  const createMutation = useMutation({
    mutationFn: (values) => {
      const fd = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        if (Array.isArray(value)) {
          value.forEach((v) => fd.append(key, v));
        } else {
          fd.append(key, value);
        }
      });
      return restaurantApi.create(fd);
    },
    onSuccess: ({ data }) => {
      setSuccess(data.data);
      notifications.show({ title: 'Restaurant created!', message: `${data.data.restaurant.name} is now live`, color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-restaurants'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed to create', color: 'red' }),
  });

  if (success) {
    return (
      <Stack gap="lg" align="center" py={48}>
        <IconCheck size={56} color="#2d6a4f" style={{ background: '#e8f5e9', borderRadius: '50%', padding: 12 }} />
        <Title order={2} c="green">Restaurant Created Successfully!</Title>

        <Card withBorder radius="md" p="xl" maw={480} w="100%">
          <Stack gap="md">
            <Group>
              <IconBuildingStore size={20} color="#2a628f" />
              <Text fw={700}>{success.restaurant.name}</Text>
              <Badge color="green">Active</Badge>
            </Group>
            <Divider />
            <Text size="sm" fw={600} c="dimmed" tt="uppercase">Owner Login Credentials</Text>
            <Stack gap={4}>
              <Group gap={8}>
                <Text size="sm" c="dimmed" style={{ width: 80 }}>Name:</Text>
                <Text size="sm" fw={600}>{success.owner.name}</Text>
              </Group>
              <Group gap={8}>
                <Text size="sm" c="dimmed" style={{ width: 80 }}>Email:</Text>
                <Text size="sm" fw={600}>{success.owner.email}</Text>
              </Group>
              <Group gap={8}>
                <Text size="sm" c="dimmed" style={{ width: 80 }}>Password:</Text>
                <Text size="sm" fw={600} style={{ fontFamily: 'monospace' }}>{form.values.ownerPassword}</Text>
              </Group>
            </Stack>
            <Text size="xs" c="dimmed">Share these credentials with the restaurant owner to login at the Owner Portal.</Text>
          </Stack>
        </Card>

        <Group>
          <Button variant="subtle" onClick={() => navigate('/restaurants')}>Back to Restaurants</Button>
          <Button color="gold" onClick={() => { setSuccess(null); form.reset(); }}>Create Another</Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/restaurants')}>
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Title order={2}>Create Restaurant</Title>
      </Group>

      <form onSubmit={form.onSubmit((v) => createMutation.mutate(v))}>
        <Grid gutter="md">
          {/* Owner Account */}
          <Grid.Col span={12}>
            <Card withBorder radius="md" p="lg">
              <Group gap="sm" mb="lg">
                <IconUser size={18} color="#2a628f" />
                <Text fw={700} size="lg">Owner Account</Text>
                <Text size="xs" c="dimmed">(used to login to Owner Portal)</Text>
              </Group>
              <Grid gutter="md">
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label="Owner Full Name" placeholder="Rajesh Kumar" required {...form.getInputProps('ownerName')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label="Owner Email" placeholder="owner@restaurant.com" required {...form.getInputProps('ownerEmail')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <PasswordInput
                    label="Login Password"
                    placeholder="Minimum 8 characters"
                    description="Owner will use this to login"
                    required
                    {...form.getInputProps('ownerPassword')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label="Owner Phone" placeholder="+91 9876543210" {...form.getInputProps('ownerPhone')} />
                </Grid.Col>
              </Grid>
            </Card>
          </Grid.Col>

          {/* Restaurant Details */}
          <Grid.Col span={12}>
            <Card withBorder radius="md" p="lg">
              <Group gap="sm" mb="lg">
                <IconBuildingStore size={18} color="#cd302b" />
                <Text fw={700} size="lg">Restaurant Details</Text>
              </Group>
              <Grid gutter="md">
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label="Restaurant Name" placeholder="Spice Garden" required {...form.getInputProps('name')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label="City" placeholder="Chennai" required {...form.getInputProps('city')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label="State" placeholder="Tamil Nadu" {...form.getInputProps('state')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label="Street Address" placeholder="123, Anna Salai" {...form.getInputProps('address')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label="Restaurant Phone" placeholder="+91 9876543210" {...form.getInputProps('phone')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label="Restaurant Email" placeholder="info@restaurant.com" {...form.getInputProps('email')} />
                </Grid.Col>
                <Grid.Col span={12}>
                  <MultiSelect
                    label="Cuisine Types"
                    placeholder="Select cuisines"
                    data={CUISINE_OPTIONS}
                    {...form.getInputProps('cuisine')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select label="Price Range" data={PRICE_RANGES} {...form.getInputProps('priceRange')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label="Subscription Plan"
                    data={[
                      { value: 'basic', label: 'Basic' },
                      { value: 'premium', label: 'Premium' },
                      { value: 'enterprise', label: 'Enterprise' },
                    ]}
                    {...form.getInputProps('subscriptionPlan')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <NumberInput label="Commission %" min={0} max={50} {...form.getInputProps('commission')} />
                </Grid.Col>
                <Grid.Col span={12}>
                  <Textarea label="Description" placeholder="Brief description of the restaurant..." rows={3} {...form.getInputProps('description')} />
                </Grid.Col>
              </Grid>
            </Card>
          </Grid.Col>

          {/* KYC Documents */}
          <Grid.Col span={12}>
            <Card withBorder radius="md" p="lg">
              <Group gap="sm" mb="lg">
                <IconFileText size={18} color="#f9a91b" />
                <Text fw={700} size="lg">Business Documents</Text>
                <Text size="xs" c="dimmed">(FSSAI, PAN & Aadhar — optional, can be added later)</Text>
              </Group>
              <Grid gutter="md">
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="FSSAI License Number"
                    placeholder="14-digit FSSAI number"
                    {...form.getInputProps('fssaiNumber')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <FileInput
                    label="FSSAI Certificate"
                    placeholder="Upload PDF or photo"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    leftSection={<IconUpload size={16} />}
                    clearable
                    {...form.getInputProps('fssaiDoc')}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="PAN Number"
                    placeholder="ABCDE1234F"
                    {...form.getInputProps('panNumber')}
                    onChange={(e) => form.setFieldValue('panNumber', e.currentTarget.value.toUpperCase())}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <FileInput
                    label="PAN Card"
                    placeholder="Upload PDF or photo"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    leftSection={<IconUpload size={16} />}
                    clearable
                    {...form.getInputProps('panDoc')}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Aadhar Number"
                    placeholder="12-digit Aadhar number"
                    {...form.getInputProps('aadharNumber')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <FileInput
                    label="Aadhar Card"
                    placeholder="Upload PDF or photo"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    leftSection={<IconUpload size={16} />}
                    clearable
                    {...form.getInputProps('aadharDoc')}
                  />
                </Grid.Col>
              </Grid>
            </Card>
          </Grid.Col>

          <Grid.Col span={12}>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => navigate('/restaurants')}>Cancel</Button>
              <Button type="submit" color="gold" size="md" loading={createMutation.isPending}
                leftSection={<IconBuildingStore size={16} />}>
                Create Restaurant & Owner Account
              </Button>
            </Group>
          </Grid.Col>
        </Grid>
      </form>
    </Stack>
  );
}
