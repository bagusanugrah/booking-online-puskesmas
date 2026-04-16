import { useState, useEffect } from 'react';
import axios from 'axios';

export default function DiseaseSection({ role }) {
  const [diseases, setDiseases] = useState([]);
  const [formData, setFormData] = useState({ name: '', cases: '', location: '' });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchDiseases = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/diseases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDiseases(res.data);
    } catch (err) {
      console.error('Gagal mengambil data penyakit', err);
    }
  };

  useEffect(() => { fetchDiseases(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/diseases`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData({ name: '', cases: '', location: '' });
      fetchDiseases(); // Refresh data setelah nambah
      alert('Data penyakit berhasil ditambahkan!');
    } catch (err) {
      alert('Gagal menambah data');
    }
  };

  const deleteDisease = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data penyakit ini?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/diseases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDiseases(); // Refresh data setelah hapus
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Monitoring Penyakit Masyarakat</h2>
      
      {/* Form Tambah Penyakit (Hanya tampil untuk Admin) */}
      {role === 'admin' && (
        <form onSubmit={handleSubmit} className="mb-6 flex gap-3 items-end bg-gray-50 p-4 rounded-md border">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-gray-700">Nama Penyakit</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium mb-1 text-gray-700">Kasus</label>
            <input type="number" required value={formData.cases} onChange={e => setFormData({...formData, cases: e.target.value})} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-gray-700">Lokasi</label>
            <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition-colors font-medium">Tambah</button>
        </form>
      )}

      {/* Tabel Penyakit (Tampil untuk Admin dan Pasien) */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3 font-semibold text-gray-700">Nama Penyakit</th>
              <th className="p-3 font-semibold text-gray-700">Lokasi</th>
              <th className="p-3 font-semibold text-gray-700">Jumlah Kasus</th>
              {/* Kolom Aksi hanya muncul kalau yang login itu admin */}
              {role === 'admin' && <th className="p-3 font-semibold text-gray-700 w-24 text-center">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {diseases.map(d => (
              <tr key={d.id} className="hover:bg-gray-50 border-b last:border-0">
                <td className="p-3">{d.name}</td>
                <td className="p-3">{d.location}</td>
                <td className="p-3 font-bold text-red-600">{d.cases} Kasus</td>
                {role === 'admin' && (
                  <td className="p-3 text-center">
                    <button onClick={() => deleteDisease(d.id)} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 font-medium transition-colors">
                      Hapus
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {diseases.length === 0 && (
              <tr>
                <td colSpan={role === 'admin' ? "4" : "3"} className="p-6 text-center text-gray-500 italic">
                  Belum ada data penyakit yang tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}