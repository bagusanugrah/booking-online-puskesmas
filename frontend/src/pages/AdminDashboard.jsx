import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, LogOut, CheckCircle, XCircle, Activity, Calendar } from 'lucide-react';
import api from '../api';
import DiseaseSection from '../components/DiseaseSection';
import ReportSection from '../components/ReportSection';

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/bookings');
      setBookings(data);
    } catch (error) {
      console.error("Gagal mengambil data", error);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (window.confirm(`Apakah Anda yakin ingin mengubah status menjadi ${newStatus}?`)) {
      try {
        await api.put(`/bookings/${id}/status`, { status: newStatus });
        fetchBookings(); // Segarkan data setelah diupdate
      } catch (error) {
        alert('Gagal mengubah status');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Navbar Admin */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center mb-8 border-b-4 border-emerald-600">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gray-800 rounded-lg">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <span className="text-xl font-bold text-gray-800">Panel <span className="text-emerald-600">Admin</span></span>
        </div>
        <button onClick={handleLogout} className="flex items-center text-red-500 hover:text-red-700 font-medium transition">
          <LogOut className="w-5 h-5 mr-1" /> Keluar
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Users className="w-5 h-5 mr-2 text-emerald-600" /> Daftar Pengajuan Janji Temu
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm">
                  <th className="p-4 font-semibold">Nama Pasien</th>
                  <th className="p-4 font-semibold">Tanggal Kunjungan</th>
                  <th className="p-4 font-semibold">Dokumen Pendukung</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-center">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">Belum ada pengajuan jadwal dari pasien.</td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition">
                      <td className="p-4 font-medium text-gray-800">
                        {/* Mengambil nama pasien dari relasi database */}
                        {booking.Patient ? booking.Patient.name : 'Data Pasien Hilang'}
                      </td>
                      <td className="p-4 text-gray-600 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(booking.booking_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                      <td className="p-4">
                        <a 
                          href={booking.document_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 px-3 py-1.5 rounded-lg"
                        >
                          <FileText className="w-4 h-4 mr-1.5" /> Lihat File
                        </a>
                      </td>
                      <td className="p-4">
                        {booking.status === 'pending' && <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md text-sm font-medium border border-amber-100">Menunggu</span>}
                        {booking.status === 'approved' && <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-sm font-medium border border-emerald-100">Disetujui</span>}
                        {booking.status === 'rejected' && <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-md text-sm font-medium border border-red-100">Ditolak</span>}
                      </td>
                      <td className="p-4 text-center">
                        {booking.status === 'pending' ? (
                          <div className="flex justify-center space-x-2">
                            <button 
                              onClick={() => handleUpdateStatus(booking.id, 'approved')}
                              className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition tooltip" title="Setujui"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(booking.id, 'rejected')}
                              className="p-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition tooltip" title="Tolak"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Tambahkan tepat di bawah tabel admin booking */}
      <DiseaseSection role="admin" />
      <ReportSection role="admin" />
    </div>
  );
}