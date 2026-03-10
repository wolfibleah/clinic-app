import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function handleRoleChange(id, newRole) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    await supabase.from('profiles').update({ role: newRole }).eq('id', id)

    if (newRole === 'doctor') {
        const { data: existing } = await supabase
          .from('doctors')
          .select('id')
          .eq('auth_id', id)
          .maybeSingle()
      
        if (!existing) {
          // Luăm emailul din auth
          const { data: patientData } = await supabase
            .from('patients')
            .select('email, birth_date')
            .eq('auth_id', id)
            .maybeSingle()
      
          await supabase.from('doctors').insert({
            name: profile.full_name,
            phone: profile.phone,
            email: profile.email || '',
            auth_id: id,
          })
        }
      
        await supabase.from('patients').delete().eq('auth_id', id)
      
      } else if (newRole === 'patient') {
        const { data: existing } = await supabase
          .from('patients')
          .select('id')
          .eq('auth_id', id)
          .maybeSingle()
      
        if (!existing) {
          const { data: doctorData } = await supabase
            .from('doctors')
            .select('email, birth_date')
            .eq('auth_id', id)
            .maybeSingle()
      
          await supabase.from('patients').insert({
            name: profile.full_name,
            phone: profile.phone,
            email: profile.email || '',
            birth_date: profile.birth_date || null,
            auth_id: id,
          })
        }
      
        await supabase.from('doctors').delete().eq('auth_id', id)
      }

    if (newRole === 'admin') {
      await supabase.from('doctors').delete().eq('auth_id', id)
      await supabase.from('patients').delete().eq('auth_id', id)
    }

    fetchUsers()
  }

  const roleColors = {
    admin: 'bg-purple-100 text-purple-700',
    doctor: 'bg-green-100 text-green-700',
    patient: 'bg-blue-100 text-blue-700',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Utilizatori</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Se încarcă...</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500">Nu există utilizatori.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Nume</th>
                <th className="text-left px-4 py-3 text-gray-600">Username</th>
                <th className="text-left px-4 py-3 text-gray-600">Telefon</th>
                <th className="text-left px-4 py-3 text-gray-600">Rol curent</th>
                <th className="text-left px-4 py-3 text-gray-600">Schimbă rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.full_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{u.username || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{u.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="border rounded-lg px-2 py-1 text-sm"
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="patient">Patient</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
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