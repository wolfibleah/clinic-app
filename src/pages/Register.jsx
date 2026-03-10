import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

const BG_IMAGE = 'https://plus.unsplash.com/premium_photo-1661901543371-0d1279a79645?q=80&w=1227&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'

function sanitize(str) {
  if (!str) return ''
  return str.trim().replace(/[<>\"'`;]/g, '')
}

function validate(form) {
  const errs = {}
  if (!form.fullName) errs.fullName = 'Numele complet este obligatoriu'
  else if (sanitize(form.fullName).length < 3) errs.fullName = 'Numele trebuie să aibă minim 3 caractere'
  else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(form.fullName)) errs.fullName = 'Numele poate conține doar litere'

  if (!form.username) errs.username = 'Username-ul este obligatoriu'
  else if (sanitize(form.username).length < 3) errs.username = 'Username-ul trebuie să aibă minim 3 caractere'
  else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Username-ul poate conține doar litere, cifre și _'

  if (!form.phone) errs.phone = 'Telefonul este obligatoriu'
  else if (!/^[0-9+\s]{10,15}$/.test(form.phone)) errs.phone = 'Număr de telefon invalid'

  if (!form.birthDate) errs.birthDate = 'Data nașterii este obligatorie'
  else {
    const age = new Date().getFullYear() - new Date(form.birthDate).getFullYear()
    if (age < 0 || age > 120) errs.birthDate = 'Data nașterii invalidă'
  }

  if (!form.email) errs.email = 'Email-ul este obligatoriu'
  else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email invalid'

  if (!form.password) errs.password = 'Parola este obligatorie'
  else if (form.password.length < 6) errs.password = 'Parola trebuie să aibă minim 6 caractere'
  else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(form.password)) errs.password = 'Parola trebuie să conțină cel puțin o literă mare și o cifră'

  if (!form.confirmPassword) errs.confirmPassword = 'Confirmă parola'
  else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Parolele nu coincid'

  return errs
}

export default function Register() {
  const [form, setForm] = useState({ fullName: '', username: '', phone: '', birthDate: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleChange(field, value) {
    setForm({ ...form, [field]: value })
    setErrors({ ...errors, [field]: '' })
  }

  async function handleSubmit() {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) return setErrors(errs)
    setLoading(true)
    setAuthError('')

    const { data, error } = await supabase.auth.signUp({
      email: sanitize(form.email),
      password: form.password,
    })

    if (error) {
      setAuthError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Salvează în profiles
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: sanitize(form.fullName),
        username: sanitize(form.username),
        phone: sanitize(form.phone),
        birth_date: form.birthDate,
        email: sanitize(form.email),
        role: 'patient',
      })

      // Salvează în patients
      await supabase.from('patients').insert({
        name: sanitize(form.fullName),
        email: sanitize(form.email),
        phone: sanitize(form.phone),
        birth_date: form.birthDate,
        auth_id: data.user.id,
      })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: `url(${BG_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <span className="text-4xl">📧</span>
          <h2 className="text-xl font-bold text-gray-800 mt-4">Verifică email-ul!</h2>
          <p className="text-gray-500 text-sm mt-2">
            Am trimis un link de confirmare la <strong>{form.email}</strong>.
            Dă click pe link și apoi autentifică-te.
          </p>
          <Link to="/login" className="mt-6 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700">
            Mergi la Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: `url(${BG_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🏥</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">ClinicApp</h1>
          <p className="text-gray-500 text-sm mt-1">Creează un cont nou</p>
        </div>

        {authError && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
            {authError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Nume Complet *</label>
            <input className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.fullName ? 'border-red-400' : 'border-gray-300'}`} placeholder="Ion Popescu" value={form.fullName} onChange={e => handleChange('fullName', e.target.value)} />
            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Username *</label>
            <input className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.username ? 'border-red-400' : 'border-gray-300'}`} placeholder="ion_popescu" value={form.username} onChange={e => handleChange('username', e.target.value)} />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Telefon *</label>
              <input className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.phone ? 'border-red-400' : 'border-gray-300'}`} placeholder="0712345678" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Data nașterii *</label>
              <input className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.birthDate ? 'border-red-400' : 'border-gray-300'}`} type="date" value={form.birthDate} onChange={e => handleChange('birthDate', e.target.value)} />
              {errors.birthDate && <p className="text-red-500 text-xs mt-1">{errors.birthDate}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Email *</label>
            <input className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.email ? 'border-red-400' : 'border-gray-300'}`} placeholder="email@exemplu.com" value={form.email} onChange={e => handleChange('email', e.target.value)} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Parolă *</label>
            <input className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.password ? 'border-red-400' : 'border-gray-300'}`} type="password" placeholder="Minim 6 caractere, o literă mare și o cifră" value={form.password} onChange={e => handleChange('password', e.target.value)} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Confirmă Parola *</label>
            <input className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`} type="password" placeholder="Repetă parola" value={form.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mt-2">
            {loading ? 'Se înregistrează...' : 'Înregistrează-te'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Ai deja cont?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Autentifică-te</Link>
          </p>
        </div>
      </div>
    </div>
  )
}