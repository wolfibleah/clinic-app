import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function DoctorPatients() {
  const { profile } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [record, setRecord] = useState({ diagnosis: '', recommendations: '', treatment: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (profile) fetchDoctor() }, [profile])

  async function fetchDoctor() {
    const { data } = await supabase
      .from('doctors')
      .select('*')
      .eq('auth_id', profile.id)
      .maybeSingle()
    setDoctor(data)
    if (data) fetchPatients(data.id)
  }

  async function fetchPatients(doctorId) {
    const { data: appts } = await supabase
      .from('appointments')
      .select('patient_id, patients(id, name, email, phone, birth_date)')
      .eq('doctor_id', doctorId)
      .neq('status', 'cancelled')
  
    const unique = {}
    ;(appts || []).forEach(a => {
      if (a.patients && !unique[a.patient_id]) {
        unique[a.patient_id] = a.patients
      }
    })
  
    // Luăm diagnosticele pentru fiecare pacient
    const patientIds = Object.keys(unique)
    const { data: records } = await supabase
      .from('medical_records')
      .select('patient_id, diagnosis')
      .eq('doctor_id', doctorId)
      .in('patient_id', patientIds)
  
    // Adăugăm diagnosticul la fiecare pacient
    ;(records || []).forEach(r => {
      if (unique[r.patient_id]) {
        unique[r.patient_id].diagnosis = r.diagnosis
      }
    })
  
    setPatients(Object.values(unique))
    setLoading(false)
  }

  async function handleSaveRecord() {
    setSaving(true)

    const { data: existing } = await supabase
      .from('medical_records')
      .select('id')
      .eq('patient_id', selectedPatient.id)
      .eq('doctor_id', doctor.id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('medical_records')
        .update({ ...record, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('medical_records')
        .insert({
          ...record,
          patient_id: selectedPatient.id,
          doctor_id: doctor.id,
        })
    }

    setSaving(false)
    alert('Fișa medicală a fost salvată!')
  }

  async function openPatient(patient) {
    setSelectedPatient(patient)
  
    const { data } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('doctor_id', doctor.id)
      .maybeSingle()
  
    if (data) {
      setRecord({
        diagnosis: data.diagnosis || '',
        recommendations: data.recommendations || '',
        treatment: data.treatment || '',
        notes: data.notes || '',
      })
    } else {
      setRecord({ diagnosis: '', recommendations: '', treatment: '', notes: '' })
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pacienții mei</h1>

      {/* Modal fișă medicală */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedPatient.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Fișă medicală</p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6">
              {/* Date pacient */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Email</p>
                  <p className="text-sm text-gray-700">{selectedPatient.email || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Telefon</p>
                  <p className="text-sm text-gray-700">{selectedPatient.phone || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Data nașterii</p>
                  <p className="text-sm text-gray-700">{selectedPatient.birth_date || '-'}</p>
                </div>
              </div>

              {/* Fișă medicală */}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Diagnostic</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                    rows={3}
                    placeholder="Introduceți diagnosticul..."
                    value={record.diagnosis}
                    onChange={e => setRecord({ ...record, diagnosis: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tratament</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                    rows={3}
                    placeholder="Introduceți tratamentul recomandat..."
                    value={record.treatment}
                    onChange={e => setRecord({ ...record, treatment: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Recomandări</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                    rows={3}
                    placeholder="Introduceți recomandările..."
                    value={record.recommendations}
                    onChange={e => setRecord({ ...record, recommendations: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Note adiționale</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                    rows={2}
                    placeholder="Alte observații..."
                    value={record.notes}
                    onChange={e => setRecord({ ...record, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleSaveRecord}
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Se salvează...' : 'Salvează fișa'}
                </button>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
                >
                  Închide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Se încarcă...</p>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500">Nu ai pacienți încă.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Nume</th>
                <th className="text-left px-4 py-3 text-gray-600">Email</th>
                <th className="text-left px-4 py-3 text-gray-600">Telefon</th>
                <th className="text-left px-4 py-3 text-gray-600">Data nașterii</th>
                <th className="text-left px-4 py-3 text-gray-600">Diagnostic</th>
                <th className="text-left px-4 py-3 text-gray-600">Fișă medicală</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.phone || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.birth_date || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.diagnosis || 'Fără diagnostic'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openPatient(p)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Vezi / Editează
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