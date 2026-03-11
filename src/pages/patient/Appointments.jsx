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
  const [editing, setEditing] = useState(null)
  const [unavailableHours, setUnavailableHours] = useState([])
  const [fullyBookedDates, setFullyBookedDates] = useState([])

  useEffect(() => { if (user) fetchAll() }, [user])

  useEffect(() => {
    if (selectedSpec) {
      setFilteredDoctors(doctors.filter(d => d.specialization === selectedSpec))
      setForm(f => ({ ...f, doctor_id: '' }))
    } else {
      setFilteredDoctors(doctors)
    }
  }, [selectedSpec, doctors])

  useEffect(() => {
    if (form.doctor_id) {
      fetchFullyBookedDates(form.doctor_id)
      setForm(f => ({ ...f, date: '', time: '' }))
      setUnavailableHours([])
    }
  }, [form.doctor_id])

  useEffect(() => {
    if (form.doctor_id && form.date) {
      fetchUnavailableHours(form.doctor_id, form.date)
      setForm(f => ({ ...f, time: '' }))
    }
  }, [form.doctor_id, form.date])

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

  async function fetchFullyBookedDates(doctorId) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('appointments')
      .select('date, time')
      .eq('doctor_id', doctorId)
      .neq('status', 'cancelled')
      .gte('date', today)

    const byDate = {}
    ;(data || []).forEach(a => {
      if (!byDate[a.date]) byDate[a.date] = []
      byDate[a.date].push(a.time)
    })

    const booked = Object.keys(byDate).filter(date => byDate[date].length >= 9)
    setFullyBookedDates(booked)
  }

  async function fetchUnavailableHours(doctorId, date) {
    const { data } = await supabase
      .from('appointments')
      .select('time, id')
      .eq('doctor_id', doctorId)
      .eq('date', date)
      .neq('status', 'cancelled')

    const occupied = (data || [])
      .filter(a => editing ? a.id !== editing : true)
      .map(a => a.time.slice(0, 5))

    setUnavailableHours(occupied)
  }

  function handleEdit(appt) {
    setEditing(appt.id)
    setSelectedSpec(appt.doctors?.specialization || '')
    setForm({
      doctor_id: appt.doctor_id,
      date: appt.date,
      time: appt.time,
      reason: appt.reason || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    if (!selectedSpec)
      return alert('Te rugăm să selectezi o specializare!')

    if (!form.doctor_id || !form.date || !form.time)
      return alert('Completează toate câmpurile obligatorii!')

    if (fullyBookedDates.includes(form.date))
      return alert('Această zi este complet ocupată! Alege altă zi.')

    if (unavailableHours.includes(form.time))
      return alert('Această oră nu este disponibilă! Alege altă oră.')

    // Verificare 60 minute între programările pacientului
    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('time, id')
      .eq('patient_id', patientId)
      .eq('date', form.date)
      .neq('status', 'cancelled')

    const filteredAppts = editing
      ? (existingAppts || []).filter(a => a.id !== editing)
      : (existingAppts || [])

    if (filteredAppts.length > 0) {
      const [hours, minutes] = form.time.split(':').map(Number)
      const newTime = hours * 60 + minutes
      const hasConflict = filteredAppts.some(appt => {
        const [h, m] = appt.time.split(':').map(Number)
        return Math.abs(newTime - (h * 60 + m)) < 60
      })
      if (hasConflict)
        return alert('Trebuie să fie minim 60 de minute între programările tale!')
    }

    if (editing) {
      await supabase.from('appointments').update({
        ...form,
        status: 'scheduled',
      }).eq('id', editing)
    } else {
      await supabase.from('appointments').insert({
        ...form,
        patient_id: patientId,
        status: 'scheduled',
      })
    }

    setForm({ doctor_id: '', date: '', time: '', reason: '' })
    setSelectedSpec('')
    setEditing(null)
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

  const allHours = Array.from({ length: 9 }, (_, i) => {
    const hour = 8 + i
    return `${String(hour).padStart(2, '0')}:00`
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Programările mele</h1>
        <button
          onClick={() => { setShowForm(!showForm); setForm({ doctor_id: '', date: '', time: '', reason: '' }); setSelectedSpec(''); setEditing(null); setUnavailableHours([]); setFullyBookedDates([]) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Programare nouă
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">{editing ? 'Editează Programare' : 'Programare Nouă'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Specializare *</label>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={selectedSpec}
                onChange={e => setSelectedSpec(e.target.value)}
              >
                <option value="">Selectează specializarea</option>
                {specializations.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Doctor *</label>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={form.doctor_id}
                onChange={e => setForm({ ...form, doctor_id: e.target.value })}
                disabled={!selectedSpec}
              >
                <option value="">{!selectedSpec ? 'Selectează mai întâi specializarea' : 'Selectează Doctor'}</option>
                {filteredDoctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.specialization || 'fără specializare'}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Data *</label>
              <input
                className="border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={form.date}
                disabled={!form.doctor_id}
                onChange={e => setForm({ ...form, date: e.target.value, time: '' })}
              />
              {fullyBookedDates.includes(form.date) && (
                <p className="text-red-500 text-xs mt-1">Această zi este complet ocupată!</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Ora *</label>
              <select
                className="border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                disabled={!form.doctor_id || !form.date || fullyBookedDates.includes(form.date)}
              >
                <option value="">
                  {!form.doctor_id || !form.date ? 'Selectează mai întâi doctorul și data' : 'Selectează ora'}
                </option>
                {allHours
                  .filter(time => !unavailableHours.includes(time))
                  .map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))
                }
              </select>
            </div>
            <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs text-gray-500 font-medium">Motiv consultație</label>
            <textarea
              className="border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Ex: Control anual, durere de spate..."
              rows={2}
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              {editing ? 'Salvează modificările' : 'Confirmă programarea'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm({ doctor_id: '', date: '', time: '', reason: '' }); setSelectedSpec(''); setUnavailableHours([]); setFullyBookedDates([]) }} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
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
                  <td className="px-4 py-3 flex gap-2">
                    {a.status === 'scheduled' && (
                      <>
                        <button onClick={() => handleEdit(a)} className="text-blue-600 hover:underline text-sm">
                          Editează
                        </button>
                        <button onClick={() => handleCancel(a.id)} className="text-red-500 hover:underline text-sm">
                          Anulează
                        </button>
                      </>
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