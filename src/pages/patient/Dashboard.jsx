import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

export default function PatientDashboard() {
  const { user, profile } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchAppointments()
  }, [user])

  async function fetchAppointments() {
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!patient) { setLoading(false); return }

    const { data } = await supabase
      .from('appointments')
      .select(`*, doctors(name, specialization)`)
      .eq('patient_id', patient.id)
      .order('date', { ascending: false })
      .limit(5)

    setAppointments(data || [])
    setLoading(false)
  }

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Bună ziua, {profile?.full_name}!</h1>
        <p className="text-gray-500 text-sm mt-1">Iată ultimele tale programări</p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Programările mele recente</h2>
        <Link to="/appointments" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + Programare nouă
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Se încarcă...</p>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-500 mb-4">Nu ai nicio programare încă.</p>
          <Link to="/appointments" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700">
            Fă o programare
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Doctor</th>
                <th className="text-left px-4 py-3 text-gray-600">Specializare</th>
                <th className="text-left px-4 py-3 text-gray-600">Data</th>
                <th className="text-left px-4 py-3 text-gray-600">Ora</th>
                <th className="text-left px-4 py-3 text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(a => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.doctors?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{a.doctors?.specialization || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{a.date}</td>
                  <td className="px-4 py-3 text-gray-500">{a.time}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status]}`}>
                      {a.status === 'scheduled' ? 'Programat' : a.status === 'completed' ? 'Finalizat' : 'Anulat'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}