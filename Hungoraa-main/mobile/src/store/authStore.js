import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      city: null, // user-selected/detected city for discovery (null = auto/all)
      coords: null, // { latitude, longitude } from device GPS, for "near me"
      locality: null, // human-readable area label, e.g. "Anna Nagar, Chennai"

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setCity: (city) => set({ city }),
      setLocation: ({ city, coords, locality }) =>
        set((s) => ({
          city: city ?? s.city,
          coords: coords ?? s.coords,
          locality: locality ?? s.locality,
        })),

      setAccessToken: (accessToken) => set({ accessToken }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'hungora-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        city: state.city,
        coords: state.coords,
        locality: state.locality,
      }),
    }
  )
);
