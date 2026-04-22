import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabase.js'
import Login from './views/Login.jsx'
import Apartments from './views/Apartments.jsx'
import CleaningDates from './views/CleaningDates.jsx'
import CalendarView from './views/Calendar.jsx'
import Stock from './views/Stock.jsx'
import Notifications from './views/Notifications.jsx'

const ADMIN_TABS = [
  { id: 'dates', label: 'Dates' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'apartments', label: 'Logements' },
  { id: 'stock', label: 'Stocks' },
  { id: 'notifications', label: 'Notifications' },
]

const CLEANER_TABS = [
  { id: 'dates', label: 'Dates à valider' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'stock', label: 'Stocks' },
  { id: 'notifications', label: 'Notifications' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dates')
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session])

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('target_role', profile.role)
        .eq('read', false)
      setUnread(count || 0)
    }
    load()
    const channel = supabase
      .channel('notif-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile])

  if (!isConfigured) {
    return (
      <div className="app">
        <div className="setup-warning">
          <h1>⚙️ Configuration requise</h1>
          <p>
            L'application n'est pas encore connectée à Supabase. Crée un fichier <code>.env</code> à la racine
            du projet avec :
          </p>
          <pre>VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=ta-clé-anonyme</pre>
          <p>
            Voir le fichier <code>supabase/schema.sql</code> pour créer les tables dans ton projet Supabase.
          </p>
        </div>
      </div>
    )
  }

  if (loading) return <div className="app center">Chargement...</div>
  if (!session) return <Login />
  if (!profile) {
    return (
      <div className="app center">
        <div className="card">
          <h2>Profil introuvable</h2>
          <p>Votre compte n'a pas encore de rôle attribué. Déconnectez-vous et recréez un compte.</p>
          <button className="btn btn-danger" onClick={() => supabase.auth.signOut()}>
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  const tabs = profile.role === 'admin' ? ADMIN_TABS : CLEANER_TABS

  const renderTab = () => {
    switch (tab) {
      case 'apartments':
        return <Apartments />
      case 'dates':
        return <CleaningDates role={profile.role} />
      case 'calendar':
        return <CalendarView />
      case 'stock':
        return <Stock role={profile.role} />
      case 'notifications':
        return <Notifications role={profile.role} onChange={() => setUnread(0)} />
      default:
        return null
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">🧹</span>
          <span className="brand-name">MénageApp</span>
          <span className={`role-pill role-${profile.role}`}>
            {profile.role === 'admin' ? 'Admin' : 'Ménage'}
          </span>
        </div>
        <div className="topbar-right">
          <span className="user-email">{session.user.email}</span>
          <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'notifications' && unread > 0 && (
              <span className="badge-count">{unread}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="content">{renderTab()}</main>
    </div>
  )
}
