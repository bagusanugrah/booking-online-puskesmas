import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ReportSection({ role }) {
  const [reports, setReports] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', address: '' });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data);
    } catch (err) {
      console.error('Gagal mengambil data laporan', err);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/reports`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData({ title: '', description: '', address: '' });
      fetchReports();
      alert('Laporan berhasil dikirim!');
    } catch (err) {
      alert('Gagal mengirim laporan');
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/reports/${id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports();
    } catch (err) {
      alert('Gagal merubah status');
    }
  };

  const deleteReport = async (id) => {
    if (!window.confirm('Yakin ingin menghapus laporan ini?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports();
    } catch (err) {
      alert('Gagal menghapus laporan');
    }
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Laporan Kesehatan Lingkungan</h2>

      {/* Form Buat Laporan (Hanya tampil untuk Pasien) */}
      {role === 'patient' && (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 p-5 rounded-md border flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Judul Laporan</label>
            <input type="text" placeholder="Misal: Tumpukan Sampah Medis" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Deskripsi Keluhan</label>
            <textarea placeholder="Ceritakan detail lokasinya dan masalahnya..." required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2 rounded h-24 focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Alamat / Lokasi</label>
            <input type="text" placeholder="Misal: Jl. Raya Bojongsoang No. 12" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <button type="submit" className="bg-green-600 text-white px-6 py-2.5 rounded hover:bg-green-700 transition-colors font-medium w-fit">
            Kirim Laporan
          </button>
        </form>
      )}

      {/* Tabel Laporan */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3 font-semibold text-gray-700">Detail Laporan</th>
              <th className="p-3 font-semibold text-gray-700">Lokasi</th>
              <th className="p-3 font-semibold text-gray-700 w-32">Status</th>
              <th className="p-3 font-semibold text-gray-700 w-48 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 border-b last:border-0">
                <td className="p-3">
                  <p className="font-bold text-gray-800">{r.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{r.description}</p>
                </td>
                <td className="p-3 text-sm">{r.address}</td>
                <td className="p-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${r.status === 'Menunggu' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    {/* Admin bisa menandai selesai JIKA statusnya Menunggu */}
                    {role === 'admin' && r.status === 'Menunggu' && (
                      <button onClick={() => updateStatus(r.id, 'Selesai')} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 font-medium transition-colors">
                        Tandai Selesai
                      </button>
                    )}
                    
                    {/* Tombol Hapus: Muncul untuk Admin kapan saja, dan untuk Pasien JIKA laporannya masih Menunggu */}
                    {(role === 'admin' || (role === 'patient' && r.status === 'Menunggu')) && (
                      <button onClick={() => deleteReport(r.id)} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 font-medium transition-colors">
                        Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-500 italic">
                  Belum ada laporan lingkungan yang masuk.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}