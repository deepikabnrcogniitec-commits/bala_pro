import { useState } from 'react';
import {
  Stack, Title, Group, Card, Text, Badge, Button, Skeleton, Box,
  Modal, Textarea, SimpleGrid, ThemeIcon, Divider, Alert,
} from '@mantine/core';
import {
  IconCheck, IconX, IconTag, IconBuildingStore,
  IconCalendar, IconInfoCircle, IconClock,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { offerApi } from '../../api';

const FUNDED_BY_COLOR = {
  restaurant: 'green', platform: 'blue', bank: 'violet', combined: 'orange',
};

function RejectModal({ offer, opened, onClose }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => offerApi.reject(offer._id, reason),
    onSuccess: () => {
      notifications.show({ title: 'Offer rejected', color: 'orange' });
      qc.invalidateQueries({ queryKey: ['admin-pending-offers'] });
      onClose();
      setReason('');
    },
    onError: (err) =>
      notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  if (!offer) return null;

  return (
    <Modal opened={opened} onClose={() => { onClose(); setReason(''); }} title="Reject Offer" size="sm" centered>
      <Stack gap="md">
        <Text size="sm">Rejecting: <strong>{offer.title}</strong> ({offer.restaurant?.name})</Text>
        <Textarea
          label="Rejection Reason"
          placeholder="e.g. Discount value too high, please stay within policy limits"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={() => { onClose(); setReason(''); }}>Cancel</Button>
          <Button color="red" leftSection={<IconX size={16} />}
            loading={mutation.isPending} disabled={!reason.trim()}
            onClick={() => mutation.mutate()}>
            Reject Offer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function OfferApprovalPage() {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pending-offers'],
    queryFn: () => offerApi.getPending().then((r) => r.data.data.offers),
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => offerApi.approve(id),
    onSuccess: () => {
      notifications.show({ title: 'Offer approved', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-pending-offers'] });
    },
    onError: (err) =>
      notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  const offers = data || [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Offer Approval Queue</Title>
        <Badge size="lg" color={offers.length > 0 ? 'red' : 'green'} variant="filled">
          {offers.length} pending
        </Badge>
      </Group>

      {offers.length > 0 && (
        <Alert color="blue" icon={<IconInfoCircle size={16} />} variant="light">
          These offers are submitted by restaurant owners awaiting your approval before going live.
        </Alert>
      )}

      {isLoading ? (
        <Stack gap="sm">{[1, 2, 3].map((i) => <Skeleton key={i} height={160} radius="md" />)}</Stack>
      ) : offers.length === 0 ? (
        <Box py={80} ta="center">
          <ThemeIcon color="green" variant="light" size={64} radius="xl" mx="auto" mb={16}>
            <IconCheck size={32} />
          </ThemeIcon>
          <Text fw={700} size="lg">All clear!</Text>
          <Text c="dimmed">No offers pending approval right now.</Text>
        </Box>
      ) : (
        <Stack gap="md">
          {offers.map((offer) => (
            <Card key={offer._id} withBorder radius="md" p="lg"
              style={{ borderLeft: '4px solid #f9a91b' }}>
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={8} style={{ flex: 1 }}>
                  {/* Title + badges */}
                  <Group gap="sm" wrap="wrap">
                    <Text fw={700} size="lg">{offer.title}</Text>
                    <Badge color="yellow" variant="light" size="sm" leftSection={<IconClock size={10} />}>
                      Pending Approval
                    </Badge>
                    {offer.fundedBy && (
                      <Badge color={FUNDED_BY_COLOR[offer.fundedBy] || 'gray'} variant="light" size="sm">
                        Funded by {offer.fundedBy}
                      </Badge>
                    )}
                  </Group>

                  {/* Restaurant */}
                  <Group gap={6}>
                    <IconBuildingStore size={14} color="#868e96" />
                    <Text size="sm" c="dimmed">{offer.restaurant?.name || '—'}</Text>
                  </Group>

                  {/* Offer details */}
                  <Group gap={16} wrap="wrap">
                    <Group gap={4}>
                      <IconTag size={14} color="#868e96" />
                      <Text size="sm" fw={700} style={{ fontFamily: 'monospace' }}>{offer.code}</Text>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {offer.type === 'percentage' ? `${offer.discountValue}% off` : `₹${offer.discountValue} off`}
                      {offer.minOrderAmount > 0 && ` • Min ₹${offer.minOrderAmount}`}
                      {offer.maxDiscountAmount > 0 && ` • Max ₹${offer.maxDiscountAmount}`}
                    </Text>
                  </Group>

                  {/* Validity */}
                  <Group gap={6}>
                    <IconCalendar size={14} color="#868e96" />
                    <Text size="sm" c="dimmed">
                      {dayjs(offer.validFrom).format('DD MMM YYYY')} – {dayjs(offer.validUntil).format('DD MMM YYYY')}
                    </Text>
                  </Group>

                  {/* Funding breakup for combined */}
                  {offer.fundedBy === 'combined' && offer.fundingBreakup && (
                    <SimpleGrid cols={3} spacing="sm">
                      {offer.fundingBreakup.restaurantPercent > 0 && (
                        <Card withBorder p="xs" radius="sm" ta="center">
                          <Text size="xs" c="dimmed">Restaurant</Text>
                          <Text size="sm" fw={700} c="green">{offer.fundingBreakup.restaurantPercent}%</Text>
                        </Card>
                      )}
                      {offer.fundingBreakup.platformPercent > 0 && (
                        <Card withBorder p="xs" radius="sm" ta="center">
                          <Text size="xs" c="dimmed">Platform</Text>
                          <Text size="sm" fw={700} c="blue">{offer.fundingBreakup.platformPercent}%</Text>
                        </Card>
                      )}
                      {offer.fundingBreakup.bankPercent > 0 && (
                        <Card withBorder p="xs" radius="sm" ta="center">
                          <Text size="xs" c="dimmed">Bank</Text>
                          <Text size="sm" fw={700} c="violet">{offer.fundingBreakup.bankPercent}%</Text>
                        </Card>
                      )}
                    </SimpleGrid>
                  )}

                  {/* Description */}
                  {offer.description && (
                    <Text size="xs" c="dimmed">{offer.description}</Text>
                  )}

                  {/* Submitted time */}
                  <Text size="xs" c="dimmed">
                    Submitted {dayjs(offer.updatedAt).fromNow()}
                  </Text>
                </Stack>

                <Divider orientation="vertical" mx="md" />

                <Stack gap="sm" style={{ minWidth: 120 }}>
                  <Button
                    color="green"
                    leftSection={<IconCheck size={16} />}
                    loading={approveMutation.isPending && approveMutation.variables === offer._id}
                    onClick={() => approveMutation.mutate(offer._id)}
                    fullWidth
                  >
                    Approve
                  </Button>
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconX size={16} />}
                    onClick={() => setRejecting(offer)}
                    fullWidth
                  >
                    Reject
                  </Button>
                </Stack>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <RejectModal
        offer={rejecting}
        opened={!!rejecting}
        onClose={() => setRejecting(null)}
      />
    </Stack>
  );
}
