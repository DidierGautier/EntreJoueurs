import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const r = await api.post('/auth/register', form)
      login(r.data.access_token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'inscription')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand">EntreJoueurs</div>
        <h1>Créer un compte</h1>
        <p style={{ marginBottom: '1rem', marginTop: 0, color: 'var(--green)' }}>⚡ 1 000 crédits offerts à l'inscription</p>
        <form onSubmit={submit}>
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input type="password" placeholder="Mot de passe" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          {error && <p className="error">{error}</p>}
          <button type="submit">S'inscrire</button>
        </form>
        <p>Déjà un compte ? <Link to="/login">Se connecter</Link></p>
      </div>
    </div>
  )
}
