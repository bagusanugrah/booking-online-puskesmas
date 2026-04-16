import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import api from '../api';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const { data } = await api.post('/login', { email: formData.email, password: formData.password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        
        if (data.role === 'admin') navigate('/admin');
        else navigate('/patient');
      } else {
        await api.post('/register', formData);
        alert('Registrasi berhasil! Silakan login.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-emerald-100 rounded-full mb-3">
            <Activity className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isLogin ? 'Masuk ke Puskesmas' : 'Daftar Pasien Baru'}
          </h2>
        </div>

        {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          
          <button type="submit" className="w-full bg-indigo-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition duration-200">
            {isLogin ? 'Masuk' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
          <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-emerald-600 hover:underline ml-1">
            {isLogin ? 'Daftar di sini' : 'Masuk di sini'}
          </button>
        </p>
      </div>
    </div>
  );
}