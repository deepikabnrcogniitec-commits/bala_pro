import api from './axios';

const authApi = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  googleLogin: (idToken) => api.post('/auth/google', { idToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password, confirmPassword) =>
    api.post(`/auth/reset-password/${token}`, { password, confirmPassword }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me'),
};

export default authApi;
