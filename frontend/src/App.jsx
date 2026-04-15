import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Komponen Penjaga untuk rute yang wajib login
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    // Jika tidak ada token maka tendang kembali ke halaman login
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    // Jika role tidak sesuai maka arahkan ke dashboard masing-masing
    return <Navigate to={role === 'admin' ? '/admin' : '/patient'} replace />;
  }

  return children;
};

// Komponen Penjaga untuk rute publik agar user yang sudah login tidak bisa kembali
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (token) {
    return <Navigate to={role === 'admin' ? '/admin' : '/patient'} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Bungkus halaman login dengan PublicRoute */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          
          {/* Bungkus dashboard dengan ProtectedRoute beserta aturan role-nya */}
          <Route 
            path="/patient" 
            element={
              <ProtectedRoute allowedRole="patient">
                <PatientDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;