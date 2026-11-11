import { create } from 'zustand';

export const useAppStore = create((set) => ({
  location: null,
  selectedCity: null,
  searchQuery: '',
  recentSearches: [],
  cartItems: [],

  // Launch logo video has finished. Screens hold their popups (location etc.) until
  // then — RN Modals render in their own window, above the intro overlay.
  introDone: false,
  setIntroDone: (introDone) => set({ introDone }),

  // Dining intent chosen from the post-login popup ('book' | 'dinein' | null).
  // `modeChooserShown` is NOT persisted, so the popup shows once per app launch.
  diningMode: null,
  modeChooserShown: false,
  setDiningMode: (diningMode) => set({ diningMode, modeChooserShown: true }),
  markModeChooserShown: () => set({ modeChooserShown: true }),

  // Location permission prompt — NOT persisted, so it re-asks each launch until a
  // location is actually set (Swiggy-style).
  locationPromptDone: false,
  markLocationPrompt: () => set({ locationPromptDone: true }),
  selectedFilters: {
    cuisine: [],
    priceRange: [],
    rating: null,
    distance: null,
    sortBy: 'relevance',
  },

  setLocation: (location) => set({ location }),
  setCity: (city) => set({ selectedCity: city }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  addRecentSearch: (term) =>
    set((state) => ({
      recentSearches: [term, ...state.recentSearches.filter((s) => s !== term)].slice(0, 10),
    })),

  clearRecentSearches: () => set({ recentSearches: [] }),

  setFilters: (filters) =>
    set((state) => ({ selectedFilters: { ...state.selectedFilters, ...filters } })),

  resetFilters: () =>
    set({
      selectedFilters: {
        cuisine: [],
        priceRange: [],
        rating: null,
        distance: null,
        sortBy: 'relevance',
      },
    }),
}));
