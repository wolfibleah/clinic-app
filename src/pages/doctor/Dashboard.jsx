import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function DoctorDashboard() {
  const { profile } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [stats, setStats] = useState({ today: 0, week: 0, completed: 0, cancelled: 0 })
  const [editingNote, setEditingNote] = useState(null)
  const [noteText, setNoteText] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  useEffect(() => { if (profile) fetchDoctor() }, [profile])
  useEffect(() => { if (doctor) fetchAppointments() }, [doctor, selectedDate])

  async function fetchDoctor() {
    const { data } = await supabase
      .from('doctors')
      .select('*')
      .eq('auth_id', profile.id)
      .maybeSingle()
    setDoctor(data)
    if (data) {
      await autoComplete(data.id)
      fetchStats(data.id)
    }
  }

  async function fetchAppointments() {
    const { data } = await supabase
      .from('appointments')
      .select(`*, patients(name, email, phone, birth_date)`)
      .eq('doctor_id', doctor.id)
      .eq('date', selectedDate)
      .order('time', { ascending: true })
    setAppointments(data || [])
    setLoading(false)
  }

  async function autoComplete(doctorId) {
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().slice(0, 5)

    const { data: pending } = await supabase
      .from('appointments')
      .select('id, date, time')
      .eq('doctor_id', doctorId)
      .eq('status', 'scheduled')

    const toComplete = (pending || []).filter(a => {
      if (a.date < currentDate) return true
      if (a.date === currentDate && a.time?.slice(0, 5) < currentTime) return true
      return false
    })

    if (toComplete.length > 0) {
      await Promise.all(
        toComplete.map(a =>
          supabase.from('appointments').update({ status: 'completed' }).eq('id', a.id)
        )
      )
    }
  }

  async function fetchStats(doctorId) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const [{ count: todayCount }, { count: weekCount }, { count: completedCount }, { count: cancelledCount }] =
      await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', doctorId).eq('date', today),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', doctorId).gte('date', weekStartStr).lte('date', weekEndStr),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', doctorId).eq('status', 'completed'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', doctorId).eq('status', 'cancelled'),
      ])

    setStats({ today: todayCount || 0, week: weekCount || 0, completed: completedCount || 0, cancelled: cancelledCount || 0 })
  }

  async function handleComplete(id) {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', id)
    fetchAppointments()
    if (doctor) fetchStats(doctor.id)
  }

  async function handleCancel(id) {
    if (!confirm('Anulezi această programare?')) return
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    fetchAppointments()
    if (doctor) fetchStats(doctor.id)
  }

  async function handleReactivate(id) {
    if (!confirm('Reactivezi această programare?')) return
    await supabase.from('appointments').update({ status: 'scheduled' }).eq('id', id)
    fetchAppointments()
    if (doctor) fetchStats(doctor.id)
  }

  async function handleSaveNote(id) {
    await supabase.from('appointments').update({ notes: noteText }).eq('id', id)
    setEditingNote(null)
    setNoteText('')
    fetchAppointments()
  }

  function isPast(date, time) {
    return new Date(`${date}T${time}`) < new Date()
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function calculateAge(birthDate) {
    if (!birthDate) return '-'
    return `${new Date().getFullYear() - new Date(birthDate).getFullYear()} ani`
  }

  function exportCSV() {
    const rows = [
      ['Ora', 'Pacient', 'Varsta', 'Motiv', 'Status', 'Nota'],
      ...appointments.map(a => [
        a.time?.slice(0, 5),
        a.patients?.name || '-',
        calculateAge(a.patients?.birth_date),
        a.reason || '-',
        a.status === 'scheduled' ? 'Programat' : a.status === 'completed' ? 'Finalizat' : 'Anulat',
        a.notes || '-'
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `programari-${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Programări ${selectedDate}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { color: #666; font-size: 14px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #f3f4f6; text-align: left; padding: 8px 12px; border: 1px solid #e5e7eb; }
            td { padding: 8px 12px; border: 1px solid #e5e7eb; }
            tr:nth-child(even) { background: #f9fafb; }
            .scheduled { color: #1d4ed8; }
            .completed { color: #15803d; }
            .cancelled { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Programări — ${formatDate(selectedDate)}</h1>
          <p>Dr. ${profile?.full_name} • ${appointments.length} programări</p>
          <table>
            <thead>
              <tr>
                <th>Ora</th><th>Pacient</th><th>Vârstă</th><th>Motiv</th><th>Status</th><th>Notă</th>
              </tr>
            </thead>
            <tbody>
              ${appointments.map(a => `
                <tr>
                  <td>${a.time?.slice(0, 5)}</td>
                  <td>${a.patients?.name || '-'}</td>
                  <td>${calculateAge(a.patients?.birth_date)}</td>
                  <td>${a.reason || '-'}</td>
                  <td class="${a.status}">
                    ${a.status === 'scheduled' ? 'Programat' : a.status === 'completed' ? 'Finalizat' : 'Anulat'}
                  </td>
                  <td>${a.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const quickDates = [
    { label: 'Ieri', date: yesterday },
    { label: 'Azi', date: today },
    { label: 'Mâine', date: tomorrow },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Programările mele</h1>
        <p className="text-gray-500 text-sm mt-1">Bună ziua, {profile?.full_name}!</p>
      </div>

      {/* Statistici */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Programări azi', value: stats.today, color: 'bg-blue-500', icon: '📅' },
          { label: 'Săptămâna aceasta', value: stats.week, color: 'bg-purple-500', icon: '📆' },
          { label: 'Finalizate total', value: stats.completed, color: 'bg-green-500', icon: '✅' },
          { label: 'Anulate total', value: stats.cancelled, color: 'bg-red-500', icon: '❌' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-2">
            <div className={`${card.color} text-white text-xl w-10 h-10 rounded-lg flex items-center justify-center`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Modal detalii pacient */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-start p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Detalii Pacient</h2>
              <button onClick={() => setSelectedAppointment(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase font-medium mb-1">Pacient</p>
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
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Vârstă</p>
                  <p className="text-sm text-gray-700">{calculateAge(selectedAppointment.patients?.birth_date)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Ora</p>
                  <p className="text-sm text-gray-700">{selectedAppointment.time?.slice(0, 5)}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase font-medium mb-1">Motiv</p>
                <p className="text-sm text-gray-700">{selectedAppointment.reason || '-'}</p>
              </div>
              {selectedAppointment.notes && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-xs text-yellow-600 uppercase font-medium mb-1">Notă</p>
                  <p className="text-sm text-gray-700">{selectedAppointment.notes}</p>
                </div>
              )}
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

      {/* Quick date buttons + calendar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {quickDates.map(q => (
            <button
              key={q.date}
              onClick={() => setSelectedDate(q.date)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDate === q.date
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {q.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">Altă dată:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3 capitalize">
          📅 {formatDate(selectedDate)}
          {selectedDate === today && <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Azi</span>}
        </p>
      </div>

      {/* Lista programări */}
      {loading ? (
        <p className="text-gray-500">Se încarcă...</p>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-500">Nu există programări pentru această zi.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
            <p className="text-sm font-medium text-gray-700">{appointments.length} programări</p>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200">
                ⬇️ CSV
              </button>
              <button onClick={exportPDF} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200">
                🖨️ PDF
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Ora</th>
                <th className="text-left px-4 py-3 text-gray-600">Pacient</th>
                <th className="text-left px-4 py-3 text-gray-600">Vârstă</th>
                <th className="text-left px-4 py-3 text-gray-600">Motiv</th>
                <th className="text-left px-4 py-3 text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-gray-600">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(a => (
                <>
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.time?.slice(0, 5)}</td>
                    <td className="px-4 py-3">{a.patients?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{calculateAge(a.patients?.birth_date)}</td>
                    <td className="px-4 py-3 text-gray-500">{a.reason || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status]}`}>
                        {a.status === 'scheduled' ? 'Programat' : a.status === 'completed' ? 'Finalizat' : 'Anulat'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2 flex-wrap">
                      <button onClick={() => setSelectedAppointment(a)} className="text-blue-600 hover:underline text-sm">
                        Vezi detalii
                      </button>
                      {a.status === 'scheduled' && isPast(a.date, a.time) && (
                        <button onClick={() => handleComplete(a.id)} className="text-green-600 hover:underline text-sm">
                          Finalizează
                        </button>
                      )}
                      {a.status === 'scheduled' && (
                        <button onClick={() => handleCancel(a.id)} className="text-red-500 hover:underline text-sm">
                          Anulează
                        </button>
                      )}
                      {a.status === 'completed' && (
                        <button onClick={() => handleReactivate(a.id)} className="text-orange-500 hover:underline text-sm">
                          ↩ Reactivează
                        </button>
                      )}
                      {a.status === 'cancelled' && (
                        <button onClick={() => handleReactivate(a.id)} className="text-orange-500 hover:underline text-sm">
                          ↩ Resetează
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingNote(a.id); setNoteText(a.notes || '') }}
                        className="text-yellow-600 hover:underline text-sm"
                      >
                        📝 Notă
                      </button>
                    </td>
                  </tr>
                  {editingNote === a.id && (
                    <tr key={`note-${a.id}`} className="bg-yellow-50 border-b">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex gap-2 items-center">
                          <input
                            className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                            placeholder="Scrie o notă pentru această programare..."
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveNote(a.id)}
                            autoFocus
                          />
                          <button onClick={() => handleSaveNote(a.id)} className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-600">
                            Salvează
                          </button>
                          <button onClick={() => setEditingNote(null)} className="text-gray-400 hover:text-gray-600 text-sm">
                            Închide
                          </button>
                        </div>
                        {a.notes && <p className="text-xs text-gray-500 mt-1">Notă curentă: {a.notes}</p>}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}