import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function PatientMedicalRecord() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchRecords() }, [user])

  async function fetchRecords() {
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (!patient) { setLoading(false); return }

    const { data } = await supabase
      .from('medical_records')
      .select(`*, doctors(name, specialization)`)
      .eq('patient_id', patient.id)
      .order('updated_at', { ascending: false })

    setRecords(data || [])
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Fișa mea medicală</h1>

      {loading ? (
        <p className="text-gray-500">Se încarcă...</p>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">Nu ai nicio fișă medicală încă.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-semibold text-gray-800">Dr. {r.doctors?.name}</p>
                  <p className="text-sm text-gray-500">{r.doctors?.specialization}</p>
                </div>
                <p className="text-xs text-gray-400">
                  Actualizat: {new Date(r.updated_at).toLocaleDateString('ro-RO')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {r.diagnosis && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">Diagnostic</p>
                    <p className="text-sm text-gray-700">{r.diagnosis}</p>
                  </div>
                )}
                {r.treatment && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">Tratament</p>
                    <p className="text-sm text-gray-700">{r.treatment}</p>
                  </div>
                )}
                {r.recommendations && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">Recomandări</p>
                    <p className="text-sm text-gray-700">{r.recommendations}</p>
                  </div>
                )}
                {r.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">Note</p>
                    <p className="text-sm text-gray-700">{r.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}