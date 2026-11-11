

import { useState, useEffect } from 'react';
import {
  Stack, Title, Group, Card, Text, Badge, Select, Textarea, Button,
  Avatar, Box, SimpleGrid, Rating, Skeleton, Divider, Collapse,
} from '@mantine/core';
import { IconStar, IconMessage } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { reviewApi, restaurantApi } from '../../api';

function StarBar({ label, value }) {
  return (
    <Group justify="space-between" gap={8}>
      <Text size="xs" c="dimmed" style={{ width: 80 }}>{label}</Text>
      <Rating value={value} readOnly size="xs" fractions={2} />
      <Text size="xs" fw={700} style={{ width: 24 }}>{value?.toFixed(1)}</Text>
    </Group>
  );
}

function ReviewCard({ review }) {
  const qc = useQueryClient();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const replyMutation = useMutation({
    mutationFn: (comment) => reviewApi.reply(review._id, comment),
    onSuccess: () => {
      notifications.show({ title: 'Reply sent', color: 'green' });
      qc.invalidateQueries({ queryKey: ['reviews'] });
      setReplyOpen(false);
    },
    onError: () => notifications.show({ title: 'Error', message: 'Could not send reply', color: 'red' }),
  });

  const ratingColor = review.rating >= 4 ? 'green' : review.rating >= 3 ? 'yellow' : 'red';

  return (
    <Card withBorder radius="md" p="lg">
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <Avatar color="red" size="md">{review.customer?.name?.charAt(0)}</Avatar>
          <Stack gap={2}>
            <Text fw={700} size="sm">{review.customer?.name}</Text>
            <Text size="xs" c="dimmed">{new Date(review.createdAt).toLocaleDateString()}</Text>
          </Stack>
        </Group>
        <Badge color={ratingColor} size="lg" variant="light">
          ⭐ {review.rating?.toFixed(1)}
        </Badge>
      </Group>

      {/* Sub-ratings */}
      <SimpleGrid cols={3} mb="md">
        <StarBar label="Food" value={review.subRatings?.food} />
        <StarBar label="Service" value={review.subRatings?.service} />
        <StarBar label="Ambiance" value={review.subRatings?.ambiance} />
      </SimpleGrid>

      {/* Review Text */}
      <Text size="sm" mb="md" style={{ fontStyle: 'italic' }}>"{review.comment}"</Text>

      {/* Existing Reply */}
      {review.ownerReply && (
        <Box p="sm" bg="#f8f9fa" style={{ borderRadius: 8, borderLeft: '3px solid #e63946' }} mb="sm">
          <Text size="xs" c="dimmed" mb={4}>Your reply • {new Date(review.ownerReply.repliedAt).toLocaleDateString()}</Text>
          <Text size="sm">{review.ownerReply.text}</Text>
        </Box>
      )}

      {/* Reply Button + Form */}
      {!review.ownerReply && (
        <>
          <Button
            variant="subtle" size="xs" leftSection={<IconMessage size={13} />}
            onClick={() => setReplyOpen((p) => !p)}>
            {replyOpen ? 'Cancel' : 'Reply'}
          </Button>
          <Collapse in={replyOpen}>
            <Stack gap="sm" mt="sm">
              <Textarea
                placeholder="Write a professional reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                autosize
                minRows={2}
              />
              <Group justify="flex-end">
                <Button size="xs" color="brand"
                  disabled={!replyText.trim()}
                  loading={replyMutation.isPending}
                  onClick={() => replyMutation.mutate(replyText)}>
                  Post Reply
                </Button>
              </Group>
            </Stack>
          </Collapse>
        </>
      )}
    </Card>
  );
}

export default function ReviewsPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [replyFilter, setReplyFilter] = useState('all');

  const { data: restaurants } = useQuery({
    queryKey: ['my-restaurants'],
    queryFn: () => restaurantApi.getMyRestaurants().then((r) => r.data.data.restaurants),
  });

  useEffect(() => {
    if (restaurants?.[0] && !restaurantId) setRestaurantId(restaurants[0]._id);
  }, [restaurants]);

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews', restaurantId, ratingFilter],
    queryFn: () => reviewApi.getAll(restaurantId, { rating: ratingFilter !== 'all' ? ratingFilter : undefined })
      .then((r) => r.data.data),
    enabled: !!restaurantId,
  });

  const reviews = reviewsData?.reviews || [];
  const stats = reviewsData?.stats || {};
  const restaurantOptions = restaurants?.map((r) => ({ value: r._id, label: r.name })) || [];

  const filtered = reviews.filter((r) => {
    if (ratingFilter !== 'all' && r.rating !== Number(ratingFilter)) return false;
    if (replyFilter === 'replied' && !r.ownerReply) return false;
    if (replyFilter === 'pending' && r.ownerReply) return false;
    return true;
  });

  const pendingReplies = reviews.filter((r) => !r.ownerReply).length;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Reviews</Title>
        {restaurants?.length > 1 && (
          <Select data={restaurantOptions} value={restaurantId} onChange={setRestaurantId}
            placeholder="Select Restaurant" style={{ width: 200 }} />
        )}
      </Group>

      {/* Rating Summary */}
      <Card withBorder radius="md" p="lg">
        <Group gap="xl">
          <Stack align="center" gap={4}>
            <Text size={40} fw={800} c="brand">{stats.averageRating?.toFixed(1) || '—'}</Text>
            <Rating value={stats.averageRating || 0} readOnly size="sm" fractions={2} />
            <Text size="sm" c="dimmed">{stats.totalReviews || 0} reviews</Text>
          </Stack>

          <Divider orientation="vertical" />

          <Stack gap={6} style={{ flex: 1 }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingBreakdown?.[star] || 0;
              const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <Group key={star} gap={8}>
                  <Text size="xs" style={{ width: 24 }}>{star}★</Text>
                  <Box style={{ flex: 1, height: 6, background: '#f1f3f5', borderRadius: 3, overflow: 'hidden' }}>
                    <Box style={{ width: `${pct}%`, height: '100%', background: star >= 4 ? '#2d6a4f' : star === 3 ? '#f4a261' : '#e63946', borderRadius: 3 }} />
                  </Box>
                  <Text size="xs" c="dimmed" style={{ width: 20 }}>{count}</Text>
                </Group>
              );
            })}
          </Stack>

          <Divider orientation="vertical" />

          <Stack gap={4} align="center">
            <Text size="xl" fw={800} c="orange">{pendingReplies}</Text>
            <Text size="sm" c="dimmed">Pending replies</Text>
          </Stack>
        </Group>
      </Card>

      {/* Filters */}
      <Group gap="sm">
        <Select
          placeholder="Filter by rating"
          value={ratingFilter}
          onChange={setRatingFilter}
          data={[
            { value: 'all', label: 'All Ratings' },
            { value: '5', label: '⭐⭐⭐⭐⭐ 5 Stars' },
            { value: '4', label: '⭐⭐⭐⭐ 4 Stars' },
            { value: '3', label: '⭐⭐⭐ 3 Stars' },
            { value: '2', label: '⭐⭐ 2 Stars' },
            { value: '1', label: '⭐ 1 Star' },
          ]}
          style={{ width: 180 }}
        />
        <Select
          placeholder="Filter by reply"
          value={replyFilter}
          onChange={setReplyFilter}
          data={[
            { value: 'all', label: 'All Reviews' },
            { value: 'pending', label: 'Needs Reply' },
            { value: 'replied', label: 'Replied' },
          ]}
          style={{ width: 180 }}
        />
      </Group>

      {/* Reviews List */}
      {isLoading ? (
        <Stack gap="md">{[1,2,3].map((i) => <Skeleton key={i} height={180} radius="md" />)}</Stack>
      ) : (
        <Stack gap="md">
          {filtered.map((review) => <ReviewCard key={review._id} review={review} />)}
        </Stack>
      )}

      {filtered.length === 0 && !isLoading && (
        <Box py={60} style={{ textAlign: 'center' }}>
          <Text size={40} mb={8}>⭐</Text>
          <Text fw={600}>No reviews yet</Text>
          <Text c="dimmed" size="sm">Reviews will appear here once customers book and dine</Text>
        </Box>
      )}
    </Stack>
  );
}
