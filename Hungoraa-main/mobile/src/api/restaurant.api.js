import api from './axios';

const restaurantApi = {
  getAll: (params) => api.get('/restaurants', { params }),

  getById: (id) => api.get(`/restaurants/${id}`),

  getBySlug: (slug) => api.get(`/restaurants/slug/${slug}`),

  search: (query, params) => api.get('/restaurants/search', { params: { q: query, ...params } }),

  getFeatured: () => api.get('/restaurants/featured'),

  getTrending: (city) => api.get('/restaurants/trending', { params: { city } }),

  getCategories: () => api.get('/restaurants/categories'),

  getCities: () => api.get('/restaurants/cities'),

  getMenu: (restaurantId, branchId) =>
    api.get(`/restaurants/${restaurantId}/menu`, { params: { branchId } }),

  getAvailability: (restaurantId, branchId, date, guests) =>
    api.get(`/restaurants/${restaurantId}/availability`, {
      params: { branchId, date, guests },
    }),

  getReviews: (restaurantId, page = 1) =>
    api.get(`/restaurants/${restaurantId}/reviews`, { params: { page } }),

  toggleSave: (restaurantId) => api.post(`/restaurants/${restaurantId}/save`),

  getSaved: () => api.get('/users/saved-restaurants'),

  getNearby: (params) => api.get('/restaurants/nearby', { params }),

  getOffers: (restaurantId) => api.get(`/offers/restaurant/${restaurantId}`),
};

export { restaurantApi };
export default restaurantApi;
