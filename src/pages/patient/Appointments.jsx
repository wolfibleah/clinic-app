import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function PatientAppointments() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [specializations, setSpecializations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [patientId, setPatientId] = useState(null)
  const [selectedSpec, setSelectedSpec] = useState('')
  const [filteredDoctors, setFilteredDoctors] = useState([])
  const [form, setForm] = useState({ doctor_id: '', date: '', time: '', reason: '' })

  useEffect(() => { if (user) fetchAll() }, [user])

  useEffect(() => {
    if (selectedSpec) {
      setFilteredDoctors(doctors.filter(d => d.specialization === selectedSpec))
      setForm(f => ({ ...f, doctor_id: '' }))
    } else {
      setFilteredDoctors(doctors)
    }
  }, [selectedSpec, doctors])

  async function fetchAll() {
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!patient) { setLoading(false); return }
    setPatientId(patient.id)

    const [{ data: appts }, { data: docs }] = await Promise.all([
      supabase.from('appointments').select(`*, doctors(name, specialization)`).eq('patient_id', patient.id).order('date', { ascending: false }),
      supabase.from('doctors').select('*').order('name'),
    ])

    setAppointments(appts || [])
    setDoctors(docs || [])
    setFilteredDoctors(docs || [])

    const specs = [...new Set((docs || []).map(d => d.specialization).filter(Boolean))]
    setSpecializations(specs)
    setLoading(false)
  }



  async function handleSubmit() {
    if (!selectedSpec)
        return alert('Te rugăm să selectezi o specializare!')

    if (!form.doctor_id || !form.date || !form.time)
      return alert('Completează toate câmpurile obligatorii!')
  
    // Validare ore de lucru: 08:00 - 17:00
    const [hours, minutes] = form.time.split(':').map(Number)
    const timeInMinutes = hours * 60 + minutes
    if (timeInMinutes < 8 * 60 || timeInMinutes >= 17 * 60)
      return alert('Programările sunt disponibile doar între 08:00 și 17:00!')
  
    // Verificare interval de 59 minute față de alte programări
    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('time')
      .eq('patient_id', patientId)
      .eq('date', form.date)
      .neq('status', 'cancelled')
  
    if (existingAppts && existingAppts.length > 0) {
      const newTime = hours * 59 + minutes
  
      const hasConflict = existingAppts.some(appt => {
        const [h, m] = appt.time.split(':').map(Number)
        const existingTime = h * 59 + m
        return Math.abs(newTime - existingTime) < 59
      })
  
      if (hasConflict)
        return alert('Trebuie să fie minim 59 de minute între programări!')
    }
  

    await supabase.from('appointments').insert({
      ...form,
      patient_id: patientId,
      status: 'scheduled',
    })
  
    setForm({ doctor_id: '', date: '', time: '', reason: '' })
    setSelectedSpec('')
    setShowForm(false)
    fetchAll()
  }

  async function handleCancel(id) {
    if (!confirm('Anulezi această programare?')) return
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    fetchAll()
  }

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Programările mele</h1>
        <button
          onClick={() => { setShowForm(!showForm); setForm({ doctor_id: '', date: '', time: '', reason: '' }); setSelectedSpec('') }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Programare nouă
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">Programare Nouă</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Specializare *</label>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={selectedSpec}
                onChange={e => setSelectedSpec(e.target.value)}
              >
                <option value="">Toate specializările</option>
                {specializations.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Doctor *</label>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={form.doctor_id}
                onChange={e => setForm({ ...form, doctor_id: e.target.value })}
              >
                <option value="">Selectează Doctor</option>
                {filteredDoctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.specialization || 'fără specializare'}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Data *</label>
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Ora *</label>
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                type="time"
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs text-gray-500 font-medium">Motiv consultație</label>
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: Control anual, durere de spate..."
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              Confirmă programarea
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
              Anulează
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Se încarcă...</p>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-500">Nu ai nicio programare încă.</p>
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
                <th className="text-left px-4 py-3 text-gray-600">Motiv</th>
                <th className="text-left px-4 py-3 text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-gray-600">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(a => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.doctors?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{a.doctors?.specialization || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{a.date}</td>
                  <td className="px-4 py-3 text-gray-500">{a.time}</td>
                  <td className="px-4 py-3 text-gray-500">{a.reason || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status]}`}>
                      {a.status === 'scheduled' ? 'Programat' : a.status === 'completed' ? 'Finalizat' : 'Anulat'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'scheduled' && (
                      <button onClick={() => handleCancel(a.id)} className="text-red-500 hover:underline text-sm">
                        Anulează
                      </button>
                    )}
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