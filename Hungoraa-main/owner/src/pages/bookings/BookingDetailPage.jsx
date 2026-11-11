import { useState } from 'react';
import {
  Stack, Title, Group, Badge, Card, Text, Button, Textarea, Select,
  Avatar, Divider, Timeline, ActionIcon, Box, Grid, Paper, Modal,
  NumberInput, TextInput, Table, Alert, ThemeIcon, Loader, Center,
} from '@mantine/core';
import {
  IconArrowLeft, IconCheck, IconX, IconClock, IconPhone, IconMail,
  IconFileInvoice, IconCash, IconAlertCircle, IconReceipt,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { bookingApi, invoiceApi, offerApi, restaurantApi } from '../../api';

const STATUS_COLORS = {
  confirmed: 'green', pending: 'yellow', seated: 'blue',
  completed: 'teal', cancelled: 'red', 'no-show': 'gray',
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'razorpay', label: 'Razorpay' },
];

// ─── Invoice Generation Modal ─────────────────────────────────────────────────
function GenerateInvoiceModal({ opened, onClose, booking, onSuccess }) {
  const qc = useQueryClient();
  const [subtotal, setSubtotal] = useState(0);
  const [offerCode, setOfferCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState(null);

  const restaurantId = booking?.restaurant?._id || booking?.restaurant;

  const { data: offers } = useQuery({
    queryKey: ['offers', restaurantId],
    queryFn: () => offerApi.getAll(restaurantId).then((r) => r.data.data.offers),
    enabled: !!restaurantId,
  });

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => restaurantApi.getById(restaurantId).then((r) => r.data.data.restaurant),
    enabled: !!restaurantId,
  });

  const commissionRate = restaurant?.commission || 10;

  const calcPreview = () => {
    if (!subtotal || subtotal <= 0) return;
    const offer = offers?.find((o) => o.code === offerCode.toUpperCase());
    let discountAmount = 0;
    if (offer) {
      if (offer.type === 'percentage') {
        discountAmount = Math.min((subtotal * offer.discountValue) / 100, offer.maxDiscount || Infinity);
      } else if (offer.type === 'flat') {
        discountAmount = Math.min(offer.discountValue, subtotal);
      }
    }
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = Math.round((afterDiscount * 5) / 100);
    const finalAmount = afterDiscount + taxAmount;
    const commissionAmount = Math.round((finalAmount * commissionRate) / 100);
    setPreview({ discountAmount, taxAmount, finalAmount, commissionAmount, restaurantReceives: finalAmount - commissionAmount });
  };

  const generateMutation = useMutation({
    mutationFn: () => invoiceApi.generate({
      bookingId: booking._id,
      subtotal,
      offerCode: offerCode || undefined,
      paymentMethod,
      notes,
    }),
    onSuccess: () => {
      notifications.show({ title: 'Invoice generated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['booking', booking._id] });
      qc.invalidateQueries({ queryKey: ['invoice-booking', booking._id] });
      onSuccess();
      onClose();
    },
    onError: (err) => notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Generate Bill" size="md" centered>
      <Stack gap="md">
        <NumberInput
          label="Food Bill Amount (₹)"
          placeholder="Enter total bill amount"
          min={1}
          value={subtotal}
          onChange={setSubtotal}
          required
          prefix="₹"
        />

        <TextInput
          label="Apply Offer Code (Optional)"
          placeholder="e.g. SAVE20"
          value={offerCode}
          onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
          onBlur={calcPreview}
        />

        {subtotal > 0 && !preview && (
          <Button variant="light" size="xs" onClick={calcPreview}>Preview Calculation</Button>
        )}

        {preview && (
          <Paper p="md" bg="#f8f9fa" radius="md" withBorder>
            <Text fw={700} mb="sm" size="sm">Bill Breakdown</Text>
            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Food Bill</Text>
                <Text size="sm" fw={600}>₹{subtotal.toLocaleString()}</Text>
              </Group>
              {preview.discountAmount > 0 && (
                <Group justify="space-between">
                  <Text size="sm" c="green">Discount ({offerCode})</Text>
                  <Text size="sm" c="green" fw={600}>- ₹{preview.discountAmount.toLocaleString()}</Text>
                </Group>
              )}
              <Group justify="space-between">
                <Text size="sm" c="dimmed">GST (5%)</Text>
                <Text size="sm" fw={600}>+ ₹{preview.taxAmount.toLocaleString()}</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" fw={700}>Customer Pays</Text>
                <Text size="sm" fw={800} c="brand">₹{preview.finalAmount.toLocaleString()}</Text>
              </Group>
              <Divider my={4} />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Platform Commission ({commissionRate}%)</Text>
                <Text size="xs" c="red">₹{preview.commissionAmount.toLocaleString()}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">You Receive</Text>
                <Text size="xs" c="green" fw={700}>₹{preview.restaurantReceives.toLocaleString()}</Text>
              </Group>
            </Stack>
          </Paper>
        )}

        <Select label="Payment Method" data={PAYMENT_METHODS} value={paymentMethod} onChange={setPaymentMethod} />
        <Textarea label="Notes (Optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button
            color="brand" leftSection={<IconFileInvoice size={16} />}
            loading={generateMutation.isPending}
            disabled={!subtotal || subtotal <= 0}
            onClick={() => generateMutation.mutate()}
          >
            Generate Invoice
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Invoice Card (shown after generation) ────────────────────────────────────
function InvoiceCard({ bookingId }) {
  const qc = useQueryClient();
  const [markPayMethod, setMarkPayMethod] = useState('cash');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice-booking', bookingId],
    queryFn: () => invoiceApi.getByBooking(bookingId).then((r) => r.data.data.invoice),
    retry: false,
  });

  const markPaidMutation = useMutation({
    mutationFn: () => invoiceApi.markPaid(invoice._id, markPayMethod),
    onSuccess: () => {
      notifications.show({ title: 'Invoice marked as paid', color: 'green' });
      qc.invalidateQueries({ queryKey: ['invoice-booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['booking'] });
    },
    onError: (err) => notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  if (isLoading) return <Center py="md"><Loader size="sm" /></Center>;
  if (!invoice) return null;

  const isPaid = invoice.paymentStatus === 'paid';

  return (
    <Card withBorder radius="md" p="lg" style={{ borderColor: isPaid ? '#40c057' : '#fab005' }}>
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <ThemeIcon color={isPaid ? 'green' : 'yellow'} variant="light" radius="xl">
            <IconReceipt size={16} />
          </ThemeIcon>
          <Text fw={700}>Invoice #{invoice.invoiceId}</Text>
        </Group>
        <Badge color={isPaid ? 'green' : 'yellow'} variant="light">
          {isPaid ? 'Paid' : 'Pending Payment'}
        </Badge>
      </Group>

      <Stack gap={4} mb="md">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Food Bill</Text>
          <Text size="sm" fw={600}>₹{invoice.subtotal.toLocaleString()}</Text>
        </Group>
        {invoice.discountAmount > 0 && (
          <Group justify="space-between">
            <Text size="sm" c="green">Discount {invoice.offerCode ? `(${invoice.offerCode})` : ''}</Text>
            <Text size="sm" c="green" fw={600}>- ₹{invoice.discountAmount.toLocaleString()}</Text>
          </Group>
        )}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">GST ({invoice.taxPercentage}%)</Text>
          <Text size="sm" fw={600}>+ ₹{invoice.taxAmount.toLocaleString()}</Text>
        </Group>
        <Divider />
        <Group justify="space-between">
          <Text fw={700}>Customer Pays</Text>
          <Text fw={800} c="brand" size="lg">₹{invoice.finalAmount.toLocaleString()}</Text>
        </Group>
        <Divider my={4} />
        <Group justify="space-between">
          <Text size="xs" c="dimmed">Commission ({invoice.commissionPercentage}%)</Text>
          <Text size="xs" c="red">₹{invoice.commissionAmount.toLocaleString()}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">You Receive</Text>
          <Text size="xs" c="green" fw={700}>₹{invoice.restaurantReceives.toLocaleString()}</Text>
        </Group>
      </Stack>

      {!isPaid && (
        <Stack gap="sm">
          <Select
            size="xs"
            label="Payment Method"
            data={PAYMENT_METHODS}
            value={markPayMethod}
            onChange={setMarkPayMethod}
          />
          <Button
            fullWidth color="green" leftSection={<IconCash size={16} />}
            loading={markPaidMutation.isPending}
            onClick={() => markPaidMutation.mutate()}
          >
            Mark as Paid
          </Button>
        </Stack>
      )}

      {isPaid && (
        <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
          Paid via {invoice.paymentMethod} on {new Date(invoice.paidAt).toLocaleDateString()}
        </Alert>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [ownerNote, setOwnerNote] = useState('');
  const [invoiceModal, setInvoiceModal] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.getById(id).then((r) => r.data.data.booking),
  });

  const updateMutation = useMutation({
    mutationFn: ({ status, note }) => bookingApi.updateStatus(id, status, note),
    onSuccess: () => {
      notifications.show({ title: 'Status updated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['booking', id] });
      setNewStatus('');
    },
  });

  const handleUpdate = () => {
    if (!newStatus) return;
    updateMutation.mutate({ status: newStatus, note: ownerNote });
  };

  if (isLoading || !booking) {
    return <Center py="xl"><Loader /></Center>;
  }

  const canGenerateInvoice = ['confirmed', 'seated'].includes(booking.status);

  return (
    <Stack gap="lg">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/bookings')}>
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Title order={2}>Booking #{booking.bookingId}</Title>
        <Badge color={STATUS_COLORS[booking.status] || 'gray'} size="lg" variant="light">
          {booking.status}
        </Badge>
      </Group>

      <Grid>
        {/* Left - Details */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            {/* Customer Info */}
            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Customer</Text>
              <Group gap="md">
                <Avatar size="lg" color="red">{booking.customer?.name?.charAt(0)}</Avatar>
                <Stack gap={4}>
                  <Text fw={700} size="lg">{booking.customer?.name}</Text>
                  <Group gap="sm">
                    <Group gap={4}>
                      <IconPhone size={14} color="#868e96" />
                      <Text size="sm" c="dimmed">{booking.customer?.phone}</Text>
                    </Group>
                    {booking.customer?.email && (
                      <Group gap={4}>
                        <IconMail size={14} color="#868e96" />
                        <Text size="sm" c="dimmed">{booking.customer?.email}</Text>
                      </Group>
                    )}
                  </Group>
                </Stack>
              </Group>
            </Card>

            {/* Booking Info */}
            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Booking Details</Text>
              <Grid gutter="md">
                {[
                  { label: 'Date', value: booking.date },
                  { label: 'Time', value: booking.time },
                  { label: 'Guests', value: `${booking.guests} people` },
                  { label: 'Table', value: `${booking.table?.name || 'N/A'} (${booking.table?.type || ''})` },
                  { label: 'Restaurant', value: booking.restaurant?.name },
                  { label: 'Branch', value: booking.branch?.name || 'Main Branch' },
                ].map(({ label, value }) => (
                  <Grid.Col span={6} key={label}>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">{label}</Text>
                      <Text size="sm" fw={600}>{value}</Text>
                    </Stack>
                  </Grid.Col>
                ))}
              </Grid>

              {booking.specialRequest && (
                <>
                  <Divider my="md" />
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">Special Request</Text>
                    <Paper p="sm" bg="#f8f9fa" radius="md">
                      <Text size="sm">{booking.specialRequest}</Text>
                    </Paper>
                  </Stack>
                </>
              )}
            </Card>

            {/* Invoice Section */}
            <Card withBorder radius="md" p="lg">
              <Group justify="space-between" mb="md">
                <Text fw={700} size="sm" c="dimmed" tt="uppercase">Bill / Invoice</Text>
                {canGenerateInvoice && (
                  <Button
                    size="xs" color="brand" leftSection={<IconFileInvoice size={14} />}
                    onClick={() => setInvoiceModal(true)}
                  >
                    Generate Bill
                  </Button>
                )}
              </Group>

              {booking.status === 'completed' || canGenerateInvoice ? (
                <InvoiceCard bookingId={booking._id} />
              ) : (
                <Alert color="gray" icon={<IconAlertCircle size={16} />} variant="light">
                  Invoice will appear here once booking is confirmed and customer is seated.
                </Alert>
              )}
            </Card>

            {/* Status History */}
            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Status History</Text>
              <Timeline bulletSize={20} lineWidth={2}>
                {(booking.statusHistory || []).map((h, i) => (
                  <Timeline.Item
                    key={i}
                    bullet={<IconClock size={10} />}
                    title={<Badge color={STATUS_COLORS[h.status] || 'gray'} variant="light" size="sm">{h.status}</Badge>}
                  >
                    <Text size="xs" c="dimmed">{new Date(h.timestamp).toLocaleString()}</Text>
                    {h.reason && <Text size="xs" mt={2}>{h.reason}</Text>}
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </Stack>
        </Grid.Col>

        {/* Right - Actions */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Quick Actions</Text>
              <Stack gap="sm">
                {booking.status === 'pending' && (
                  <>
                    <Button
                      fullWidth color="green" leftSection={<IconCheck size={16} />}
                      loading={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ status: 'confirmed', note: 'Confirmed by owner' })}>
                      Confirm Booking
                    </Button>
                    <Button
                      fullWidth color="red" variant="light" leftSection={<IconX size={16} />}
                      loading={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ status: 'cancelled', note: 'Rejected by owner' })}>
                      Reject Booking
                    </Button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <>
                    <Button fullWidth color="blue"
                      onClick={() => updateMutation.mutate({ status: 'seated', note: 'Guest seated' })}>
                      Mark as Seated
                    </Button>
                    <Button
                      fullWidth color="brand" variant="light" leftSection={<IconFileInvoice size={16} />}
                      onClick={() => setInvoiceModal(true)}
                    >
                      Generate Bill
                    </Button>
                  </>
                )}
                {booking.status === 'seated' && (
                  <Button
                    fullWidth color="brand" leftSection={<IconFileInvoice size={16} />}
                    onClick={() => setInvoiceModal(true)}
                  >
                    Generate Bill
                  </Button>
                )}
              </Stack>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Text fw={700} mb="md" size="sm" c="dimmed" tt="uppercase">Update Status</Text>
              <Stack gap="sm">
                <Select
                  placeholder="Select new status"
                  value={newStatus}
                  onChange={setNewStatus}
                  data={[
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'seated', label: 'Seated' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'no-show', label: 'No Show' },
                  ]}
                />
                <Textarea
                  placeholder="Add a note (optional)"
                  value={ownerNote}
                  onChange={(e) => setOwnerNote(e.target.value)}
                  rows={3}
                />
                <Button
                  fullWidth color="brand"
                  disabled={!newStatus}
                  loading={updateMutation.isPending}
                  onClick={handleUpdate}>
                  Update Status
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      <GenerateInvoiceModal
        opened={invoiceModal}
        onClose={() => setInvoiceModal(false)}
        booking={booking}
        onSuccess={() => setInvoiceModal(false)}
      />
    </Stack>
  );
}
