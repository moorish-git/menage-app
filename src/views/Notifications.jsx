import { useEffect, useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../supabase.js'

const TYPE_ICONS = {
  new_date: '📅',
  date_accepted: '✅',
  date_refused: '❌',
}

export default function Notifications({ role, onChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_role', role)
      .order('created_at', { ascending: false })
      .limit(100)
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('notif-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [role])

  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('target_role', role)
      .eq('read', false)
    onChange?.()
  }

  const markOneRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    onChange?.()
  }

  const removeAll = async () => {
    if (!confirm('Effacer toutes les notifications ?')) return
    await supabase.from('notifications').delete().eq('target_role', role)
  }

  if (loading) return <div className="muted">Chargement...</div>

  const unreadCount = items.filter((i) => !i.read).length

  return (
    <section>
      <div className="section-header">
        <h2>Notifications</h2>
        <div className="row-gap">
          {unreadCount > 0 && (
            <button className="btn btn-ghost" onClick={markAllRead}>
              Tout marquer comme lu
            </button>
          )}
          {items.length > 0 && (
            <button className="btn btn-danger" onClick={removeAll}>
              Tout effacer
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">Aucune notification.</div>
      ) : (
        <ul className="list">
          {items.map((n) => (
            <li
              key={n.id}
              className={`card notif-item ${n.read ? 'notif-read' : 'notif-unread'}`}
              onClick={() => !n.read && markOneRead(n.id)}
            >
              <div className="notif-icon">{TYPE_ICONS[n.type] || '🔔'}</div>
              <div className="notif-main">
                <div className="notif-title">{n.title}</div>
                {n.message && <div className="notif-message">{n.message}</div>}
                <div className="muted small">
                  {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: fr })}
                </div>
              </div>
              {!n.read && <span className="notif-dot" />}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
