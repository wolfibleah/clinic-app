import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function DoctorDashboard() {
  const { profile } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedAppointment, setSelectedAppointment] = useState(null)

  useEffect(() => {
    if (profile) fetchAppointments()
  }, [profile, selectedDate])

  async function fetchAppointments() {
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('auth_id', profile.id)
      .maybeSingle()
  
    console.log('Profile ID:', profile.id)
    console.log('Doctor găsit:', doctor)
    console.log('Doctor error:', doctorError)
  
    if (!doctor) {
      setLoading(false)
      return
    }
  
    const { data, error } = await supabase
      .from('appointments')
      .select(`*, patients(name, email, phone, birth_date)`)
      .eq('doctor_id', doctor.id)
      .eq('date', selectedDate)
      .order('time', { ascending: true })
  
    console.log('Programări:', data)
    console.log('Programări error:', error)
  
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Programările mele</h1>
          <p className="text-gray-500 text-sm mt-1">Bună ziua, Dr. {profile?.full_name}!</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Detalii pacient modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-gray-800">Detalii Pacient</h2>
              <button onClick={() => setSelectedAppointment(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-2">
                <p className="text-xs text-gray-400 uppercase font-medium">Pacient</p>
                <p className="font-semibold text-gray-800">{selectedAppointment.patients?.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Email</p>
                  <p className="text-sm text-gray-700">{selectedAppointment.patients?.email || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Telefon</p>
                  <p className="text-sm text-gray-700">{selectedAppointment.patients?.phone || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Data nașterii</p>
                  <p className="text-sm text-gray-700">{selectedAppointment.patients?.birth_date || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Ora</p>
                  <p className="text-sm text-gray-700">{selectedAppointment.time}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase font-medium mb-1">Motiv consultație</p>
                <p className="text-sm text-gray-700">{selectedAppointment.reason || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase font-medium mb-1">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedAppointment.status]}`}>
                  {selectedAppointment.status === 'scheduled' ? 'Programat' : selectedAppointment.status === 'completed' ? 'Finalizat' : 'Anulat'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Se încarcă...</p>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-500">Nu există programări pentru această zi.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Ora</th>
                <th className="text-left px-4 py-3 text-gray-600">Pacient</th>
                <th className="text-left px-4 py-3 text-gray-600">Motiv</th>
                <th className="text-left px-4 py-3 text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-gray-600">Detalii</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(a => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.time}</td>
                  <td className="px-4 py-3">{a.patients?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{a.reason || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status]}`}>
                      {a.status === 'scheduled' ? 'Programat' : a.status === 'completed' ? 'Finalizat' : 'Anulat'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedAppointment(a)} className="text-blue-600 hover:underline text-sm">
                      Vezi detalii
                    </button>
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