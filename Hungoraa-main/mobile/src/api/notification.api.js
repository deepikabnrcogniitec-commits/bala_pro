import api from './axios';

const notificationApi = {
  getAll: (params) => api.get('/notifications', { params }),
  // Pass { grouped: true } to get { total, byType } breakdown
  getUnreadCount: (params) => api.get('/notifications/unread-count', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: (type) => api.patch('/notifications/mark-all-read', type ? { type } : {}),
  markMultiple: (ids) => api.patch('/notifications/mark-multiple', { ids }),
  deleteOne: (id) => api.delete(`/notifications/${id}`),
  clearRead: (type) => api.delete('/notifications/clear', { params: type ? { type } : {} }),
};

export { notificationApi };
export default notificationApi;
