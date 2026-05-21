import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    // Redirect to login on auth failure, but not for auth endpoints themselves
    if ((status === 401 || status === 403) && !url.includes('/auth/')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const transactionAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
};

export const statsAPI = {
  getDashboard: () => api.get('/statistics/dashboard'),
  exportExcel: () => api.get('/statistics/export/excel', { responseType: 'blob' }),
  exportPdf: () => api.get('/statistics/export/pdf', { responseType: 'blob' }),
};

export const goalsAPI = {
  getAll: () => api.get('/goals'),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  updateProgress: (id, progress) => api.patch(`/goals/${id}/progress`, { progress }),
};

export const planningAPI = {
  getAll: () => api.get('/planning'),
  create: (data) => api.post('/planning', data),
  update: (id, data) => api.put(`/planning/${id}`, data),
  delete: (id) => api.delete(`/planning/${id}`),
};

export const studyAPI = {
  getTasks: () => api.get('/study/tasks'),
  createTask: (data) => api.post('/study/tasks', data),
  toggleTask: (id) => api.patch(`/study/tasks/${id}/toggle`),
  deleteTask: (id) => api.delete(`/study/tasks/${id}`),
};

export const fitnessAPI = {
  getWorkouts: () => api.get('/fitness/workouts'),
  createWorkout: (data) => api.post('/fitness/workouts', data),
  deleteWorkout: (id) => api.delete(`/fitness/workouts/${id}`),
};

export default api;
