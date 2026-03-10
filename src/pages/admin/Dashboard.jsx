import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ patients: 0, doctors: 0, appointments: 0, todayAppointments: 0 })

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const today = new Date().toISOString().split('T')[0]
    const [{ count: patients }, { count: doctors }, { count: appointments }, { count: todayAppointments }] =
      await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('doctors').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('date', today),
      ])
    setStats({ patients, doctors, appointments, todayAppointments })
  }

  const cards = [
    { label: 'Total Pacienți', value: stats.patients, color: 'bg-blue-500', icon: '👤' },
    { label: 'Total Doctori', value: stats.doctors, color: 'bg-green-500', icon: '👨‍⚕️' },
    { label: 'Total Programări', value: stats.appointments, color: 'bg-purple-500', icon: '📅' },
    { label: 'Programări Azi', value: stats.todayAppointments, color: 'bg-orange-500', icon: '🗓️' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Admin</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-2">
            <div className={`${card.color} text-white text-2xl w-12 h-12 rounded-lg flex items-center justify-center`}>
              {card.icon}
            </div>
            <p className="text-3xl font-bold text-gray-800">{card.value ?? 0}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}