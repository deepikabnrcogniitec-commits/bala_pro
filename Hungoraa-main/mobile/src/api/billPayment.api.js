import api from './axios';

const billPaymentApi = {
  getRestaurants: (params) => api.get('/bill-payments/restaurants', { params }),

  // Server-computed breakdown: bill − discount + convenience fee + GST + tip.
  // params: { restaurantId, billAmount, offerId?, offerCode?, tipAmount? }
  quote: (params) => api.get('/bill-payments/quote', { params }),

  // Step 1: create a BillPayment draft (billStatus = 'open')
  fetchBill: (data) => api.post('/bill-payments/fetch', data),

  // Step 2: apply an offer → { offerId } or { offerCode } — returns
  // discountBreakup + finalAmount (billStatus = 'preview')
  applyOffer: (id, data) => api.patch(`/bill-payments/${id}/apply-offer`, data),

  // Step 3: pay — { restaurantId, billAmount, offerId?, offerCode?, paymentMethod }.
  // Wallet completes immediately; any other method returns a Razorpay order.
  pay: (data) => api.post('/bill-payments', data),

  // Razorpay only: verify the signature after checkout and mark the bill paid.
  completeBillPayment: (data) => api.post('/bill-payments/complete', data),

  // History
  getMyHistory: (params) => api.get('/bill-payments/my', { params }),
  getById: (id) => api.get(`/bill-payments/${id}`),
};

export { billPaymentApi };
export default billPaymentApi;
