import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const adminLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/patients', label: 'Pacienți' },
    { path: '/doctors', label: 'Doctori' },
    { path: '/users', label: 'Utilizatori' },
  ]

  const doctorLinks = [
    { path: '/', label: 'Programările mele' },
    { path: '/my-patients', label: 'Pacienții mei' },
  ]

  const patientLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/appointments', label: 'Programările mele' },
    { path: '/medical-record', label: 'Fișa mea medicală' },
  ]

  const links = profile?.role === 'admin' ? adminLinks
    : profile?.role === 'doctor' ? doctorLinks
    : patientLinks

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-blue-600 font-bold text-xl">🏥 ClinicApp</span>
          <div className="flex gap-6">
            {links.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 capitalize">{profile?.role} — {profile?.full_name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors font-medium"
          >
            Deconectare →
          </button>
        </div>
      </div>
    </nav>
  )
}
