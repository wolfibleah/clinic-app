import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminPatients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', birth_date: '' })

  useEffect(() => { fetchPatients() }, [])

  async function fetchPatients() {
    // Luăm toți pacienții
    const { data: allPatients } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
  
    // Luăm profilele cu rol doctor sau admin ca să îi excludem
    const { data: nonPatients } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['doctor', 'admin'])
  
    const excludeIds = (nonPatients || []).map(p => p.id)
  
    const onlyPatients = (allPatients || []).filter(p => 
      !excludeIds.includes(p.auth_id)
    )
  
    setPatients(onlyPatients)
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.name) return alert('Numele este obligatoriu!')
    if (editing) {
      await supabase.from('patients').update(form).eq('id', editing)
    } else {
      await supabase.from('patients').insert(form)
    }
    setForm({ name: '', email: '', phone: '', birth_date: '' })
    setEditing(null)
    setShowForm(false)
    fetchPatients()
  }

  async function handleDelete(id) {
    if (!confirm('Ștergi acest pacient?')) return
    await supabase.from('patients').delete().eq('id', id)
    fetchPatients()
  }

  function handleEdit(patient) {
    setForm({ name: patient.name, email: patient.email || '', phone: patient.phone || '', birth_date: patient.birth_date || '' })
    setEditing(patient.id)
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pacienți</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', email: '', phone: '', birth_date: '' }) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Adaugă Pacient
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">{editing ? 'Editează Pacient' : 'Pacient Nou'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Nume *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
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
      ) : patients.length === 0 ? (
        <p className="text-gray-500">Nu există pacienți încă.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Nume</th>
                <th className="text-left px-4 py-3 text-gray-600">Email</th>
                <th className="text-left px-4 py-3 text-gray-600">Telefon</th>
                <th className="text-left px-4 py-3 text-gray-600">Data nașterii</th>
                <th className="text-left px-4 py-3 text-gray-600">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.phone || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.birth_date || '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEdit(p)} className="text-blue-600 hover:underline">Editează</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline">Șterge</button>
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