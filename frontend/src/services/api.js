import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth APIs
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getProfile: () => api.get('/auth/profile'),
};

// Upload APIs
export const uploadAPI = {
    preview: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/upload/preview', formData);
    },
    submit: (fileName, columnMapping) =>
        api.post('/upload/submit', { fileName, columnMapping }),
    getStatus: (jobId) => api.get(`/upload/status/${jobId}`),
    getAllUploads: (params) => api.get('/upload/all', { params }),
};

// Reconciliation APIs
export const reconciliationAPI = {
    getDashboardStats: (params) => api.get('/reconciliation/dashboard/stats', { params }),
    getResults: (params) => api.get('/reconciliation/results', { params }),
    manualCorrection: (recordId, updates) => api.patch(`/reconciliation/records/${recordId}`, updates),
};

// Audit APIs
export const auditAPI = {
    getRecordTimeline: (recordId) => api.get(`/audit/record/${recordId}`),
    getUploadTimeline: (uploadJobId) => api.get(`/audit/upload/${uploadJobId}`),
    getAllLogs: (params) => api.get('/audit/all', { params }),
};

export default api;
