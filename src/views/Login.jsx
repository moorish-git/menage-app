import { useState } from 'react'
import { supabase } from '../supabase.js'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('admin')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        const userId = data.user?.id
        if (userId) {
          const { error: pErr } = await supabase.from('profiles').insert({
            id: userId,
            role,
            full_name: fullName || null,
          })
          if (pErr) throw pErr
        }
      }
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app center">
      <div className="card auth-card">
        <h1 className="auth-title">🧹 MénageApp</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Connectez-vous à votre compte' : 'Créez un nouveau compte'}
        </p>

        <form onSubmit={submit} className="form-stack">
          {mode === 'signup' && (
            <>
              <label className="field">
                <span className="field-label">Nom complet</span>
                <input
                  className="input"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jean Dupont"
                  required
                />
              </label>

              <label className="field">
                <span className="field-label">Rôle</span>
                <select
                  className="select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="admin">Administrateur</option>
                  <option value="cleaner">Personnel de ménage</option>
                </select>
              </label>
            </>
          )}

          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span className="field-label">Mot de passe</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              Pas encore de compte ?{' '}
              <button className="link" onClick={() => setMode('signup')}>
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{' '}
              <button className="link" onClick={() => setMode('login')}>
                Se connecter
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
