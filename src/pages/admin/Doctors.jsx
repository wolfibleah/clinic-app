import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', specialization: '', phone: '', email: '' })

  useEffect(() => { fetchDoctors() }, [])

  async function fetchDoctors() {
    const { data } = await supabase.from('doctors').select('*').order('created_at', { ascending: false })
    setDoctors(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.name) return alert('Numele este obligatoriu!')
    if (editing) {
      await supabase.from('doctors').update(form).eq('id', editing)
    } else {
      await supabase.from('doctors').insert(form)
    }
    setForm({ name: '', specialization: '', phone: '', email: '' })
    setEditing(null)
    setShowForm(false)
    fetchDoctors()
  }

  async function handleDelete(id) {
    if (!confirm('Ștergi acest doctor?')) return
    await supabase.from('doctors').delete().eq('id', id)
    fetchDoctors()
  }

  function handleEdit(doctor) {
    setForm({ name: doctor.name, specialization: doctor.specialization || '', phone: doctor.phone || '', email: doctor.email || '' })
    setEditing(doctor.id)
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Doctori</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', specialization: '', phone: '', email: '' }) }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
        >
          + Adaugă Doctor
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">{editing ? 'Editează Doctor' : 'Doctor Nou'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Nume *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Specializare" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
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
      ) : doctors.length === 0 ? (
        <p className="text-gray-500">Nu există doctori încă.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Nume</th>
                <th className="text-left px-4 py-3 text-gray-600">Specializare</th>
                <th className="text-left px-4 py-3 text-gray-600">Telefon</th>
                <th className="text-left px-4 py-3 text-gray-600">Email</th>
                <th className="text-left px-4 py-3 text-gray-600">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map(d => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-gray-500">{d.specialization || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{d.phone || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{d.email || '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEdit(d)} className="text-blue-600 hover:underline">Editează</button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:underline">Șterge</button>
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