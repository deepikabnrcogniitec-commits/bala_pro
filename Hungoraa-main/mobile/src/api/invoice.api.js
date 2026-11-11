import api from './axios';

const invoiceApi = {
  getByBooking: (bookingId) => api.get(`/invoices/booking/${bookingId}`),
  getById: (id) => api.get(`/invoices/${id}`),
};

export { invoiceApi };
export default invoiceApi;
