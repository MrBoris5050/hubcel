import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Packages
export const getPackages = () => api.get('/packages');

// Subscriptions
export const activateSubscription = (packageId) => api.post('/subscriptions/activate', { packageId });
export const getActiveSubscription = () => api.get('/subscriptions/active');
export const getSubscriptionHistory = () => api.get('/subscriptions/history');
export const cancelSubscription = (id) => api.patch(`/subscriptions/${id}/cancel`);

// Beneficiaries
export const getBeneficiaries = () => api.get('/beneficiaries');
export const addBeneficiary = (data) => api.post('/beneficiaries', data);
export const updateBeneficiary = (id, data) => api.patch(`/beneficiaries/${id}`, data);
export const deleteBeneficiary = (id) => api.delete(`/beneficiaries/${id}`);

// Share
export const sendData = (data) => api.post('/share/send', data);
export const bulkSendData = (distributions) => api.post('/share/bulk-send', { distributions });

// Transactions
export const getTransactions = (params) => api.get('/transactions', { params });
export const getTransaction = (id) => api.get(`/transactions/${id}`);

// Telecel Auth
export const getTokenStatus = () => api.get('/telecel/token-status');
export const requestOtp = () => api.post('/telecel/request-otp');
export const verifyOtp = (otp) => api.post('/telecel/verify-otp', { otp });
export const setManualToken = (token) => api.post('/telecel/manual-token', { token });
export const getTokenHistory = () => api.get('/telecel/history');

// Queue
export const getQueueStatus = () => api.get('/queue/status');
export const getQueueJobs = (params) => api.get('/queue/jobs', { params });
export const retryFailedJobs = () => api.post('/queue/retry');
export const cancelPendingJobs = () => api.post('/queue/cancel');

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Users (admin)
export const getUsers = () => api.get('/users');
export const getUser = (id) => api.get(`/users/${id}`);
export const toggleUser = (id) => api.patch(`/users/${id}/toggle`);
export const changeUserRole = (id, role) => api.patch(`/users/${id}/role`, { role });
export const updateUser = (id, data) => api.patch(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// API Keys (admin)
export const getApiKeys = () => api.get('/api-keys');
export const createApiKey = (data) => api.post('/api-keys', data);
export const updateApiKey = (id, data) => api.patch(`/api-keys/${id}`, data);
export const deleteApiKey = (id) => api.delete(`/api-keys/${id}`);

// System Logs (admin)
export const getLogs = (params) => api.get('/logs', { params });
export const getLogStats = () => api.get('/logs/stats');
export const clearLogs = (days) => api.delete(`/logs/clear?olderThanDays=${days}`);

// System Config (admin)
export const getConfigs = () => api.get('/config');
export const updateConfig = (key, value) => api.patch(`/config/${key}`, { value });

// User Credits
export const getMyBalance = () => api.get('/user-credits/my-balance');
export const getMyCreditHistory = (params) => api.get('/user-credits/my-history', { params });
export const creditUser = (data) => api.post('/user-credits/credit', data);
export const debitUser = (data) => api.post('/user-credits/debit', data);
export const getAllCredits = () => api.get('/user-credits');
export const getUserCredits = (userId) => api.get(`/user-credits/user/${userId}`);

// Data Requests
export const createDataRequest = (data) => api.post('/data-requests', data);
export const getMyRequests = (params) => api.get('/data-requests/my-requests', { params });
export const cancelRequest = (id) => api.delete(`/data-requests/${id}`);
export const getPendingRequests = () => api.get('/data-requests/pending');
export const getAllRequests = (params) => api.get('/data-requests/all', { params });
export const approveRequest = (id, reviewNote) => api.patch(`/data-requests/${id}/approve`, { reviewNote });
export const rejectRequest = (id, reviewNote) => api.patch(`/data-requests/${id}/reject`, { reviewNote });

// Credit Send
export const sendFromCredit = (data) => api.post('/share/send-from-credit', data);

// User Packages
export const getUserPackages = () => api.get('/user-packages');
export const createUserPackage = (data) => api.post('/user-packages', data);
export const updateUserPackage = (id, data) => api.patch(`/user-packages/${id}`, data);
export const deleteUserPackage = (id) => api.delete(`/user-packages/${id}`);

export default api;
