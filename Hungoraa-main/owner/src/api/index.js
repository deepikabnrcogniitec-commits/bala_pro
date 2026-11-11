import api from './axios';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
};

export const restaurantApi = {
  getMyRestaurants: () => api.get('/restaurants/owner/my'),
  getById: (id) => api.get(`/restaurants/${id}`),
  create: (data) => api.post('/restaurants', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/restaurants/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/restaurants/${id}`),
  getDashboard: () => api.get('/restaurants/owner/dashboard'),
  getAnalytics: (restaurantId, period) => api.get('/restaurants/owner/analytics', { params: { restaurantId, period } }),
  togglePayBill: (id) => api.patch(`/bill-payments/${id}/toggle`),
};

export const billPaymentApi = {
  getRestaurantBillPayments: (restaurantId, params) =>
    api.get('/bill-payments/restaurant', { params: { restaurantId, ...params } }),
  getById: (id) => api.get(`/bill-payments/${id}`),
};

export const branchApi = {
  getAll: (restaurantId) => api.get(`/restaurants/${restaurantId}/branches`),
  create: (restaurantId, data) => api.post(`/restaurants/${restaurantId}/branches`, data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
  toggle: (id) => api.patch(`/branches/${id}/toggle`),
};

export const tableApi = {
  getAll: (restaurantId, branchId) => api.get('/tables', { params: { restaurantId, branchId } }),
  create: (restaurantId, data) => api.post('/tables', { ...data, restaurantId }),
  update: (restaurantId, id, data) => api.put(`/tables/${id}`, { ...data, restaurantId }),
  delete: (restaurantId, id) => api.delete(`/tables/${id}`, { params: { restaurantId } }),
  toggleAvailability: (id) => api.patch(`/tables/${id}/toggle`),
};

export const menuApi = {
  get: (restaurantId) => api.get(`/menus/${restaurantId}`),
  addCategory: (restaurantId, data) => api.post(`/menus/${restaurantId}/categories`, data),
  updateCategory: (restaurantId, categoryId, data) => api.put(`/menus/${restaurantId}/categories/${categoryId}`, data),
  deleteCategory: (restaurantId, categoryId) => api.delete(`/menus/${restaurantId}/categories/${categoryId}`),
  addItem: (restaurantId, categoryId, data) =>
    api.post(`/menus/${restaurantId}/categories/${categoryId}/items`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateItem: (restaurantId, categoryId, itemId, data) =>
    api.put(`/menus/${restaurantId}/categories/${categoryId}/items/${itemId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteItem: (restaurantId, categoryId, itemId) =>
    api.delete(`/menus/${restaurantId}/categories/${categoryId}/items/${itemId}`),
};

export const bookingApi = {
  getAll: (params) => api.get('/bookings/restaurant', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  updateStatus: (id, status, reason) => api.patch(`/bookings/${id}/status`, { status, reason }),
  getToday: (restaurantId) => api.get('/bookings/today', { params: { restaurantId } }),
};

export const offerApi = {
  getAll: (restaurantId) => api.get(`/offers/restaurant/${restaurantId}`),
  getById: (id) => api.get(`/offers/${id}`),
  create: (restaurantId, data) => api.post('/offers', { ...data, restaurantId }),
  update: (id, data) => api.put(`/offers/${id}`, data),
  delete: (id) => api.delete(`/offers/${id}`),
  // Offer approval workflow
  submitForApproval: (id) => api.patch(`/offers/${id}/submit`),
  // Usage analytics
  getUsage: (id, params) => api.get(`/offers/${id}/usage`, { params }),
};

export const reviewApi = {
  getAll: (restaurantId, params) => api.get(`/restaurants/${restaurantId}/reviews`, { params }),
  reply: (reviewId, comment) => api.post(`/reviews/${reviewId}/reply`, { comment }),
};

export const invoiceApi = {
  generate: (data) => api.post('/invoices', data),
  markPaid: (id, paymentMethod) => api.patch(`/invoices/${id}/pay`, { paymentMethod }),
  lock: (id) => api.patch(`/invoices/${id}/lock`),
  cancel: (id) => api.patch(`/invoices/${id}/cancel`),
  getByBooking: (bookingId) => api.get(`/invoices/booking/${bookingId}`),
  getById: (id) => api.get(`/invoices/${id}`),
  getRestaurantInvoices: (restaurantId, params) =>
    api.get('/invoices/restaurant', { params: { restaurantId, ...params } }),
};

export const commissionApi = {
  getMy: (restaurantId, params) => api.get('/commissions/my', { params: { restaurantId, ...params } }),
  getById: (id) => api.get(`/commissions/${id}`),
  getTrend: (restaurantId, params) => api.get('/commissions/trend', { params: { restaurantId, ...params } }),
};

export const settlementApi = {
  getMy: (restaurantId) => api.get('/settlements/my', { params: { restaurantId } }),
  getById: (id) => api.get(`/settlements/${id}`),
  // Pipeline advancement: body: { status, transactionRef?, failureReason?, note? }
  updateStatus: (id, data) => api.patch(`/settlements/${id}/status`, data),
  getReport: (params) => api.get('/settlements/report', { params }),
};
