import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import AdminUsers from './pages/admin/Users'
import PatientMedicalRecord from './pages/patient/MedicalRecord'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminPatients from './pages/admin/Patients'
import AdminDoctors from './pages/admin/Doctors'
import AdminAppointments from './pages/admin/Appointments'

// Doctor pages
import DoctorDashboard from './pages/doctor/Dashboard'
import DoctorPatients from './pages/doctor/Patients'

// Patient pages
import PatientDashboard from './pages/patient/Dashboard'
import PatientAppointments from './pages/patient/Appointments'

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Se încarcă...</p>
    </div>
  )

  if (user && !profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Se încarcă profilul...</p>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-6xl mx-auto p-6">
              {profile?.role === 'admin' && (
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/patients" element={<AdminPatients />} />
                  <Route path="/doctors" element={<AdminDoctors />} />
                  <Route path="/appointments" element={<AdminAppointments />} />
                  <Route path="/users" element={<AdminUsers />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              )}
              {profile?.role === 'doctor' && (
                <Routes>
                  <Route path="/" element={<DoctorDashboard />} />
                  <Route path="*" element={<Navigate to="/" />} />
                  <Route path="/my-patients" element={<DoctorPatients />} />
                </Routes>
              )}
              {profile?.role === 'patient' && (
                <Routes>
                  <Route path="/" element={<PatientDashboard />} />
                  <Route path="/appointments" element={<PatientAppointments />} />
                  <Route path="/medical-record" element={<PatientMedicalRecord />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              )}
            </div>
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  )
}