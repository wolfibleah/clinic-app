import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link, useNavigate } from 'react-router-dom'
const BG_IMAGE = 'https://plus.unsplash.com/premium_photo-1661901543371-0d1279a79645?q=80&w=1227&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'

function sanitize(str) {
  if (!str) return ''
  return str.trim().replace(/[<>\"'`;]/g, '')
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  function validate() {
    const errs = {}
    if (!form.email) errs.email = 'Email-ul este obligatoriu'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email invalid'
    if (!form.password) errs.password = 'Parola este obligatorie'
    else if (form.password.length < 6) errs.password = 'Parola trebuie să aibă minim 6 caractere'
    return errs
  }

  function handleChange(field, value) {
    setForm({ ...form, [field]: value })
    setErrors({ ...errors, [field]: '' })
  }

  async function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) return setErrors(errs)
    setLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: sanitize(form.email),
      password: form.password,
    })
    if (error) {
      setAuthError('Email sau parolă incorectă')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${BG_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative z-10 w-full flex items-center justify-center px-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-4xl">🏥</span>
            <h1 className="text-2xl font-bold text-gray-800 mt-2">ClinicApp</h1>
            <p className="text-gray-500 text-sm mt-1">Autentifică-te în contul tău</p>
          </div>

          {authError && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
              {authError}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="email@exemplu.com"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Parolă</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                type="password"
                placeholder="Parola ta"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
            >
              {loading ? 'Se autentifică...' : 'Autentifică-te'}
            </button>

            <p className="text-center text-sm text-gray-500">
              Nu ai cont?{' '}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Înregistrează-te
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

