import api from './axios';

const settingsApi = {
  // Safe platform settings for the app (home hero background, flags)
  getPublic: () => api.get('/settings/public'),
};

export { settingsApi };
export default settingsApi;
