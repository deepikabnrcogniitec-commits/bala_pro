import api from './axios';

const offerApi = {
  // Active, approved offers — optionally scoped to a city or usage type
  getAll: (params) => api.get('/offers', { params }),

  getForRestaurant: (restaurantId) => api.get(`/offers/restaurant/${restaurantId}`),

  validateCoupon: (payload) => api.post('/offers/validate-coupon', payload),
};

export { offerApi };
export default offerApi;
