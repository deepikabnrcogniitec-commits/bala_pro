import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { restaurantApi } from '../api/restaurant.api';
import { offerApi } from '../api/offer.api';
import { notificationApi } from '../api/notification.api';
import { useAuthStore } from '../store/authStore';

const unwrap = (r) => r.data?.data ?? r.data;

/**
 * Data hooks for the home screen. Each returns the standard react-query
 * object ({ data, isLoading, isError, refetch }) so sections can render
 * skeleton / empty / error states independently.
 */

export function useActiveOffers(city) {
  return useQuery({
    queryKey: ['home', 'offers', city || 'all'],
    queryFn: () => offerApi.getAll({ city, limit: 15 }).then(unwrap),
    select: (d) => d?.offers || [],
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeaturedRestaurants() {
  return useQuery({
    queryKey: ['home', 'featured'],
    queryFn: () => restaurantApi.getFeatured().then(unwrap),
    select: (d) => d?.restaurants || [],
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrendingRestaurants(city, { cuisine, sortBy } = {}) {
  return useQuery({
    queryKey: ['home', 'trending', city || 'all', cuisine || 'all', sortBy || 'default'],
    queryFn: () => {
      if (cuisine && cuisine !== 'all') {
        return restaurantApi.getAll({ city, cuisine, sortBy, limit: 12 }).then(unwrap);
      }
      return restaurantApi.getTrending(city).then(unwrap);
    },
    select: (d) => d?.restaurants || [],
    staleTime: 3 * 60 * 1000,
  });
}

export function useCities() {
  return useQuery({
    queryKey: ['home', 'cities'],
    queryFn: () => restaurantApi.getCities().then(unwrap),
    select: (d) => d?.cities || [],
    staleTime: 30 * 60 * 1000,
  });
}

export function useUnreadCount() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['home', 'unread'],
    enabled: isAuthed,
    queryFn: () => notificationApi.getUnreadCount().then(unwrap),
    select: (d) => d?.count ?? d?.total ?? 0,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Saved / favourite restaurants — a Set of ids plus an optimistic toggle
 * that persists via POST /restaurants/:id/save.
 */
export function useFavorites() {
  const qc = useQueryClient();
  const isAuthed = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ['home', 'favorites'],
    enabled: isAuthed,
    queryFn: () => restaurantApi.getSaved().then(unwrap),
    select: (d) => {
      const list = d?.restaurants || d?.saved || d || [];
      return new Set(list.map((r) => r._id || r.id || r));
    },
    staleTime: 5 * 60 * 1000,
  });

  const ids = query.data || new Set();

  const toggle = useMutation({
    mutationFn: (restaurant) => restaurantApi.toggleSave(restaurant.id || restaurant._id),
    onMutate: async (restaurant) => {
      if (!isAuthed) {
        Toast.show({ type: 'error', text1: 'Sign in to save restaurants' });
        throw new Error('not-authed');
      }
      await qc.cancelQueries({ queryKey: ['home', 'favorites'] });
      const prev = qc.getQueryData(['home', 'favorites']);
      const next = new Set(prev instanceof Set ? prev : []);
      const rid = restaurant.id || restaurant._id;
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      qc.setQueryData(['home', 'favorites'], next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['home', 'favorites'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['home', 'favorites'] }),
  });

  return {
    isFavorite: (id) => ids.has(id),
    toggleFavorite: (restaurant) => toggle.mutate(restaurant),
  };
}
