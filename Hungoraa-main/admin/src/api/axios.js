import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('hungora-admin-auth');
  if (stored) {
    const { state } = JSON.parse(stored);
    if (state?.accessToken) config.headers.Authorization = `Bearer ${state.accessToken}`;
  }

  // File uploads: the instance defaults to `application/json`, which makes
  // axios v1 serialise a FormData body to JSON (losing the file). Drop the
  // header for FormData so the browser sets `multipart/form-data; boundary=…`.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers?.setContentType) config.headers.setContentType(false);
    else if (config.headers?.delete) config.headers.delete('Content-Type');
    else if (config.headers) delete config.headers['Content-Type'];
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hungora-admin-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
