import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function DoctorPatients() {
  const { profile } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [patients, setPatients] = useState([])
  const [filteredPatients, setFilteredPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [record, setRecord] = useState({ diagnosis: '', recommendations: '', treatment: '', notes: '' })
  const [history, setHistory] = useState([])
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('record')
  const [fileNote, setFileNote] = useState('')
  const [selectedAppointmentFilter, setSelectedAppointmentFilter] = useState('all')

  useEffect(() => { if (profile) fetchDoctor() }, [profile])

  useEffect(() => {
    if (search) {
      setFilteredPatients(patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
      ))
    } else {
      setFilteredPatients(patients)
    }
  }, [search, patients])

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

    const patientIds = Object.keys(unique)
    if (patientIds.length > 0) {
      const { data: records } = await supabase
        .from('medical_records')
        .select('patient_id, diagnosis')
        .eq('doctor_id', doctorId)
        .in('patient_id', patientIds)

      ;(records || []).forEach(r => {
        if (unique[r.patient_id]) unique[r.patient_id].diagnosis = r.diagnosis
      })
    }

    setPatients(Object.values(unique))
    setFilteredPatients(Object.values(unique))
    setLoading(false)
  }

  async function openPatient(patient) {
    setSelectedPatient(patient)
    setActiveTab('record')
    setSelectedAppointmentFilter('all')
    setPendingFile(null)
    setFileNote('')

    const { data: rec } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('doctor_id', doctor.id)
      .maybeSingle()

    setRecord(rec ? {
      diagnosis: rec.diagnosis || '',
      recommendations: rec.recommendations || '',
      treatment: rec.treatment || '',
      notes: rec.notes || '',
    } : { diagnosis: '', recommendations: '', treatment: '', notes: '' })

    const { data: apptHistory } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('doctor_id', doctor.id)
      .order('date', { ascending: false })

    setHistory(apptHistory || [])

    const { data: patientFiles } = await supabase
      .from('medical_files')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false })

    setFiles(patientFiles || [])
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
      await supabase.from('medical_records')
        .update({ ...record, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('medical_records')
        .insert({ ...record, patient_id: selectedPatient.id, doctor_id: doctor.id })
    }
    setSaving(false)
    alert('Fișa medicală a fost salvată!')
    fetchPatients(doctor.id)
  }

  async function handleUpload() {
    if (!pendingFile) return
    setUploading(true)

    const ext = pendingFile.name.split('.').pop()
    const fileName = `${doctor.id}/${selectedPatient.id}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('medical-files')
      .upload(fileName, pendingFile)

    if (error) {
      alert('Eroare la upload: ' + error.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('medical-files')
      .getPublicUrl(fileName)

    await supabase.from('medical_files').insert({
      patient_id: selectedPatient.id,
      doctor_id: doctor.id,
      appointment_id: selectedAppointmentFilter !== 'all' ? selectedAppointmentFilter : null,
      file_name: pendingFile.name,
      file_url: urlData.publicUrl,
      file_type: pendingFile.type,
      notes: fileNote,
    })

    setFileNote('')
    setPendingFile(null)
    setUploading(false)

    const { data: patientFiles } = await supabase
      .from('medical_files')
      .select('*')
      .eq('patient_id', selectedPatient.id)
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false })

    setFiles(patientFiles || [])
  }

  async function handleDeleteFile(file) {
    if (!confirm('Ștergi acest fișier?')) return
    const path = file.file_url.split('/medical-files/')[1]
    await supabase.storage.from('medical-files').remove([path])
    await supabase.from('medical_files').delete().eq('id', file.id)
    setFiles(files.filter(f => f.id !== file.id))
  }

  function exportRecordCSV() {
    const rows = [
      ['Camp', 'Valoare'],
      ['Pacient', selectedPatient.name],
      ['Varsta', calculateAge(selectedPatient.birth_date)],
      ['Telefon', selectedPatient.phone || '-'],
      ['Email', selectedPatient.email || '-'],
      ['Diagnostic', record.diagnosis || '-'],
      ['Tratament', record.treatment || '-'],
      ['Recomandari', record.recommendations || '-'],
      ['Note', record.notes || '-'],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fisa-${selectedPatient.name.replace(/ /g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportRecordPDF() {
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Fișă medicală — ${selectedPatient.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; max-width: 700px; margin: 0 auto; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
            .section { margin-bottom: 20px; }
            .label { font-size: 11px; text-transform: uppercase; color: #999; font-weight: 600; margin-bottom: 4px; }
            .value { font-size: 14px; color: #1f2937; background: #f9fafb; padding: 10px 14px; border-radius: 6px; min-height: 36px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
            .footer { margin-top: 40px; font-size: 12px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          </style>
        </head>
        <body>
          <h1>Fișă medicală</h1>
          <p class="subtitle">Generată la ${new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <div class="grid">
            <div><div class="label">Pacient</div><div class="value">${selectedPatient.name}</div></div>
            <div><div class="label">Vârstă</div><div class="value">${calculateAge(selectedPatient.birth_date)}</div></div>
            <div><div class="label">Telefon</div><div class="value">${selectedPatient.phone || '-'}</div></div>
            <div><div class="label">Email</div><div class="value">${selectedPatient.email || '-'}</div></div>
          </div>
          <div class="section"><div class="label">Diagnostic</div><div class="value">${record.diagnosis || '-'}</div></div>
          <div class="section"><div class="label">Tratament</div><div class="value">${record.treatment || '-'}</div></div>
          <div class="section"><div class="label">Recomandări</div><div class="value">${record.recommendations || '-'}</div></div>
          <div class="section"><div class="label">Note adiționale</div><div class="value">${record.notes || '-'}</div></div>
          <div class="footer">ClinicApp • Fișă generată automat</div>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  function calculateAge(birthDate) {
    if (!birthDate) return '-'
    return `${new Date().getFullYear() - new Date(birthDate).getFullYear()} ani`
  }

  function isImage(fileType) {
    return fileType?.startsWith('image/')
  }

  const filteredFiles = selectedAppointmentFilter === 'all'
    ? files
    : files.filter(f => f.appointment_id === selectedAppointmentFilter)

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pacienții mei</h1>
        <span className="text-sm text-gray-500">{filteredPatients.length} pacienți</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="🔍 Caută pacient după nume..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {selectedPatient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedPatient.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {calculateAge(selectedPatient.birth_date)} • {selectedPatient.phone || '-'} • {selectedPatient.email || '-'}
                </p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="flex border-b overflow-x-auto">
              {[
                { key: 'record', label: '📋 Fișă medicală' },
                { key: 'files', label: `📎 Fișiere (${files.length})` },
                { key: 'history', label: `📅 Programare (${history.length})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'record' && (
                <div className="flex flex-col gap-4">
                  {[
                    { key: 'diagnosis', label: 'Diagnostic' },
                    { key: 'treatment', label: 'Tratament' },
                    { key: 'recommendations', label: 'Recomandări' },
                    { key: 'notes', label: 'Note adiționale' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">{field.label}</label>
                      <textarea
                        className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                        rows={3}
                        value={record[field.key]}
                        onChange={e => setRecord({ ...record, [field.key]: e.target.value })}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button onClick={handleSaveRecord} disabled={saving} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                      {saving ? 'Se salvează...' : 'Salvează fișa'}
                    </button>
                    <button onClick={exportRecordPDF} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
                      🖨️ PDF
                    </button>
                    <button onClick={exportRecordCSV} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
                      ⬇️ CSV
                    </button>
                    <button onClick={() => setSelectedPatient(null)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
                      Închide
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-sm font-medium text-gray-700">Adaugă fișier nou</p>
                    <select
                      className="border rounded-lg px-3 py-2 text-sm"
                      value={selectedAppointmentFilter}
                      onChange={e => setSelectedAppointmentFilter(e.target.value)}
                    >
                      <option value="all">Fără programare asociată</option>
                      {history.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.date} {h.time?.slice(0, 5)} — {h.reason || 'Fără motiv'}
                        </option>
                      ))}
                    </select>
                    <input
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Notă despre fișier (opțional)..."
                      value={fileNote}
                      onChange={e => setFileNote(e.target.value)}
                    />
                    <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50'}`}>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={e => setPendingFile(e.target.files[0])}
                        disabled={uploading}
                      />
                      {pendingFile ? (
                        <span className="text-sm text-green-600 font-medium">✅ {pendingFile.name}</span>
                      ) : (
                        <>
                          <span className="text-2xl">📎</span>
                          <span className="text-sm text-gray-600">Click pentru a selecta fișier</span>
                        </>
                      )}
                    </label>
                    {pendingFile && (
                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {uploading ? 'Se încarcă...' : '⬆️ Salvează fișierul'}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Filtrează:</span>
                    <select
                      className="border rounded-lg px-3 py-1.5 text-sm"
                      value={selectedAppointmentFilter}
                      onChange={e => setSelectedAppointmentFilter(e.target.value)}
                    >
                      <option value="all">Toate fișierele</option>
                      {history.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.date} {h.time?.slice(0, 5)} — {h.reason || 'Fără motiv'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredFiles.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">Nu există fișiere.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredFiles.map(f => (
                        <div key={f.id} className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                          {isImage(f.file_type) ? (
                            <a href={f.file_url} target="_blank" rel="noreferrer">
                              <img src={f.file_url} alt={f.file_name} className="w-full h-32 object-cover rounded-lg" />
                            </a>
                          ) : (
                            <a href={f.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white rounded-lg p-3 hover:bg-blue-50 transition-colors">
                              <span className="text-2xl">📄</span>
                              <span className="text-sm text-blue-600 truncate">{f.file_name}</span>
                            </a>
                          )}
                          {f.notes && <p className="text-xs text-gray-500">{f.notes}</p>}
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('ro-RO')}</span>
                            <button onClick={() => handleDeleteFile(f)} className="text-red-400 hover:text-red-600 text-xs">
                              🗑 Șterge
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  {history.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nu există programări anterioare.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {history.map(h => (
                        <div key={h.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">{h.date} — {h.time?.slice(0, 5)}</p>
                            <p className="text-sm text-gray-500 mt-1">{h.reason || 'Fără motiv specificat'}</p>
                            {h.notes && <p className="text-xs text-yellow-600 mt-1">📝 {h.notes}</p>}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[h.status]}`}>
                            {h.status === 'scheduled' ? 'Programat' : h.status === 'completed' ? 'Finalizat' : 'Anulat'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Se încarcă...</p>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500">{search ? 'Nu s-au găsit pacienți.' : 'Nu ai pacienți încă.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Nume</th>
                <th className="text-left px-4 py-3 text-gray-600">Vârstă</th>
                <th className="text-left px-4 py-3 text-gray-600">Telefon</th>
                <th className="text-left px-4 py-3 text-gray-600">Email</th>
                <th className="text-left px-4 py-3 text-gray-600">Diagnostic</th>
                <th className="text-left px-4 py-3 text-gray-600">Fișă</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{calculateAge(p.birth_date)}</td>
                  <td className="px-4 py-3 text-gray-500">{p.phone || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.diagnosis || 'Fără diagnostic'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openPatient(p)} className="text-blue-600 hover:underline text-sm">
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