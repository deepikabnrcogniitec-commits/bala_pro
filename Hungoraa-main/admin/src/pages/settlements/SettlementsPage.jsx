import { useState } from 'react';
import {
  Stack, Title, Group, Select, Card, Table, Badge, Text, Skeleton,
  SimpleGrid, Pagination, Button, Modal, TextInput, Box, Textarea,
  ThemeIcon, Divider, Alert, Stepper,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconPlus, IconCheck, IconClock, IconBuildingBank,
  IconCurrencyRupee, IconAlertCircle, IconX, IconArrowRight,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { settlementApi, commissionApi, restaurantApi } from '../../api';

const STATUS_COLOR = {
  pending: 'yellow', processing: 'blue', generated: 'violet',
  paid: 'green', failed: 'red',
};

// pending → processing → generated → paid | failed
const NEXT_STATUS = {
  pending: 'processing',
  processing: 'generated',
  generated: 'paid',
};

const PIPELINE_STEPS = ['pending', 'processing', 'generated', 'paid'];
const STEP_INDEX = { pending: 0, processing: 1, generated: 2, paid: 3, failed: 3 };

// ─── Create Settlement Modal ──────────────────────────────────────────────────
function CreateSettlementModal({ opened, onClose }) {
  const qc = useQueryClient();
  const [restaurantId, setRestaurantId] = useState('');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data: restaurants } = useQuery({
    queryKey: ['admin-restaurants-list'],
    queryFn: () => restaurantApi.getAll({ limit: 200 }).then((r) => r.data.data.restaurants),
  });

  const restaurantOptions = (restaurants || []).map((r) => ({ value: r._id, label: r.name }));

  const loadPreview = async () => {
    if (!restaurantId || !from || !to) return;
    setPreviewLoading(true);
    try {
      const res = await commissionApi.getAll({
        restaurantId,
        status: 'pending',
        from: dayjs(from).format('YYYY-MM-DD'),
        to: dayjs(to).format('YYYY-MM-DD'),
        limit: 200,
      });
      const commissions = res.data.data.commissions || [];
      const totalCommission = commissions.reduce((s, c) => s + c.amount, 0);
      const totalRevenue = commissions.reduce((s, c) => s + (c.grossAmount || c.invoiceAmount || 0), 0);
      setPreview({
        count: commissions.length,
        totalRevenue,
        totalCommission,
        netPayable: totalRevenue - totalCommission,
      });
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: () =>
      settlementApi.create({
        restaurantId,
        periodFrom: dayjs(from).format('YYYY-MM-DD'),
        periodTo: dayjs(to).format('YYYY-MM-DD'),
        notes,
      }),
    onSuccess: () => {
      notifications.show({ title: 'Settlement created', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-settlements'] });
      onClose();
      setRestaurantId(''); setFrom(null); setTo(null); setNotes(''); setPreview(null);
    },
    onError: (err) =>
      notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Create Settlement" size="md" centered>
      <Stack gap="md">
        <Select
          label="Restaurant"
          placeholder="Select restaurant"
          data={restaurantOptions}
          value={restaurantId}
          onChange={(v) => { setRestaurantId(v || ''); setPreview(null); }}
          searchable
          required
        />
        <Group grow>
          <DateInput label="Period From" value={from} onChange={(v) => { setFrom(v); setPreview(null); }} required />
          <DateInput label="Period To" value={to} onChange={(v) => { setTo(v); setPreview(null); }} required />
        </Group>

        <Button variant="light" color="gold" size="xs"
          disabled={!restaurantId || !from || !to} loading={previewLoading} onClick={loadPreview}>
          Preview Pending Commissions
        </Button>

        {preview !== null && (
          preview.count === 0 ? (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />} variant="light">
              No pending commissions found for this period.
            </Alert>
          ) : (
            <Card withBorder radius="md" p="md" style={{ background: '#f8fff9' }}>
              <Text fw={700} size="sm" mb="sm">Settlement Preview</Text>
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Invoices Included</Text>
                  <Text size="sm" fw={600}>{preview.count}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Total Revenue</Text>
                  <Text size="sm" fw={600}>₹{preview.totalRevenue.toLocaleString('en-IN')}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Platform Commission</Text>
                  <Text size="sm" fw={600} c="red">₹{preview.totalCommission.toLocaleString('en-IN')}</Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Text size="sm" fw={700}>Restaurant Receives</Text>
                  <Text size="sm" fw={800} c="green.7">₹{preview.netPayable.toLocaleString('en-IN')}</Text>
                </Group>
              </Stack>
            </Card>
          )
        )}

        <TextInput label="Notes (Optional)" placeholder="e.g. June settlement"
          value={notes} onChange={(e) => setNotes(e.target.value)} />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button color="gold" leftSection={<IconPlus size={16} />}
            loading={createMutation.isPending}
            disabled={!restaurantId || !from || !to || preview?.count === 0}
            onClick={() => createMutation.mutate()}>
            Create Settlement
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Advance Status Modal ─────────────────────────────────────────────────────
function AdvanceStatusModal({ settlement, opened, onClose }) {
  const qc = useQueryClient();
  const [txnRef, setTxnRef] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [markFailed, setMarkFailed] = useState(false);

  const nextStatus = markFailed ? 'failed' : NEXT_STATUS[settlement?.status];
  const isFinalPay = nextStatus === 'paid';
  const isFailed = nextStatus === 'failed';

  const advanceMutation = useMutation({
    mutationFn: () =>
      settlementApi.updateStatus(settlement._id, {
        status: nextStatus,
        ...(isFinalPay && { transactionRef: txnRef }),
        ...(isFailed && { failureReason }),
      }),
    onSuccess: () => {
      notifications.show({
        title: isFailed ? 'Settlement marked failed' : `Settlement → ${nextStatus}`,
        color: isFailed ? 'red' : 'green',
      });
      qc.invalidateQueries({ queryKey: ['admin-settlements'] });
      onClose();
      setTxnRef(''); setFailureReason(''); setMarkFailed(false);
    },
    onError: (err) =>
      notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  if (!settlement) return null;

  const currentStep = STEP_INDEX[settlement.status] ?? 0;

  return (
    <Modal
      opened={opened}
      onClose={() => { onClose(); setMarkFailed(false); setTxnRef(''); setFailureReason(''); }}
      title="Advance Settlement"
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Pipeline progress */}
        <Stepper active={currentStep} size="xs" color="gold">
          {PIPELINE_STEPS.map((s) => (
            <Stepper.Step key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} />
          ))}
        </Stepper>

        <Card withBorder radius="md" p="md">
          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Settlement ID</Text>
              <Text size="sm" fw={600} style={{ fontFamily: 'monospace' }}>{settlement.settlementId}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Restaurant</Text>
              <Text size="sm" fw={600}>{settlement.restaurant?.name}</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" fw={700}>Owner Receivable</Text>
              <Text size="lg" fw={800} c="green.7">
                ₹{(settlement.ownerReceivable ?? settlement.netPayable)?.toLocaleString('en-IN')}
              </Text>
            </Group>
          </Stack>
        </Card>

        {/* Generated → show mark-failed option */}
        {settlement.status === 'generated' && (
          <Group gap="sm">
            <Button
              size="xs"
              variant={!markFailed ? 'filled' : 'light'}
              color="green"
              onClick={() => setMarkFailed(false)}
            >
              Mark Paid
            </Button>
            <Button
              size="xs"
              variant={markFailed ? 'filled' : 'light'}
              color="red"
              leftSection={<IconX size={12} />}
              onClick={() => setMarkFailed(true)}
            >
              Mark Failed
            </Button>
          </Group>
        )}

        {isFinalPay && (
          <TextInput
            label="Transaction Reference"
            placeholder="UTR / NEFT Ref No."
            value={txnRef}
            onChange={(e) => setTxnRef(e.target.value)}
            required
          />
        )}

        {isFailed && (
          <Textarea
            label="Failure Reason"
            placeholder="e.g. Bank transfer rejected — incorrect account number"
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value)}
            rows={2}
            required
          />
        )}

        <Alert color="blue" icon={<IconAlertCircle size={16} />} variant="light">
          {isFinalPay
            ? `This will mark the settlement as paid and close it.`
            : isFailed
            ? `This will mark the settlement as failed. The owner will be notified.`
            : `Advance status from "${settlement.status}" → "${nextStatus}".`}
        </Alert>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={() => { onClose(); setMarkFailed(false); }}>Cancel</Button>
          <Button
            color={isFailed ? 'red' : 'green'}
            leftSection={isFailed ? <IconX size={16} /> : <IconArrowRight size={16} />}
            loading={advanceMutation.isPending}
            disabled={
              (isFinalPay && !txnRef.trim()) ||
              (isFailed && !failureReason.trim())
            }
            onClick={() => advanceMutation.mutate()}
          >
            {isFailed ? 'Mark Failed' : `→ ${nextStatus}`}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettlementsPage() {
  const [status, setStatus] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [advancing, setAdvancing] = useState(null);

  const { data: restaurants } = useQuery({
    queryKey: ['admin-restaurants-list'],
    queryFn: () => restaurantApi.getAll({ limit: 200 }).then((r) => r.data.data.restaurants),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settlements', status, restaurantId, page],
    queryFn: () =>
      settlementApi.getAll({
        status: status || undefined,
        restaurantId: restaurantId || undefined,
        page,
        limit: 20,
      }).then((r) => r.data.data),
  });

  const settlements = data?.settlements || [];
  const pagination = data?.pagination || {};

  const restaurantOptions = [
    { value: '', label: 'All Restaurants' },
    ...(restaurants || []).map((r) => ({ value: r._id, label: r.name })),
  ];

  const totalPending = settlements.filter((s) => ['pending', 'processing', 'generated'].includes(s.status)).length;
  const totalPayable = settlements
    .filter((s) => !['paid', 'failed'].includes(s.status))
    .reduce((sum, s) => sum + (s.ownerReceivable ?? s.netPayable ?? 0), 0);
  const totalPaid = settlements
    .filter((s) => s.status === 'paid')
    .reduce((sum, s) => sum + (s.ownerReceivable ?? s.netPayable ?? 0), 0);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Settlements</Title>
        <Button color="gold" leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
          Create Settlement
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #f9a91b' }}>
          <ThemeIcon color="yellow" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconClock size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="yellow.7">{totalPending}</Text>
          <Text size="xs" c="dimmed">In Progress</Text>
        </Card>

        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #cd302b' }}>
          <ThemeIcon color="red" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconCurrencyRupee size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="red.7">₹{totalPayable.toLocaleString('en-IN')}</Text>
          <Text size="xs" c="dimmed">Amount Payable</Text>
        </Card>

        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #2d6a4f' }}>
          <ThemeIcon color="green" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconCheck size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="green.7">₹{totalPaid.toLocaleString('en-IN')}</Text>
          <Text size="xs" c="dimmed">Total Paid Out</Text>
        </Card>

        <Card withBorder radius="md" p="md" ta="center" style={{ borderTop: '3px solid #2a628f' }}>
          <ThemeIcon color="gold" variant="light" size="xl" radius="xl" mx="auto" mb={8}>
            <IconBuildingBank size={20} />
          </ThemeIcon>
          <Text size="xl" fw={800} c="brand.7">{pagination.total || 0}</Text>
          <Text size="xs" c="dimmed">Total Settlements</Text>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p="md">
        <Group gap="sm" wrap="wrap">
          <Select
            placeholder="All Status"
            value={status}
            onChange={(v) => { setStatus(v || ''); setPage(1); }}
            data={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'generated', label: 'Generated' },
              { value: 'paid', label: 'Paid' },
              { value: 'failed', label: 'Failed' },
            ]}
            style={{ width: 180 }}
            clearable
          />
          <Select
            placeholder="All Restaurants"
            value={restaurantId}
            onChange={(v) => { setRestaurantId(v || ''); setPage(1); }}
            data={restaurantOptions}
            style={{ width: 220 }}
            searchable
            clearable
          />
        </Group>
      </Card>

      <Card withBorder radius="md" p={0}>
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="lg">
          <Table.Thead style={{ background: '#123f66' }}>
            <Table.Tr>
              <Table.Th>Settlement ID</Table.Th>
              <Table.Th>Restaurant</Table.Th>
              <Table.Th>Period</Table.Th>
              <Table.Th>Revenue</Table.Th>
              <Table.Th>Commission</Table.Th>
              <Table.Th>Owner Gets</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Txn Ref</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading
              ? [1, 2, 3].map((i) => (
                  <Table.Tr key={i}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => (
                      <Table.Td key={j}><Skeleton height={18} radius="sm" /></Table.Td>
                    ))}
                  </Table.Tr>
                ))
              : settlements.length === 0
              ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Box py={40} ta="center">
                      <Text size={32} mb={8}>🏦</Text>
                      <Text fw={600} c="dimmed">No settlements yet</Text>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              )
              : settlements.map((s) => (
                  <Table.Tr key={s._id}>
                    <Table.Td>
                      <Text size="xs" fw={700} style={{ fontFamily: 'monospace' }}>{s.settlementId}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>{s.restaurant?.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {dayjs(s.periodFrom).format('DD MMM')} – {dayjs(s.periodTo).format('DD MMM YYYY')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>₹{s.totalRevenue?.toLocaleString('en-IN')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="red" fw={600}>₹{s.totalCommission?.toLocaleString('en-IN')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="green.7" fw={700}>
                        ₹{(s.ownerReceivable ?? s.netPayable)?.toLocaleString('en-IN')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLOR[s.status] || 'gray'} variant="light" size="sm">
                        {s.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                        {s.transactionRef || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {NEXT_STATUS[s.status] ? (
                        <Button size="xs" color="gold" variant="light"
                          leftSection={<IconArrowRight size={12} />}
                          onClick={() => setAdvancing(s)}>
                          Advance
                        </Button>
                      ) : s.status === 'paid' ? (
                        <Text size="xs" c="green" fw={600}>✓ Paid</Text>
                      ) : (
                        <Text size="xs" c="red" fw={600}>✗ Failed</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
          </Table.Tbody>
        </Table>
      </Card>

      {pagination.pages > 1 && (
        <Group justify="center">
          <Pagination total={pagination.pages} value={page} onChange={setPage} color="gold" />
        </Group>
      )}

      <CreateSettlementModal opened={createOpen} onClose={() => setCreateOpen(false)} />
      <AdvanceStatusModal
        settlement={advancing}
        opened={!!advancing}
        onClose={() => setAdvancing(null)}
      />
    </Stack>
  );
}
