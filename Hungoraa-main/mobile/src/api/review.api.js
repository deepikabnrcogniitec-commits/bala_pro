import api from './axios';

const reviewApi = {
  getMy: (params) => api.get('/reviews/my', { params }),
  add: (restaurantId, data) => api.post(`/restaurants/${restaurantId}/reviews`, data),
  getForRestaurant: (restaurantId, params) => api.get(`/restaurants/${restaurantId}/reviews`, { params }),
};

export { reviewApi };
export default reviewApi;
