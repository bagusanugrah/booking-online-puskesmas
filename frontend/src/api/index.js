import axios from 'axios';

const api = axios.create({
  // Gunakan env URL jika ada, jika tidak gunakan localhost untuk fallback lokal
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Otomatis menyisipkan token JWT ke setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;