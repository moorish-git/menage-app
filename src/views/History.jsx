import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, startOfMonth, isAfter, isSameMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../supabase.js'

export default function History() {
  const [dates, setDates] = useState([])
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [apartmentFilter, setApartmentFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    const [d, a] = await Promise.all([
      supabase
        .from('cleaning_dates')
        .select('*, apartment:apartments(id, name, image_url)')
        .eq('status', 'done')
        .order('done_at', { ascending: false, nullsFirst: false })
        .order('scheduled_date', { ascending: false }),
      supabase.from('apartments').select('id, name').order('name'),
    ])
    if (!d.error) setDates(d.data || [])
    if (!a.error) setApartments(a.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('history-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_dates' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const filtered = useMemo(() => {
    let list = dates
    if (apartmentFilter !== 'all') {
      list = list.filter((d) => d.apartment_id === apartmentFilter)
    }
    if (periodFilter === 'month') {
      const now = new Date()
      list = list.filter((d) => {
        const ref = d.done_at ? parseISO(d.done_at) : parseISO(d.scheduled_date)
        return isSameMonth(ref, now)
      })
    } else if (periodFilter === '3months') {
      const threshold = new Date()
      threshold.setMonth(threshold.getMonth() - 3)
      list = list.filter((d) => {
        const ref = d.done_at ? parseISO(d.done_at) : parseISO(d.scheduled_date)
        return isAfter(ref, threshold)
      })
    }
    return list
  }, [dates, apartmentFilter, periodFilter])

  const stats = useMemo(() => {
    const total = filtered.reduce((sum, d) => sum + Number(d.price || 0), 0)
    const count = filtered.length
    const byApartment = {}
    filtered.forEach((d) => {
      const name = d.apartment?.name || 'Supprimé'
      byApartment[name] = (byApartment[name] || 0) + Number(d.price || 0)
    })
    return { total, count, byApartment }
  }, [filtered])

  const groupedByMonth = useMemo(() => {
    const map = {}
    filtered.forEach((d) => {
      const ref = d.done_at ? parseISO(d.done_at) : parseISO(d.scheduled_date)
      const key = format(startOfMonth(ref), 'yyyy-MM')
      if (!map[key]) map[key] = { label: format(ref, 'MMMM yyyy', { locale: fr }), items: [] }
      map[key].items.push(d)
    })
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filtered])

  if (loading) return <div className="muted">Chargement...</div>

  return (
    <section>
      <div className="section-header">
        <h2>Historique des ménages</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total encaissé</div>
          <div className="stat-value">{stats.total.toFixed(2)} €</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ménages terminés</div>
          <div className="stat-value">{stats.count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Moyenne / ménage</div>
          <div className="stat-value">
            {stats.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00'} €
          </div>
        </div>
      </div>

      <div className="filters">
        <button
          className={`chip ${periodFilter === 'all' ? 'chip-active' : ''}`}
          onClick={() => setPeriodFilter('all')}
        >
          Tout
        </button>
        <button
          className={`chip ${periodFilter === 'month' ? 'chip-active' : ''}`}
          onClick={() => setPeriodFilter('month')}
        >
          Ce mois-ci
        </button>
        <button
          className={`chip ${periodFilter === '3months' ? 'chip-active' : ''}`}
          onClick={() => setPeriodFilter('3months')}
        >
          3 derniers mois
        </button>
      </div>

      {apartments.length > 0 && (
        <div className="filters">
          <button
            className={`chip ${apartmentFilter === 'all' ? 'chip-active' : ''}`}
            onClick={() => setApartmentFilter('all')}
          >
            Tous logements
          </button>
          {apartments.map((a) => (
            <button
              key={a.id}
              className={`chip ${apartmentFilter === a.id ? 'chip-active' : ''}`}
              onClick={() => setApartmentFilter(a.id)}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">Aucun ménage terminé pour cette sélection.</div>
      ) : (
        groupedByMonth.map(([key, group]) => {
          const monthTotal = group.items.reduce((s, d) => s + Number(d.price || 0), 0)
          return (
            <div key={key} className="history-month">
              <div className="history-month-header">
                <span className="history-month-label">{group.label}</span>
                <span className="history-month-total">
                  {group.items.length} ménage{group.items.length > 1 ? 's' : ''} ·{' '}
                  <strong>{monthTotal.toFixed(2)} €</strong>
                </span>
              </div>
              <ul className="list">
                {group.items.map((d) => (
                  <li key={d.id} className="card date-item">
                    {d.apartment?.image_url ? (
                      <img className="date-thumb" src={d.apartment.image_url} alt="" />
                    ) : (
                      <div className="date-thumb date-thumb-placeholder">🏠</div>
                    )}
                    <div className="date-main">
                      <div className="date-title">
                        {d.apartment?.name || 'Logement supprimé'}
                        <span className="badge badge-info">Terminé</span>
                      </div>
                      <div className="date-meta">
                        📅 {format(parseISO(d.scheduled_date), 'dd MMMM yyyy', { locale: fr })}
                      </div>
                      <div className="date-meta">💶 {Number(d.price).toFixed(2)} €</div>
                      {d.cleaner_note && (
                        <div className="date-meta small">
                          <strong>Note :</strong> {d.cleaner_note}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })
      )}
    </section>
  )
}
