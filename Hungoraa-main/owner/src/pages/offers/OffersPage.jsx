import { useState, useEffect } from 'react';
import {
  Stack, Title, Group, Button, Card, Text, Badge, ActionIcon, Select,
  Modal, TextInput, NumberInput, Switch, Grid, Box, Skeleton, Textarea,
  MultiSelect, Alert, ThemeIcon, Divider,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import {
  IconPlus, IconEdit, IconTrash, IconTag, IconCopy, IconDeviceMobile,
  IconInfoCircle, IconSend, IconClock, IconCircleCheck, IconCircleX,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { offerApi, restaurantApi } from '../../api';

const OFFER_TYPE_COLORS = {
  percentage: 'blue', flat: 'green', free_item: 'violet',
  bogo: 'orange', early_bird: 'teal', happy_hours: 'red',
};
const APPROVAL_STATUS = {
  draft:            { color: 'gray',   icon: IconTag,         label: 'Draft' },
  pending_approval: { color: 'yellow', icon: IconClock,       label: 'Pending Approval' },
  approved:         { color: 'green',  icon: IconCircleCheck, label: 'Approved' },
  rejected:         { color: 'red',    icon: IconCircleX,     label: 'Rejected' },
};
const OFFER_TYPE_LABELS = {
  percentage: '% Off', flat: 'Flat Off', free_item: 'Free Item',
  bogo: 'Buy 1 Get 1', early_bird: 'Early Bird', happy_hours: 'Happy Hours',
};
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function OfferModal({ opened, onClose, offer, restaurantId }) {
  const qc = useQueryClient();
  const isEdit = !!offer?._id;

  const form = useForm({
    initialValues: {
      title: offer?.title || '',
      code: offer?.code || '',
      type: offer?.type || 'percentage',
      discountValue: offer?.discountValue || 0,
      minOrderAmount: offer?.minOrderAmount || 0,
      maxDiscountAmount: offer?.maxDiscountAmount || '',
      maxUses: offer?.maxUses || 100,
      maxUsesPerUser: offer?.maxUsesPerUser || 1,
      description: offer?.description || '',
      validFrom: offer?.validFrom ? new Date(offer.validFrom) : new Date(),
      validUntil: offer?.validUntil ? new Date(offer.validUntil) : dayjs().add(30, 'day').toDate(),
      isActive: offer?.isActive ?? true,
      applicableTo: offer?.applicableTo || ['booking'],
    },
    validate: {
      title: (v) => (v.trim().length >= 2 ? null : 'Title required'),
      code: (v, values) =>
        values.applicableTo?.includes('booking') && v.trim().length < 2
          ? 'Coupon code required for booking offers'
          : null,
    },
  });

  const isPayBillOnly = form.values.applicableTo?.length === 1 && form.values.applicableTo[0] === 'pay_bill';

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? offerApi.update(offer._id, data)
      : offerApi.create(restaurantId, data),
    onSuccess: () => {
      notifications.show({ title: isEdit ? 'Offer updated' : 'Offer created', color: 'green' });
      qc.invalidateQueries({ queryKey: ['offers', restaurantId] });
      onClose();
    },
    onError: (err) => notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    form.setFieldValue('code', code);
  };

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit Offer' : 'Create Offer'} size="lg" centered>
      <form onSubmit={form.onSubmit((v) => mutation.mutate({ ...v, restaurantId }))}>
        <Stack gap="md">
          <Grid gutter="md">
            <Grid.Col span={8}>
              <TextInput label="Offer Title" placeholder="e.g. Weekend Special" required {...form.getInputProps('title')} />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select
                label="Type"
                data={Object.entries(OFFER_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                value={form.values.type}
                onChange={(v) => form.setFieldValue('type', v)}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <MultiSelect
                label="Applicable To"
                description="Where customers can use this offer"
                data={[
                  { value: 'booking', label: '📅 Table Booking' },
                  { value: 'pay_bill', label: '💳 Pay Bill (Auto-applied)' },
                ]}
                value={form.values.applicableTo}
                onChange={(v) => form.setFieldValue('applicableTo', v)}
                required
              />
            </Grid.Col>
            <Grid.Col span={8}>
              <TextInput
                label="Coupon Code"
                placeholder={isPayBillOnly ? 'Optional for Pay Bill offers' : 'e.g. SAVE20'}
                required={!isPayBillOnly}
                rightSection={
                  <ActionIcon variant="subtle" onClick={generateCode}>
                    <IconTag size={14} />
                  </ActionIcon>
                }
                {...form.getInputProps('code')}
                style={{ textTransform: 'uppercase' }}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput
                label={form.values.type === 'percentage' ? 'Discount %' : 'Discount ₹'}
                min={0}
                max={form.values.type === 'percentage' ? 100 : 10000}
                {...form.getInputProps('discountValue')}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput label="Min Order Amount (₹)" min={0} {...form.getInputProps('minOrderAmount')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput label="Max Discount (₹)" min={0} placeholder="No limit" {...form.getInputProps('maxDiscountAmount')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput label="Total Uses Limit" min={1} {...form.getInputProps('maxUses')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput label="Per User Limit" min={1} {...form.getInputProps('maxUsesPerUser')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <DateInput label="Valid From" required value={form.values.validFrom} onChange={(v) => form.setFieldValue('validFrom', v)} />
            </Grid.Col>
            <Grid.Col span={6}>
              <DateInput label="Valid Until" required value={form.values.validUntil} onChange={(v) => form.setFieldValue('validUntil', v)} />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea label="Description" placeholder="Terms and conditions..." rows={2} {...form.getInputProps('description')} />
            </Grid.Col>
            <Grid.Col span={12}>
              <Switch label="Offer Active" checked={form.values.isActive}
                onChange={(e) => form.setFieldValue('isActive', e.target.checked)} color="brand" />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" color="brand" loading={mutation.isPending}>
              {isEdit ? 'Save Changes' : 'Create Offer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default function OffersPage() {
  const qc = useQueryClient();
  const [restaurantId, setRestaurantId] = useState('');
  const [modal, setModal] = useState({ open: false, offer: null });
  const [payBillEnabled, setPayBillEnabled] = useState(false);

  const { data: restaurants } = useQuery({
    queryKey: ['my-restaurants'],
    queryFn: () => restaurantApi.getMyRestaurants().then((r) => r.data.data.restaurants),
  });

  useEffect(() => {
    if (restaurants?.[0] && !restaurantId) {
      const r = restaurants[0];
      setRestaurantId(r._id);
      setPayBillEnabled(r.payBillEnabled || false);
    }
  }, [restaurants]);

  useEffect(() => {
    const r = restaurants?.find((r) => r._id === restaurantId);
    if (r) setPayBillEnabled(r.payBillEnabled || false);
  }, [restaurantId, restaurants]);

  const togglePayBillMutation = useMutation({
    mutationFn: () => restaurantApi.togglePayBill(restaurantId),
    onSuccess: (res) => {
      const newVal = res.data.data.payBillEnabled;
      setPayBillEnabled(newVal);
      qc.invalidateQueries({ queryKey: ['my-restaurants'] });
      notifications.show({ title: `Pay Bill ${newVal ? 'enabled' : 'disabled'}`, color: newVal ? 'green' : 'gray' });
    },
    onError: () => notifications.show({ title: 'Failed to update', color: 'red' }),
  });

  const { data: offers, isLoading } = useQuery({
    queryKey: ['offers', restaurantId],
    queryFn: () => offerApi.getAll(restaurantId).then((r) => r.data.data.offers),
    enabled: !!restaurantId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => offerApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers', restaurantId] }),
  });

  const submitMutation = useMutation({
    mutationFn: (id) => offerApi.submitForApproval(id),
    onSuccess: () => {
      notifications.show({ title: 'Submitted for approval', color: 'blue',
        message: 'Admin will review and approve your offer shortly.' });
      qc.invalidateQueries({ queryKey: ['offers', restaurantId] });
    },
    onError: (err) =>
      notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => offerApi.delete(id),
    onSuccess: () => {
      notifications.show({ title: 'Offer deleted', color: 'green' });
      qc.invalidateQueries({ queryKey: ['offers', restaurantId] });
    },
  });

  const list = offers || [];
  const restaurantOptions = restaurants?.map((r) => ({ value: r._id, label: r.name })) || [];
  const active = list.filter((o) => o.isActive).length;
  const totalUses = list.reduce((acc, o) => acc + (o.usedCount || 0), 0);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Offers & Coupons</Title>
        <Group gap="sm">
          {restaurants?.length > 1 && (
            <Select data={restaurantOptions} value={restaurantId} onChange={setRestaurantId}
              placeholder="Select Restaurant" style={{ width: 200 }} />
          )}
          <Button leftSection={<IconPlus size={16} />} color="brand"
            onClick={() => setModal({ open: true, offer: null })}>
            Create Offer
          </Button>
        </Group>
      </Group>

      {/* Pay Bill Toggle */}
      <Card withBorder radius="md" p="lg" style={{ borderLeft: `4px solid ${payBillEnabled ? '#2d6a4f' : '#ced4da'}` }}>
        <Group justify="space-between">
          <Group gap="md">
            <ThemeIcon color={payBillEnabled ? 'green' : 'gray'} variant="light" size="xl" radius="xl">
              <IconDeviceMobile size={20} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text fw={700} size="md">Pay Bill via App</Text>
              <Text size="sm" c="dimmed">
                Allow customers to pay their restaurant bill directly from the app with auto-applied offers
              </Text>
            </Stack>
          </Group>
          <Switch
            checked={payBillEnabled}
            onChange={() => togglePayBillMutation.mutate()}
            loading={togglePayBillMutation.isPending}
            color="green"
            size="lg"
            label={payBillEnabled ? 'Enabled' : 'Disabled'}
          />
        </Group>
        {payBillEnabled && (
          <Alert mt="sm" color="green" variant="light" icon={<IconInfoCircle size={14} />}>
            Customers can now open the app, enter their bill amount, and pay with auto-applied discount offers tagged as "Pay Bill".
          </Alert>
        )}
      </Card>

      {/* Stats */}
      <Grid gutter="md">
        {[
          { label: 'Total Offers', value: list.length },
          { label: 'Active Offers', value: active },
          { label: 'Total Redemptions', value: totalUses },
        ].map(({ label, value }) => (
          <Grid.Col key={label} span={{ base: 12, sm: 4 }}>
            <Card withBorder radius="md" p="md" ta="center">
              <Text size="xl" fw={800}>{value}</Text>
              <Text size="sm" c="dimmed">{label}</Text>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {/* Offers List */}
      {isLoading ? (
        <Stack gap="sm">{[1,2,3].map((i) => <Skeleton key={i} height={100} radius="md" />)}</Stack>
      ) : (
        <Stack gap="md">
          {list.map((offer) => {
            const isExpired = dayjs(offer.validTo).isBefore(dayjs());
            const usagePercent = Math.round(((offer.usedCount || 0) / (offer.totalUsageLimit || 1)) * 100);
            const approvalMeta = APPROVAL_STATUS[offer.approvalStatus || 'approved'];
            const ApprovalIcon = approvalMeta.icon;
            const canSubmit = ['draft', 'rejected'].includes(offer.approvalStatus);
            const borderColor = offer.approvalStatus === 'rejected' ? '#e03131'
              : offer.approvalStatus === 'pending_approval' ? '#f59f00'
              : offer.isActive && !isExpired ? '#2d6a4f'
              : '#ced4da';
            return (
              <Card key={offer._id} withBorder radius="md" p="lg"
                style={{ borderLeft: `4px solid ${borderColor}` }}>
                <Group justify="space-between" align="flex-start">
                  <Stack gap={6} style={{ flex: 1 }}>
                    <Group gap="sm">
                      <Text fw={700} size="lg">{offer.title}</Text>
                      <Badge color={OFFER_TYPE_COLORS[offer.type] || 'gray'} variant="light" size="sm">
                        {OFFER_TYPE_LABELS[offer.type]}
                      </Badge>
                      {/* Approval status */}
                      {offer.approvalStatus && offer.approvalStatus !== 'approved' && (
                        <Badge
                          color={approvalMeta.color}
                          variant="light"
                          size="sm"
                          leftSection={<ApprovalIcon size={10} />}
                        >
                          {approvalMeta.label}
                        </Badge>
                      )}
                      {offer.applicableTo?.includes('pay_bill') && (
                        <Badge color="teal" variant="light" size="sm" leftSection="💳">Pay Bill</Badge>
                      )}
                      {offer.applicableTo?.includes('booking') && (
                        <Badge color="blue" variant="light" size="sm" leftSection="📅">Booking</Badge>
                      )}
                      {isExpired && <Badge color="red" variant="dot" size="sm">Expired</Badge>}
                      {!offer.isActive && !isExpired && <Badge color="gray" variant="dot" size="sm">Inactive</Badge>}
                    </Group>
                    {/* Rejection reason */}
                    {offer.approvalStatus === 'rejected' && offer.approvalHistory?.length > 0 && (
                      <Alert color="red" variant="light" p="xs" icon={<IconInfoCircle size={14} />}>
                        <Text size="xs">
                          <strong>Rejected:</strong>{' '}
                          {offer.approvalHistory.at(-1)?.note || 'No reason provided'}
                        </Text>
                      </Alert>
                    )}

                    <Group gap={16}>
                      <Group gap={4}>
                        <IconTag size={14} color="#868e96" />
                        <Text size="sm" fw={700} c="brand" style={{ fontFamily: 'monospace' }}>
                          {offer.code}
                        </Text>
                        <ActionIcon size="xs" variant="subtle"
                          onClick={() => { navigator.clipboard.writeText(offer.code); notifications.show({ title: 'Copied!', color: 'blue' }); }}>
                          <IconCopy size={12} />
                        </ActionIcon>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {offer.type === 'percentage' ? `${offer.discountValue}% off` : `₹${offer.discountValue} off`}
                        {offer.minOrderAmount > 0 && ` • Min ₹${offer.minOrderAmount}`}
                      </Text>
                    </Group>

                    <Group gap={16}>
                      <Text size="xs" c="dimmed">
                        {dayjs(offer.validFrom).format('DD MMM')} – {dayjs(offer.validTo).format('DD MMM YYYY')}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {offer.usedCount || 0}/{offer.totalUsageLimit || '∞'} uses ({usagePercent}%)
                      </Text>
                    </Group>
                  </Stack>

                  <Stack gap={8} align="flex-end">
                    {canSubmit && (
                      <Button
                        size="xs"
                        color="blue"
                        variant="light"
                        leftSection={<IconSend size={12} />}
                        loading={submitMutation.isPending && submitMutation.variables === offer._id}
                        onClick={() => submitMutation.mutate(offer._id)}
                      >
                        Submit for Approval
                      </Button>
                    )}
                    <Group gap={8}>
                      <Switch
                        checked={offer.isActive}
                        onChange={(e) => toggleMutation.mutate({ id: offer._id, isActive: e.target.checked })}
                        color="brand"
                        disabled={offer.approvalStatus === 'pending_approval'}
                      />
                      <ActionIcon variant="subtle" onClick={() => setModal({ open: true, offer })}
                        disabled={offer.approvalStatus === 'pending_approval'}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon color="red" variant="subtle" onClick={() => deleteMutation.mutate(offer._id)}>
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

      {list.length === 0 && !isLoading && (
        <Box py={60} style={{ textAlign: 'center' }}>
          <Text size={40} mb={8}>🏷️</Text>
          <Text fw={600}>No offers yet</Text>
          <Text c="dimmed" size="sm">Create offers to attract more customers</Text>
          <Button mt="md" color="brand" leftSection={<IconPlus size={16} />}
            onClick={() => setModal({ open: true, offer: null })}>
            Create First Offer
          </Button>
        </Box>
      )}

      <OfferModal
        opened={modal.open}
        onClose={() => setModal({ open: false, offer: null })}
        offer={modal.offer}
        restaurantId={restaurantId}
      />
    </Stack>
  );
}
