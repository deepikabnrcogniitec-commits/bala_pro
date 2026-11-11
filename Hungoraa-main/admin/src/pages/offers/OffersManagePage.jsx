import { useState, useMemo } from 'react';
import {
  Stack, Title, Group, Button, Card, Text, Badge, ActionIcon, Select,
  Modal, TextInput, NumberInput, Switch, Grid, Box, Skeleton, Textarea,
  MultiSelect, Alert, SegmentedControl, FileInput, Image,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import {
  IconPlus, IconEdit, IconTrash, IconTag, IconInfoCircle, IconStar,
  IconDeviceMobile, IconClock, IconUpload,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { offerApi, restaurantApi } from '../../api';

const TYPE_LABELS = {
  percentage: '% Off', flat: 'Flat ₹ Off', free_item: 'Free Item',
  bogo: 'Buy 1 Get 1', early_bird: 'Early Bird', happy_hours: 'Happy Hours',
};
const TYPE_COLORS = {
  percentage: 'blue', flat: 'green', free_item: 'violet',
  bogo: 'orange', early_bird: 'teal', happy_hours: 'red',
};
const FUNDER_LABELS = {
  restaurant: 'Restaurant', platform: 'Platform (Hungora)', bank: 'Bank', combined: 'Shared',
};
const FUNDER_COLORS = { restaurant: 'gray', platform: 'grape', bank: 'cyan', combined: 'indigo' };
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_OPTIONS = DAYS.map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }));

function randomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Worked example for the chosen funder — mirrors the backend formula:
// commissionBase = bill − restaurantFunded, restaurant gets base − commission.
function FundingPreview({ values, commissionRate }) {
  const bill = 2000;
  const raw = values.type === 'percentage'
    ? (bill * (Number(values.discountValue) || 0)) / 100
    : values.type === 'flat' ? Math.min(Number(values.discountValue) || 0, bill) : 0;
  const discount = values.maxDiscount && values.type === 'percentage'
    ? Math.min(raw, Number(values.maxDiscount)) : raw;
  const pct = values.fundedBy === 'combined'
    ? { r: values.restaurantPercent || 0, p: values.platformPercent || 0, b: values.bankPercent || 0 }
    : { r: values.fundedBy === 'restaurant' ? 100 : 0, p: values.fundedBy === 'platform' ? 100 : 0, b: values.fundedBy === 'bank' ? 100 : 0 };
  const restFunded = (discount * pct.r) / 100;
  const platFunded = (discount * pct.p) / 100;
  const commission = ((bill - restFunded) * commissionRate) / 100;
  const restaurantGets = bill - restFunded - commission;
  const fmt = (n) => `₹${Math.round(n * 100) / 100}`;

  return (
    <Box p="sm" style={{ background: 'var(--mantine-color-gray-0)', borderRadius: 8 }}>
      <Text size="xs" fw={600} mb={4}>Example on a {fmt(bill)} bill ({commissionRate}% commission)</Text>
      <Text size="xs" c="dimmed">
        Customer pays {fmt(bill - discount)} (+ convenience fee) · Discount {fmt(discount)}
      </Text>
      <Text size="xs" c="dimmed">
        Restaurant bears {fmt(restFunded)} · Platform bears {fmt(platFunded)}
        {pct.b ? ` · Bank bears ${fmt((discount * pct.b) / 100)}` : ''}
      </Text>
      <Text size="xs" mt={4}>
        Commission {fmt(commission)} · <b>Restaurant settlement {fmt(restaurantGets)}</b> · Platform net {fmt(commission - platFunded)}
      </Text>
    </Box>
  );
}

function OfferModal({ opened, onClose, offer, restaurants }) {
  const qc = useQueryClient();
  const isEdit = !!offer?._id;
  const [uploading, setUploading] = useState(false);

  const form = useForm({
    initialValues: {
      restaurantId: offer?.restaurant?._id || offer?.restaurant || '',
      title: offer?.title || '',
      code: offer?.code || randomCode(),
      type: offer?.type || 'percentage',
      discountValue: offer?.discountValue || 20,
      maxDiscount: offer?.maxDiscount || '',
      minOrderAmount: offer?.minOrderAmount || 0,
      description: offer?.description || '',
      validFrom: offer?.validFrom ? new Date(offer.validFrom) : new Date(),
      validTo: offer?.validTo ? new Date(offer.validTo) : dayjs().add(30, 'day').toDate(),
      validDays: offer?.validDays || [],
      applicableTo: offer?.applicableTo || ['booking'],
      fundedBy: offer?.fundedBy || 'restaurant',
      restaurantPercent: offer?.fundingBreakup?.restaurantPercent ?? 50,
      platformPercent: offer?.fundingBreakup?.platformPercent ?? 50,
      bankPercent: offer?.fundingBreakup?.bankPercent ?? 0,
      isActive: offer?.isActive ?? true,
      isFeatured: offer?.isFeatured ?? false,
      image: offer?.image?.url
        ? { url: offer.image.url, publicId: offer.image.publicId || '' }
        : null,
    },
    validate: {
      restaurantId: (v) => (v ? null : 'Pick a restaurant'),
      title: (v) => (v.trim().length >= 2 ? null : 'Title required'),
      code: (v) => (v.trim().length >= 2 ? null : 'Code required'),
      discountValue: (v) => (v > 0 ? null : 'Must be greater than 0'),
      restaurantPercent: (_v, vals) => {
        if (vals.fundedBy !== 'combined') return null;
        const sum = (vals.restaurantPercent || 0) + (vals.platformPercent || 0) + (vals.bankPercent || 0);
        return Math.round(sum) === 100 ? null : `Shares must add up to 100% (now ${sum}%)`;
      },
    },
  });

  const daysPreset = useMemo(() => {
    const s = new Set(form.values.validDays);
    if (s.size === 0) return 'all';
    if (s.size === 2 && s.has('saturday') && s.has('sunday')) return 'weekend';
    if (s.size === 5 && !s.has('saturday') && !s.has('sunday')) return 'weekday';
    return 'custom';
  }, [form.values.validDays]);

  const setDaysPreset = (v) => {
    if (v === 'all') form.setFieldValue('validDays', []);
    else if (v === 'weekend') form.setFieldValue('validDays', ['saturday', 'sunday']);
    else if (v === 'weekday') form.setFieldValue('validDays', DAYS.slice(0, 5));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await offerApi.uploadImage(file);
      form.setFieldValue('image', { url: data.data.url, publicId: data.data.publicId });
      notifications.show({ title: 'Banner uploaded', color: 'green' });
    } catch (err) {
      notifications.show({
        title: 'Upload failed',
        message: err.response?.data?.message || 'Use a JPG, PNG or WebP under 5 MB',
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        restaurantId: values.restaurantId,
        title: values.title.trim(),
        code: values.code.trim().toUpperCase(),
        type: values.type,
        discountValue: Number(values.discountValue),
        maxDiscount: values.maxDiscount ? Number(values.maxDiscount) : undefined,
        minOrderAmount: Number(values.minOrderAmount) || 0,
        description: values.description.trim(),
        validFrom: values.validFrom,
        validTo: values.validTo,
        validDays: values.validDays,
        applicableTo: values.applicableTo,
        fundedBy: values.fundedBy,
        fundingBreakup: values.fundedBy === 'combined' ? {
          restaurantPercent: Number(values.restaurantPercent) || 0,
          platformPercent: Number(values.platformPercent) || 0,
          bankPercent: Number(values.bankPercent) || 0,
        } : undefined,
        isActive: values.isActive,
        isFeatured: values.isFeatured,
        image: values.image || null,
      };
      return isEdit ? offerApi.update(offer._id, payload) : offerApi.create(payload);
    },
    onSuccess: () => {
      notifications.show({ title: isEdit ? 'Offer updated' : 'Offer created & live', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-offers'] });
      onClose();
    },
    onError: (err) =>
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' }),
  });

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit Offer' : 'Create Offer'} size="lg" centered>
      <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
        <Stack gap="md">
          <Alert color="blue" variant="light" icon={<IconInfoCircle size={14} />}>
            Admin offers go live immediately and appear on the app home screen — no approval step.
          </Alert>

          <Select
            label="Restaurant"
            placeholder="Select restaurant"
            searchable
            required
            data={(restaurants || []).map((r) => ({ value: r._id, label: r.name }))}
            {...form.getInputProps('restaurantId')}
          />

          <Grid gutter="md">
            <Grid.Col span={8}>
              <TextInput label="Offer Title" placeholder="e.g. Weekend Special — 50% OFF" required {...form.getInputProps('title')} />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select
                label="Type"
                data={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                value={form.values.type}
                onChange={(v) => form.setFieldValue('type', v)}
              />
            </Grid.Col>

            <Grid.Col span={5}>
              <TextInput
                label="Coupon Code"
                required
                rightSection={
                  <ActionIcon variant="subtle" onClick={() => form.setFieldValue('code', randomCode())}>
                    <IconTag size={14} />
                  </ActionIcon>
                }
                {...form.getInputProps('code')}
                onChange={(e) => form.setFieldValue('code', e.target.value.toUpperCase())}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <NumberInput
                label={form.values.type === 'percentage' ? 'Discount %' : 'Discount ₹'}
                min={0}
                max={form.values.type === 'percentage' ? 100 : 100000}
                {...form.getInputProps('discountValue')}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput label="Max Discount ₹" min={0} placeholder="No cap" {...form.getInputProps('maxDiscount')} />
            </Grid.Col>

            <Grid.Col span={6}>
              <NumberInput label="Min Order Amount ₹" min={0} {...form.getInputProps('minOrderAmount')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <MultiSelect
                label="Applicable To"
                data={[
                  { value: 'booking', label: '📅 Table Booking' },
                  { value: 'pay_bill', label: '💳 Pay Bill' },
                ]}
                value={form.values.applicableTo}
                onChange={(v) => form.setFieldValue('applicableTo', v.length ? v : ['booking'])}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Text size="sm" fw={500} mb={2}>Discount funded by</Text>
              <Text size="xs" c="dimmed" mb={6}>
                Who bears the discount. Commission is charged on the bill minus the restaurant-funded part only.
              </Text>
              <SegmentedControl
                fullWidth
                data={Object.entries(FUNDER_LABELS).map(([value, label]) => ({ value, label }))}
                value={form.values.fundedBy}
                onChange={(v) => form.setFieldValue('fundedBy', v)}
              />
              {form.values.fundedBy === 'combined' && (
                <Grid gutter="sm" mt="xs">
                  <Grid.Col span={4}>
                    <NumberInput label="Restaurant %" min={0} max={100} {...form.getInputProps('restaurantPercent')} />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <NumberInput label="Platform %" min={0} max={100} {...form.getInputProps('platformPercent')} error={null} />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <NumberInput label="Bank %" min={0} max={100} {...form.getInputProps('bankPercent')} error={null} />
                  </Grid.Col>
                </Grid>
              )}
              <Box mt="xs">
                <FundingPreview
                  values={form.values}
                  commissionRate={restaurants?.find((r) => r._id === form.values.restaurantId)?.commission || 10}
                />
              </Box>
            </Grid.Col>

            <Grid.Col span={6}>
              <DateInput label="Valid From" required value={form.values.validFrom} onChange={(v) => form.setFieldValue('validFrom', v)} />
            </Grid.Col>
            <Grid.Col span={6}>
              <DateInput label="Valid Until" required value={form.values.validTo} onChange={(v) => form.setFieldValue('validTo', v)} />
            </Grid.Col>

            <Grid.Col span={12}>
              <Text size="sm" fw={500} mb={4}>Active Days</Text>
              <SegmentedControl
                fullWidth
                data={[
                  { value: 'all', label: 'Every day' },
                  { value: 'weekend', label: 'Weekend only' },
                  { value: 'weekday', label: 'Weekdays only' },
                  { value: 'custom', label: 'Custom' },
                ]}
                value={daysPreset}
                onChange={setDaysPreset}
              />
              {daysPreset === 'custom' && (
                <MultiSelect
                  mt="xs"
                  data={DAY_OPTIONS}
                  value={form.values.validDays}
                  onChange={(v) => form.setFieldValue('validDays', v)}
                  placeholder="Pick days"
                />
              )}
            </Grid.Col>

            <Grid.Col span={12}>
              <Text size="sm" fw={500} mb={2}>Banner Image (optional)</Text>
              <Text size="xs" c="dimmed" mb={8}>
                Shown behind the offer card on the app home screen. JPG, PNG or WebP, up to 5 MB.
              </Text>
              {form.values.image?.url ? (
                <Group gap="sm" align="center">
                  <Image
                    src={form.values.image.url}
                    w={132}
                    h={78}
                    radius="sm"
                    fit="cover"
                    alt="Banner preview"
                  />
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    leftSection={<IconTrash size={13} />}
                    onClick={() => form.setFieldValue('image', null)}
                  >
                    Remove
                  </Button>
                </Group>
              ) : (
                <FileInput
                  placeholder="Upload banner image"
                  accept="image/png,image/jpeg,image/webp"
                  leftSection={<IconUpload size={16} />}
                  onChange={handleImageUpload}
                  disabled={uploading}
                  clearable
                />
              )}
              {uploading && <Text size="xs" c="dimmed" mt={6}>Uploading…</Text>}
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea label="Description" placeholder="Terms, what's included…" rows={2} {...form.getInputProps('description')} />
            </Grid.Col>

            <Grid.Col span={6}>
              <Switch
                label="Offer Active"
                checked={form.values.isActive}
                onChange={(e) => form.setFieldValue('isActive', e.target.checked)}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Switch
                label="Feature on app home"
                description="Show first in the offers banner"
                checked={form.values.isFeatured}
                onChange={(e) => form.setFieldValue('isFeatured', e.target.checked)}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save Changes' : 'Create Offer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default function OffersManagePage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, offer: null });
  const [restaurantFilter, setRestaurantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: restaurantData } = useQuery({
    queryKey: ['admin-all-restaurants'],
    queryFn: () => restaurantApi.getAll({ limit: 500 }).then((r) => r.data.data),
  });
  const restaurants = restaurantData?.restaurants || [];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-offers', restaurantFilter, statusFilter],
    queryFn: () => offerApi.getAll({
      restaurantId: restaurantFilter || undefined,
      approvalStatus: statusFilter || undefined,
    }).then((r) => r.data.data.offers),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => offerApi.toggleActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-offers'] }),
    onError: (err) => notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => offerApi.delete(id),
    onSuccess: () => {
      notifications.show({ title: 'Offer deleted', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-offers'] });
    },
  });

  const offers = data || [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Offers</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModal({ open: true, offer: null })}>
          Create Offer
        </Button>
      </Group>

      <Group gap="sm">
        <Select
          placeholder="All restaurants"
          clearable
          searchable
          style={{ width: 240 }}
          data={restaurants.map((r) => ({ value: r._id, label: r.name }))}
          value={restaurantFilter}
          onChange={(v) => setRestaurantFilter(v || '')}
        />
        <Select
          placeholder="Any status"
          clearable
          style={{ width: 180 }}
          data={[
            { value: 'approved', label: 'Approved / Live' },
            { value: 'pending_approval', label: 'Pending Approval' },
            { value: 'draft', label: 'Draft' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v || '')}
        />
      </Group>

      {isLoading ? (
        <Stack gap="sm">{[1, 2, 3].map((i) => <Skeleton key={i} height={110} radius="md" />)}</Stack>
      ) : offers.length === 0 ? (
        <Box py={60} ta="center">
          <Text fz={40} mb={8}>🏷️</Text>
          <Text fw={600}>No offers</Text>
          <Text c="dimmed" size="sm">Create one to show it on the app home screen.</Text>
        </Box>
      ) : (
        <Stack gap="md">
          {offers.map((offer) => {
            const expired = dayjs(offer.validTo).isBefore(dayjs());
            const live = offer.isActive && !expired && offer.approvalStatus === 'approved';
            const borderColor = offer.approvalStatus === 'rejected' ? '#e03131'
              : offer.approvalStatus === 'pending_approval' ? '#f59f00'
              : live ? '#2d6a4f' : '#ced4da';
            return (
              <Card key={offer._id} withBorder radius="md" p="lg" style={{ borderLeft: `4px solid ${borderColor}` }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={6} style={{ flex: 1 }}>
                    <Group gap="sm" wrap="wrap">
                      <Text fw={700} size="lg">{offer.title}</Text>
                      <Badge color={TYPE_COLORS[offer.type] || 'gray'} variant="light" size="sm">
                        {TYPE_LABELS[offer.type] || offer.type}
                      </Badge>
                      <Badge color={FUNDER_COLORS[offer.fundedBy] || 'gray'} variant="outline" size="sm">
                        {offer.fundedBy === 'combined'
                          ? `Shared R${offer.fundingBreakup?.restaurantPercent ?? 0}/P${offer.fundingBreakup?.platformPercent ?? 0}/B${offer.fundingBreakup?.bankPercent ?? 0}`
                          : `${FUNDER_LABELS[offer.fundedBy] || 'Restaurant'} funded`}
                      </Badge>
                      {offer.isFeatured && (
                        <Badge color="yellow" variant="light" size="sm" leftSection={<IconStar size={10} />}>Featured</Badge>
                      )}
                      {live && <Badge color="green" variant="dot" size="sm">Live on app</Badge>}
                      {expired && <Badge color="red" variant="dot" size="sm">Expired</Badge>}
                      {offer.approvalStatus === 'pending_approval' && (
                        <Badge color="yellow" variant="light" size="sm" leftSection={<IconClock size={10} />}>Pending</Badge>
                      )}
                      {offer.approvalStatus === 'rejected' && <Badge color="red" variant="light" size="sm">Rejected</Badge>}
                    </Group>

                    <Group gap={16} wrap="wrap">
                      <Text size="sm" fw={700} style={{ fontFamily: 'monospace' }}>{offer.code}</Text>
                      <Text size="sm" c="dimmed">
                        {offer.type === 'percentage' ? `${offer.discountValue}% off` : `₹${offer.discountValue} off`}
                        {offer.maxDiscount ? ` • up to ₹${offer.maxDiscount}` : ''}
                        {offer.minOrderAmount ? ` • min ₹${offer.minOrderAmount}` : ''}
                      </Text>
                      <Text size="sm" c="dimmed">{offer.restaurant?.name || '—'}</Text>
                    </Group>

                    <Group gap={16} wrap="wrap">
                      <Text size="xs" c="dimmed">
                        {dayjs(offer.validFrom).format('DD MMM')} – {dayjs(offer.validTo).format('DD MMM YYYY')}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {offer.validDays?.length ? offer.validDays.join(', ') : 'every day'}
                      </Text>
                      {offer.applicableTo?.includes('pay_bill') && (
                        <Badge size="xs" color="teal" variant="light" leftSection={<IconDeviceMobile size={9} />}>Pay Bill</Badge>
                      )}
                    </Group>
                  </Stack>

                  <Stack gap={8} align="flex-end">
                    <Switch
                      checked={offer.isActive}
                      onChange={(e) => toggleMutation.mutate({ id: offer._id, isActive: e.target.checked })}
                      label={offer.isActive ? 'Active' : 'Off'}
                    />
                    <Group gap={6}>
                      <ActionIcon variant="subtle" onClick={() => setModal({ open: true, offer })}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => {
                          if (window.confirm(`Delete "${offer.title}"?`)) deleteMutation.mutate(offer._id);
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Stack>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}

      <OfferModal
        opened={modal.open}
        onClose={() => setModal({ open: false, offer: null })}
        offer={modal.offer}
        restaurants={restaurants}
      />
    </Stack>
  );
}
