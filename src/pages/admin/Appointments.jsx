import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', date: '', time: '', reason: '', status: 'scheduled' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: appts }, { data: pats }, { data: docs }] = await Promise.all([
      supabase.from('appointments').select(`*, patients(name), doctors(name)`).order('date', { ascending: false }),
      supabase.from('patients').select('id, name').order('name'),
      supabase.from('doctors').select('id, name').order('name'),
    ])
    setAppointments(appts || [])
    setPatients(pats || [])
    setDoctors(docs || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.patient_id || !form.doctor_id || !form.date || !form.time) 
      return alert('Completează toate câmpurile obligatorii!')
    if (editing) {
      await supabase.from('appointments').update(form).eq('id', editing)
    } else {
      await supabase.from('appointments').insert(form)
    }
    setForm({ patient_id: '', doctor_id: '', date: '', time: '', reason: '', status: 'scheduled' })
    setEditing(null)
    setShowForm(false)
    fetchAll()
  }

  async function handleDelete(id) {
    if (!confirm('Ștergi această programare?')) return
    await supabase.from('appointments').delete().eq('id', id)
    fetchAll()
  }

  function handleEdit(appt) {
    setForm({
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      date: appt.date,
      time: appt.time,
      reason: appt.reason || '',
      status: appt.status,
    })
    setEditing(appt.id)
    setShowForm(true)
  }

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Programări</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ patient_id: '', doctor_id: '', date: '', time: '', reason: '', status: 'scheduled' }) }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
        >
          + Adaugă Programare
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">{editing ? 'Editează Programare' : 'Programare Nouă'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })}>
              <option value="">Selectează Pacient *</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })}>
              <option value="">Selectează Doctor *</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input className="border rounded-lg px-3 py-2 text-sm" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Motiv consultație" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="scheduled">Programat</option>
              <option value="completed">Finalizat</option>
              <option value="cancelled">Anulat</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">
              {editing ? 'Salvează' : 'Adaugă'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null) }} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
              Anulează
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Se încarcă...</p>
      ) : appointments.length === 0 ? (
        <p className="text-gray-500">Nu există programări încă.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Pacient</th>
                <th className="text-left px-4 py-3 text-gray-600">Doctor</th>
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
                  <td className="px-4 py-3 font-medium">{a.patients?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{a.doctors?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{a.date}</td>
                  <td className="px-4 py-3 text-gray-500">{a.time}</td>
                  <td className="px-4 py-3 text-gray-500">{a.reason || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status]}`}>
                      {a.status === 'scheduled' ? 'Programat' : a.status === 'completed' ? 'Finalizat' : 'Anulat'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEdit(a)} className="text-blue-600 hover:underline">Editează</button>
                    <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:underline">Șterge</button>
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