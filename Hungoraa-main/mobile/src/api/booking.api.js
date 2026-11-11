import api from './axios';

const bookingApi = {
  create: (data) => api.post('/bookings', data),
  holdBooking: (data) => api.post('/bookings/hold', data),
  releaseHold: (id) => api.delete(`/bookings/hold/${id}`),
  getMyBookings: (params) => api.get('/bookings/my', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id, reason) => api.patch(`/bookings/${id}/cancel`, { reason }),
  reschedule: (id, data) => api.patch(`/bookings/${id}/reschedule`, data),
  addReview: (bookingId, data) => api.post(`/bookings/${bookingId}/review`, data),
};

export { bookingApi };
export default bookingApi;
