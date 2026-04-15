import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Upload, FileText, LogOut, Clock, CheckCircle, XCircle, Activity, Trash2 } from 'lucide-react';
import api from '../api';

export default function PatientDashboard() {
  const [bookings, setBookings] = useState([]);
  const [date, setDate] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  const patientName = localStorage.getItem('name') || 'Pasien';

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/bookings');
      setBookings(data);
    } catch (error) {
      console.error("Gagal mengambil data booking", error);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert('Silakan unggah dokumen KTP/BPJS terlebih dahulu.');
    
    setLoading(true);
    const formData = new FormData();
    formData.append('booking_date', date);
    formData.append('document', file);

    try {
      // Axios akan otomatis mengatur header Content-Type untuk FormData
      await api.post('/bookings', formData);
      alert('Berhasil! Menunggu verifikasi admin.');
      setDate('');
      setFile(null);
      document.getElementById('file-upload').value = '';
      fetchBookings();
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal membuat janji temu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin membatalkan jadwal ini?')) {
      try {
        await api.delete(`/bookings/${id}`);
        fetchBookings(); // Refresh data setelah dihapus
      } catch (error) {
        alert(error.response?.data?.error || 'Gagal membatalkan jadwal');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="flex items-center text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full"><CheckCircle className="w-4 h-4 mr-1" /> Disetujui</span>;
      case 'rejected':
        return <span className="flex items-center text-sm font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full"><XCircle className="w-4 h-4 mr-1" /> Ditolak</span>;
      default:
        return <span className="flex items-center text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full"><Clock className="w-4 h-4 mr-1" /> Menunggu Verifikasi</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center mb-8">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Activity className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="text-xl font-bold text-gray-800">Puskesmas<span className="text-emerald-600">App</span></span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="font-medium text-gray-600 hidden sm:block">Halo, {patientName}</span>
          <button onClick={handleLogout} className="flex items-center text-red-500 hover:text-red-700 font-medium transition">
            <LogOut className="w-5 h-5 mr-1" /> Keluar
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Kolom Kiri: Form Booking */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-emerald-600" /> Buat Janji Temu
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kunjungan</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unggah Dokumen (KTP/BPJS)</label>
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-all duration-300 ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50 scale-105' 
                      : 'border-gray-300 bg-gray-50 hover:border-emerald-500'
                  }`}
                >
                  <div className="space-y-1 text-center">
                    <Upload className={`mx-auto h-8 w-8 transition-colors ${isDragging ? 'text-emerald-500' : 'text-gray-400'}`} />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none">
                        <span>Pilih File</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => setFile(e.target.files[0])} accept="image/*,.pdf" />
                      </label>
                      <span className="ml-1">atau seret ke sini</span>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF hingga 5MB</p>
                  </div>
                </div>
                {file && <p className="mt-2 text-sm text-emerald-600 flex items-center"><FileText className="w-4 h-4 mr-1"/> {file.name}</p>}
              </div>

              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition duration-200 disabled:opacity-50">
                {loading ? 'Memproses...' : 'Ajukan Jadwal'}
              </button>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Riwayat Booking */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-full">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-emerald-600" /> Riwayat Kunjungan
            </h2>
            
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Belum ada jadwal janji temu.</p>
                <p className="text-sm text-gray-400 mt-1">Silakan buat jadwal kunjungan di menu samping.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:shadow-sm transition bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="bg-emerald-100 p-3 rounded-lg text-emerald-700 font-bold text-center w-16">
                        <div className="text-xl">{new Date(booking.booking_date).getDate()}</div>
                        <div className="text-xs uppercase">{new Date(booking.booking_date).toLocaleString('id-ID', { month: 'short' })}</div>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Pemeriksaan Umum</p>
                        <a href={`http://localhost:5000${booking.document_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline flex items-center mt-1">
                          <FileText className="w-3 h-3 mr-1" /> Lihat Dokumen
                        </a>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {getStatusBadge(booking.status)}
                      
                      {booking.status === 'pending' && (
                        <button 
                          onClick={() => handleDelete(booking.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center transition"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}