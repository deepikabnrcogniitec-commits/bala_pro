import api from './axios';

const paymentApi = {
  // Booking deposit payment
  createOrder: (data) => api.post('/payments/create-order', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  payWithWallet: (bookingId, amount) => api.post('/payments/wallet/pay', { bookingId, amount }),

  // Wallet top-up (2-step: create order → verify)
  createWalletTopupOrder: (amount) => api.post('/payments/wallet/topup-order', { amount }),
  topUpWallet: (data) => api.post('/payments/wallet/topup', data),

  // Wallet info
  getWallet: () => api.get('/payments/wallet'),
  getWalletTransactions: (params) => api.get('/payments/wallet/transactions', { params }),

  // Payment history
  getHistory: (params) => api.get('/payments/history', { params }),
  getById: (id) => api.get(`/payments/${id}`),

  // Offer validation
  validateCoupon: (code, data) => api.post('/offers/validate-coupon', { code, ...data }),
};

export { paymentApi };
export default paymentApi;
